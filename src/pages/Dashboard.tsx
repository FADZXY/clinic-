// ============================================================
// الصفحة الرئيسية — قائمة المرضى + المرضى غير النشطين + تذكير النسخ الاحتياطي
// ============================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import Navbar from "../components/Navbar";
import NewPatientModal from "../components/NewPatientModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { ToastContainer, showToast } from "../components/Toast";
import { getAllPatients, deletePatients, formatId, Patient, parseFormattedDate } from "../lib/db";

// مريض غير نشط = آخر علاج له أكثر من 30 يوماً
function getLastTreatmentDate(patient: Patient): Date | null {
  const dates: Date[] = [];
  for (const row of patient.treatments) {
    if (!row.date) continue;
    const d = parseFormattedDate(row.date);
    if (d) dates.push(d);
  }
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [patients,         setPatients]         = useState<Patient[]>([]);
  const [filtered,         setFiltered]         = useState<Patient[]>([]);
  const [search,           setSearch]           = useState("");
  const [showNewModal,     setShowNewModal]      = useState(false);
  const [selectedIds,      setSelectedIds]       = useState<Set<number>>(new Set());
  const [showDeleteConfirm,setShowDeleteConfirm] = useState(false);
  const [loading,          setLoading]          = useState(true);

  // تذكير النسخ الاحتياطي
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  // المرضى غير النشطين
  const [showInactive, setShowInactive] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    const data = await getAllPatients();
    setPatients(data);
    setFiltered(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // فحص تذكير النسخة الاحتياطية عند التحميل
  useEffect(() => {
    const lastBackup = localStorage.getItem("lastBackupDate");
    if (!lastBackup) {
      setShowBackupReminder(true);
      return;
    }
    const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 7) setShowBackupReminder(true);
  }, []);

  // حساب المرضى غير النشطين (آخر علاج > 30 يوم)
  const inactivePatients = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return patients.filter((p) => {
      if (p.treatments.filter((t) => t.date || t.diagnosis).length === 0) return false;
      const last = getLastTreatmentDate(p);
      if (!last) return false;
      return last < thirtyDaysAgo;
    });
  }, [patients]);

  // البحث
  useEffect(() => {
    if (!search.trim()) { setFiltered(patients); return; }
    const q = search.trim().toLowerCase();
    setFiltered(patients.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      formatId(p.id).includes(q) ||
      String(p.id).includes(q) ||
      (p.phone && p.phone.includes(q))
    ));
  }, [search, patients]);

  function openPatient(id: number) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${base}/patient/${id}`, "_blank");
  }

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((p) => p.id)));
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    await deletePatients(ids);
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
    showToast(`تم حذف ${ids.length} ملف بنجاح`);
    loadPatients();
  }

  function handlePatientSaved(patient: Patient) {
    setShowNewModal(false);
    loadPatients();
    openPatient(patient.id);
  }

  // عدد أيام منذ آخر زيارة
  function daysSince(patient: Patient): number {
    const last = getLastTreatmentDate(patient);
    if (!last) return 0;
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <ToastContainer />

      <div className="pt-20 max-w-4xl mx-auto px-4 pb-10">

        {/* ===== تذكير النسخة الاحتياطية ===== */}
        {showBackupReminder && (
          <div className="flex items-center gap-3 mb-4 mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-amber-700 flex-1">
              لم يتم إجراء نسخة احتياطية منذ فترة — يُنصح بالنسخ الاحتياطي أسبوعياً لحماية بياناتك.
            </p>
            <button
              onClick={() => setLocation("/admin")}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex-shrink-0"
            >
              النسخ الآن
            </button>
            <button
              onClick={() => setShowBackupReminder(false)}
              className="text-amber-400 hover:text-amber-600 text-lg leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* ===== شريط الأدوات ===== */}
        <div className="flex flex-wrap items-center gap-3 mb-4 mt-4">
          <div className="flex-1 min-w-[200px] relative">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المريض أو رقم الملف أو الهاتف..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-right text-sm bg-white shadow-sm"
              data-testid="input-search" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>

          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-all shadow-sm text-sm whitespace-nowrap"
            data-testid="button-new-patient">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ملف جديد
          </button>

          <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-sky-100 rounded-xl shadow-sm">
            <span className="text-sky-600 font-bold text-lg">{patients.length}</span>
            <span className="text-xs text-gray-500">ملف</span>
          </div>
        </div>

        {/* ===== قسم المرضى غير النشطين ===== */}
        {inactivePatients.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-2xl text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                مرضى لم يراجعوا منذ أكثر من 30 يوماً
                <span className="bg-orange-200 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                  {inactivePatients.length}
                </span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${showInactive ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showInactive && (
              <div className="mt-2 border-2 border-orange-100 rounded-2xl overflow-hidden bg-white">
                {inactivePatients.slice(0, 20).map((p) => (
                  <div key={p.id}
                    onClick={() => openPatient(p.id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-orange-50 last:border-0 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[9px] text-orange-400 font-medium">رقم</span>
                      <span className="text-xs font-bold text-orange-600">{formatId(p.id)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.phone || "—"}</p>
                    </div>
                    <span className="text-xs font-semibold text-orange-500 flex-shrink-0">
                      منذ {daysSince(p)} يوم
                    </span>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
                {inactivePatients.length > 20 && (
                  <p className="text-xs text-center text-gray-400 py-2">
                    و {inactivePatients.length - 20} مريض آخر...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== شريط الحذف ===== */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <span className="text-sm font-semibold text-red-600">تم تحديد {selectedIds.size} ملف</span>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm transition-all"
              data-testid="button-delete-selected">
              حذف المحدد
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg text-sm transition-all">
              إلغاء التحديد
            </button>
          </div>
        )}

        {/* ===== قائمة المرضى ===== */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full mx-auto mb-3" />
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {search
              ? <><p className="text-lg mb-1">لا يوجد ملف مطابق</p><p className="text-sm">جرب البحث بمعلومات مختلفة</p></>
              : <><p className="text-lg mb-1">لا توجد ملفات بعد</p><p className="text-sm">اضغط "ملف جديد" لإضافة أول مريض</p></>}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 px-1">
              <button onClick={toggleSelectAll} className="text-xs text-sky-500 hover:text-sky-700 font-medium">
                {selectedIds.size === filtered.length && filtered.length > 0 ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </button>
              <span className="text-xs text-gray-400">({filtered.length} ملف)</span>
            </div>

            <div className="space-y-2">
              {filtered.map((patient) => (
                <div key={patient.id} onClick={() => openPatient(patient.id)}
                  className={`patient-card flex items-center gap-4 p-4 bg-white rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedIds.has(patient.id) ? "border-sky-400 bg-sky-50" : "border-gray-100 hover:border-sky-200"
                  }`}
                  data-testid={`card-patient-${patient.id}`}>

                  <div onClick={(e) => toggleSelect(patient.id, e)}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                      selectedIds.has(patient.id) ? "bg-sky-500 border-sky-500" : "border-gray-300 hover:border-sky-400"
                    }`}>
                    {selectedIds.has(patient.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="w-14 h-14 rounded-xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs text-sky-400 font-medium">رقم</span>
                    <span className="text-base font-bold text-sky-700">{formatId(patient.id)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-base truncate">{patient.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {patient.gender === "male" ? "ذكر" : "أنثى"}
                      {patient.birthDate && ` • ${patient.birthDate}`}
                    </p>
                  </div>

                  <div className="text-sm text-gray-500 font-medium flex-shrink-0">{patient.phone || "—"}</div>

                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showNewModal && (
        <NewPatientModal onClose={() => setShowNewModal(false)} onSaved={handlePatientSaved} />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف ${selectedIds.size} ملف؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="نعم، احذف" cancelLabel="لا، رجوع"
          onConfirm={handleDeleteSelected}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      )}
    </div>
  );
}
