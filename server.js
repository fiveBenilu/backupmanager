const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const logger = require('./config/logger');
require('dotenv').config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const instanceRoutes = require('./routes/instances');
const servicesRoutes = require('./routes/services');
const hardwareRoutes = require('./routes/hardware');
const uptimeRoutes = require('./routes/uptime');
const backupService = require('./services/backupService');
const uptimeService = require('./services/uptimeService');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limit for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const backupsDir = path.join(__dirname, 'backups');
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(dataDir);
fs.ensureDirSync(backupsDir);
fs.ensureDirSync(logsDir);

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

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
    }
  };
  res.status(200).json(healthCheck);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/uptime', uptimeRoutes);

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

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// Initialize services
backupService.initialize();
uptimeService.initialize();

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Backup service initialized`);
  logger.info(`Uptime monitoring service initialized`);
});
