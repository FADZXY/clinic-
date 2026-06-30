// ============================================================
// نافذة إنشاء ملف مريض جديد
// تظهر كنافذة منبثقة مع جميع حقول المريض
// ============================================================
import { useState, useEffect } from "react";
import {
  generateNewId,
  savePatient,
  todayFormatted,
  createEmptyTreatmentRows,
  formatId,
  Patient,
} from "../lib/db";
import FieldGroup from "./FieldGroup";
import ConfirmDialog from "./ConfirmDialog";
import { showToast } from "./Toast";

interface NewPatientModalProps {
  onClose: () => void;
  onSaved: (patient: Patient) => void;
}

export default function NewPatientModal({ onClose, onSaved }: NewPatientModalProps) {
  const [fileId, setFileId] = useState<number | null>(null);
  const [createdAt] = useState(todayFormatted());
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // حقول المريض
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [chronicDiseases, setChronicDiseases] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // توليد الرقم التلقائي عند الفتح
  useEffect(() => {
    generateNewId().then(setFileId);
  }, []);

  async function handleSave() {
    if (!name.trim()) {
      showToast("يرجى إدخال اسم المريض", "error");
      return;
    }
    if (!fileId) return;

    setSaving(true);
    const patient: Patient = {
      id: fileId,
      name: name.trim(),
      gender,
      birthDate,
      phone,
      address,
      email,
      chronicDiseases,
      allergies,
      notes,
      createdAt,
      treatments: createEmptyTreatmentRows(10),
    };

    await savePatient(patient);
    showToast("تم إنشاء الملف بنجاح");
    setSaving(false);
    onSaved(patient);
  }

  function handleCancelClick() {
    setShowCancelConfirm(true);
  }

  function handleCancelConfirm() {
    setShowCancelConfirm(false);
    onClose();
  }

  return (
    <>
      {/* خلفية شفافة */}
      <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-start justify-end p-4 sm:p-6">
        {/* النافذة المنبثقة - في الجانب الأيمن العلوي */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slideUp"
          style={{ marginTop: "64px" }}
        >
          <div className="p-6">
            <h2 className="text-lg font-bold text-sky-700 mb-5 text-center border-b border-sky-100 pb-4">
              إنشاء ملف مريض جديد
            </h2>

            {/* الصف الأول: رقم الملف + تاريخ الإنشاء */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* رقم الملف */}
              <FieldGroup label="رقم الملف">
                <div className="text-2xl font-bold text-sky-600 text-center py-1">
                  {fileId ? formatId(fileId) : "..."}
                </div>
              </FieldGroup>

              {/* تاريخ الإنشاء */}
              <FieldGroup label="تاريخ إنشاء الملف">
                <div className="text-sm font-semibold text-gray-700 text-center py-1">
                  {createdAt}
                </div>
              </FieldGroup>
            </div>

            {/* معلومات المريض */}
            <FieldGroup label="معلومات المريض" className="mb-4">
              <div className="space-y-3">
                {/* اسم المريض */}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم المريض *"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-right text-sm bg-gray-50 focus:bg-white"
                  data-testid="input-patient-name"
                />

                {/* الجنس وتاريخ الميلاد */}
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right"
                    data-testid="select-gender"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="تاريخ الميلاد"
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right"
                    data-testid="input-birthdate"
                  />
                </div>

                {/* رقم الهاتف */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-right text-sm bg-gray-50 focus:bg-white"
                  data-testid="input-phone"
                />

                {/* العنوان والبريد (اختياريان) */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="العنوان (اختياري)"
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right"
                    data-testid="input-address"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="البريد (اختياري)"
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-gray-50 text-right"
                    data-testid="input-email"
                  />
                </div>
              </div>
            </FieldGroup>

            {/* التاريخ الطبي */}
            <FieldGroup label="التاريخ الطبي" className="mb-5">
              <div className="space-y-3">
                <input
                  type="text"
                  value={chronicDiseases}
                  onChange={(e) => setChronicDiseases(e.target.value)}
                  placeholder="الأمراض المزمنة"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-right text-sm bg-gray-50 focus:bg-white"
                  data-testid="input-chronic-diseases"
                />
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="الحساسية"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-right text-sm bg-gray-50 focus:bg-white"
                  data-testid="input-allergies"
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات عامة"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-right text-sm bg-gray-50 focus:bg-white resize-none"
                  data-testid="input-notes"
                />
              </div>
            </FieldGroup>

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60 text-sm"
                data-testid="button-save-patient"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                onClick={handleCancelClick}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm"
                data-testid="button-cancel-patient"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* تأكيد الإلغاء */}
      {showCancelConfirm && (
        <ConfirmDialog
          title="تأكيد الإلغاء"
          message="هل أنت متأكد من إلغاء إنشاء الملف الجديد؟ لن يتم حفظ أي بيانات."
          confirmLabel="نعم، إلغاء"
          cancelLabel="لا، رجوع"
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancelConfirm(false)}
          danger
        />
      )}
    </>
  );
}
