#!/bin/bash

# MC Backup Manager - Installation Script

echo "==================================="
echo "MC Backup Manager - Installation"
echo "==================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js ist nicht installiert!"
    echo "Installiere Node.js..."
    
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    if [ $? -eq 0 ]; then
        echo "✓ Node.js erfolgreich installiert"
    else
        echo "✗ Fehler bei der Installation von Node.js"
        exit 1
    fi
else
    echo "✓ Node.js ist bereits installiert ($(node --version))"
fi

echo ""
echo "Installiere Abhängigkeiten..."
echo ""

# Install backend dependencies
echo "Backend-Abhängigkeiten..."
npm install

if [ $? -ne 0 ]; then
    echo "✗ Fehler bei der Installation der Backend-Abhängigkeiten"
    exit 1
fi

# Install frontend dependencies
echo ""
echo "Frontend-Abhängigkeiten..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "✗ Fehler bei der Installation der Frontend-Abhängigkeiten"
    exit 1
fi

cd ..

echo ""
echo "==================================="
echo "✓ Installation abgeschlossen!"
echo "==================================="
echo ""
echo "Nächste Schritte:"
echo "1. Passen Sie die .env Datei an (JWT_SECRET ändern!)"
echo "2. Für Development:"
echo "   - Terminal 1: npm run dev"
echo "   - Terminal 2: npm run client"
echo ""
echo "3. Für Production:"
echo "   - npm run build"
echo "   - npm start"
echo ""
echo "4. Oder als systemd Service:"
echo "   - sudo ./install-service.sh"
echo ""
