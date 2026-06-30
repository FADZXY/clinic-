import { useState, useEffect, useMemo, useRef } from "react";
import { getAllPatients, saveAppointment, Appointment, Patient, formatId, todayISO } from "../lib/db";
import { useAutoSave } from "../hooks/use-auto-save";
import { showToast } from "./Toast";

interface AppointmentModalProps {
  initialPatient?: { id: number; name: string } | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AppointmentModal({ initialPatient, onClose, onSaved }: AppointmentModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState(initialPatient?.name ?? "");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const draftAutoSave = useAutoSave("draft_appointment");

  // استعادة المسودة عند الفتح
  useEffect(() => {
    if (!initialPatient) {
      const draft = draftAutoSave.load<{ patientId?: number; patientName?: string; date: string; time: string; notes: string }>();
      if (draft) {
        if (draft.date) setDate(draft.date);
        if (draft.time) setTime(draft.time);
        if (draft.notes) setNotes(draft.notes);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حفظ مسودة
  useEffect(() => {
    draftAutoSave.save({ date, time, notes });
  });

  useEffect(() => {
    getAllPatients().then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient as unknown as Patient);
      setPatientSearch(initialPatient.name);
    }
  }, [initialPatient]);

  useEffect(() => {
    if (!initialPatient) searchRef.current?.focus();
  }, [initialPatient]);

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
    if (!date) { setError("اختر تاريخ الموعد"); return; }
    if (!time) { setError("اختر وقت الموعد"); return; }

    setSaving(true);
    const appt: Appointment = {
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      date,
      time,
      notes: notes.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await saveAppointment(appt);
    setSaving(false);
    draftAutoSave.clear();
    showToast("تم حفظ الموعد بنجاح");
    if (onSaved) onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideUp" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">موعد سريع</h2>
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

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all"
          >
            {saving ? "جاري الحفظ..." : "حفظ الموعد"}
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
