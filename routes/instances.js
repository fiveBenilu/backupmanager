const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { verifyToken } = require('./auth');

const dataDir = path.join(__dirname, '../data');
const instancesFile = path.join(dataDir, 'instances.json');

// Get all instances
router.get('/', verifyToken, (req, res) => {
  try {
    const instances = fs.readJsonSync(instancesFile);
    res.json(instances);
  } catch (error) {
    console.error('Error reading instances:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single instance
router.get('/:id', verifyToken, (req, res) => {
  try {
    const instances = fs.readJsonSync(instancesFile);
    const instance = instances.find(i => i.id === req.params.id);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json(instance);
  } catch (error) {
    console.error('Error reading instance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create instance
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, sourcePath, targetPath, interval, maxBackups } = req.body;

    // Validate input
    if (!name || !sourcePath || !targetPath || !interval || !maxBackups) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (maxBackups < 1 || maxBackups > 5) {
      return res.status(400).json({ error: 'Max backups must be between 1 and 5' });
    }

    // Check if source path exists
    if (!fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'Source path does not exist' });
    }

    const instances = fs.readJsonSync(instancesFile);

    const newInstance = {
      id: Date.now().toString(),
      name,
      sourcePath,
      targetPath,
      interval,
      maxBackups: parseInt(maxBackups),
      lastBackup: null,
      size: 0,
      backups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    instances.push(newInstance);
    fs.writeJsonSync(instancesFile, instances, { spaces: 2 });

    // Trigger backup service to reload schedules
    const backupService = require('../services/backupService');
    backupService.reloadSchedules();

    res.status(201).json(newInstance);
  } catch (error) {
    console.error('Error creating instance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update instance
router.put('/:id', verifyToken, (req, res) => {
  try {
    const { name, sourcePath, targetPath, interval, maxBackups } = req.body;
    const instances = fs.readJsonSync(instancesFile);
    const instanceIndex = instances.findIndex(i => i.id === req.params.id);

    if (instanceIndex === -1) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Validate input
    if (!name || !sourcePath || !targetPath || !interval || !maxBackups) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (maxBackups < 1 || maxBackups > 5) {
      return res.status(400).json({ error: 'Max backups must be between 1 and 5' });
    }

    // Check if source path exists
    if (!fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'Source path does not exist' });
    }

    instances[instanceIndex] = {
      ...instances[instanceIndex],
      name,
      sourcePath,
      targetPath,
      interval,
      maxBackups: parseInt(maxBackups),
      updatedAt: new Date().toISOString()
    };

    fs.writeJsonSync(instancesFile, instances, { spaces: 2 });

    // Trigger backup service to reload schedules
    const backupService = require('../services/backupService');
    backupService.reloadSchedules();

    res.json(instances[instanceIndex]);
  } catch (error) {
    console.error('Error updating instance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete instance
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const instances = fs.readJsonSync(instancesFile);
    const instanceIndex = instances.findIndex(i => i.id === req.params.id);

    if (instanceIndex === -1) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    instances.splice(instanceIndex, 1);
    fs.writeJsonSync(instancesFile, instances, { spaces: 2 });

    // Trigger backup service to reload schedules
    const backupService = require('../services/backupService');
    backupService.reloadSchedules();

    res.json({ message: 'Instance deleted' });
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Trigger manual backup
router.post('/:id/backup', verifyToken, async (req, res) => {
  try {
    const instances = fs.readJsonSync(instancesFile);
    const instance = instances.find(i => i.id === req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const backupService = require('../services/backupService');
    await backupService.performBackup(instance);

    // Reload updated instance
    const updatedInstances = fs.readJsonSync(instancesFile);
    const updatedInstance = updatedInstances.find(i => i.id === req.params.id);

    res.json(updatedInstance);
  } catch (error) {
    console.error('Error performing backup:', error);
    res.status(500).json({ error: 'Backup failed: ' + error.message });
  }
});

// Download backup
router.get('/:id/backups/:backupIndex/download', verifyToken, async (req, res) => {
  try {
    const instances = fs.readJsonSync(instancesFile);
    const instance = instances.find(i => i.id === req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const backupIndex = parseInt(req.params.backupIndex);
    
    if (!instance.backups || backupIndex < 0 || backupIndex >= instance.backups.length) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = instance.backups[backupIndex];
    
    // Check if file exists
    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }

    // Send file for download
    res.download(backup.filePath, backup.fileName, (err) => {
      if (err) {
        console.error('Error downloading backup:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading backup' });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
