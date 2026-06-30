// ============================================================
// قاعدة البيانات المحلية - IndexedDB
// تخزين جميع بيانات المرضى والمواعيد محلياً بدون إنترنت
// ============================================================

export interface TreatmentRow {
  toothNumber: string;
  diagnosis: string;
  treatmentAmount: string;
  paidAmount: string;
  remainingAmount: string;
  date: string;
  currency?: "USD" | "SYP"; // العملة: دولار أمريكي أو ليرة سورية
}

export interface Patient {
  id: number;
  name: string;
  gender: "male" | "female";
  birthDate: string;
  phone: string;
  address?: string;
  email?: string;
  chronicDiseases?: string;
  allergies?: string;
  notes?: string;
  createdAt: string;
  treatments: TreatmentRow[];
  toothNotes?: Record<string, string>; // ملاحظات الأسنان - نظام FDI (مثل "11", "36")
  dataFormatVersion?: number; // إصدار تنسيق البيانات (للترحيل)
}

export interface Appointment {
  id?: number;          // auto-increment
  patientId: number;
  patientName: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM
  notes: string;
  status: "pending" | "done" | "cancelled";
  createdAt: string;
}

export interface Expense {
  id?: number;          // auto-increment
  description: string;  // وصف المصروف
  amount: number;       // المبلغ
  currency: "USD" | "SYP"; // العملة
  date: string;         // YYYY-MM-DD
  category: string;     // رواتب / إيجار / مستلزمات / فواتير / أخرى
  createdAt: string;
}

const DB_NAME    = "medicalDB";
const DB_VERSION = 3;              // رُفع إلى 3 لإضافة مخزن المصاريف
const STORE_PATIENTS     = "patients";
const STORE_DELETED_IDS  = "deletedIds";
const STORE_APPOINTMENTS = "appointments";
const STORE_EXPENSES     = "expenses";

// فتح قاعدة البيانات
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PATIENTS)) {
        db.createObjectStore(STORE_PATIENTS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_DELETED_IDS)) {
        db.createObjectStore(STORE_DELETED_IDS, { keyPath: "id" });
      }

      // مخزن المواعيد — جديد في الإصدار 2
      if (!db.objectStoreNames.contains(STORE_APPOINTMENTS)) {
        const apptStore = db.createObjectStore(STORE_APPOINTMENTS, {
          keyPath: "id",
          autoIncrement: true,
        });
        apptStore.createIndex("date",      "date",      { unique: false });
        apptStore.createIndex("patientId", "patientId", { unique: false });
      }

      // مخزن المصاريف — جديد في الإصدار 3
      if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
        const expStore = db.createObjectStore(STORE_EXPENSES, {
          keyPath: "id",
          autoIncrement: true,
        });
        expStore.createIndex("date", "date", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(request.error);
  });
}

// ============================================================
// المرضى
// ============================================================

export async function getAllPatients(): Promise<Patient[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_PATIENTS, "readonly");
    const store = tx.objectStore(STORE_PATIENTS);
    const request = store.getAll();
    request.onsuccess = () => {
      const patients = (request.result as Patient[]).sort((a, b) => a.id - b.id);
      resolve(patients);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPatientById(id: number): Promise<Patient | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_PATIENTS, "readonly");
    const store = tx.objectStore(STORE_PATIENTS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as Patient | undefined);
    request.onerror   = () => reject(request.error);
  });
}

