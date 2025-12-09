const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');

const execPromise = util.promisify(exec);

// Store last network stats for calculating rates
let lastNetworkStats = null;
let lastNetworkTime = null;

// Get CPU usage
async function getCPUUsage() {
  try {
    // Get CPU info
    const cpus = os.cpus();
    const model = cpus[0].model;
    const cores = cpus.length;

    // Calculate average CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return {
      usage,
      cores,
      model
    };
  } catch (error) {
    console.error('Error getting CPU usage:', error);
    return { usage: 0, cores: 0, model: 'Unknown' };
  }
}

// Get memory info
function getMemoryInfo() {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      total,
      used,
      available: free
    };
  } catch (error) {
    console.error('Error getting memory info:', error);
    return { total: 0, used: 0, available: 0 };
  }
}

// Get disk info
async function getDiskInfo() {
  const platform = process.platform;
  
  try {
    let cmd = 'df -B1 / | tail -1'; // Linux
    if (platform === 'darwin') {
      cmd = 'df -k / | tail -1'; // macOS uses 1K blocks
    }
    
    const { stdout } = await execPromise(cmd);
    const parts = stdout.trim().split(/\s+/);
    
    if (platform === 'darwin') {
      // macOS: convert from KB to bytes
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      const available = parseInt(parts[3]) * 1024;
      
      return { total, used, available };
    } else {
      // Linux: already in bytes
      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const available = parseInt(parts[3]);
      
      return { total, used, available };
    }
  } catch (error) {
    console.error('Error getting disk info:', error);
    return { total: 0, used: 0, available: 0 };
  }
}

// Get network info
async function getNetworkInfo() {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    // macOS - use netstat
    try {
      const { stdout } = await execPromise('netstat -ib | grep -v lo0');
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      
      let totalRx = 0;
      let totalTx = 0;

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;
        
        // netstat format: Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes
        const ibytes = parseInt(parts[6]) || 0;
        const obytes = parseInt(parts[9]) || 0;
        
        totalRx += ibytes;
        totalTx += obytes;
      }

      const currentTime = Date.now();
      let rxPerSec = 0;
      let txPerSec = 0;

      if (lastNetworkStats && lastNetworkTime) {
        const timeDiff = (currentTime - lastNetworkTime) / 1000;
        rxPerSec = (totalRx - lastNetworkStats.rx) / timeDiff;
        txPerSec = (totalTx - lastNetworkStats.tx) / timeDiff;
      }

      lastNetworkStats = { rx: totalRx, tx: totalTx };
      lastNetworkTime = currentTime;

      return {
        rx_bytes: totalRx,
        tx_bytes: totalTx,
        rx_bytes_per_sec: Math.max(0, rxPerSec),
        tx_bytes_per_sec: Math.max(0, txPerSec)
      };
    } catch (error) {
      console.error('Error getting network info on macOS:', error);
      return {
        rx_bytes: 0,
        tx_bytes: 0,
        rx_bytes_per_sec: 0,
        tx_bytes_per_sec: 0
      };
    }
  } else if (platform === 'linux') {
    // Linux - use /proc/net/dev
    try {
      const data = await fs.readFile('/proc/net/dev', 'utf8');
      const lines = data.split('\n');
      
      let totalRx = 0;
      let totalTx = 0;

      // Skip first two header lines
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/\s+/);
        const iface = parts[0].replace(':', '');
        
        // Skip loopback
        if (iface === 'lo') continue;
        
        totalRx += parseInt(parts[1]) || 0;
        totalTx += parseInt(parts[9]) || 0;
      }

      const currentTime = Date.now();
      let rxPerSec = 0;
      let txPerSec = 0;

      if (lastNetworkStats && lastNetworkTime) {
        const timeDiff = (currentTime - lastNetworkTime) / 1000;
        rxPerSec = (totalRx - lastNetworkStats.rx) / timeDiff;
        txPerSec = (totalTx - lastNetworkStats.tx) / timeDiff;
      }

      lastNetworkStats = { rx: totalRx, tx: totalTx };
      lastNetworkTime = currentTime;

      return {
        rx_bytes: totalRx,
        tx_bytes: totalTx,
        rx_bytes_per_sec: Math.max(0, rxPerSec),
        tx_bytes_per_sec: Math.max(0, txPerSec)
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        rx_bytes: 0,
        tx_bytes: 0,
        rx_bytes_per_sec: 0,
        tx_bytes_per_sec: 0
      };
    }
  }
  
  // Fallback for other platforms
  return {
    rx_bytes: 0,
    tx_bytes: 0,
    rx_bytes_per_sec: 0,
    tx_bytes_per_sec: 0
  };
}

// GET /api/hardware - Get all hardware info
router.get('/', async (req, res) => {
  try {
    const [cpu, memory, disk, network] = await Promise.all([
      getCPUUsage(),
      Promise.resolve(getMemoryInfo()),
      getDiskInfo(),
      getNetworkInfo()
    ]);

    res.json({
      cpu,
      memory,
      disk,
      network
    });
  } catch (error) {
    console.error('Error in GET /api/hardware:', error);
    res.status(500).json({ error: 'Failed to retrieve hardware info' });
  }
});

module.exports = router;
