# Server Management Tool

A modern server management tool with web interface for backups, service monitoring, and hardware monitoring.

## Features

- 🎨 Modern, minimalist web interface (dark, gray)
- 🔐 Secure authentication with JWT
- 📦 **Backup Management**
  - Automatic ZIP backups with configurable intervals
  - Built-in scheduler (hourly, daily, weekly)
  - Automatic management of old backups (keep 1-5 backups)
  - Download function for stored backups
- 🔧 **Service Monitoring**
  - Monitor all custom systemctl services
  - Real-time status (active, inactive, error)
  - Service status history over time
  - Automatic filtering of standard services
- 💻 **Hardware Monitoring**
  - CPU usage in percent with live chart
  - RAM usage in GB with history
  - Disk space overview
  - Network usage (download/upload) in real-time
  - Historical data over 10 minutes
- 📊 Tab-based dashboard for clear navigation
- ⚙️ Easy management of all functions

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

### 1. Install Node.js (if not already installed)

```bash
# For Debian/Ubuntu/Raspberry Pi OS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install dependencies

```bash
cd /opt/mcbackupmanager
npm run install-all
```

This installs both backend and frontend dependencies.

## Configuration

1. Edit the `.env` file:

```bash
nano .env
```

Important settings:
- `PORT`: Port for the backend server (default: 3001)
- `JWT_SECRET`: Change this to a secure, random string
- `NODE_ENV`: production or development

## Usage

### Development Mode

Terminal 1 - Start backend:
```bash
cd /opt/mcbackupmanager
npm run dev
```

Terminal 2 - Start frontend:
```bash
cd /opt/mcbackupmanager
npm run client
```

The frontend runs on http://localhost:3000

### Production Mode

1. Build frontend:
```bash
npm run build
```

2. Start server:
```bash
npm start
```

The server runs on http://localhost:3001

### With systemd as Service (Recommended for Production)

1. Create service file:
```bash
sudo nano /etc/systemd/system/mcbackupmanager.service
```

2. Insert the following content:
```ini
[Unit]
Description=MC Backup Manager
After=network.target

[Service]
Type=simple
User=bennetgriese
WorkingDirectory=/opt/mcbackupmanager
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcbackupmanager
sudo systemctl start mcbackupmanager
sudo systemctl status mcbackupmanager
```

## Initial Setup

1. Open the web interface in your browser
2. You will be automatically redirected to the setup page
3. Create your administrator account
4. After successful registration you will be redirected to the dashboard

## Managing Backup Instances

### Create New Instance

1. Click the **+** symbol in the top right
2. Fill out the fields:
   - **Name**: Descriptive name for the instance
   - **Source Path**: The folder to be backed up
   - **Target Path**: Where the ZIP backups will be stored
   - **Interval**: How often backups are created (hourly/daily/weekly)
   - **Max. Backups**: How many backups to keep (1-5)
3. Click **Save**

### Edit Instance

1. Click the **⚙** symbol in the desired instance card
2. Edit the settings
3. Click **Save** or **Delete Instance**

### Manual Backup

Click **Start Backup Now** in the instance card to create a backup immediately.

## Backup Intervals

- **Hourly**: Every hour on the hour
- **Daily**: Every day at 2:00 AM
- **Weekly**: Every Sunday at 2:00 AM

## Data Structure

```
/opt/mcbackupmanager/
├── data/               # Database (JSON)
│   ├── users.json      # Users
│   ├── instances.json  # Backup instances
│   └── settings.json   # System settings
├── backups/            # Default backup directory
├── client/             # React frontend
├── routes/             # API routes
├── services/           # Backend services
└── server.js           # Main server
```

## Security

- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Automatic token validation
- Protected API endpoints

## Troubleshooting

### Backend won't start
```bash
# Check logs (when running as service)
sudo journalctl -u mcbackupmanager -f

# Start manually for more details
cd /opt/mcbackupmanager
node server.js
```

### Backup fails
- Check if the source path exists and is readable
- Check if the target path exists and is writable
- Check the server logs

### Port is already in use
Change the port in the `.env` file:
```
PORT=3002
```

## License

MIT

## Support

For questions or problems, please create an issue in the repository.
