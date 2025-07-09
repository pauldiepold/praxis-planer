# Pflegeplaner

Eine Electron-App zur Verwaltung von Pflegepraktikantinnen und deren Wochenplanung.

## Features

- 📅 Kalenderansicht mit Wochenplanung
- 👥 Verwaltung von Schülerinnen
- 🏫 Pflegeschulen-Verwaltung  
- 🏢 Betriebe-Verwaltung
- 🌙 Dark Mode
- 💾 Lokale JSON-Datenbank (Lowdb)

## Entwicklung

```bash
# Dependencies installieren
npm install

# App starten
npm start

# Entwicklungsmodus
npm run dev
```

## Build

### Lokaler Build (Windows)
```bash
npm run build
```

### GitHub Actions Build

Die App wird automatisch über GitHub Actions gebaut:

1. **Push auf main Branch**: Automatischer Build für alle Plattformen
2. **Pull Request**: Build für Tests
3. **Manual Trigger**: Über GitHub Actions Tab

### Build-Artefakte

Nach jedem Build werden folgende Dateien erstellt:

- **Windows**: `pflege-planner.exe` (Portable)
- **macOS**: `pflege-planner.dmg` (Installer)
- **Linux**: `pflege-planner.AppImage` (Portable)

### Releases

Bei Push auf main wird automatisch ein Release erstellt mit:
- Alle Build-Artefakte
- Automatische Versionierung
- Download-Links

## Datenbank

Die App verwendet Lowdb (JSON) für die lokale Datenspeicherung:
- `data.json` wird im App-Verzeichnis gespeichert
- Seed-Daten werden beim ersten Start erstellt
- Automatische Backups bei Änderungen

## Technologie-Stack

- **Frontend**: HTML, CSS, JavaScript
- **UI**: Tailwind CSS + DaisyUI
- **Backend**: Electron
- **Datenbank**: Lowdb (JSON)
- **Build**: Electron Builder
- **CI/CD**: GitHub Actions 