async function getDeletedIds(): Promise<number[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_DELETED_IDS, "readonly");
    const store = tx.objectStore(STORE_DELETED_IDS);
    const request = store.getAll();
    request.onsuccess = () => {
      const ids = (request.result as { id: number }[]).map((r) => r.id).sort((a, b) => a - b);
      resolve(ids);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function generateNewId(): Promise<number> {
  const deletedIds = await getDeletedIds();
  if (deletedIds.length > 0) return deletedIds[0];
  const patients = await getAllPatients();
  if (patients.length === 0) return 1;
  return Math.max(...patients.map((p) => p.id)) + 1;
}

export async function savePatient(patient: Patient): Promise<void> {
  const db = await openDB();

  const deletedIds = await getDeletedIds();
  if (deletedIds.includes(patient.id)) {
    await new Promise<void>((resolve, reject) => {
      const tx    = db.transaction(STORE_DELETED_IDS, "readwrite");
      const store = tx.objectStore(STORE_DELETED_IDS);
      const req   = store.delete(patient.id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_PATIENTS, "readwrite");
    const store = tx.objectStore(STORE_PATIENTS);
    const request = store.put(patient);
    request.onsuccess = () => resolve();
    request.onerror   = () => reject(request.error);
  });
}

export async function updatePatient(patient: Patient): Promise<void> {
  return savePatient(patient);
}

export async function deletePatient(id: number): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(STORE_PATIENTS, "readwrite");
    const store = tx.objectStore(STORE_PATIENTS);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(STORE_DELETED_IDS, "readwrite");
    const store = tx.objectStore(STORE_DELETED_IDS);
    const req   = store.put({ id });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function deletePatients(ids: number[]): Promise<void> {
  await Promise.all(ids.map((id) => deletePatient(id)));
}

// ============================================================
// المواعيد
// ============================================================

export async function getAllAppointments(): Promise<Appointment[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_APPOINTMENTS, "readonly");
    const store = tx.objectStore(STORE_APPOINTMENTS);
    const request = store.getAll();
    request.onsuccess = () => {
      const appts = (request.result as Appointment[]).sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        return dateCmp !== 0 ? dateCmp : a.time.localeCompare(b.time);
      });
      resolve(appts);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveAppointment(appt: Appointment): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_APPOINTMENTS, "readwrite");
    const store = tx.objectStore(STORE_APPOINTMENTS);
    const request = store.put(appt);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror   = () => reject(request.error);
  });
}

export async function deleteAppointment(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_APPOINTMENTS, "readwrite");
    const store = tx.objectStore(STORE_APPOINTMENTS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror   = () => reject(request.error);
  });
}

// ============================================================
// المصاريف
// ============================================================

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_EXPENSES, "readonly");
    const store = tx.objectStore(STORE_EXPENSES);
    const request = store.getAll();
    request.onsuccess = () => {
      const list = (request.result as Expense[]).sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveExpense(expense: Expense): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_EXPENSES, "readwrite");
    const store = tx.objectStore(STORE_EXPENSES);
    const request = store.put(expense);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror   = () => reject(request.error);
  });
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_EXPENSES, "readwrite");
    const store = tx.objectStore(STORE_EXPENSES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror   = () => reject(request.error);
  });
}

// ============================================================
// ترحيل بيانات الأسنان (FDI Quadrant Swap)
// ============================================================

export const DATA_FORMAT_VERSION = 2;
const DATA_VERSION_KEY = "dataFormatVersion";

export function checkDataVersion(): number {
  try {
    return parseInt(localStorage.getItem(DATA_VERSION_KEY) || "1", 10) || 1;
  } catch {
    return 1;
  }
}

function setDataVersion(v: number): void {
  try { localStorage.setItem(DATA_VERSION_KEY, String(v)); } catch { /* noop */ }
}

