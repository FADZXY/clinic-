// ============================================================
// صفحة المواعيد — حجز وعرض وإدارة مواعيد المرضى
// ============================================================
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Navbar from "../components/Navbar";
import { ToastContainer, showToast } from "../components/Toast";
import { useAutoSave } from "../hooks/use-auto-save";
import {
  getAllAppointments,
  getAllPatients,
  saveAppointment,
  deleteAppointment,
  Appointment,
  Patient,
  formatId,
  formatDateAr,
  todayISO,
} from "../lib/db";

// ============================================================
// ثوابت
// ============================================================
const STATUS_LABEL: Record<Appointment["status"], string> = {
  pending:   "قادم",
  done:      "مكتمل",
  cancelled: "ملغى",
};

const STATUS_COLORS: Record<Appointment["status"], string> = {
  pending:   "bg-sky-100 text-sky-700 border-sky-200",
  done:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_CARD: Record<Appointment["status"], string> = {
  pending:   "border-sky-200 bg-white",
  done:      "border-emerald-200 bg-emerald-50/40",
  cancelled: "border-gray-200 bg-gray-50 opacity-70",
};

// ============================================================
// تحويل الوقت HH:MM إلى نص عربي
// ============================================================
function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hour   = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ============================================================
// مجموعة مواعيد حسب التاريخ
// ============================================================
interface DateGroup {
  date:  string;
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  appointments: Appointment[];
}

function groupByDate(appts: Appointment[], todayStr: string): DateGroup[] {
  const tomorrow = new Date(todayStr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const map = new Map<string, Appointment[]>();
  for (const a of appts) {
    if (!map.has(a.date)) map.set(a.date, []);
    map.get(a.date)!.push(a);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      label: date === todayStr
        ? "اليوم"
        : date === tomorrowStr
        ? "غداً"
        : formatDateAr(date),
      isToday:    date === todayStr,
      isTomorrow: date === tomorrowStr,
      appointments: list.sort((a, b) => a.time.localeCompare(b.time)),
    }));
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients,     setPatients]     = useState<Patient[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editAppt,     setEditAppt]     = useState<Appointment | null>(null);

  // عرض السابق
  const [showPast,    setShowPast]    = useState(false);
  // فلتر الحالة
  const [filterStatus, setFilterStatus] = useState<"all" | Appointment["status"]>("all");

  const today = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    const [appts, pats] = await Promise.all([getAllAppointments(), getAllPatients()]);
    setAppointments(appts);
    setPatients(pats);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // تقسيم إلى قادم وسابق
  const { upcoming, past } = useMemo(() => {
    const filtered = filterStatus === "all"
      ? appointments
      : appointments.filter((a) => a.status === filterStatus);

    return {
      upcoming: filtered.filter((a) => a.date >= today),
      past:     filtered.filter((a) => a.date <  today),
    };
  }, [appointments, today, filterStatus]);

  const upcomingGroups = useMemo(() => groupByDate(upcoming, today), [upcoming, today]);
  const pastGroups     = useMemo(() => groupByDate(past,     today), [past,     today]);

  // ======= تغيير الحالة =======
  async function changeStatus(appt: Appointment, status: Appointment["status"]) {
    await saveAppointment({ ...appt, status });
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, status } : a))
    );
  }

  // ======= حذف موعد =======
  async function handleDelete(appt: Appointment) {
    if (!appt.id) return;
    if (!confirm(`هل تريد حذف موعد ${appt.patientName}؟`)) return;
    await deleteAppointment(appt.id);
    setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
    showToast("تم حذف الموعد", "success");
  }

  // ======= فتح ملف مريض =======
  function openPatient(id: number) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${base}/patient/${id}`, "_blank");
  }

  // ======= إحصاء اليوم =======
  const todayTotal   = appointments.filter((a) => a.date === today).length;
  const todayPending = appointments.filter((a) => a.date === today && a.status === "pending").length;
  const todayDone    = appointments.filter((a) => a.date === today && a.status === "done").length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <ToastContainer />

      <div className="pt-20 max-w-3xl mx-auto px-4 pb-12">

        {/* ===== رأس الصفحة ===== */}
        <div className="flex items-center justify-between mt-4 mb-6">
          <h1 className="text-xl font-bold text-sky-700">المواعيد</h1>
          <button
            onClick={() => { setEditAppt(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            موعد جديد
          </button>
        </div>

        {/* ===== ملخص اليوم ===== */}
        {todayTotal > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl border-2 border-sky-100 p-3 text-center">
              <p className="text-xs text-gray-400 font-medium mb-0.5">مواعيد اليوم</p>
              <p className="text-2xl font-bold text-sky-700">{todayTotal}</p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-amber-100 p-3 text-center">
              <p className="text-xs text-gray-400 font-medium mb-0.5">قادم</p>
              <p className="text-2xl font-bold text-amber-500">{todayPending}</p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-emerald-100 p-3 text-center">
              <p className="text-xs text-gray-400 font-medium mb-0.5">مكتمل</p>
              <p className="text-2xl font-bold text-emerald-600">{todayDone}</p>
            </div>
          </div>
        )}

        {/* ===== فلتر الحالة ===== */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(["all", "pending", "done", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filterStatus === s
                  ? "bg-sky-500 text-white border-sky-500"
                  : "bg-white text-gray-500 border-gray-200 hover:border-sky-200 hover:text-sky-600"
              }`}
            >
              {s === "all" ? "الكل" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* ===== المحتوى ===== */}
        {loading ? (
          <div className="text-center py-14 text-gray-400">
            <div className="animate-spin w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full mx-auto mb-3" />
            جاري التحميل...
          </div>
        ) : upcomingGroups.length === 0 && !showPast ? (
          <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-base mb-1">لا توجد مواعيد قادمة</p>
            <p className="text-sm">أضف موعداً جديداً بالضغط على الزر أعلاه</p>
          </div>
        ) : (
          <>
            {/* المواعيد القادمة */}
            {upcomingGroups.map((group) => (
              <DateSection
                key={group.date}
                group={group}
                onStatusChange={changeStatus}
                onDelete={handleDelete}
                onEdit={(a) => { setEditAppt(a); setShowModal(true); }}
                onOpenPatient={openPatient}
              />
            ))}

            {/* المواعيد السابقة */}
            {pastGroups.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors mb-3"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showPast ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  المواعيد السابقة ({pastGroups.reduce((s, g) => s + g.appointments.length, 0)})
                </button>

                {showPast && pastGroups.slice().reverse().map((group) => (
                  <DateSection
                    key={group.date}
                    group={group}
                    onStatusChange={changeStatus}
                    onDelete={handleDelete}
                    onEdit={(a) => { setEditAppt(a); setShowModal(true); }}
                    onOpenPatient={openPatient}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== نافذة إضافة/تعديل موعد ===== */}
      {showModal && (
        <AppointmentModal
          patients={patients}
          initial={editAppt}
          todayISO={today}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false);
            await load();
            showToast(editAppt ? "تم تحديث الموعد" : "تم حفظ الموعد", "success");
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// مكوّن: قسم تاريخ واحد
// ============================================================
interface DateSectionProps {
  group: DateGroup;
  onStatusChange: (a: Appointment, s: Appointment["status"]) => void;
  onDelete:       (a: Appointment) => void;
  onEdit:         (a: Appointment) => void;
  onOpenPatient:  (id: number) => void;
}

function DateSection({ group, onStatusChange, onDelete, onEdit, onOpenPatient }: DateSectionProps) {
  return (
    <div className="mb-5">
      {/* رأس التاريخ */}
      <div className={`flex items-center gap-2 mb-2 ${group.isToday ? "text-sky-600" : "text-gray-500"}`}>
        <span className={`text-sm font-bold ${group.isToday ? "text-sky-700" : ""}`}>
          {group.label}
        </span>
        {group.isToday && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-600 rounded-lg border border-sky-200">
            اليوم
          </span>
        )}
        {group.isTomorrow && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-600 rounded-lg border border-amber-200">
            غداً
          </span>
        )}
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">{group.appointments.length} موعد</span>
      </div>

      {/* قائمة المواعيد */}
      <div className="space-y-2">
        {group.appointments.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onEdit={onEdit}
            onOpenPatient={onOpenPatient}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// مكوّن: بطاقة موعد
// ============================================================
interface CardProps {
  appt: Appointment;
  onStatusChange: (a: Appointment, s: Appointment["status"]) => void;
  onDelete:       (a: Appointment) => void;
  onEdit:         (a: Appointment) => void;
  onOpenPatient:  (id: number) => void;
}

function AppointmentCard({ appt, onStatusChange, onDelete, onEdit, onOpenPatient }: CardProps) {
  return (
    <div className={`rounded-2xl border-2 p-4 flex gap-3 items-start transition-all ${STATUS_CARD[appt.status]}`}>

      {/* الوقت */}
      <div className="flex-shrink-0 w-16 text-center">
        <p className="text-base font-bold text-gray-700">{formatTime(appt.time)}</p>
      </div>

      {/* الخط الفاصل */}
      <div className={`w-px self-stretch rounded-full ${appt.status === "pending" ? "bg-sky-200" : appt.status === "done" ? "bg-emerald-200" : "bg-gray-200"}`} />

      {/* التفاصيل */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenPatient(appt.patientId)}
            className="font-bold text-gray-800 hover:text-sky-600 transition-colors text-sm"
          >
            {appt.patientName}
          </button>
          <span className="text-xs text-gray-400 font-mono">#{formatId(appt.patientId)}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${STATUS_COLORS[appt.status]}`}>
            {STATUS_LABEL[appt.status]}
          </span>
        </div>

        {appt.notes && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{appt.notes}</p>
        )}
      </div>

      {/* الأزرار */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {appt.status === "pending" && (
          <>
            <button
              title="تم"
              onClick={() => onStatusChange(appt, "done")}
              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              title="إلغاء"
              onClick={() => onStatusChange(appt, "cancelled")}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
        {(appt.status === "done" || appt.status === "cancelled") && (
          <button
            title="إعادة تفعيل"
            onClick={() => onStatusChange(appt, "pending")}
            className="w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <button
          title="تعديل"
          onClick={() => onEdit(appt)}
          className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          title="حذف"
          onClick={() => onDelete(appt)}
          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// مكوّن: نافذة إضافة / تعديل موعد
// ============================================================
interface ModalProps {
  patients:  Patient[];
  initial:   Appointment | null;
  todayISO:  string;
  onClose:   () => void;
  onSaved:   () => void;
}

function AppointmentModal({ patients, initial, todayISO, onClose, onSaved }: ModalProps) {
  const [patientSearch, setPatientSearch] = useState(initial?.patientName ?? "");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    initial ? (patients.find((p) => p.id === initial.patientId) ?? null) : null
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [date,  setDate]  = useState(initial?.date  ?? todayISO);
  const [time,  setTime]  = useState(initial?.time  ?? "09:00");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const draftAutoSave = useAutoSave("draft_appointment_page");

  // حفظ مسودة تلقائي
  useEffect(() => {
    if (initial) return; // لا تحفظ مسودة عند التعديل
    draftAutoSave.save({ date, time, notes });
  });

  useEffect(() => {
    if (!initial) searchRef.current?.focus();
  }, [initial]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 8);
    return patients
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        (p.phone || "").includes(q)
      )
      .slice(0, 8);
  }, [patients, patientSearch]);

  async function handleSave() {
    if (!selectedPatient) { setError("اختر مريضاً أولاً"); return; }
    if (!date)             { setError("اختر تاريخ الموعد"); return; }
    if (!time)             { setError("اختر وقت الموعد");   return; }

    setSaving(true);
    const appt: Appointment = {
      ...(initial?.id ? { id: initial.id } : {}),
      patientId:   selectedPatient.id,
      patientName: selectedPatient.name,
      date,
      time,
      notes: notes.trim(),
      status:    initial?.status ?? "pending",
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    await saveAppointment(appt);
    setSaving(false);
    draftAutoSave.clear();
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">

        {/* رأس النافذة */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {initial ? "تعديل الموعد" : "موعد جديد"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* اختيار المريض */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">المريض *</label>

            {selectedPatient ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 border-2 border-sky-200">
                <div className="flex-1">
                  <p className="font-bold text-sky-800 text-sm">{selectedPatient.name}</p>
                  <p className="text-xs text-sky-500">#{formatId(selectedPatient.id)}</p>
                </div>
                <button
                  onClick={() => { setSelectedPatient(null); setPatientSearch(""); setShowDropdown(false); }}
                  className="text-sky-400 hover:text-sky-600 text-sm font-medium"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="ابحث بالاسم أو رقم الملف أو الهاتف..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm text-right"
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج</p>
                    ) : filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => {
                          setSelectedPatient(p);
                          setPatientSearch(p.name);
                          setShowDropdown(false);
                        }}
                        className="w-full text-right px-4 py-2.5 hover:bg-sky-50 flex items-center gap-3 transition-colors"
                      >
                        <span className="text-xs text-gray-400 font-mono w-10">#{formatId(p.id)}</span>
                        <span className="text-sm font-medium text-gray-700 flex-1">{p.name}</span>
                        {p.phone && <span className="text-xs text-gray-400">{p.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* التاريخ والوقت */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">التاريخ *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">الوقت *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* الملاحظات */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="نوع العلاج، تعليمات خاصة..."
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm resize-none"
            />
          </div>

          {/* خطأ */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        {/* أزرار النافذة */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all"
          >
            {saving ? "جاري الحفظ..." : initial ? "حفظ التعديلات" : "حفظ الموعد"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
