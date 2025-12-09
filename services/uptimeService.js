const schedule = require('node-schedule');
const net = require('net');
const http = require('http');
const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../config/logger');

const dataDir = path.join(__dirname, '../data');
const monitorsFile = path.join(dataDir, 'uptime-monitors.json');
const historyFile = path.join(dataDir, 'uptime-history.json');

// Store active jobs and current states
const jobs = {};
const currentStates = {};

// Ensure data files exist
if (!fs.existsSync(monitorsFile)) {
  fs.writeJsonSync(monitorsFile, []);
}
if (!fs.existsSync(historyFile)) {
  fs.writeJsonSync(historyFile, {});
}

// Initialize uptime service
function initialize() {
  logger.info('Initializing uptime monitoring service...');
  loadMonitors();
}

// Load and schedule all monitors
function loadMonitors() {
  try {
    // Cancel existing jobs
    Object.values(jobs).forEach(job => job.cancel());
    Object.keys(jobs).forEach(key => delete jobs[key]);

    const monitors = fs.readJsonSync(monitorsFile);
    
    monitors.forEach(monitor => {
      scheduleMonitor(monitor);
      // Initialize current state
      if (!currentStates[monitor.id]) {
        currentStates[monitor.id] = {
          status: 'unknown',
          lastCheck: null,
          responseTime: null
        };
      }
    });

    logger.info(`Scheduled ${monitors.length} uptime monitors`);
  } catch (error) {
    logger.error('Error loading monitors:', error);
  }
}

// Schedule a monitor
function scheduleMonitor(monitor) {
  // Convert interval to cron expression (interval in minutes)
  const interval = parseInt(monitor.interval) || 5;
  const cronExpression = `*/${interval} * * * *`;

  const job = schedule.scheduleJob(cronExpression, async () => {
    await checkMonitor(monitor);
  });

  jobs[monitor.id] = job;
  
  // Run initial check
  checkMonitor(monitor);
}

// Check if a monitor is up
async function checkMonitor(monitor) {
  const startTime = Date.now();
  
  try {
    const isUp = await performCheck(monitor);
    const responseTime = Date.now() - startTime;
    
    // Update current state
    currentStates[monitor.id] = {
      status: isUp ? 'up' : 'down',
      lastCheck: new Date().toISOString(),
      responseTime: isUp ? responseTime : null
    };

    // Save to history
    saveCheckResult(monitor.id, isUp, responseTime);

    logger.info(`Monitor ${monitor.name}: ${isUp ? 'UP' : 'DOWN'} (${responseTime}ms)`);
  } catch (error) {
    logger.error(`Error checking monitor ${monitor.name}:`, error.message);
    
    currentStates[monitor.id] = {
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: null
    };

    saveCheckResult(monitor.id, false, null);
  }
}

// Perform the actual check based on monitor type
function performCheck(monitor) {
  return new Promise((resolve, reject) => {
    const timeout = 5000; // 5 seconds timeout
    
    if (monitor.type === 'http' || monitor.type === 'https') {
      const protocol = monitor.type === 'https' ? https : http;
      const url = `${monitor.type}://${monitor.host}:${monitor.port}${monitor.path || ''}`;
      
      const req = protocol.get(url, { timeout }, (res) => {
        // Consider 2xx and 3xx as success
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.on('error', () => {
        resolve(false);
      });
    } else {
      // TCP check
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.connect(monitor.port, monitor.host, () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });
    }
  });
}

// Save check result to history
function saveCheckResult(monitorId, isUp, responseTime) {
  try {
    const history = fs.readJsonSync(historyFile);
    
    if (!history[monitorId]) {
      history[monitorId] = [];
    }

    history[monitorId].push({
      timestamp: new Date().toISOString(),
      status: isUp ? 'up' : 'down',
      responseTime
    });

    // Keep last 1000 entries per monitor
    if (history[monitorId].length > 1000) {
      history[monitorId] = history[monitorId].slice(-1000);
    }

    fs.writeJsonSync(historyFile, history);
  } catch (error) {
    logger.error('Error saving check result:', error);
  }
}

// Get all monitors with current status
function getAllMonitors() {
  try {
    const monitors = fs.readJsonSync(monitorsFile);
    
    return monitors.map(monitor => ({
      ...monitor,
      currentStatus: currentStates[monitor.id] || {
        status: 'unknown',
        lastCheck: null,
        responseTime: null
      }
    }));
  } catch (error) {
    logger.error('Error getting monitors:', error);
    return [];
  }
}

// Get monitor history with uptime calculation
function getMonitorHistory(monitorId, hours = 24) {
  try {
    const history = fs.readJsonSync(historyFile);
    const monitorHistory = history[monitorId] || [];
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentHistory = monitorHistory.filter(entry => 
      new Date(entry.timestamp) > cutoffTime
    );

    // Calculate uptime percentage
    const totalChecks = recentHistory.length;
    const upChecks = recentHistory.filter(entry => entry.status === 'up').length;
    const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0;

    // Calculate average response time
    const responseTimes = recentHistory
      .filter(entry => entry.responseTime !== null)
      .map(entry => entry.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : null;

    return {
      history: recentHistory,
      stats: {
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        totalChecks,
        upChecks,
        downChecks: totalChecks - upChecks,
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null
      }
    };
  } catch (error) {
    logger.error('Error getting monitor history:', error);
    return {
      history: [],
      stats: {
        uptimePercentage: 0,
        totalChecks: 0,
        upChecks: 0,
        downChecks: 0,
        avgResponseTime: null
      }
    };
  }
}

// Add a new monitor
function addMonitor(monitor) {
  try {
    const monitors = fs.readJsonSync(monitorsFile);
    
    // Generate ID
    const id = Date.now().toString();
    const newMonitor = {
      id,
      ...monitor,
      createdAt: new Date().toISOString()
    };

    monitors.push(newMonitor);
    fs.writeJsonSync(monitorsFile, monitors);

    // Schedule the monitor
    scheduleMonitor(newMonitor);

    return newMonitor;
  } catch (error) {
    logger.error('Error adding monitor:', error);
    throw error;
  }
}

// Update a monitor
function updateMonitor(id, updates) {
  try {
    const monitors = fs.readJsonSync(monitorsFile);
    const index = monitors.findIndex(m => m.id === id);

    if (index === -1) {
      throw new Error('Monitor not found');
    }

    monitors[index] = {
      ...monitors[index],
      ...updates,
      id, // Keep original ID
      updatedAt: new Date().toISOString()
    };

    fs.writeJsonSync(monitorsFile, monitors);

    // Reschedule
    if (jobs[id]) {
      jobs[id].cancel();
    }
    scheduleMonitor(monitors[index]);

    return monitors[index];
  } catch (error) {
    logger.error('Error updating monitor:', error);
    throw error;
  }
}

// Delete a monitor
function deleteMonitor(id) {
  try {
    const monitors = fs.readJsonSync(monitorsFile);
    const filtered = monitors.filter(m => m.id !== id);

    fs.writeJsonSync(monitorsFile, filtered);

    // Cancel job
    if (jobs[id]) {
      jobs[id].cancel();
      delete jobs[id];
    }

    // Delete current state
    delete currentStates[id];

    // Keep history for now (could be deleted if desired)

    return true;
  } catch (error) {
    logger.error('Error deleting monitor:', error);
    throw error;
  }
}

module.exports = {
  initialize,
  getAllMonitors,
  getMonitorHistory,
  addMonitor,
  updateMonitor,
  deleteMonitor,
  checkMonitor
};
