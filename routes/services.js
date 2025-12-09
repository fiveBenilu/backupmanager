const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs-extra');
const path = require('path');

const execPromise = util.promisify(exec);

// Store service history
const dataDir = path.join(__dirname, '../data');
const servicesHistoryFile = path.join(dataDir, 'services-history.json');

// Ensure history file exists
if (!fs.existsSync(servicesHistoryFile)) {
  fs.writeJsonSync(servicesHistoryFile, {});
}

// Standard Raspberry Pi OS services to exclude
const standardServices = [
  'systemd', 'dbus', 'rsyslog', 'cron', 'ssh', 'getty', 'login',
  'networking', 'dhcpcd', 'wpa_supplicant', 'bluetooth', 'avahi-daemon',
  'triggerhappy', 'keyboard-setup', 'console-setup', 'rpi-eeprom-update',
  'raspi-config', 'fake-hwclock', 'alsa-', 'ModemManager', 'polkit',
  'udisks2', 'accounts-daemon', 'upower', 'packagekit', 'lightdm',
  'user@', 'systemd-', 'dbus-org', 'pulseaudio', 'rtkit-daemon',
  'colord', 'cups', 'apache2', 'nginx-', 'apt-daily', 'unattended-upgrades',
  'rpcbind', 'nfs-', 'multipathd', 'iscsid', 'hciuart', 'snapd',
  'networkd-dispatcher', 'irqbalance', 'thermald', 'apport'
];

// Get all active systemd services (Linux) or launchd services (macOS)
async function getAllServices() {
  const platform = process.platform;
  
  // On non-Linux systems, return mock data or empty array
  if (platform === 'darwin') {
    // macOS - use launchctl
    try {
      const { stdout } = await execPromise('launchctl list');
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      const services = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) continue;

        const pid = parts[0];
        const status = parts[1];
        const label = parts[2];

        // Filter out system services
        if (label.startsWith('com.apple.') || label.startsWith('0x')) continue;

        services.push({
          name: label,
          status: pid !== '-' ? 'active' : 'inactive',
          description: label,
          load: 'loaded',
          active: pid !== '-' ? 'active' : 'inactive',
          sub: pid !== '-' ? 'running' : 'dead'
        });
      }

      return services;
    } catch (error) {
      console.error('Error getting macOS services:', error);
      return [];
    }
  } else if (platform === 'linux') {
    // Linux - use systemctl
    try {
      const { stdout } = await execPromise(
        'systemctl list-units --type=service --all --no-pager --no-legend'
      );
      
      const lines = stdout.trim().split('\n');
      const services = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) continue;

        const serviceName = parts[0].replace('.service', '');
        const load = parts[1];
        const active = parts[2];
        const sub = parts[3];
        
        // Filter out standard services
        const isStandard = standardServices.some(std => 
          serviceName.startsWith(std) || serviceName.includes(std)
        );
        
        if (isStandard) continue;

        // Get service description
        let description = parts.slice(4).join(' ');
        try {
          const { stdout: descOut } = await execPromise(
            `systemctl show ${serviceName}.service -p Description --value`
          );
          description = descOut.trim() || description;
        } catch (err) {
          // Use default description if command fails
        }

        let status = 'inactive';
        if (active === 'active') {
          status = sub === 'running' ? 'active' : 'inactive';
        } else if (active === 'failed') {
          status = 'failed';
        }

        services.push({
          name: serviceName,
          status,
          description,
          load,
          active,
          sub
        });
      }

      return services;
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }
  
  // Other platforms - return empty array
  return [];
}

// Update service history
function updateServiceHistory(services) {
  try {
    const history = fs.readJsonSync(servicesHistoryFile);
    const timestamp = new Date().toISOString();

    services.forEach(service => {
      if (!history[service.name]) {
        history[service.name] = [];
      }

      // Add new entry
      history[service.name].push({
        status: service.status,
        timestamp
      });

      // Keep only last 1000 entries (approx. 2.7 hours at 10s intervals)
      if (history[service.name].length > 1000) {
        history[service.name] = history[service.name].slice(-1000);
      }
    });

    fs.writeJsonSync(servicesHistoryFile, history);
  } catch (error) {
    console.error('Error updating service history:', error);
  }
}

// GET /api/services - Get all custom services
router.get('/', async (req, res) => {
  try {
    const services = await getAllServices();
    
    // Update history
    updateServiceHistory(services);
    
    res.json(services);
  } catch (error) {
    console.error('Error in GET /api/services:', error);
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// GET /api/services/:name/history - Get service history
router.get('/:name/history', (req, res) => {
  try {
    const { name } = req.params;
    const history = fs.readJsonSync(servicesHistoryFile);
    
    const serviceHistory = history[name] || [];
    
    // Return last 100 entries
    res.json(serviceHistory.slice(-100));
  } catch (error) {
    console.error('Error in GET /api/services/:name/history:', error);
    res.status(500).json({ error: 'Failed to retrieve service history' });
  }
});

// POST /api/services/:name/action - Execute systemctl action on a service
router.post('/:name/action', async (req, res) => {
  try {
    const { name } = req.params;
    const { action } = req.body;
    
    // Validate action
    const validActions = ['start', 'stop', 'restart', 'enable', 'disable'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be one of: start, stop, restart, enable, disable' });
    }
    
    const platform = process.platform;
    
    if (platform === 'linux') {
      // Execute systemctl command
      const command = `sudo systemctl ${action} ${name}.service`;
      const { stdout, stderr } = await execPromise(command);
      
      // Get updated service status
      const services = await getAllServices();
      const updatedService = services.find(s => s.name === name);
      
      res.json({
        success: true,
        message: `Service ${name} ${action} executed successfully`,
        service: updatedService,
        output: stdout || stderr
      });
    } else if (platform === 'darwin') {
      // macOS - use launchctl
      let command;
      switch (action) {
        case 'start':
          command = `launchctl start ${name}`;
          break;
        case 'stop':
          command = `launchctl stop ${name}`;
          break;
        case 'restart':
          command = `launchctl stop ${name} && launchctl start ${name}`;
          break;
        case 'enable':
          command = `launchctl load ${name}`;
          break;
        case 'disable':
          command = `launchctl unload ${name}`;
          break;
      }
      
      const { stdout, stderr } = await execPromise(command);
      
      res.json({
        success: true,
        message: `Service ${name} ${action} executed successfully`,
        output: stdout || stderr
      });
    } else {
      res.status(501).json({ error: 'Platform not supported' });
    }
  } catch (error) {
    console.error('Error executing service action:', error);
    res.status(500).json({ 
      error: 'Failed to execute service action',
      message: error.message,
      stderr: error.stderr
    });
  }
});

module.exports = router;
