# Anforderungen für die Migration: Pflegeplaner zu Nuxt (Nuxthub)

## Projektüberblick

Der Pflegeplaner ist eine Webanwendung zur Verwaltung von Pflegepraktikantinnen und deren Wochenplanung in einer Kinderarztpraxis. Die App bietet eine Kalenderansicht, Verwaltung von Schülerinnen, Pflegeschulen und Betrieben. Ziel ist es, die Anwendung als moderne Web-App mit Nuxt (Nuxthub) neu zu implementieren.

---

## Zielgruppe
- Praxispersonal (z.B. Verwaltung, Ärzte)

---

## Kernfunktionen

1. **Kalenderansicht (Jahres-/Wochenplaner)**
   - Übersicht aller Wochen eines Jahres
   - Status pro Woche: "Frei", "Belegt" (mit Schülerin), "Urlaub"
   - Details zu belegten Wochen (Schülerin, Schule, Betrieb, Notizen)
   - Jahr hinzufügen/löschen

2. **Schülerinnen-Verwaltung**
   - Anlegen, Bearbeiten, Löschen von Schülerinnen
   - Zuordnung zu Pflegeschule und Betrieb
   - Kontaktdaten (Telefon, E-Mail)

3. **Pflegeschulen-Verwaltung**
   - Anlegen, Bearbeiten, Löschen von Schulen
   - Ansprechpartner, Kontaktdaten

4. **Betriebe-Verwaltung**
   - Anlegen, Bearbeiten, Löschen von Betrieben
   - Ansprechpartner, Kontaktdaten

5. **Notizen**
   - Pro Woche können Notizen hinterlegt werden

6. **Dark Mode**
   - Umschaltbar (optional, aber gewünscht)

---

## Datenmodell (Entitäten)

### Schülerin (Student)
- id: number
- name: string
- school_id: number | null
- company_id: number | null
- phone: string | null
- email: string | null

### Pflegeschule (School)
- id: number
- name: string
- contact_person: string | null
- phone: string | null
- email: string | null

### Betrieb (Company)
- id: number
- name: string
- contact_person: string | null
- phone: string | null
- email: string | null

### Woche (Week)
- id: number
- year: number
- week_number: number (1-52/53)
- status: 'free' | 'booked' | 'vacation'
- student_id: number | null
- notes: string | null

---

## Beziehungen
- Eine Schülerin gehört zu einer Schule und einem Betrieb (optional)
- Eine Woche kann einer Schülerin zugeordnet sein (wenn status = 'booked')

---

## Technische Anforderungen
- **Frontend:** Nuxt 3 (Vue 3, Composition API)
- **UI:** NuxtUi
- **Datenhaltung:** Über Nuxthub SQL Database
- **Deployment:** Nuxthub
- **Sprache:** Deutsch
- **Responsives Design**

---

## Zusätzliche Hinweise
- Die App soll einfach, übersichtlich und für nicht-technische Nutzer:innen verständlich sein
- Das Datenmodell kann bei Bedarf erweitert werden (z.B. Felder für Praktikumszeitraum, Statushistorie)

---

**Diese Datei dient als Grundlage für die Neuimplementierung mit Nuxt auf Nuxthub.** 