# Dental Clinic Management System - Project Map

## [TECH_STACK]
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Routing**: wouter
- **State**: React Query + React Context (ClinicContext)
- **Storage**: IndexedDB (local, offline-first)
- **Data Format**: JSON export/import
- **Financial model**: Treatment rows plus patient-level payment transactions in IndexedDB

## [SYSTEM_FLOW]
- PatientFile stores treatment charges separately from payment transactions.
- Each transaction records received amount, discount, currency, date, and method (`direct`, `sham_cash`, or legacy `unknown`); PatientFile exposes a per-transaction payment-method selector.
- Income and monthly statistics sum received amounts only; discounts reduce outstanding balances but are not income.
- Logging uses asynchronous `info`/`warn`/`error` console delivery and excludes patient data.
- Outstanding balance per currency = treatment charges - received amounts - discounts. The outstanding page lists patients with a positive balance in either currency.
- Accounting's outstanding card opens the protected `/accounting/remaining` route; selecting a patient opens their file in a new tab.
- Legacy treatment `paidAmount` values migrate once to transactions with method `unknown`; old backups are normalized during import.

## [ARCHITECTURE]

### Pages (`/src/pages/`)
| Page | Route | Purpose |
|------|-------|---------|
| Login | `/` | Authentication (local) |
| Dashboard | `/dashboard` | Patient list, search, inactive patients |
| PatientFile | `/patient/:id` | Patient profile, treatments, tooth diagram |
| Appointments | `/appointments` | Appointment management |
| Accounting | `/accounting` | Income/expenses with dual-currency (USD/SYP) |
| OutstandingBalances | `/accounting/remaining` | Patients with open treatment balances |
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
- **IndexedDB**: `medicalDB` (v3)
- **Stores**: patients, deletedIds, appointments, expenses
- **Data Format Version**: 3 (FDI migration v2, payment transaction migration v3)
- **Patient payments**: embedded transaction list, included in the existing JSON export/import

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
- `createdAt`, `treatments[]`, `payments[]`, `toothNotes{}`, `dataFormatVersion?`

### TreatmentRow
- `toothNumber`, `diagnosis`, `treatmentAmount`, `date`, `currency?`
- Historical `paidAmount`/`remainingAmount` fields are retained only to migrate older records.

### PaymentTransaction
- `id`, `amount`, `discount`, `currency`, `date`, `method`
- `method`: `direct`, `sham_cash`, or `unknown` for legacy records

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
- IndexedDB schema is currently v3; format version is tracked separately.
- Data format v2: FDI tooth-number migration.
- Data format v3: legacy treatment payments migrated to patient transactions.

## [ORPHANS & PENDING]
- `Navbar` currently renders nested anchors through its route-link composition; this predates the payment changes and remains outside scope.
- Legacy transactions without a valid treatment date retain an empty date and are excluded from date-filtered income/statistics; their amounts still affect balances.
- Legacy payment method remains unknown because historical records did not store it.
- No remote logging or persistent activity log is added for payment transactions.
