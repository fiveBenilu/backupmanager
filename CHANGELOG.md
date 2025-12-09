# Changelog - Server Management Tool

## Version 2.0 - Extension to Server Management Tool

### New Features

#### 1. Tab-based Navigation
- The dashboard now uses a modern tab system
- Three main areas: Backups, Services, Hardware
- Clear navigation between different functions
- Consistent design across all areas

#### 2. Service Monitoring
**Features:**
- Monitor all custom systemctl services
- Automatic filtering of standard Raspberry Pi OS services
- Real-time status display (Active, Inactive, Error)
- Color-coded status indicators (Green = Active, Red = Error, Gray = Inactive)
- Clickable service cards for detailed view
- Historical service status tracking
- Automatic refresh every 10 seconds

**Technical Details:**
- Backend route: `/api/services`
- History route: `/api/services/:name/history`
- History stored in `data/services-history.json`
- Keeps last 1000 entries per service (approx. 2.7 hours at 10s intervals)

**Filtered Standard Services:**
- systemd, dbus, ssh, cron, rsyslog
- networking, dhcpcd, bluetooth, avahi-daemon
- getty, login, wpa_supplicant
- and many other standard services

#### 3. Hardware Monitoring
**Features:**
- **CPU Monitoring:**
  - Current usage in percent
  - Number of CPU cores
  - CPU model information
  - Live chart of the last 10 minutes
  
- **RAM Monitoring:**
  - Used memory in GB
  - Total memory in GB
  - Available memory
  - Percentage usage
  - History chart
  
- **Disk Monitoring:**
  - Used storage in GB
  - Total storage in GB
  - Available storage
  - Percentage usage
  - History chart
  
- **Network Monitoring:**
  - Download rate (RX) in Bytes/s
  - Upload rate (TX) in Bytes/s
  - Total data received
  - Total data sent
  - Two-color chart for RX/TX

**Technical Details:**
- Backend route: `/api/hardware`
- Automatic refresh every 10 seconds
- 60 data points history (10 minutes)
- Canvas-based real-time charts
- Uses OS APIs and /proc/net/dev for network stats

#### 4. Design Improvements
- Unified, modern dark theme
- Minimalist design with high usability
- Responsive card layout
- Color-coded status indicators
- Smooth hover effects and transitions
- Consistent typography and spacing

### API Endpoints

#### Services
```
GET /api/services
Returns all custom services with current status

GET /api/services/:name/history
Returns status history of a specific service (last 100 entries)
```

#### Hardware
```
GET /api/hardware
Returns current hardware metrics:
- CPU (usage, cores, model)
- Memory (total, used, available)
- Disk (total, used, available)
- Network (rx_bytes, tx_bytes, rx_bytes_per_sec, tx_bytes_per_sec)
```

### Component Structure

```
client/src/
├── components/
│   ├── InstanceModal.js      (bestehend)
│   ├── ServicesTab.js         (neu)
│   └── HardwareTab.js         (neu)
├── pages/
│   ├── Dashboard.js           (erweitert mit Tab-System)
│   ├── Login.js               (bestehend)
│   └── Setup.js               (bestehend)
└── services/
    └── api.js                 (bestehend)

routes/
├── auth.js                    (bestehend)
├── instances.js               (bestehend)
├── services.js                (neu)
└── hardware.js                (neu)
```

### Data Persistence

New files:
- `data/services-history.json` - Stores service status history

### Recommended System Requirements

- Node.js v14 or higher
- Raspberry Pi OS, Linux, or macOS
- Access to systemctl (Linux) or launchctl (macOS) for service monitoring
- Read access to /proc/net/dev (Linux) or netstat (macOS) for network monitoring

### Platform Support

**Linux (Raspberry Pi OS, Ubuntu, Debian, etc.):**
- ✅ Full support for all features
- Service monitoring via systemctl
- Hardware monitoring via /proc and Node.js OS APIs
- Network statistics via /proc/net/dev

**macOS:**
- ✅ Full support for all features
- Service monitoring via launchctl (shows custom services)
- Hardware monitoring via Node.js OS APIs
- Network statistics via netstat

**Windows:**
- ⚠️ Limited support
- Backup functionality fully functional
- Service monitoring not available
- Hardware monitoring (CPU, RAM) limited availability

### Migration from v1.0

No breaking changes! Existing backup functionality remains fully intact.
Simply:
1. Update code
2. Run `npm install`
3. Rebuild frontend: `npm run build`
4. Restart server

### Known Limitations

- Service monitoring shows launchctl services on macOS (different service names than on Linux)
- Hardware monitoring uses Node.js OS APIs, precision may vary by system
- Network statistics are calculated from first request (first measurement could be inaccurate)
- On macOS only custom launchd services are shown (com.apple.* services are filtered)

### Future Extensions (Roadmap)

- Service control (Start/Stop/Restart of services)
- More hardware metrics (temperature, process list)
- Notifications for critical states
- Export of monitoring data
- Configurable refresh interval
