#!/bin/bash

# MC Backup Manager - Service Installation Script

SERVICE_NAME="mcbackupmanager"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
WORKING_DIR="/opt/mcbackupmanager"
USER="bennetgriese"

echo "==================================="
echo "MC Backup Manager - Service Setup"
echo "==================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Bitte als root ausführen (sudo ./install-service.sh)"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "✗ Node.js ist nicht installiert!"
    echo "Führen Sie zuerst ./install.sh aus"
    exit 1
fi

# Get Node.js path
NODE_PATH=$(which node)

echo "Erstelle systemd Service..."
echo ""

# Create service file
cat > $SERVICE_FILE << EOF
[Unit]
Description=MC Backup Manager
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORKING_DIR
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=$NODE_PATH server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

if [ $? -ne 0 ]; then
    echo "✗ Fehler beim Erstellen der Service-Datei"
    exit 1
fi

echo "✓ Service-Datei erstellt: $SERVICE_FILE"
echo ""

# Reload systemd
echo "Lade systemd neu..."
systemctl daemon-reload

if [ $? -ne 0 ]; then
    echo "✗ Fehler beim Neuladen von systemd"
    exit 1
fi

echo "✓ systemd neu geladen"
echo ""

# Enable service
echo "Aktiviere Service..."
systemctl enable $SERVICE_NAME

if [ $? -ne 0 ]; then
    echo "✗ Fehler beim Aktivieren des Service"
    exit 1
fi

echo "✓ Service aktiviert"
echo ""

# Start service
echo "Starte Service..."
systemctl start $SERVICE_NAME

if [ $? -ne 0 ]; then
    echo "✗ Fehler beim Starten des Service"
    echo ""
    echo "Prüfen Sie die Logs mit:"
    echo "sudo journalctl -u $SERVICE_NAME -f"
    exit 1
fi

echo "✓ Service gestartet"
echo ""

# Check status
sleep 2
systemctl is-active --quiet $SERVICE_NAME

if [ $? -eq 0 ]; then
    echo "==================================="
    echo "✓ Installation erfolgreich!"
    echo "==================================="
    echo ""
    echo "Service-Status:"
    systemctl status $SERVICE_NAME --no-pager -l
    echo ""
    echo "Nützliche Befehle:"
    echo "  Status prüfen:    sudo systemctl status $SERVICE_NAME"
    echo "  Logs anzeigen:    sudo journalctl -u $SERVICE_NAME -f"
    echo "  Service stoppen:  sudo systemctl stop $SERVICE_NAME"
    echo "  Service starten:  sudo systemctl start $SERVICE_NAME"
    echo "  Service neuladen: sudo systemctl restart $SERVICE_NAME"
    echo ""
    echo "Weboberfläche: http://localhost:3001"
    echo ""
else
    echo "✗ Service läuft nicht!"
    echo ""
    echo "Prüfen Sie die Logs:"
    echo "sudo journalctl -u $SERVICE_NAME -f"
    exit 1
fi
