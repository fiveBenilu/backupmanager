# MC Backup Manager

Ein moderner Backup-Management-Service mit Weboberfläche für automatische Datensicherungen.

## Features

- 🎨 Moderne, minimalistische Weboberfläche (dunkel, grau)
- 🔐 Sichere Authentifizierung mit JWT
- 📦 Automatische ZIP-Backups mit konfigurierbaren Intervallen
- ⏰ Integrierter Scheduler (stündlich, täglich, wöchentlich)
- 🗂️ Automatische Verwaltung alter Backups (1-5 Backups aufbewahren)
- 🚀 Erstmalige Einrichtung mit Admin-Account
- 📊 Übersichtliches Dashboard mit allen Backup-Instanzen
- ⚙️ Einfache Verwaltung von Backup-Konfigurationen

## Voraussetzungen

- Node.js (v14 oder höher)
- npm oder yarn

## Installation

### 1. Node.js installieren (falls nicht vorhanden)

```bash
# Für Debian/Ubuntu/Raspberry Pi OS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Abhängigkeiten installieren

```bash
cd /opt/mcbackupmanager
npm run install-all
```

Dies installiert sowohl die Backend- als auch Frontend-Abhängigkeiten.

## Konfiguration

1. Bearbeiten Sie die `.env` Datei:

```bash
nano .env
```

Wichtige Einstellungen:
- `PORT`: Port für den Backend-Server (Standard: 3001)
- `JWT_SECRET`: Ändern Sie dies zu einem sicheren, zufälligen String
- `NODE_ENV`: production oder development

## Verwendung

### Development-Modus

Terminal 1 - Backend starten:
```bash
cd /opt/mcbackupmanager
npm run dev
```

Terminal 2 - Frontend starten:
```bash
cd /opt/mcbackupmanager
npm run client
```

Das Frontend läuft auf http://localhost:3000

### Production-Modus

1. Frontend bauen:
```bash
npm run build
```

2. Server starten:
```bash
npm start
```

Der Server läuft auf http://localhost:3001

### Mit systemd als Service (Empfohlen für Production)

1. Service-Datei erstellen:
```bash
sudo nano /etc/systemd/system/mcbackupmanager.service
```

2. Folgenden Inhalt einfügen:
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

3. Service aktivieren und starten:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcbackupmanager
sudo systemctl start mcbackupmanager
sudo systemctl status mcbackupmanager
```

## Erstmalige Einrichtung

1. Öffnen Sie die Weboberfläche im Browser
2. Sie werden automatisch zur Einrichtungsseite weitergeleitet
3. Erstellen Sie Ihren Administrator-Account
4. Nach erfolgreicher Registrierung werden Sie zum Dashboard weitergeleitet

## Backup-Instanzen verwalten

### Neue Instanz anlegen

1. Klicken Sie auf das **+** Symbol oben rechts
2. Füllen Sie die Felder aus:
   - **Name**: Beschreibender Name für die Instanz
   - **Quellpfad**: Der Ordner, der gesichert werden soll
   - **Zielpfad**: Wo die ZIP-Backups gespeichert werden
   - **Intervall**: Wie oft Backups erstellt werden (stündlich/täglich/wöchentlich)
   - **Max. Backups**: Wie viele Backups aufbewahrt werden (1-5)
3. Klicken Sie auf **Speichern**

### Instanz bearbeiten

1. Klicken Sie auf das **⚙** Symbol in der gewünschten Instanz-Karte
2. Bearbeiten Sie die Einstellungen
3. Klicken Sie auf **Speichern** oder **Instanz löschen**

### Manuelles Backup

Klicken Sie auf **Backup jetzt starten** in der Instanz-Karte, um sofort ein Backup zu erstellen.

## Backup-Intervalle

- **Stündlich**: Jeden Stunde zur vollen Stunde
- **Täglich**: Jeden Tag um 2:00 Uhr nachts
- **Wöchentlich**: Jeden Sonntag um 2:00 Uhr nachts

## Datenstruktur

```
/opt/mcbackupmanager/
├── data/               # Datenbank (JSON)
│   ├── users.json      # Benutzer
│   ├── instances.json  # Backup-Instanzen
│   └── settings.json   # System-Einstellungen
├── backups/            # Standard-Backup-Verzeichnis
├── client/             # React Frontend
├── routes/             # API-Routen
├── services/           # Backend-Services
└── server.js           # Hauptserver
```

## Sicherheit

- Passwörter werden mit bcrypt gehasht
- JWT-Tokens für Authentifizierung
- Automatische Token-Validierung
- Geschützte API-Endpunkte

## Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen (wenn als Service)
sudo journalctl -u mcbackupmanager -f

# Manuell starten für mehr Details
cd /opt/mcbackupmanager
node server.js
```

### Backup schlägt fehl
- Prüfen Sie, ob der Quellpfad existiert und lesbar ist
- Prüfen Sie, ob der Zielpfad existiert und beschreibbar ist
- Prüfen Sie die Server-Logs

### Port ist bereits belegt
Ändern Sie den Port in der `.env` Datei:
```
PORT=3002
```

## Lizenz

MIT

## Support

Bei Fragen oder Problemen erstellen Sie bitte ein Issue im Repository.
