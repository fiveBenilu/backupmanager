const schedule = require('node-schedule');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const instancesFile = path.join(dataDir, 'instances.json');

// Store active jobs
const jobs = {};

// Initialize backup service
function initialize() {
  console.log('Initializing backup service...');
  loadSchedules();
}

// Load and schedule all backup jobs
function loadSchedules() {
  try {
    // Cancel existing jobs
    Object.values(jobs).forEach(job => job.cancel());
    Object.keys(jobs).forEach(key => delete jobs[key]);

    const instances = fs.readJsonSync(instancesFile);
    
    instances.forEach(instance => {
      scheduleBackup(instance);
    });

    console.log(`Scheduled ${instances.length} backup jobs`);
  } catch (error) {
    console.error('Error loading schedules:', error);
  }
}

// Schedule a backup for an instance
function scheduleBackup(instance) {
  // Parse interval (format: "daily", "hourly", "weekly", or cron expression)
  let cronExpression;
  
  switch (instance.interval.toLowerCase()) {
    case 'hourly':
      cronExpression = '0 * * * *'; // Every hour
      break;
    case 'daily':
      cronExpression = '0 2 * * *'; // Every day at 2 AM
      break;
    case 'weekly':
      cronExpression = '0 2 * * 0'; // Every Sunday at 2 AM
      break;
    default:
      cronExpression = instance.interval; // Custom cron expression
  }

  try {
    const job = schedule.scheduleJob(cronExpression, async () => {
      console.log(`Running scheduled backup for instance: ${instance.name}`);
      await performBackup(instance);
    });

    jobs[instance.id] = job;
    console.log(`Scheduled backup for ${instance.name} with interval: ${instance.interval}`);
  } catch (error) {
    console.error(`Error scheduling backup for ${instance.name}:`, error);
  }
}

// Perform backup for an instance
async function performBackup(instance) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Starting backup for: ${instance.name}`);

      // Ensure target directory exists
      await fs.ensureDir(instance.targetPath);

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${instance.name}_${timestamp}.zip`;
      const backupFilePath = path.join(instance.targetPath, backupFileName);

      // Create write stream
      const output = fs.createWriteStream(backupFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive events
      output.on('close', async () => {
        const backupSize = archive.pointer();
        console.log(`Backup completed: ${backupFileName} (${formatBytes(backupSize)})`);

        // Update instance data
        await updateInstanceAfterBackup(instance, {
          fileName: backupFileName,
          filePath: backupFilePath,
          size: backupSize,
          timestamp: new Date().toISOString()
        });

        resolve();
      });

      archive.on('error', (err) => {
        console.error(`Backup error for ${instance.name}:`, err);
        reject(err);
      });

      // Pipe archive to file
      archive.pipe(output);

      // Add directory to archive
      if (fs.existsSync(instance.sourcePath)) {
        const stats = await fs.stat(instance.sourcePath);
        
        if (stats.isDirectory()) {
          // Exclude temporary and problematic files
          archive.directory(instance.sourcePath, false, (entry) => {
            // Skip temporary files that may have permission issues
            const excludePatterns = [
              /\.tmp$/i,                    // Temporary files
              /\.jfr\.tmp$/i,               // Java Flight Recorder temp files (Spark)
              /tmp-client\//i,              // Spark tmp-client folder
              /\.lck$/i,                    // Lock files
              /session\.lock$/i,            // Minecraft session locks
            ];
            
            const shouldExclude = excludePatterns.some(pattern => pattern.test(entry.name));
            if (shouldExclude) {
              console.log(`Skipping file: ${entry.name}`);
              return false;
            }
            return entry;
          });
        } else {
          archive.file(instance.sourcePath, { name: path.basename(instance.sourcePath) });
        }
      } else {
        throw new Error(`Source path does not exist: ${instance.sourcePath}`);
      }

      // Finalize archive
      await archive.finalize();

    } catch (error) {
      console.error(`Error performing backup for ${instance.name}:`, error);
      reject(error);
    }
  });
}

// Update instance after successful backup
async function updateInstanceAfterBackup(instance, backupInfo) {
  try {
    const instances = fs.readJsonSync(instancesFile);
    const instanceIndex = instances.findIndex(i => i.id === instance.id);

    if (instanceIndex === -1) return;

    const updatedInstance = instances[instanceIndex];

    // Add new backup to list
    if (!updatedInstance.backups) {
      updatedInstance.backups = [];
    }
    updatedInstance.backups.push(backupInfo);

    // Update last backup info
    updatedInstance.lastBackup = backupInfo.timestamp;
    updatedInstance.size = backupInfo.size;

    // Remove old backups if exceeding maxBackups
    if (updatedInstance.backups.length > updatedInstance.maxBackups) {
      const backupsToRemove = updatedInstance.backups.splice(
        0,
        updatedInstance.backups.length - updatedInstance.maxBackups
      );

      // Delete old backup files
      for (const oldBackup of backupsToRemove) {
        try {
          if (fs.existsSync(oldBackup.filePath)) {
            await fs.remove(oldBackup.filePath);
            console.log(`Deleted old backup: ${oldBackup.fileName}`);
          }
        } catch (error) {
          console.error(`Error deleting old backup ${oldBackup.fileName}:`, error);
        }
      }
    }

    instances[instanceIndex] = updatedInstance;
    fs.writeJsonSync(instancesFile, instances, { spaces: 2 });

  } catch (error) {
    console.error('Error updating instance after backup:', error);
  }
}

// Reload schedules
function reloadSchedules() {
  console.log('Reloading backup schedules...');
  loadSchedules();
}

// Format bytes to human readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = {
  initialize,
  reloadSchedules,
  performBackup
};
