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
| ToothDiagram | FDI tooth map (corrected Q1↔Q2, Q3↔Q4) |
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

## Database Version History
- v1: Initial - patients + deletedIds
- v2: Added appointments store
- v3: Added expenses store
- v4: Added `dataFormatVersion` field support + FDI migration
