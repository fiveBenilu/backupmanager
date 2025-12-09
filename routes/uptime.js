const express = require('express');
const router = express.Router();
const uptimeService = require('../services/uptimeService');

// Get all monitors with current status
router.get('/', async (req, res) => {
  try {
    const monitors = uptimeService.getAllMonitors();
    res.json(monitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monitor history and stats
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    const data = uptimeService.getMonitorHistory(id, hours);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new monitor
router.post('/', async (req, res) => {
  try {
    const { name, host, port, type, interval, path } = req.body;

    if (!name || !host || !port || !type || !interval) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const monitor = uptimeService.addMonitor({
      name,
      host,
      port: parseInt(port),
      type,
      interval: parseInt(interval),
      path: path || ''
    });

    res.json(monitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a monitor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, host, port, type, interval, path } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (host !== undefined) updates.host = host;
    if (port !== undefined) updates.port = parseInt(port);
    if (type !== undefined) updates.type = type;
    if (interval !== undefined) updates.interval = parseInt(interval);
    if (path !== undefined) updates.path = path;

    const monitor = uptimeService.updateMonitor(id, updates);
    res.json(monitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a monitor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    uptimeService.deleteMonitor(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger a check
router.post('/:id/check', async (req, res) => {
  try {
    const { id } = req.params;
    const monitors = uptimeService.getAllMonitors();
    const monitor = monitors.find(m => m.id === id);

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    await uptimeService.checkMonitor(monitor);
    
    // Get updated status
    const updated = uptimeService.getAllMonitors().find(m => m.id === id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
