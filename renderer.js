const { ipcRenderer } = require('electron');
const dayjs = require('dayjs');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

let currentYear = 2026;
let currentWeekData = {};
let schools = [];
let companies = [];
let students = [];
let pendingConfirmAction = null;

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    generateCalendar();
    setupEventListeners();
    showPage('calendar'); // Standardseite anzeigen
    
    // Jahre im Dropdown aktualisieren
    updateYearDropdown();
});

// Navigation
function showPage(pageName) {
    // Alle Seiten verstecken
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Aktive Navigation entfernen
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Gewünschte Seite anzeigen
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
    
    // Navigation markieren
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Daten laden wenn nötig
    if (pageName === 'students') {
        loadStudentsTable();
    } else if (pageName === 'schools') {
        loadSchoolsTable();
    } else if (pageName === 'companies') {
        loadCompaniesTable();
    }
}

// Tabellen laden
function loadStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const school = schools.find(s => s.id === student.school_id);
        const company = companies.find(c => c.id === student.company_id);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${school ? school.name : '-'}</td>
            <td>${company ? company.name : '-'}</td>
            <td>${student.phone || '-'}</td>
            <td>${student.email || '-'}</td>
            <td>
                <div class="flex gap-2">
                    <button onclick="editStudent(${student.id})" class="btn btn-sm btn-outline">Bearbeiten</button>
                    <button onclick="deleteStudent(${student.id})" class="btn btn-sm btn-error">Löschen</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadSchoolsTable() {
    const tbody = document.getElementById('schoolsTableBody');
    tbody.innerHTML = '';
    
    schools.forEach(school => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${school.name}</td>
            <td>${school.contact_person || '-'}</td>
            <td>${school.phone || '-'}</td>
            <td>${school.email || '-'}</td>
            <td>
                <div class="flex gap-2">
                    <button onclick="editSchool(${school.id})" class="btn btn-sm btn-outline">Bearbeiten</button>
                    <button onclick="deleteSchool(${school.id})" class="btn btn-sm btn-error">Löschen</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadCompaniesTable() {
    const tbody = document.getElementById('companiesTableBody');
    tbody.innerHTML = '';
    
    companies.forEach(company => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${company.name}</td>
            <td>${company.contact_person || '-'}</td>
            <td>${company.phone || '-'}</td>
            <td>${company.email || '-'}</td>
            <td>
                <div class="flex gap-2">
                    <button onclick="editCompany(${company.id})" class="btn btn-sm btn-outline">Bearbeiten</button>
                    <button onclick="deleteCompany(${company.id})" class="btn btn-sm btn-error">Löschen</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadData() {
    try {
        schools = await ipcRenderer.invoke('get-schools');
        companies = await ipcRenderer.invoke('get-companies');
        students = await ipcRenderer.invoke('get-students');
        await updateYearDropdown();
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
    }
}

async function loadWeekData() {
    try {
        const weeks = await ipcRenderer.invoke('get-weeks', currentYear);
        currentWeekData = {};
        weeks.forEach(week => {
            currentWeekData[week.week_number] = week;
        });
    } catch (error) {
        console.error('Fehler beim Laden der Wochen:', error);
    }
}

function generateCalendar() {
    const container = document.getElementById('calendarContainer');
    container.innerHTML = '';

    // Wochen des aktuellen Jahres sortieren
    const yearWeeks = Object.values(currentWeekData).sort((a, b) => a.week_number - b.week_number);
    
    if (yearWeeks.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'col-span-full text-center p-8';
        noDataDiv.innerHTML = `
            <div class="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Keine Wochen für ${currentYear} gefunden. Fügen Sie das Jahr hinzu.</span>
            </div>
        `;
        container.appendChild(noDataDiv);
        return;
    }

    // Wochen nach Monaten gruppieren
    const months = [
        { name: 'Januar', month: 1 },
        { name: 'Februar', month: 2 },
        { name: 'März', month: 3 },
        { name: 'April', month: 4 },
        { name: 'Mai', month: 5 },
        { name: 'Juni', month: 6 },
        { name: 'Juli', month: 7 },
        { name: 'August', month: 8 },
        { name: 'September', month: 9 },
        { name: 'Oktober', month: 10 },
        { name: 'November', month: 11 },
        { name: 'Dezember', month: 12 }
    ];

    months.forEach(month => {
        // Wochen für diesen Monat finden
        const monthWeeks = yearWeeks.filter(week => {
            const weekStart = dayjs().year(currentYear).isoWeek(week.week_number).startOf('isoWeek');
            return weekStart.month() === month.month - 1;
        });

        if (monthWeeks.length === 0) return; // Monat überspringen wenn keine Wochen

        const monthCard = document.createElement('div');
        monthCard.className = 'card bg-base-200 shadow-xl border-t-4 border-primary';
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-4';
        
        const header = document.createElement('h2');
        header.className = 'card-title text-primary text-center w-full mb-4';
        header.textContent = month.name;
        cardBody.appendChild(header);

        const weeksList = document.createElement('div');
        weeksList.className = 'space-y-1';

        monthWeeks.forEach(week => {
            const weekItem = createWeekListItem(week.week_number);
            weeksList.appendChild(weekItem);
        });

        cardBody.appendChild(weeksList);
        monthCard.appendChild(cardBody);
        container.appendChild(monthCard);
    });
}

function createWeekListItem(weekNumber) {
    const weekItem = document.createElement('div');
    weekItem.className = 'flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-base-300 transition-all duration-200 bg-base-100 shadow-sm';
    weekItem.setAttribute('data-week', weekNumber);
    
    const weekData = currentWeekData[weekNumber] || { status: 'free' };
    
    // Status-basierte Farben für den Status-Badge
    let statusClass = 'badge badge-neutral';
    let statusText = 'Frei';
    if (weekData.status === 'free') {
        statusClass = 'badge badge-success';
        statusText = 'Frei';
    } else if (weekData.status === 'booked') {
        statusClass = 'badge badge-error';
        statusText = 'Belegt';
    } else if (weekData.status === 'vacation') {
        statusClass = 'badge badge-warning';
        statusText = 'Urlaub';
    }
    
    // Linke Seite: Woche und Datum
    const leftSide = document.createElement('div');
    leftSide.className = 'flex items-center space-x-3';
    
    const weekInfo = document.createElement('div');
    weekInfo.className = 'flex flex-col';
    
    const weekNumberDiv = document.createElement('div');
    weekNumberDiv.className = 'font-bold text-base';
    weekNumberDiv.textContent = `KW ${weekNumber}`;
    weekInfo.appendChild(weekNumberDiv);
    
    const datesDiv = document.createElement('div');
    datesDiv.className = 'text-sm text-base-content/70';
    datesDiv.textContent = getWeekDates(currentYear, weekNumber);
    weekInfo.appendChild(datesDiv);
    
    leftSide.appendChild(weekInfo);
    
    // Rechte Seite: Details und Status
    const rightSide = document.createElement('div');
    rightSide.className = 'flex items-center space-x-3';
    
    // Details für belegte Wochen (links vom Status)
    if (weekData.status === 'booked') {
        const student = students.find(s => s.id === weekData.student_id);
        if (student) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'text-right';
            
            const studentDiv = document.createElement('div');
            studentDiv.className = 'font-medium text-sm';
            studentDiv.textContent = student.name;
            detailsDiv.appendChild(studentDiv);
            
            const school = schools.find(s => s.id === student.school_id);
            if (school) {
                const schoolDiv = document.createElement('div');
                schoolDiv.className = 'text-xs text-base-content/70';
                schoolDiv.textContent = school.name;
                detailsDiv.appendChild(schoolDiv);
            }
            
            rightSide.appendChild(detailsDiv);
        }
    }
    
    // Status Badge (immer ganz rechts)
    const statusBadge = document.createElement('div');
    statusBadge.className = statusClass;
    statusBadge.textContent = statusText;
    rightSide.appendChild(statusBadge);
    
    weekItem.appendChild(leftSide);
    weekItem.appendChild(rightSide);
    
    weekItem.addEventListener('click', () => openWeekModal(weekNumber));
    weekItem.addEventListener('dblclick', () => markWeekBlock(weekNumber));
    
    return weekItem;
}

function getWeekDates(year, weekNumber) {
    // Korrekte Wochenberechnung mit dayjs
    const startOfYear = dayjs(year, 'YYYY').startOf('year');
    const firstWeekOfYear = startOfYear.isoWeek();
    
    let targetDate;
    if (firstWeekOfYear === 1) {
        // Jahr beginnt mit KW 1
        targetDate = startOfYear.add((weekNumber - 1) * 7, 'day');
    } else {
        // Jahr beginnt mit KW 52/53 des Vorjahres
        targetDate = startOfYear.add((weekNumber - 1) * 7, 'day');
    }
    
    // Montag der Woche finden
    const monday = targetDate.startOf('isoWeek');
    const sunday = monday.add(6, 'day');
    
    return `${monday.format('DD.MM')}-${sunday.format('DD.MM')}`;
}

async function markWeekBlock(startWeek) {
    const allWeeks = document.querySelectorAll('.week');
    const startIndex = Array.from(allWeeks).findIndex(w => w.getAttribute('data-week') == startWeek);
    
    try {
        // 4 Wochen als belegt markieren
        for (let i = startIndex; i < startIndex + 4 && i < allWeeks.length; i++) {
            const weekNumber = parseInt(allWeeks[i].getAttribute('data-week'));
            const weekData = {
                year: currentYear,
                week_number: weekNumber,
                status: 'booked',
                student_id: null,
                notes: ''
            };
            await ipcRenderer.invoke('update-week', weekData);
        }
        
        // Daten neu laden und Kalender aktualisieren
        await loadData();
        generateCalendar();
    } catch (error) {
        console.error('Fehler beim Markieren der Wochen:', error);
        alert('Fehler beim Markieren der Wochen');
    }
}

function setupEventListeners() {
    // Status-Änderung
    document.getElementById('weekStatus').addEventListener('change', function() {
        const status = this.value;
        const bookingFields = document.getElementById('bookingFields');
        
        if (status === 'booked') {
            bookingFields.style.display = 'block';
        } else {
            bookingFields.style.display = 'none';
        }
    });
}

async function openWeekModal(weekNumber) {
    const modal = document.getElementById('weekModal');
    const modalTitle = document.getElementById('modalTitle');
    const weekStatus = document.getElementById('weekStatus');
    const studentSelect = document.getElementById('studentSelect');
    const weekNotes = document.getElementById('weekNotes');

    modalTitle.textContent = `Woche ${weekNumber} bearbeiten`;
    
    // Aktuelle Daten laden
    const weekData = currentWeekData[weekNumber] || { status: 'free' };
    weekStatus.value = weekData.status;
    weekNotes.value = weekData.notes || '';

    // Dropdowns befüllen
    populateStudentSelect(studentSelect, weekData.student_id);

    // Status-Änderung auslösen
    const event = new Event('change');
    weekStatus.dispatchEvent(event);

    modal.setAttribute('data-week', weekNumber);
    modal.showModal();
}

function populateStudentSelect(select, selectedId) {
    select.innerHTML = '<option value="">Bitte wählen...</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (${student.school_name || 'Keine Schule'})`;
        // Korrekte Typenvergleiche für selectedId
        if (student.id === parseInt(selectedId)) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

async function saveWeek() {
    const modal = document.getElementById('weekModal');
    const weekNumber = parseInt(modal.getAttribute('data-week'));
    const status = document.getElementById('weekStatus').value;
    const studentId = document.getElementById('studentSelect').value;
    const notes = document.getElementById('weekNotes').value;

    // Korrekte Typen für student_id
    const studentIdInt = studentId ? parseInt(studentId) : null;

    const weekData = {
        year: currentYear,
        week_number: weekNumber,
        status: status,
        student_id: studentIdInt,
        notes: notes
    };

    try {
        await ipcRenderer.invoke('update-week', weekData);
        // Daten neu laden und Kalender aktualisieren
        await loadData();
        generateCalendar();
        closeModal();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern der Woche');
    }
}

function closeModal() {
    document.getElementById('weekModal').close();
}

// Jahr hinzufügen/löschen
async function addYear() {
    try {
        // Nächstes Jahr berechnen
        const yearSelector = document.getElementById('yearSelector');
        const existingYears = Array.from(yearSelector.options).map(opt => parseInt(opt.value)).sort();
        const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : 2026;
        
        const result = await ipcRenderer.invoke('add-year', nextYear);
        if (result.error) {
            alert(result.error);
            return;
        }
        
        // Jahr zum Dropdown hinzufügen
        const option = document.createElement('option');
        option.value = result.year;
        option.textContent = result.year;
        yearSelector.appendChild(option);
        
        // Daten neu laden und Kalender aktualisieren
        await loadData();
        generateCalendar();
        
        // Button-Text aktualisieren
        updateAddYearButtonText();
        
        alert(`Jahr ${result.year} wurde mit ${result.weeksCount} Wochen hinzugefügt`);
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Jahres:', error);
        alert('Fehler beim Hinzufügen des Jahres');
    }
}



// Schülerinnen CRUD
function addNewStudent(selectedSchoolId = null, selectedCompanyId = null) {
    document.getElementById('studentModalTitle').textContent = 'Neue Schülerin hinzufügen';
    document.getElementById('editStudentId').value = '';
    clearStudentForm();
    populateSchoolSelect(selectedSchoolId);
    populateCompanySelect(selectedCompanyId);
    document.getElementById('studentModal').showModal();
}

function populateSchoolSelect(selectedId = null) {
    const select = document.getElementById('newStudentSchool');
    select.innerHTML = '<option value="">Bitte wählen...</option>';
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.name;
        // Korrekte Typenvergleiche für selectedId
        if (selectedId && school.id === parseInt(selectedId)) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function populateCompanySelect(selectedId = null) {
    const select = document.getElementById('newStudentCompany');
    select.innerHTML = '<option value="">Bitte wählen...</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        // Korrekte Typenvergleiche für selectedId
        if (selectedId && company.id === parseInt(selectedId)) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

async function saveStudent() {
    const editId = document.getElementById('editStudentId').value;
    const name = document.getElementById('newStudentName').value;
    let schoolId = document.getElementById('newStudentSchool').value;
    let companyId = document.getElementById('newStudentCompany').value;
    const phone = document.getElementById('newStudentPhone').value;
    const email = document.getElementById('newStudentEmail').value;

    if (!name) {
        alert('Bitte geben Sie einen Namen ein');
        return;
    }

    // Korrekte Typen für IDs
    schoolId = schoolId ? parseInt(schoolId) : null;
    companyId = companyId ? parseInt(companyId) : null;

    const studentData = {
        name, 
        school_id: schoolId, 
        company_id: companyId,
        phone, 
        email
    };

    try {
        let newStudentId;
        if (editId) {
            studentData.id = parseInt(editId);
            await ipcRenderer.invoke('update-student', studentData);
            newStudentId = parseInt(editId);
        } else {
            const newStudent = await ipcRenderer.invoke('add-student', studentData);
            newStudentId = newStudent.id;
        }
        
        // Daten neu laden und Kalender aktualisieren
        await loadData();
        generateCalendar();
        
        // Schülerinnen-Modal schließen
        closeStudentModal();
        
        // Neue Schülerin in allen relevanten Selects vorauswählen
        // Schülerinnen-Select nur aktualisieren, wenn das Wochen-Modal offen ist
        const weekModal = document.getElementById('weekModal');
        if (weekModal.open) {
            populateStudentSelect(document.getElementById('studentSelect'), newStudentId);
        }
        // Tabellen neu laden
        loadStudentsTable();
    } catch (error) {
        console.error('Fehler beim Speichern der Schülerin:', error);
        alert('Fehler beim Speichern der Schülerin');
    }
}

function clearStudentForm() {
    document.getElementById('newStudentName').value = '';
    document.getElementById('newStudentSchool').value = '';
    document.getElementById('newStudentCompany').value = '';
    document.getElementById('newStudentPhone').value = '';
    document.getElementById('newStudentEmail').value = '';
}

function closeStudentModal() {
    document.getElementById('studentModal').close();
    clearStudentForm();
}

// Schulen CRUD
function addNewSchool(selectedStudentId = null) {
    document.getElementById('schoolModalTitle').textContent = 'Neue Schule hinzufügen';
    document.getElementById('editSchoolId').value = '';
    clearSchoolForm();
    // Schülerinnen-Modal nur schließen, wenn es offen ist
    const studentModal = document.getElementById('studentModal');
    if (!studentModal.open) {
        studentModal.close();
    }
    document.getElementById('schoolModal').showModal();
}

async function saveSchool() {
    const editId = document.getElementById('editSchoolId').value;
    const name = document.getElementById('newSchoolName').value;
    const contact = document.getElementById('newSchoolContact').value;
    const phone = document.getElementById('newSchoolPhone').value;
    const email = document.getElementById('newSchoolEmail').value;

    if (!name) {
        alert('Bitte geben Sie einen Namen ein');
        return;
    }

    const schoolData = {
        name, 
        contact_person: contact, 
        phone, 
        email
    };

    try {
        let newSchoolId;
        if (editId) {
            schoolData.id = parseInt(editId);
            await ipcRenderer.invoke('update-school', schoolData);
            newSchoolId = parseInt(editId);
        } else {
            const newSchool = await ipcRenderer.invoke('add-school', schoolData);
            newSchoolId = newSchool.id;
        }
        
        // Daten neu laden und Kalender aktualisieren
        await loadData();
        generateCalendar();
        
        // Schule-Modal schließen
        closeSchoolModal();
        
        // Neue Schule in allen relevanten Selects vorauswählen
        populateSchoolSelect(newSchoolId);
        // Schülerinnen-Select nur aktualisieren, wenn das Wochen-Modal offen ist
        const weekModal = document.getElementById('weekModal');
        if (weekModal.open) {
            populateStudentSelect(document.getElementById('studentSelect'));
        }
        // Tabellen neu laden
        loadSchoolsTable();
    } catch (error) {
        console.error('Fehler beim Speichern der Schule:', error);
        alert('Fehler beim Speichern der Schule');
    }
}

function clearSchoolForm() {
    document.getElementById('newSchoolName').value = '';
    document.getElementById('newSchoolContact').value = '';
    document.getElementById('newSchoolPhone').value = '';
    document.getElementById('newSchoolEmail').value = '';
}

function closeSchoolModal() {
    document.getElementById('schoolModal').close();
    clearSchoolForm();
}

// Betriebe CRUD
function addNewCompany(selectedStudentId = null) {
    document.getElementById('companyModalTitle').textContent = 'Neuen Betrieb hinzufügen';
    document.getElementById('editCompanyId').value = '';
    clearCompanyForm();
    // Schülerinnen-Modal nur schließen, wenn es offen ist
    const studentModal = document.getElementById('studentModal');
    if (!studentModal.open) {
        studentModal.close();
    }
    document.getElementById('companyModal').showModal();
}

async function saveCompany() {
    const editId = document.getElementById('editCompanyId').value;
    const name = document.getElementById('newCompanyName').value;
    const contact = document.getElementById('newCompanyContact').value;
    const phone = document.getElementById('newCompanyPhone').value;
    const email = document.getElementById('newCompanyEmail').value;

    if (!name) {
        alert('Bitte geben Sie einen Namen ein');
        return;
    }

    const companyData = {
        name, 
        contact_person: contact, 
        phone, 
        email
    };

    try {
        let newCompanyId;
        if (editId) {
            companyData.id = parseInt(editId);
            await ipcRenderer.invoke('update-company', companyData);
            newCompanyId = parseInt(editId);
        } else {
            const newCompany = await ipcRenderer.invoke('add-company', companyData);
            newCompanyId = newCompany.id;
        }
        
        // Daten neu laden und Kalender aktualisieren
        await loadData();
        generateCalendar();
        
        // Betrieb-Modal schließen
        closeCompanyModal();
        
        // Neuen Betrieb in allen relevanten Selects vorauswählen
        populateCompanySelect(newCompanyId);
        // Schülerinnen-Select nur aktualisieren, wenn das Wochen-Modal offen ist
        const weekModal = document.getElementById('weekModal');
        if (weekModal.open) {
            populateStudentSelect(document.getElementById('studentSelect'));
        }
        // Tabellen neu laden
        loadCompaniesTable();
    } catch (error) {
        console.error('Fehler beim Speichern des Betriebs:', error);
        alert('Fehler beim Speichern des Betriebs');
    }
}

function clearCompanyForm() {
    document.getElementById('newCompanyName').value = '';
    document.getElementById('newCompanyContact').value = '';
    document.getElementById('newCompanyPhone').value = '';
    document.getElementById('newCompanyEmail').value = '';
}

function closeCompanyModal() {
    document.getElementById('companyModal').close();
    clearCompanyForm();
}

// Listen-Modals
function openSchoolsModal() {
    document.getElementById('schoolsListModal').style.display = 'block';
    loadSchoolsList();
}

function closeSchoolsListModal() {
    document.getElementById('schoolsListModal').style.display = 'none';
}

function loadSchoolsList() {
    const container = document.getElementById('schoolsList');
    container.innerHTML = '';
    
    schools.forEach(school => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${school.name}</div>
                <div class="list-item-details">
                    ${school.contact_person ? `Kontakt: ${school.contact_person}` : ''}
                    ${school.phone ? ` | Tel: ${school.phone}` : ''}
                    ${school.email ? ` | E-Mail: ${school.email}` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button onclick="editSchool(${school.id})" class="btn-edit">Bearbeiten</button>
                <button onclick="deleteSchool(${school.id})" class="btn-delete">Löschen</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function editSchool(schoolId) {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
        document.getElementById('schoolModalTitle').textContent = 'Schule bearbeiten';
        document.getElementById('editSchoolId').value = school.id;
        document.getElementById('newSchoolName').value = school.name;
        document.getElementById('newSchoolContact').value = school.contact_person || '';
        document.getElementById('newSchoolPhone').value = school.phone || '';
        document.getElementById('newSchoolEmail').value = school.email || '';
        document.getElementById('schoolModal').showModal();
    }
}

async function deleteSchool(schoolId) {
    if (confirm('Möchten Sie diese Schule wirklich löschen?')) {
        try {
            await ipcRenderer.invoke('delete-school', schoolId);
            // Daten neu laden und Kalender aktualisieren
            await loadData();
            generateCalendar();
            loadSchoolsTable();
        } catch (error) {
            console.error('Fehler beim Löschen der Schule:', error);
            alert('Fehler beim Löschen der Schule');
        }
    }
}

function openCompaniesModal() {
    document.getElementById('companiesListModal').style.display = 'block';
    loadCompaniesList();
}

function closeCompaniesListModal() {
    document.getElementById('companiesListModal').style.display = 'none';
}

function loadCompaniesList() {
    const container = document.getElementById('companiesList');
    container.innerHTML = '';
    
    companies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${company.name}</div>
                <div class="list-item-details">
                    ${company.contact_person ? `Kontakt: ${company.contact_person}` : ''}
                    ${company.phone ? ` | Tel: ${company.phone}` : ''}
                    ${company.email ? ` | E-Mail: ${company.email}` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button onclick="editCompany(${company.id})" class="btn-edit">Bearbeiten</button>
                <button onclick="deleteCompany(${company.id})" class="btn-delete">Löschen</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function editCompany(companyId) {
    const company = companies.find(c => c.id === companyId);
    if (company) {
        document.getElementById('companyModalTitle').textContent = 'Betrieb bearbeiten';
        document.getElementById('editCompanyId').value = company.id;
        document.getElementById('newCompanyName').value = company.name;
        document.getElementById('newCompanyContact').value = company.contact_person || '';
        document.getElementById('newCompanyPhone').value = company.phone || '';
        document.getElementById('newCompanyEmail').value = company.email || '';
        document.getElementById('companyModal').showModal();
    }
}

async function deleteCompany(companyId) {
    if (confirm('Möchten Sie diesen Betrieb wirklich löschen?')) {
        try {
            await ipcRenderer.invoke('delete-company', companyId);
            // Daten neu laden und Kalender aktualisieren
            await loadData();
            generateCalendar();
            loadCompaniesTable();
        } catch (error) {
            console.error('Fehler beim Löschen des Betriebs:', error);
            alert('Fehler beim Löschen des Betriebs');
        }
    }
}

function openStudentsModal() {
    document.getElementById('studentsListModal').style.display = 'block';
    loadStudentsList();
}

function closeStudentsListModal() {
    document.getElementById('studentsListModal').style.display = 'none';
}

function loadStudentsList() {
    const container = document.getElementById('studentsList');
    container.innerHTML = '';
    
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${student.name}</div>
                <div class="list-item-details">
                    Schule: ${student.school_name || 'Keine Schule'}
                    ${student.company_name ? ` | Betrieb: ${student.company_name}` : ''}
                    ${student.phone ? ` | Tel: ${student.phone}` : ''}
                    ${student.email ? ` | E-Mail: ${student.email}` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button onclick="editStudent(${student.id})" class="btn-edit">Bearbeiten</button>
                <button onclick="deleteStudent(${student.id})" class="btn-delete">Löschen</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function editStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (student) {
        document.getElementById('studentModalTitle').textContent = 'Schülerin bearbeiten';
        document.getElementById('editStudentId').value = student.id;
        document.getElementById('newStudentName').value = student.name;
        // Erst Selects befüllen, dann Wert setzen
        populateSchoolSelect(student.school_id);
        populateCompanySelect(student.company_id);
        document.getElementById('newStudentSchool').value = student.school_id || '';
        document.getElementById('newStudentCompany').value = student.company_id || '';
        document.getElementById('newStudentPhone').value = student.phone || '';
        document.getElementById('newStudentEmail').value = student.email || '';
        document.getElementById('studentModal').showModal();
    }
}

async function deleteStudent(studentId) {
    if (confirm('Möchten Sie diese Schülerin wirklich löschen?')) {
        try {
            await ipcRenderer.invoke('delete-student', studentId);
            // Daten neu laden und Kalender aktualisieren
            await loadData();
            generateCalendar();
            loadStudentsTable();
        } catch (error) {
            console.error('Fehler beim Löschen der Schülerin:', error);
            alert('Fehler beim Löschen der Schülerin');
        }
    }
}

function addNewSchoolFromList() {
    addNewSchool();
}

function addNewCompanyFromList() {
    addNewCompany();
}

function addNewStudentFromList() {
    addNewStudent();
}

// Jahr ändern
async function updateYear() {
    currentYear = parseInt(document.getElementById('yearSelector').value);
    await loadWeekData();
    generateCalendar();
}

// Jahre im Dropdown aktualisieren
async function updateYearDropdown() {
    const yearSelector = document.getElementById('yearSelector');
    
    // Alle verfügbaren Jahre aus der Datenbank holen
    const allWeeks = await ipcRenderer.invoke('get-all-weeks');
    const existingYears = [...new Set(allWeeks.map(w => w.year))].sort();
    
    // Dropdown leeren
    yearSelector.innerHTML = '';
    
    // Verfügbare Jahre hinzufügen
    existingYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelector.appendChild(option);
    });
    
    // Aktuelles Jahr auswählen
    if (existingYears.length > 0) {
        currentYear = existingYears[0];
        yearSelector.value = currentYear;
        // Wochen für das ausgewählte Jahr laden
        await loadWeekData();
        generateCalendar();
    }
    
    // Button-Text aktualisieren
    updateAddYearButtonText();
}

function updateAddYearButtonText() {
    const yearSelector = document.getElementById('yearSelector');
    const addYearButton = document.getElementById('addYearButton');
    
    if (yearSelector && addYearButton) {
        const existingYears = Array.from(yearSelector.options).map(opt => parseInt(opt.value)).sort();
        const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : 2026;
        
        const buttonText = addYearButton.querySelector('span') || addYearButton.lastChild;
        if (buttonText && buttonText.nodeType === Node.TEXT_NODE) {
            buttonText.textContent = `Jahr ${nextYear} hinzufügen`;
        }
    }
} 