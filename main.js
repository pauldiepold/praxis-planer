const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// Logging-Funktion
function log(message) {
  const logPath = path.join(__dirname, 'app.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // In Konsole ausgeben
  console.log(message);
  
  // In Datei schreiben
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (error) {
    console.error('Fehler beim Schreiben in Log-Datei:', error);
  }
}

let mainWindow;
let db;

async function createWindow() {
  try {
    log('Erstelle BrowserWindow...');
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false,
        allowRunningInsecureContent: true
      },
      icon: path.join(__dirname, 'assets/icon.png'),
      title: 'Pflegeplaner - Kinderarztpraxis Holstein-Diepold'
    });

    const htmlPath = path.join(__dirname, 'index.html');
    log('Lade HTML-Datei von:', htmlPath);
    
    // Prüfen ob HTML-Datei existiert
    if (!fs.existsSync(htmlPath)) {
      log('HTML-Datei nicht gefunden:', htmlPath);
      throw new Error('HTML-Datei nicht gefunden');
    }

    // Prüfen ob Assets existieren
    const assetsPath = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsPath)) {
      log('Assets-Ordner nicht gefunden:', assetsPath);
    } else {
      log('Assets-Ordner gefunden:', assetsPath);
      const files = fs.readdirSync(assetsPath);
      log('Assets-Dateien:', files);
    }

    mainWindow.loadFile(htmlPath);
    log('HTML-Datei erfolgreich geladen');

    // Fenster maximieren und dann anzeigen
    mainWindow.maximize();
    mainWindow.show();

    // Fehlerbehandlung für das Laden
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log('Fehler beim Laden der HTML-Datei:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('did-finish-load', () => {
      log('HTML-Datei erfolgreich geladen und gerendert');
    });

    // Zusätzliche Fehlerbehandlung für Ressourcen
    mainWindow.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription) => {
      log('Fehler beim provisorischen Laden:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      log(`Console [${level}]: ${message} (${sourceId}:${line})`);
    });

  } catch (error) {
    log('Fehler beim Erstellen des Fensters:', error);
    app.quit();
  }
}

