# Dental Clinic Management System - Project Map

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Routing**: wouter
- **State**: React Query + React Context (ClinicContext)
- **Storage**: IndexedDB (local, offline-first)
- **Data Format**: JSON export/import

## Architecture

### Pages (`/src/pages/`)
| Page | Route | Purpose |
|------|-------|---------|
| Login | `/` | Authentication (local) |
| Dashboard | `/dashboard` | Patient list, search, inactive patients |
| PatientFile | `/patient/:id` | Patient profile, treatments, tooth diagram |
| Appointments | `/appointments` | Appointment management |
| Accounting | `/accounting` | Income/expenses with dual-currency (USD/SYP) |
| Statistics | `/statistics` | Charts, activity log |
| Admin | `/admin` | Backup/restore, password change |

### Components (`/src/components/`)
| Component | Purpose |
|-----------|---------|
| Navbar | Navigation with today's count + Quick Appointment button |
| Logo | Animated logo (hides on scroll) |
| ToothDiagram | FDI tooth map wrapper (uses SVG charts internally) |
| AdultDentalChart | SVG interactive 32-tooth chart (permanent, FDI 11-48) |
| ChildDentalChart | SVG interactive 20-tooth chart (primary, FDI 51-85) |
| NewPatientModal | Create new patient |
| AppointmentModal | Quick appointment booking (floating) |
| ConfirmDialog | Delete/cancel confirmation |
| FieldGroup | Form field wrapper |
| Toast | Notification system |

### Data Layer (`/src/lib/db.ts`)
- **IndexedDB**: `medicalDB` (v4)
- **Stores**: patients, deletedIds, appointments, expenses
- **Data Format Version**: 2 (with migration from v1)

### Context (`/src/lib/clinic-context.tsx`)
- Active patient tracking (for appointment auto-fill)
- Booking modal state management

### Hooks (`/src/hooks/`)
- `use-auto-save.ts` - localStorage draft saving with debounce
- `use-toast.ts` - Toast notifications
- `use-mobile.tsx` - Mobile detection

## Recent Changes (v2.0)

### 1. Dental Numbering Correction (FDI)
- **`ToothDiagram.tsx`**: Swapped UPPER_RIGHT↔UPPER_LEFT, LOWER_RIGHT↔LOWER_LEFT arrays for correct anatomical display in RTL
- **`db.ts`**: Added `swapQuadrant()`, `migratePatientToothNumbers()`, `ensureDataMigration()` - swaps Q1↔Q2, Q3↔Q4, Q5↔Q6, Q7↔Q8
- **`App.tsx`**: Runs migration on startup with loading screen
- **Versioning**: DATA_FORMAT_VERSION=2, stored in localStorage + patient field

### 2. Dual-Currency Accounting (USD/SYP)
- **`db.ts`**: Added `currency: "USD" | "SYP"` to `TreatmentRow` and `Expense`
- **`PatientFile.tsx`**: Currency dropdown per treatment row, dual totals (USD+SYP)
- **`Accounting.tsx`**: Currency selector in expense forms, dual-currency totals and per-line display
- **`Statistics.tsx`**: Dual-currency summary cards, separate USD/SYP charts

### 3. Floating Appointment Modal
- **`clinic-context.tsx`**: Global state for active patient + booking modal
- **`AppointmentModal.tsx`**: Reusable floating modal with patient search, date/time, auto-fill
- **`Navbar.tsx`**: "حجز موعد" button to open modal from any page
- **`PatientFile.tsx`**: "حجز موعد" button in header with auto-fill current patient

### 4. Global Auto-Save
- **`use-auto-save.ts`**: Custom hook for localStorage draft persistence
- **`Accounting.tsx`**: Auto-saves expense form drafts
- **`AppointmentModal.tsx`**: Auto-saves appointment drafts
- **`PatientFile.tsx`**: Existing auto-save (1s debounce after any change)

## Data Model

### Patient
- `id`, `name`, `gender`, `birthDate`, `phone`, `address`, `email`
- `chronicDiseases`, `allergies`, `notes`
- `createdAt`, `treatments[]`, `toothNotes{}`, `dataFormatVersion?`

### TreatmentRow
- `toothNumber`, `diagnosis`, `treatmentAmount`, `paidAmount`, `remainingAmount`, `date`, `currency?`

### Appointment
- `id?`, `patientId`, `patientName`, `date`, `time`, `notes`, `status`, `createdAt`

### Expense
- `id?`, `description`, `amount`, `currency`, `date`, `category`, `createdAt`

## Recent Changes (v2.1)

### 5. SVG-Based Interactive Dental Charts
- **`AdultDentalChart.tsx`**: New SVG component rendering 32 permanent teeth (FDI 11-18, 21-28, 31-38, 41-48) in a U-shaped arch. Each tooth is a clickable SVG `<path>` with distinct shapes for incisors, canines, premolars, and molars. Supports `onToothSelect`, `onHover`, `selectedTooth`, and color/stroke overrides.
- **`ChildDentalChart.tsx`**: New SVG component for 20 primary teeth (FDI 51-55, 61-65, 71-75, 81-85). Same interactive features as adult chart.
- **`ToothDiagram.tsx`**: Refactored to delegate rendering to `AdultDentalChart`/`ChildDentalChart` via new `isChild` prop, while preserving all existing note-editing and color-legend behavior.
- **`PatientFile.tsx`**: Added "طفل" checkbox in the tooth diagram section header to toggle between child/adult chart.

## Database Version History
- v1: Initial - patients + deletedIds
- v2: Added appointments store
- v3: Added expenses store
- v4: Added `dataFormatVersion` field support + FDI migration