// تبديل الربع (Quadrant) لرقم السن وفقاً لنظام FDI
// 1↔2, 3↔4, 5↔6, 7↔8
export function swapQuadrant(toothNumber: string): string {
  if (!toothNumber) return toothNumber;
  const trimmed = toothNumber.trim();
  if (trimmed === "" || trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const rest  = trimmed.slice(1);
  const swapMap: Record<string, string> = {
    "1": "2", "2": "1",
    "3": "4", "4": "3",
    "5": "6", "6": "5",
    "7": "8", "8": "7",
  };
  const swapped = swapMap[first];
  if (!swapped) return trimmed;
  return swapped + rest;
}

// ترحيل جميع أرقام الأسنان في بيانات المرضى
export async function migratePatientToothNumbers(): Promise<number> {
  const patients = await getAllPatients();
  let migratedCount = 0;

  for (const patient of patients) {
    let changed = false;

    // ترحيل treatments
    const newTreatments = patient.treatments.map((row) => {
      if (row.toothNumber === "") return row;
      const swapped = swapQuadrant(row.toothNumber);
      if (swapped !== row.toothNumber) changed = true;
      return { ...row, toothNumber: swapped };
    });

    // ترحيل toothNotes
    let newToothNotes = patient.toothNotes;
    if (newToothNotes) {
      const entries = Object.entries(newToothNotes);
      const migratedEntries = entries.map(([key, val]) => {
        if (key === "") return [key, val] as const;
        const swapped = swapQuadrant(key);
        // إذا تغير المفتاح ننشئ زوجاً جديداً
        return [swapped, val] as const;
      });
      newToothNotes = Object.fromEntries(migratedEntries);
      // تحقق إن كان أي مفتاح تغير
      const keysChanged = migratedEntries.some(([newKey, _], i) => newKey !== entries[i][0]);
      if (keysChanged) changed = true;
    }

    if (changed) {
      await savePatient({ ...patient, treatments: newTreatments, toothNotes: newToothNotes });
      migratedCount++;
    }
  }

  setDataVersion(DATA_FORMAT_VERSION);
  return migratedCount;
}

// التحقق من وجود ترحيل معلّق وتنفيذه
export async function ensureDataMigration(): Promise<boolean> {
  const currentVersion = checkDataVersion();
  if (currentVersion >= DATA_FORMAT_VERSION) return false;
  const count = await migratePatientToothNumbers();
  console.log(`[Migration] تم ترحيل ${count} مريض إلى الإصدار ${DATA_FORMAT_VERSION}`);
  return count > 0;
}

// ============================================================
// أدوات مساعدة
// ============================================================

export async function exportData(): Promise<string> {
  const patients     = await getAllPatients();
  const deletedIds   = await getDeletedIds();
  const appointments = await getAllAppointments();
  const expenses     = await getAllExpenses();
  const data = { patients, deletedIds, appointments, expenses, exportDate: new Date().toISOString() };
  return JSON.stringify(data, null, 2);
}

export interface ImportResult {
  imported: number;
  skipped: number;
  conflicts: { id: number; name: string; reason: string }[];
}

export async function importData(jsonString: string): Promise<ImportResult> {
  const data = JSON.parse(jsonString);
  const importedPatients: Patient[] = data.patients || [];
  const existingPatients = await getAllPatients();

  const result: ImportResult = { imported: 0, skipped: 0, conflicts: [] };

  for (const patient of importedPatients) {
    const existingById   = existingPatients.find((p) => p.id === patient.id);
    const existingByName = existingPatients.find(
      (p) => p.name === patient.name && p.id === patient.id
    );

    if (existingByName) {
      result.skipped++;
      result.conflicts.push({ id: patient.id, name: patient.name, reason: "تكرار" });
      continue;
    }

    if (existingById) {
      result.conflicts.push({
        id: patient.id,
        name: patient.name,
        reason: `تعارض في الرقم مع ${existingById.name}`,
      });
      result.skipped++;
      continue;
    }

    await savePatient(patient);
    result.imported++;
  }

  return result;
}

export function formatId(id: number): string {
  return String(id).padStart(4, "0");
}

export function formatAmount(value: string): string {
  const num = parseAmount(value);
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("en-US");
}

export function parseAmount(value: string): number {
  const normalized = (value || "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[،٬,]/g, "");
  return parseFloat(normalized) || 0;
}

export function createEmptyTreatmentRows(count = 10): TreatmentRow[] {
  return Array.from({ length: count }, () => ({
    toothNumber: "",
    diagnosis: "",
    treatmentAmount: "",
    paidAmount: "",
    remainingAmount: "",
    date: "",
    currency: "SYP",
  }));
}

export function todayFormatted(): string {
  const d     = new Date();
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseFormattedDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

// تحويل YYYY-MM-DD إلى نص عربي جميل
export function formatDateAr(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const monthNames = [
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
  ];
  const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const date    = new Date(y, m - 1, d);
  return `${dayNames[date.getDay()]} ${d} ${monthNames[m - 1]} ${y}`;
}

// اليوم بصيغة YYYY-MM-DD
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