async function initializeDatabase() {
  try {
    log('Initialisiere Datenbank...');
    const { Low } = await import('lowdb');
    const { JSONFile } = await import('lowdb/node');
    const dbPath = path.join(__dirname, 'pflege_planner.json');
    
    log('Datenbank-Pfad:', dbPath);
    
    // Prüfen ob Verzeichnis existiert
    const dirPath = path.dirname(dbPath);
    if (!fs.existsSync(dirPath)) {
      log('Verzeichnis nicht gefunden, erstelle:', dirPath);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Prüfen ob JSON-Datei existiert
    const fileExists = fs.existsSync(dbPath);
    log('JSON-Datei existiert:', fileExists);
    
    const adapter = new JSONFile(dbPath);
    db = new Low(adapter, {
      schools: [],
      companies: [],
      students: [],
      weeks: []
    });
    await db.read();
    await db.write();
    
    // Seed-Daten hinzufügen wenn JSON-Datei nicht existiert
    if (!fileExists) {
      log('JSON-Datei nicht gefunden. Initialisiere Datenbank mit Seed-Daten...');
      await seedDatabase();
    } else {
      log('Datenbank bereits initialisiert');
    }
  } catch (error) {
    log('Fehler bei der Datenbank-Initialisierung:', error);
    throw error;
  }
}

// Hilfsfunktionen für IDs
function getNextId(arr) {
  if (arr.length === 0) return 1;
  const maxId = Math.max(...arr.map(e => e.id || 0));
  return maxId + 1;
}

// Funktion um tatsächliche Kalenderwochen zu generieren
function generateWeeksForYear(year) {
  const weeks = [];
  
  // Einfacher Ansatz: Alle Wochen 1-52 für jedes Jahr generieren
  // (Die meisten Jahre haben 52 Wochen, manche 53)
  for (let weekNumber = 1; weekNumber <= 52; weekNumber++) {
    weeks.push({
      id: getNextId(weeks),
      year: year,
      week_number: weekNumber,
      status: 'free',
      student_id: null,
      notes: ''
    });
  }
  
  // Prüfen ob das Jahr eine 53. Woche hat
  try {
    const week53Start = dayjs().year(year).isoWeek(53).startOf('isoWeek');
    if (week53Start.isoWeekYear() === year) {
      weeks.push({
        id: getNextId(weeks),
        year: year,
        week_number: 53,
        status: 'free',
        student_id: null,
        notes: ''
      });
    }
  } catch (error) {
    // Woche 53 existiert nicht für dieses Jahr
  }
  
  log(`Generiert ${weeks.length} Wochen für Jahr ${year}`);
  return weeks;
}

// Seed-Daten für die Datenbank
async function seedDatabase() {
  log('Starte Seeding der Datenbank...');
  
  // Schulen hinzufügen
  const schools = [
    { id: 1, name: 'Pflegeschule Hamburg', contact_person: 'Frau Schmidt', phone: '040-123456', email: 'info@pflegeschule-hh.de' },
    { id: 2, name: 'Berufsschule für Pflege', contact_person: 'Herr Müller', phone: '040-654321', email: 'kontakt@bs-pflege.de' },
    { id: 3, name: 'Schule für Gesundheitsberufe', contact_person: 'Frau Weber', phone: '040-789012', email: 'info@gesundheitsschule.de' },
    { id: 4, name: 'Pflegeakademie Nord', contact_person: 'Herr Fischer', phone: '040-345678', email: 'akademie@pflege-nord.de' }
  ];
  
  // Betriebe hinzufügen
  const companies = [
    { id: 1, name: 'Kinderarztpraxis Holstein-Diepold', contact_person: 'Dr. Diepold', phone: '040-111111', email: 'praxis@kinderarzt-hh.de' },
    { id: 2, name: 'Klinikum Hamburg', contact_person: 'Frau Dr. Meyer', phone: '040-222222', email: 'kinderstation@klinikum-hh.de' },
    { id: 3, name: 'Kinderklinik Altona', contact_person: 'Herr Dr. Schulz', phone: '040-333333', email: 'info@kinderklinik-altona.de' },
    { id: 4, name: 'Praxis für Kinderheilkunde', contact_person: 'Dr. Wagner', phone: '040-444444', email: 'kontakt@kinderpraxis-hh.de' },
    { id: 5, name: 'Kinderarztpraxis Bergedorf', contact_person: 'Frau Dr. Hoffmann', phone: '040-555555', email: 'info@kinderarzt-bergedorf.de' }
  ];
  
  // Schülerinnen hinzufügen
  const students = [
    { id: 1, name: 'Anna Schmidt', school_id: 1, company_id: 1, phone: '0170-123456', email: 'anna.schmidt@email.de' },
    { id: 2, name: 'Lisa Müller', school_id: 2, company_id: 2, phone: '0170-234567', email: 'lisa.mueller@email.de' },
    { id: 3, name: 'Sarah Weber', school_id: 3, company_id: 3, phone: '0170-345678', email: 'sarah.weber@email.de' },
    { id: 4, name: 'Emma Fischer', school_id: 4, company_id: 4, phone: '0170-456789', email: 'emma.fischer@email.de' },
    { id: 5, name: 'Marie Hoffmann', school_id: 1, company_id: 5, phone: '0170-567890', email: 'marie.hoffmann@email.de' }
  ];
  
  // Wochen für alle Jahre 2026-2030 generieren
  const allWeeks = [];
  for (let year = 2026; year <= 2030; year++) {
    const yearWeeks = generateWeeksForYear(year);
    allWeeks.push(...yearWeeks);
  }
  
  // Daten in Datenbank schreiben
  db.data.schools = schools;
  db.data.companies = companies;
  db.data.students = students;
  db.data.weeks = allWeeks;
  
  await db.write();
  log(`Datenbank wurde mit Seed-Daten initialisiert:`);
  log(`- ${schools.length} Schulen`);
  log(`- ${companies.length} Betriebe`);
  log(`- ${students.length} Schülerinnen`);
  log(`- ${allWeeks.length} Wochen (Jahre 2026-2030)`);
}

// IPC Handler für Datenbankoperationen
ipcMain.handle('get-weeks', async (event, year) => {
  await db.read();
  return db.data.weeks.filter(w => w.year === year).sort((a, b) => a.week_number - b.week_number);
});

ipcMain.handle('get-all-weeks', async () => {
  await db.read();
  return db.data.weeks.sort((a, b) => a.year - b.year || a.week_number - b.week_number);
});

ipcMain.handle('update-week', async (event, weekData) => {
  await db.read();
  let week = db.data.weeks.find(w => w.year === weekData.year && w.week_number === weekData.week_number);
  if (week) {
    Object.assign(week, weekData);
  } else {
    db.data.weeks.push({ ...weekData, id: getNextId(db.data.weeks) });
  }
  await db.write();
  return weekData;
});

// Schulen CRUD
ipcMain.handle('get-schools', async () => {
  await db.read();
  return db.data.schools.sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle('add-school', async (event, school) => {
  await db.read();
  const id = getNextId(db.data.schools);
  const newSchool = { id, ...school };
  db.data.schools.push(newSchool);
  await db.write();
  return newSchool;
});

ipcMain.handle('update-school', async (event, school) => {
  await db.read();
  const idx = db.data.schools.findIndex(s => s.id === school.id);
  if (idx !== -1) db.data.schools[idx] = school;
  await db.write();
  return school;
});

ipcMain.handle('delete-school', async (event, schoolId) => {
  await db.read();
  db.data.schools = db.data.schools.filter(s => s.id !== schoolId);
  await db.write();
  return { deleted: true };
});

// Betriebe CRUD
ipcMain.handle('get-companies', async () => {
  await db.read();
  return db.data.companies.sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle('add-company', async (event, company) => {
  await db.read();
  const id = getNextId(db.data.companies);
  const newCompany = { id, ...company };
  db.data.companies.push(newCompany);
  await db.write();
  return newCompany;
});

ipcMain.handle('update-company', async (event, company) => {
  await db.read();
  const idx = db.data.companies.findIndex(c => c.id === company.id);
  if (idx !== -1) db.data.companies[idx] = company;
  await db.write();
  return company;
});

ipcMain.handle('delete-company', async (event, companyId) => {
  await db.read();
  db.data.companies = db.data.companies.filter(c => c.id !== companyId);
  await db.write();
  return { deleted: true };
});

// Schülerinnen CRUD
ipcMain.handle('get-students', async () => {
  await db.read();
  // Join für school_name und company_name
  return db.data.students.map(s => ({
    ...s,
    school_name: db.data.schools.find(sc => sc.id === s.school_id)?.name || null,
    company_name: db.data.companies.find(c => c.id === s.company_id)?.name || null
  })).sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle('add-student', async (event, student) => {
  await db.read();
  const id = getNextId(db.data.students);
  const newStudent = { id, ...student };
  db.data.students.push(newStudent);
  await db.write();
  return newStudent;
});

ipcMain.handle('update-student', async (event, student) => {
  await db.read();
  const idx = db.data.students.findIndex(s => s.id === student.id);
  if (idx !== -1) db.data.students[idx] = student;
  await db.write();
  return student;
});

ipcMain.handle('delete-student', async (event, studentId) => {
  await db.read();
  db.data.students = db.data.students.filter(s => s.id !== studentId);
  await db.write();
  return { deleted: true };
});

// Jahr hinzufügen/löschen
ipcMain.handle('add-year', async (event, year) => {
  await db.read();
  
  // Wenn kein Jahr angegeben, das nächste verfügbare Jahr finden
  if (!year) {
    const existingYears = [...new Set(db.data.weeks.map(w => w.year))].sort();
    year = existingYears.length > 0 ? Math.max(...existingYears) + 1 : 2026;
  }
  
  // Prüfen ob Jahr bereits existiert
  const existingWeeks = db.data.weeks.filter(w => w.year === year);
  if (existingWeeks.length > 0) {
    return { year, error: 'Jahr bereits vorhanden' };
  }
  
  // Tatsächliche Kalenderwochen für das Jahr generieren
  const newWeeks = generateWeeksForYear(year);
  
  // Neue Wochen zur Datenbank hinzufügen
  db.data.weeks.push(...newWeeks);
  await db.write();
  
  return { year, added: true, weeksCount: newWeeks.length };
});

ipcMain.handle('delete-year', async (event, year) => {
  await db.read();
  db.data.weeks = db.data.weeks.filter(w => w.year !== year);
  await db.write();
  return { year, deleted: true };
});

ipcMain.handle('get-week-details', async (event, year, weekNumber) => {
  await db.read();
  const week = db.data.weeks.find(w => w.year === year && w.week_number === weekNumber);
  if (!week) return null;
  const student = db.data.students.find(s => s.id === week.student_id);
  const school = student ? db.data.schools.find(sc => sc.id === student.school_id) : null;
  const company = student ? db.data.companies.find(c => c.id === student.company_id) : null;
  return {
    ...week,
    student_name: student?.name || null,
    school_name: school?.name || null,
    company_name: company?.name || null
  };
});

app.whenReady().then(async () => {
  try {
    log('App ist bereit, initialisiere Datenbank...');
    await initializeDatabase();
    log('Datenbank initialisiert, erstelle Fenster...');
    await createWindow();
    log('Fenster erstellt');

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    log('Fehler bei der App-Initialisierung:', error);
    app.quit();
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Globale Fehlerbehandlung
process.on('uncaughtException', (error) => {
  log('Unbehandelter Fehler:', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unbehandelte Promise-Ablehnung:', reason);
  app.quit();
}); 