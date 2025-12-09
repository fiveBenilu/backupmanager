# Quick Start - Server Management Tool

## After Update

### 1. Install dependencies (if new ones were added)
```bash
cd /Users/bennetgriese/Documents/Projekte/ServerCT/backupmanager
npm install
```

### 2. Rebuild frontend
```bash
npm run build
```

### 3. Start server
```bash
npm start
```

Or with systemd (recommended):
```bash
sudo systemctl restart mcbackupmanager
```

## Access Web Interface

Open in browser: `http://localhost:3001`

## New Features

### Tab Navigation
After login you'll see three tabs:
- **Backups** - The familiar backup management
- **Services** - Service monitoring for systemctl services
- **Hardware** - Real-time hardware monitoring

### Services Tab
- Shows all custom services
- Standard services are automatically filtered
- Click on a service to see status history
- Automatically refreshes every 10 seconds

### Hardware Tab
- **CPU**: Current usage with history chart
- **RAM**: Memory usage in GB with history
- **Disk**: Disk space usage with history
- **Network**: Download/Upload rates in real-time
- All charts show the last 10 minutes

## Troubleshooting

### Services not displayed
- Make sure the system uses systemd
- Check permissions: `systemctl list-units`

### Hardware data missing
- On Linux systems all data should be available
- /proc/net/dev must be readable for network stats

### Frontend shows old version
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Rebuild frontend: `npm run build`

## Development Mode

If you want to work on the code:

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
npm run client
```

Frontend will run on: `http://localhost:3000`
