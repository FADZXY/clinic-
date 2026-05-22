// ============================================================
// صفحة الإدارة - تصدير/استيراد البيانات وتغيير كلمة المرور
// ============================================================
import { useState, useRef } from "react";
import Navbar from "../components/Navbar";
import { ToastContainer, showToast } from "../components/Toast";
import { exportData, importData, ImportResult } from "../lib/db";

export default function Admin() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حقول تغيير كلمة المرور
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [pwdLoading,  setPwdLoading]  = useState(false);

  // تصدير البيانات كـ JSON
  async function handleExport() {
    setExporting(true);
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href     = url;
      a.download = `نسخة_احتياطية_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem("lastBackupDate", new Date().toISOString());
      showToast("تم تصدير البيانات بنجاح");
    } catch {
      showToast("حدث خطأ أثناء التصدير", "error");
    }
    setExporting(false);
  }

  // استيراد البيانات من JSON
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text   = await file.text();
      const result = await importData(text);
      setImportResult(result);
      if (result.imported > 0) {
        showToast(`تم استيراد ${result.imported} ملف بنجاح`);
      } else {
        showToast("لم يتم استيراد ملفات جديدة", "warning");
      }
    } catch {
      showToast("خطأ في قراءة الملف - تأكد من أنه ملف JSON صحيح", "error");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // تغيير كلمة المرور
  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdLoading(true);

    const saved = localStorage.getItem("clinicPassword") || "12345";

    if (currentPwd !== saved) {
      showToast("كلمة المرور الحالية غير صحيحة", "error");
      setPwdLoading(false);
      return;
    }
    if (newPwd.length < 4) {
      showToast("كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل", "error");
      setPwdLoading(false);
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast("كلمة المرور الجديدة وتأكيدها غير متطابقتين", "error");
      setPwdLoading(false);
      return;
    }

    setTimeout(() => {
      localStorage.setItem("clinicPassword", newPwd);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      showToast("تم تغيير كلمة المرور بنجاح");
      setPwdLoading(false);
    }, 300);
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <ToastContainer />

      <div className="pt-20 max-w-2xl mx-auto px-4 pb-10">
        <h1 className="text-xl font-bold text-sky-700 mb-6 mt-4">إدارة البيانات</h1>

        {/* ===== تصدير البيانات ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1">تصدير النسخة الاحتياطية</h3>
              <p className="text-sm text-gray-500 mb-4">تحميل جميع بيانات المرضى كملف JSON. يُنصح بعمل نسخة احتياطية بشكل دوري.</p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60 text-sm"
                data-testid="button-export-data"
              >
                {exporting ? "جاري التصدير..." : "تصدير البيانات"}
              </button>
            </div>
          </div>
        </div>

        {/* ===== استيراد البيانات ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1">استيراد بيانات</h3>
              <p className="text-sm text-gray-500 mb-4">استيراد ملفات المرضى من نسخة احتياطية سابقة. سيتم التحقق من التكرار تلقائياً.</p>

              <div
                className="border-2 border-dashed border-sky-200 rounded-xl p-6 text-center cursor-pointer hover:bg-sky-50 transition-colors mb-3"
                onClick={() => fileInputRef.current?.click()}
              >
                {importing ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin w-6 h-6 border-4 border-sky-200 border-t-sky-500 rounded-full" />
                    <span className="text-sm text-gray-500">جاري الاستيراد...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-sky-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">اضغط لاختيار ملف JSON</p>
                    <p className="text-xs text-gray-400 mt-1">يجب أن يكون الملف من نسخة احتياطية سابقة</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                data-testid="input-import-file"
              />
            </div>
          </div>
        </div>

        {/* ===== نتيجة الاستيراد ===== */}
        {importResult && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fadeIn mb-4">
            <h3 className="font-bold text-gray-800 mb-3">نتيجة الاستيراد</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                <p className="text-xs text-gray-500 mt-1">تم استيرادها</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                <p className="text-xs text-gray-500 mt-1">تم تخطيها</p>
              </div>
            </div>
            {importResult.conflicts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">تفاصيل الملفات المتخطاة:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResult.conflicts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                      <span className="font-medium text-gray-700">{c.name}</span>
                      <span className="text-gray-400">{c.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== تغيير كلمة المرور ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1">تغيير كلمة المرور</h3>
              <p className="text-sm text-gray-500 mb-4">تغيير كلمة مرور الدخول. كلمة المرور الافتراضية هي 12345.</p>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none text-sm bg-gray-50 text-right"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="4 أحرف على الأقل"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none text-sm bg-gray-50 text-right"
                    required
                    minLength={4}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none text-sm bg-gray-50 text-right"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-6 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60 text-sm"
                >
                  {pwdLoading ? "جاري الحفظ..." : "تغيير كلمة المرور"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ===== ملاحظة تقنية ===== */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">ملاحظة مهمة</p>
          <p className="text-xs text-amber-600">
            البيانات مخزنة محلياً في المتصفح (IndexedDB). يُنصح بتصدير نسخة احتياطية بانتظام لتجنب فقدان البيانات عند مسح ذاكرة المتصفح.
          </p>
        </div>
      </div>
    </div>
  );
}
