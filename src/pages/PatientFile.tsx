// ============================================================
// صفحة ملف المريض - تفتح في تبويب جديد
// تعرض جميع المعلومات والجدول العلاجي ومخطط الأسنان
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPatientById,
  updatePatient,
  calculatePatientFinancials,
  PaymentTransaction,
  TreatmentRow,
  Patient,
  createEmptyTreatmentRows,
  formatId,
  formatAmount,
  parseAmount,
  todayFormatted,
  todayISO,
} from "../lib/db";
import FieldGroup from "../components/FieldGroup";
import { ToastContainer, showToast } from "../components/Toast";
import { useClinic } from "../lib/clinic-context";
import AppointmentModal from "../components/AppointmentModal";
import ToothDiagram from "../components/ToothDiagram";

interface PatientFileProps {
  patientId: number;
}

export default function PatientFile({ patientId }: PatientFileProps) {
  const [patient,   setPatient]   = useState<Patient | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setActivePatient } = useClinic();

  // حقول قابلة للتعديل
  const [isChild,         setIsChild]         = useState(false);
  const [name,            setName]            = useState("");
  const [gender,          setGender]          = useState<"male" | "female">("male");
  const [birthDate,       setBirthDate]       = useState("");
  const [phone,           setPhone]           = useState("");
  const [address,         setAddress]         = useState("");
  const [email,           setEmail]           = useState("");
  const [chronicDiseases, setChronicDiseases] = useState("");
  const [allergies,       setAllergies]       = useState("");
  const [notes,           setNotes]           = useState("");
  const [treatments,      setTreatments]      = useState<TreatmentRow[]>([]);
  const [payments,        setPayments]        = useState<PaymentTransaction[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount,   setPaymentAmount]   = useState("");
  const [paymentDiscount, setPaymentDiscount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState<"USD" | "SYP">("SYP");
  const [paymentMethod, setPaymentMethod] = useState<"direct" | "sham_cash">("direct");
  const [paymentDate,     setPaymentDate]     = useState(todayISO());
  const [paymentSaving,   setPaymentSaving]   = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [toothNotes,      setToothNotes]      = useState<Record<string, string>>({});

  // تحميل بيانات المريض
  const loadPatient = useCallback(async () => {
    setLoading(true);
    const p = await getPatientById(patientId);
    if (p) {
      setPatient(p);
      setName(p.name);
      setGender(p.gender);
      setBirthDate(p.birthDate);
      setPhone(p.phone);
      setAddress(p.address || "");
      setEmail(p.email || "");
      setChronicDiseases(p.chronicDiseases || "");
      setAllergies(p.allergies || "");
      setNotes(p.notes || "");
      setPayments(p.payments || []);
      setToothNotes(p.toothNotes || {});
      setActivePatient({ id: p.id, name: p.name });
      const rows = [...(p.treatments || [])];
      if (rows.length < 10) rows.push(...createEmptyTreatmentRows(10 - rows.length));
      setTreatments(rows);
    }
    setLoading(false);
  }, [patientId, setActivePatient]);

  useEffect(() => { loadPatient(); }, [loadPatient]);

  // حفظ تلقائي — يقبل قيماً مُحدَّثة صراحةً لتجنب مشكلة الـ closure القديمة
  const triggerAutoSave = useCallback(
    (updatedTreatments?: TreatmentRow[], updatedToothNotes?: Record<string, string>) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(async () => {
        if (!patient) return;
        setSaving(true);
        const updated: Patient = {
          ...patient,
          name, gender, birthDate, phone, address, email,
          chronicDiseases, allergies, notes,
          treatments:  updatedTreatments  ?? treatments,
          toothNotes:  updatedToothNotes  ?? toothNotes,
        };
        await updatePatient(updated);
        setPatient(updated);
        setSaving(false);
        showToast("تم الحفظ تلقائياً");
      }, 1000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patient, name, gender, birthDate, phone, address, email, chronicDiseases, allergies, notes, treatments, toothNotes]
  );

  // حفظ يدوي
  async function handleManualSave() {
    if (!patient) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    const updated: Patient = {
      ...patient,
      name, gender, birthDate, phone, address, email,
      chronicDiseases, allergies, notes,
      treatments,
      toothNotes,
    };
    await updatePatient(updated);
    setPatient(updated);
    setSaving(false);
    showToast("تم حفظ التعديلات بنجاح");
  }

  // تحديث صف في الجدول العلاجي (أثناء الكتابة — بدون تنسيق)
  function updateTreatmentRow(index: number, field: keyof TreatmentRow, rawValue: string) {
    setTreatments((prev) => {
      const updated = [...prev];

      if (field === "treatmentAmount" || field === "paidAmount") {
        const digitsOnly = rawValue.replace(/[^\d]/g, "");
        updated[index] = { ...updated[index], [field]: digitsOnly };

        const treatment = parseAmount(field === "treatmentAmount" ? digitsOnly : updated[index].treatmentAmount);
        const paid      = parseAmount(field === "paidAmount"      ? digitsOnly : updated[index].paidAmount);
        const remaining = treatment - paid;
        updated[index].remainingAmount = remaining !== 0 ? formatAmount(String(remaining)) : "";
      } else if (field === "currency") {
        updated[index] = { ...updated[index], currency: rawValue as "USD" | "SYP" };
      } else {
        updated[index] = { ...updated[index], [field]: rawValue };
      }

      if (index === updated.length - 1 && rawValue.trim() !== "") {
        updated.push(...createEmptyTreatmentRows(5));
      }

      triggerAutoSave(updated);
      return updated;
    });
  }

  // تنسيق المبلغ بالفواصل عند الخروج من الحقل
  function handleAmountBlur(index: number, field: "treatmentAmount" | "paidAmount") {
    setTreatments((prev) => {
      const updated = [...prev];
      const num     = parseAmount(updated[index][field]);
      const formatted = num > 0 ? formatAmount(String(num)) : "";
      updated[index] = { ...updated[index], [field]: formatted };

      const treatment = parseAmount(field === "treatmentAmount" ? formatted : updated[index].treatmentAmount);
      const paid      = parseAmount(field === "paidAmount"      ? formatted : updated[index].paidAmount);
      const remaining = treatment - paid;
      updated[index].remainingAmount = remaining !== 0 ? formatAmount(String(remaining)) : "";

      triggerAutoSave(updated);
      return updated;
    });
  }

  // تحديث ملاحظات الأسنان من مخطط الأسنان
  function handleToothNotesChange(newNotes: Record<string, string>) {
    setToothNotes(newNotes);
    triggerAutoSave(undefined, newNotes);
  }

  async function handlePaymentSave() {
    if (!patient) return;
    const amount = parseAmount(paymentAmount);
    const discount = parseAmount(paymentDiscount);
    if (amount < 0 || discount < 0 || (amount === 0 && discount === 0)) {
      showToast("أدخل مبلغ دفعة أو خصماً صحيحاً", "error");
      return;
    }
    if (!paymentDate) {
      showToast("أدخل تاريخ المعاملة", "error");
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setPaymentSaving(true);
    const transaction: PaymentTransaction = {
      id: crypto.randomUUID(), amount, discount, currency: paymentCurrency,
      date: paymentDate, method: paymentMethod,
    };
    const updatedPayments = [...payments, transaction];
    const updatedPatient: Patient = {
      ...patient, name, gender, birthDate, phone, address, email,
      chronicDiseases, allergies, notes, treatments, toothNotes,
      payments: updatedPayments,
    };
    await updatePatient(updatedPatient);
    setPatient(updatedPatient);
    setPayments(updatedPayments);
    setPaymentAmount("");
    setPaymentDiscount("");
    setPaymentMethod("direct");
    setPaymentDate(todayISO());
    setShowPaymentForm(false);
    setPaymentSaving(false);
    showToast("تم حفظ المعاملة بنجاح", "success");
  }

  async function handlePaymentMethodChange(transaction: PaymentTransaction, method: "direct" | "sham_cash") {
    if (!patient || updatingPaymentId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setUpdatingPaymentId(transaction.id);
    const updatedPayments = payments.map((payment) => payment.id === transaction.id
      ? { ...payment, method }
      : payment);
    const updatedPatient: Patient = { ...patient, payments: updatedPayments };
    await updatePatient(updatedPatient);
    setPatient(updatedPatient);
    setPayments(updatedPayments);
    setUpdatingPaymentId(null);
    showToast(method === "sham_cash" ? "تم تسجيل الدفعة كشام كاش" : "تم تسجيل الدفعة نقداً");
  }

  // استخراج أرقام الأسنان المُعالَجة من جدول العلاجات
  const treatedTeeth = treatments
    .map((r) => r.toothNumber.trim())
    .filter((n) => n !== "");

  const financials = calculatePatientFinancials(treatments, payments);
  const { treatment: totalTreatment, paid: totalPaid, discount: totalDiscount } = financials;
  const totalRemainingUSD = financials.remaining.usd;
  const totalRemainingSYP = financials.remaining.syp;

  function handlePrintPDF() { window.print(); }

  // ===== حالات التحميل والخطأ =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full mx-auto mb-3" />
          <p className="text-gray-500">جاري تحميل الملف...</p>
        </div>
      </div>
    );
  }
  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-xl font-bold mb-2">الملف غير موجود</p>
          <p className="text-sm">رقم الملف: {formatId(patientId)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16" dir="rtl">
      <ToastContainer />

      {/* ===== شريط العلوي ===== */}
      <div className="bg-white border-b border-sky-100 sticky top-0 z-40 no-print" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.08)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100">
              <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
                <path d="M32 8C24 8 18 14 18 22C18 25 19 28 20.5 31L26 42L32 52L38 42L43.5 31C45 28 46 25 46 22C46 14 40 8 32 8Z" fill="#0ea5e9" />
                <circle cx="32" cy="22" r="5" fill="white" />
              </svg>
            </div>
            <span className="font-bold text-sky-700">ملف المريض</span>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400 animate-pulse">جاري الحفظ...</span>}
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all no-print"
              data-testid="button-quick-appointment-file"
            >
              حجز موعد
            </button>
            <button
              onClick={handleManualSave}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-all no-print"
              data-testid="button-save-patient-file"
            >
              حفظ التعديلات
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all no-print"
              data-testid="button-print-pdf"
            >
              PDF طباعة/
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 print-full">

        {/* ===== رقم الملف + تاريخ الإنشاء ===== */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FieldGroup label="رقم الملف">
            <div className="text-3xl font-bold text-sky-600 text-center py-1">{formatId(patient.id)}</div>
          </FieldGroup>
          <FieldGroup label="تاريخ إنشاء الملف">
            <div className="text-base font-semibold text-gray-700 text-center py-1">{patient.createdAt}</div>
          </FieldGroup>
        </div>

        {/* ===== معلومات المريض ===== */}
        <FieldGroup label="معلومات المريض" className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الاسم</label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right"
                data-testid="input-edit-name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الجنس</label>
              <select value={gender} onChange={(e) => { setGender(e.target.value as "male" | "female"); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right">
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">تاريخ الميلاد</label>
              <input type="text" value={birthDate} onChange={(e) => { setBirthDate(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">رقم الهاتف</label>
              <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">العنوان</label>
              <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right" placeholder="اختياري" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right" placeholder="اختياري" />
            </div>
          </div>
        </FieldGroup>

        {/* ===== التاريخ الطبي ===== */}
        <FieldGroup label="التاريخ الطبي" className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الأمراض المزمنة</label>
              <textarea value={chronicDiseases} onChange={(e) => { setChronicDiseases(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right resize-none" rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الحساسية</label>
              <textarea value={allergies} onChange={(e) => { setAllergies(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right resize-none" rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الملاحظات</label>
              <textarea value={notes} onChange={(e) => { setNotes(e.target.value); triggerAutoSave(); }}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right resize-none" rows={2} />
            </div>
          </div>
        </FieldGroup>

        {/* ===== مخطط الأسنان ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 tooth-diagram-section">
          <div className="bg-sky-50 border-b border-sky-100 -mx-4 -mt-4 px-4 py-3 rounded-t-2xl mb-4">
            <h3 className="font-bold text-sky-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              مخطط الأسنان
              <span className="text-xs font-normal text-sky-500">(انقر على سن لإضافة ملاحظة)</span>
            </h3>
            <label className="flex items-center gap-1.5 text-xs text-sky-600 cursor-pointer select-none mr-auto">
              <input
                type="checkbox"
                checked={isChild}
                onChange={(e) => setIsChild(e.target.checked)}
                className="rounded border-sky-300 text-sky-500 focus:ring-sky-400"
              />
              طفل
            </label>
          </div>
          <ToothDiagram
            treatedTeeth={treatedTeeth}
            toothNotes={toothNotes}
            onNotesChange={handleToothNotesChange}
            isChild={isChild}
          />
        </div>

        {/* ===== جدول العلاجات ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="bg-sky-50 border-b border-sky-100 px-4 py-3">
            <h3 className="font-bold text-sky-700 text-sm">جدول العلاجات</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full treatment-table text-sm" style={{ minWidth: "520px" }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-2.5 text-right font-bold text-gray-600 text-xs w-16">رقم السن</th>
                  <th className="px-3 py-2.5 text-right font-bold text-gray-600 text-xs">التشخيص والعلاج</th>
                  <th className="px-3 py-2.5 text-right font-bold text-gray-600 text-xs w-16">العملة</th>
                  <th className="px-3 py-2.5 text-right font-bold text-gray-600 text-xs w-28">مبلغ العلاج</th>
                  <th className="px-3 py-2.5 text-right font-bold text-gray-600 text-xs w-28">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map((row, index) => (
                  <tr key={index}
                    className={`border-b border-gray-50 hover:bg-sky-50/30 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                    data-testid={`row-treatment-${index}`}
                  >
                    {/* رقم السن */}
                    <td className="px-1 py-1">
                      <input type="text" value={row.toothNumber}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 2);
                          if (/^\d*$/.test(val)) updateTreatmentRow(index, "toothNumber", val);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-sky-300 focus:bg-white text-center text-sm"
                        maxLength={2} data-testid={`input-tooth-${index}`} />
                    </td>
                    {/* التشخيص والعلاج */}
                    <td className="px-1 py-1">
                      <input type="text" value={row.diagnosis}
                        onChange={(e) => updateTreatmentRow(index, "diagnosis", e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-sky-300 focus:bg-white text-sm"
                        data-testid={`input-diagnosis-${index}`} />
                    </td>
                    {/* العملة */}
                    <td className="px-1 py-1">
                      <select value={row.currency || "SYP"}
                        onChange={(e) => updateTreatmentRow(index, "currency", e.target.value)}
                        className="w-full px-1 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-sky-300 focus:bg-white text-xs text-center bg-white cursor-pointer"
                        data-testid={`input-currency-${index}`}>
                        <option value="SYP">ل.س</option>
                        <option value="USD">$</option>
                      </select>
                    </td>
                    {/* مبلغ العلاج */}
                    <td className="px-1 py-1">
                      <input type="text" inputMode="numeric" value={row.treatmentAmount}
                        onChange={(e) => updateTreatmentRow(index, "treatmentAmount", e.target.value)}
                        onBlur={() => handleAmountBlur(index, "treatmentAmount")}
                        className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-sky-300 focus:bg-white text-sm text-center"
                        placeholder="0" data-testid={`input-treatment-amount-${index}`} />
                    </td>
                    {/* التاريخ */}
                    <td className="px-1 py-1">
                      <input type="text" value={row.date}
                        onChange={(e) => updateTreatmentRow(index, "date", e.target.value)}
                        onFocus={(e) => { if (!e.target.value) updateTreatmentRow(index, "date", todayFormatted()); }}
                        className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-sky-300 focus:bg-white text-sm text-center"
                        placeholder="DD/MM/YYYY" data-testid={`input-date-${index}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="flex items-center justify-between gap-3 bg-emerald-50 border-b border-emerald-100 px-4 py-3">
            <h3 className="font-bold text-emerald-700 text-sm">سجل الدفعات</h3>
            <button onClick={() => setShowPaymentForm((shown) => !shown)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
              {showPaymentForm ? "إلغاء" : "تسجيل دفعة / خصم"}
            </button>
          </div>

          {showPaymentForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border-b border-gray-100">
              <label className="text-xs font-semibold text-gray-600">المبلغ المقبوض
                <input type="number" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="0" />
              </label>
              <label className="text-xs font-semibold text-gray-600">الخصم
                <input type="number" min="0" value={paymentDiscount} onChange={(e) => setPaymentDiscount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="0" />
              </label>
              <label className="text-xs font-semibold text-gray-600">العملة
                <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value as "USD" | "SYP")}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
                  <option value="SYP">ل.س</option><option value="USD">$</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">وسيلة الدفع
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "direct" | "sham_cash")}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm">
                  <option value="direct">نقداً</option><option value="sham_cash">شام كاش</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">التاريخ
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </label>
              <button onClick={handlePaymentSave} disabled={paymentSaving}
                className="self-end px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold">
                {paymentSaving ? "جاري الحفظ..." : "حفظ المعاملة"}
              </button>
            </div>
          )}

          {payments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">لا توجد معاملات مسجلة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "560px" }}>
                <thead><tr className="bg-gray-50 text-right text-xs text-gray-600">
                  <th className="px-4 py-2.5">التاريخ</th><th className="px-4 py-2.5">المدفوع</th>
                  <th className="px-4 py-2.5">الخصم</th><th className="px-4 py-2.5">وسيلة الدفع</th>
                </tr></thead>
                <tbody>{payments.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-gray-100">
                    <td className="px-4 py-2.5">{transaction.date || "تاريخ غير مسجل"}</td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-700">
                      {transaction.amount.toLocaleString("en-US")} {transaction.currency === "USD" ? "$" : "ل.س"}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-amber-700">
                      {transaction.discount.toLocaleString("en-US")} {transaction.currency === "USD" ? "$" : "ل.س"}
                    </td>
                    <td className="px-4 py-2.5">
                      <select value={transaction.method}
                        disabled={updatingPaymentId !== null}
                        onChange={(event) => {
                          if (event.target.value !== "unknown") {
                            handlePaymentMethodChange(transaction, event.target.value as "direct" | "sham_cash");
                          }
                        }}
                        aria-label={`وسيلة الدفع للدفعة ${transaction.amount}`}
                        className="min-w-28 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-teal-700 focus:border-teal-400 focus:outline-none">
                        <option value="direct">نقداً</option><option value="sham_cash">شام كاش</option>
                        {transaction.method === "unknown" && <option value="unknown">غير محدد</option>}
                      </select>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== مجاميع المدفوعات (ثنائي العملة) ===== */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border-2 border-sky-100 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 mb-1">إجمالي العلاجات</p>
              <p className="text-xl font-bold text-sky-700">
                {totalTreatment.usd.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">$</span>
              </p>
              <p className="text-lg font-bold text-sky-600">
                {totalTreatment.syp.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">ل.س</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-emerald-100 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 mb-1">إجمالي المدفوع</p>
              <p className="text-xl font-bold text-emerald-600">
                {totalPaid.usd.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">$</span>
              </p>
              <p className="text-lg font-bold text-emerald-500">
                {totalPaid.syp.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">ل.س</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-amber-100 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 mb-1">إجمالي الخصومات</p>
              <p className="text-xl font-bold text-amber-700">
                {totalDiscount.usd.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">$</span>
              </p>
              <p className="text-lg font-bold text-amber-600">
                {totalDiscount.syp.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">ل.س</span>
              </p>
            </div>
            <div className={`bg-white rounded-2xl border-2 p-4 text-center ${totalRemainingUSD > 0 || totalRemainingSYP > 0 ? "border-amber-200" : "border-emerald-100"}`}>
              <p className="text-xs font-semibold text-gray-500 mb-1">المتبقي</p>
              <p className={`text-xl font-bold ${totalRemainingUSD > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {totalRemainingUSD.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">$</span>
              </p>
              <p className={`text-lg font-bold ${totalRemainingSYP > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {totalRemainingSYP.toLocaleString("en-US")}
                <span className="text-xs font-normal text-gray-400 mr-1">ل.س</span>
              </p>
            </div>
          </div>
        </div>

        {/* زر الطباعة */}
        <div className="flex justify-center no-print">
          <button onClick={handlePrintPDF}
            className="flex items-center gap-2 px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-all shadow-sm"
            data-testid="button-export-pdf">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة / تصدير PDF
          </button>
        </div>
      </div>
      {/* نافذة حجز موعد سريع */}
      {showBookingModal && patient && (
        <AppointmentModal
          initialPatient={{ id: patient.id, name: patient.name }}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
}
