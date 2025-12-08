const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const instanceRoutes = require('./routes/instances');
const backupService = require('./services/backupService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const backupsDir = path.join(__dirname, 'backups');
fs.ensureDirSync(dataDir);
fs.ensureDirSync(backupsDir);

// Initialize data files if they don't exist
const usersFile = path.join(dataDir, 'users.json');
const instancesFile = path.join(dataDir, 'instances.json');
const settingsFile = path.join(dataDir, 'settings.json');

if (!fs.existsSync(usersFile)) {
  fs.writeJsonSync(usersFile, []);
}
if (!fs.existsSync(instancesFile)) {
  fs.writeJsonSync(instancesFile, []);
}
if (!fs.existsSync(settingsFile)) {
  fs.writeJsonSync(settingsFile, { isSetupComplete: false });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);

// Check setup status
app.get('/api/setup-status', (req, res) => {
  const settings = fs.readJsonSync(settingsFile);
  res.json({ isSetupComplete: settings.isSetupComplete });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Initialize backup service
backupService.initialize();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Backup service initialized`);
});
