// ============================================================
// صفحة المحاسبة — الإيرادات + المصاريف + طباعة + تعديل
// ============================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import { ToastContainer, showToast } from "../components/Toast";
import { useAutoSave } from "../hooks/use-auto-save";
import {
  getAllPatients, getAllExpenses, saveExpense, deleteExpense,
  parseAmount, formatId, formatDateAr, todayISO, Expense,
} from "../lib/db";

const CATEGORIES = ["رواتب", "إيجار", "مستلزمات", "فواتير", "صيانة", "أخرى"];
const CAT_COLORS: Record<string, string> = {
  رواتب: "bg-violet-100 text-violet-700", إيجار: "bg-orange-100 text-orange-700",
  مستلزمات: "bg-sky-100 text-sky-700",   فواتير: "bg-amber-100 text-amber-700",
  صيانة: "bg-teal-100 text-teal-700",    أخرى: "bg-gray-100 text-gray-600",
};

interface FilteredPayment {
  patientId: number; patientName: string;
  paymentCount: number;
  totalPaidUSD: number; totalPaidSYP: number;
  totalTreatmentUSD: number; totalTreatmentSYP: number;
}

export default function Accounting() {
  const todayStr  = todayISO();
  const todayDate = new Date(todayStr);

  const [patients,  setPatients]  = useState<Awaited<ReturnType<typeof getAllPatients>>>([]);
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"income" | "expenses">("income");

  const [year,  setYear]  = useState(todayDate.getFullYear());
  const [month, setMonth] = useState<number | "">(todayDate.getMonth() + 1);
  const [day,   setDay]   = useState<number | "">(todayDate.getDate());
  const [nameSearch, setNameSearch] = useState("");

  // ─── نموذج الإضافة / التعديل ───
  const [showForm,      setShowForm]      = useState(false);
  const [editingExp,    setEditingExp]    = useState<Expense | null>(null);
  const [newDesc,       setNewDesc]       = useState("");
  const [newAmount,     setNewAmount]     = useState("");
  const [newCurrency,   setNewCurrency]   = useState<"USD" | "SYP">("SYP");
  const [newCategory,   setNewCategory]   = useState("أخرى");
  const [newDate,       setNewDate]       = useState(todayStr);
  const [saving,        setSaving]        = useState(false);

  // حفظ تلقائي للمسودات
  const draftAutoSave = useAutoSave("draft_expense");

  // استعادة المسودة عند فتح النموذج
  useEffect(() => {
    if (showForm) {
      const draft = draftAutoSave.load<{
        desc: string; amount: string; currency: "USD"|"SYP"; category: string; date: string;
      }>();
      if (draft && !editingExp) {
        setNewDesc(draft.desc);
        setNewAmount(draft.amount);
        setNewCurrency(draft.currency);
        setNewCategory(draft.category);
        setNewDate(draft.date);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  // حفظ مسودة عند تغيير الحقول
  useEffect(() => {
    if (!showForm || editingExp) return;
    draftAutoSave.save({ desc: newDesc, amount: newAmount, currency: newCurrency, category: newCategory, date: newDate });
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [pats, exps] = await Promise.all([getAllPatients(), getAllExpenses()]);
    setPatients(pats); setExpenses(exps); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function matchesDate(dateYMD: string) {
    const [y, m, d] = dateYMD.split("-").map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    if (y !== year) return false;
    if (month !== "" && m !== Number(month)) return false;
    if (day !== "" && month !== "" && d !== Number(day)) return false;
    return true;
  }

  const dateResults = useMemo<FilteredPayment[]>(() => {
    const out: FilteredPayment[] = [];
    for (const patient of patients) {
      let cnt = 0, paidUSD = 0, paidSYP = 0, treatUSD = 0, treatSYP = 0;
      for (const row of patient.treatments) {
        if (!row.date || !row.paidAmount) continue;
        const p = parseAmount(row.paidAmount); if (p === 0) continue;
        const parts = row.date.split("/"); if (parts.length !== 3) continue;
        const [d, m, y] = parts.map(Number); if (isNaN(d) || isNaN(m) || isNaN(y)) continue;
        if (y !== year) continue;
        if (month !== "" && m !== Number(month)) continue;
        if (day !== "" && month !== "" && d !== Number(day)) continue;
        cnt++;
        const treat = parseAmount(row.treatmentAmount);
        if (row.currency === "USD") { paidUSD += p; treatUSD += treat; }
        else { paidSYP += p; treatSYP += treat; }
      }
      if (cnt > 0) out.push({ patientId: patient.id, patientName: patient.name, paymentCount: cnt, totalPaidUSD: paidUSD, totalPaidSYP: paidSYP, totalTreatmentUSD: treatUSD, totalTreatmentSYP: treatSYP });
    }
    return out.sort((a, b) => (b.totalPaidUSD + b.totalPaidSYP) - (a.totalPaidUSD + a.totalPaidSYP));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, year, month, day]);

  const incomeResults = useMemo<FilteredPayment[]>(() => {
    const q = nameSearch.trim();
    if (!q) return dateResults;
    return dateResults.filter((r) => r.patientName.includes(q) || String(r.patientId).includes(q));
  }, [dateResults, nameSearch]);

  const filteredExpenses = useMemo(() =>
    expenses.filter((e) => matchesDate(e.date)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [expenses, year, month, day]);

  // مجاميع ثنائية العملة
  const totalIncomeUSD    = incomeResults.reduce((s, r) => s + r.totalPaidUSD, 0);
  const totalIncomeSYP    = incomeResults.reduce((s, r) => s + r.totalPaidSYP, 0);
  const totalTreatmentUSD = incomeResults.reduce((s, r) => s + r.totalTreatmentUSD, 0);
  const totalTreatmentSYP = incomeResults.reduce((s, r) => s + r.totalTreatmentSYP, 0);
  const totalRemainingUSD = totalTreatmentUSD - totalIncomeUSD;
  const totalRemainingSYP = totalTreatmentSYP - totalIncomeSYP;
  const totalExpensesUSD  = filteredExpenses.filter((e) => e.currency === "USD").reduce((s, e) => s + e.amount, 0);
  const totalExpensesSYP  = filteredExpenses.filter((e) => e.currency !== "USD").reduce((s, e) => s + e.amount, 0);
  const netProfitUSD      = totalIncomeUSD - totalExpensesUSD;
  const netProfitSYP      = totalIncomeSYP - totalExpensesSYP;

  // ─── فتح نموذج إضافة ───
  function openAddForm() {
    setEditingExp(null);
    setNewDesc(""); setNewAmount(""); setNewCurrency("SYP"); setNewCategory("أخرى"); setNewDate(todayStr);
    setShowForm(true);
  }

  // ─── فتح نموذج تعديل ───
  function openEditForm(exp: Expense) {
    setEditingExp(exp);
    setNewDesc(exp.description);
    setNewAmount(String(exp.amount));
    setNewCurrency(exp.currency);
    setNewCategory(exp.category);
    setNewDate(exp.date);
    setShowForm(true);
  }

  // ─── حفظ (إضافة أو تعديل) ───
  async function handleSave() {
    const amt = parseFloat(newAmount.replace(/,/g, ""));
    if (!newDesc.trim()) { showToast("أدخل وصف المصروف", "error"); return; }
    if (!amt || amt <= 0) { showToast("أدخل مبلغاً صحيحاً",  "error"); return; }
    setSaving(true);
    const exp: Expense = {
      ...(editingExp?.id ? { id: editingExp.id } : {}),
      description: newDesc.trim(), amount: amt,
      currency: newCurrency,
      date: newDate, category: newCategory,
      createdAt: editingExp?.createdAt ?? new Date().toISOString(),
    };
    await saveExpense(exp);
    setShowForm(false); setEditingExp(null);
    draftAutoSave.clear();
    await load();
    showToast(editingExp ? "تم تحديث المصروف" : "تم حفظ المصروف", "success");
    setSaving(false);
  }

  function cancelForm() { setShowForm(false); setEditingExp(null); }

  async function handleDelete(exp: Expense) {
    if (!exp.id) return;
    if (!confirm(`حذف "${exp.description}"؟`)) return;
    await deleteExpense(exp.id);
    setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
    showToast("تم حذف المصروف", "success");
  }

  function openPatient(id: number) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${base}/patient/${id}`, "_blank");
  }

  // ─── طباعة التقرير ───
  function handlePrint() {
    const win = window.open("", "_blank", "width=850,height=700");
    if (!win) return;
    const incRows = incomeResults.map((r) => {
      const paidStr = [r.totalPaidUSD > 0 ? `$${r.totalPaidUSD.toLocaleString("en-US")}` : "", r.totalPaidSYP > 0 ? `${r.totalPaidSYP.toLocaleString("en-US")} ل.س` : ""].filter(Boolean).join(" + ");
      return `<tr><td>${formatId(r.patientId)}</td><td>${r.patientName}</td><td>${r.paymentCount}</td><td style="font-weight:bold;color:#10b981">${paidStr}</td></tr>`;
    }).join("");
    const expRows = filteredExpenses.map((e) => {
      const amtStr = e.currency === "USD" ? `$${e.amount.toLocaleString("en-US")}` : `${e.amount.toLocaleString("en-US")} ل.س`;
      return `<tr><td>${formatDateAr(e.date)}</td><td>${e.description}</td><td>${e.category}</td><td style="font-weight:bold;color:#ef4444">${amtStr}</td></tr>`;
    }).join("");
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
<title>تقرير المحاسبة</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
  body{font-family:'Tajawal',sans-serif;padding:30px;direction:rtl;background:#fff;color:#1f2937}
  h1{color:#0ea5e9;font-size:22px;margin-bottom:4px}
  .period{color:#6b7280;font-size:14px;margin-bottom:24px}
  .cards{display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
  .card{flex:1;min-width:150px;padding:16px;border-radius:12px;text-align:center}
  .card p{margin:0;font-size:12px;color:#6b7280}.card .val{font-size:22px;font-weight:700;margin-top:4px}
  .c-green{background:#f0fdf4;border:1px solid #bbf7d0}.c-red{background:#fef2f2;border:1px solid #fecaca}
  .c-blue{background:#eff6ff;border:1px solid #bfdbfe}.c-amber{background:#fffbeb;border:1px solid #fde68a}
  h2{font-size:16px;color:#374151;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #f3f4f6}
  table{width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px}
  th{background:#f8fafc;padding:10px 12px;text-align:right;border:1px solid #e2e8f0;font-weight:700;color:#374151}
  td{padding:9px 12px;border:1px solid #f1f5f9;color:#374151}
  tr:nth-child(even) td{background:#fafafa}
  @media print{button{display:none}}
</style></head><body>
<h1>تقرير المحاسبة</h1>
<p class="period">الفترة: ${dateLabel}</p>
<div class="cards">
  <div class="card c-green"><p>الإيرادات</p><div class="val" style="color:#10b981;font-size:16px">$${totalIncomeUSD.toLocaleString("en-US")}</div><div class="val" style="color:#10b981;font-size:16px">${totalIncomeSYP.toLocaleString("en-US")} ل.س</div></div>
  <div class="card c-red"><p>المصاريف</p><div class="val" style="color:#ef4444;font-size:16px">$${totalExpensesUSD.toLocaleString("en-US")}</div><div class="val" style="color:#ef4444;font-size:16px">${totalExpensesSYP.toLocaleString("en-US")} ل.س</div></div>
  <div class="card c-blue"><p>صافي الربح</p><div class="val" style="color:${netProfitUSD >= 0 ? "#0ea5e9" : "#ef4444"};font-size:16px">${netProfitUSD < 0 ? "-" : ""}$${Math.abs(netProfitUSD).toLocaleString("en-US")}</div><div class="val" style="color:${netProfitSYP >= 0 ? "#0ea5e9" : "#ef4444"};font-size:16px">${netProfitSYP < 0 ? "-" : ""}${Math.abs(netProfitSYP).toLocaleString("en-US")} ل.س</div></div>
  <div class="card c-amber"><p>متبقي العلاجات</p><div class="val" style="color:#d97706;font-size:16px">$${totalRemainingUSD.toLocaleString("en-US")}</div><div class="val" style="color:#d97706;font-size:16px">${totalRemainingSYP.toLocaleString("en-US")} ل.س</div></div>
</div>
${incomeResults.length > 0 ? `<h2>الإيرادات (${incomeResults.length} مريض)</h2>
<table><thead><tr><th>رقم الملف</th><th>اسم المريض</th><th>عدد الدفعات</th><th>المدفوع</th></tr></thead>
<tbody>${incRows}</tbody></table>` : ""}
${filteredExpenses.length > 0 ? `<h2>المصاريف (${filteredExpenses.length} مصروف)</h2>
<table><thead><tr><th>التاريخ</th><th>الوصف</th><th>الفئة</th><th>المبلغ</th></tr></thead>
<tbody>${expRows}</tbody></table>` : ""}
<script>window.onload=function(){window.print();}</script>
</body></html>`);
    win.document.close();
  }

  const currentYear = todayDate.getFullYear();
  const years  = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    {value:1,label:"يناير"},{value:2,label:"فبراير"},{value:3,label:"مارس"},
    {value:4,label:"أبريل"},{value:5,label:"مايو"},{value:6,label:"يونيو"},
    {value:7,label:"يوليو"},{value:8,label:"أغسطس"},{value:9,label:"سبتمبر"},
    {value:10,label:"أكتوبر"},{value:11,label:"نوفمبر"},{value:12,label:"ديسمبر"},
  ];
  const dateLabel =
    day !== "" && month !== ""
      ? `يوم ${day}/${String(Number(month)).padStart(2,"0")}/${year}`
      : month !== "" ? `${months[Number(month)-1]?.label} ${year}` : `سنة ${year}`;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar /><ToastContainer />

      <div className="pt-20 max-w-4xl mx-auto px-4 pb-12">

        {/* رأس الصفحة */}
        <div className="flex items-center justify-between mt-4 mb-5">
          <h1 className="text-xl font-bold text-sky-700">تقارير المحاسبة</h1>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-sky-300 text-gray-600 hover:text-sky-600 rounded-xl text-sm font-semibold transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة التقرير
          </button>
        </div>

        {/* فلاتر التاريخ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-600 mb-4">فلترة حسب التاريخ</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">السنة *</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="px-4 py-2.5 rounded-xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-sm bg-white font-semibold text-sky-700">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">الشهر <span className="text-gray-400 font-normal">(اختياري)</span></label>
              <select value={month} onChange={(e) => { const v=e.target.value; setMonth(v===""?"":Number(v)); if(v==="")setDay(""); }}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-white">
                <option value="">كل الأشهر</option>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">اليوم <span className="text-gray-400 font-normal">(يحتاج شهراً)</span></label>
              <select value={day} onChange={(e) => setDay(e.target.value===""?"":Number(e.target.value))} disabled={month===""}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">كل الأيام</option>
                {Array.from({length:31},(_,i)=>i+1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs font-semibold text-sky-600">{dateLabel}</div>
          </div>
        </div>

        {/* بطاقات المجاميع - ثنائي العملة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border-2 border-emerald-100 p-4 text-center">
            <p className="text-xs font-semibold text-gray-500 mb-1">الإيرادات</p>
            <p className="text-lg font-bold text-emerald-600">${totalIncomeUSD.toLocaleString("en-US")}</p>
            <p className="text-sm font-bold text-emerald-500">{totalIncomeSYP.toLocaleString("en-US")} ل.س</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-red-100 p-4 text-center">
            <p className="text-xs font-semibold text-gray-500 mb-1">المصاريف</p>
            <p className="text-lg font-bold text-red-500">${totalExpensesUSD.toLocaleString("en-US")}</p>
            <p className="text-sm font-bold text-red-400">{totalExpensesSYP.toLocaleString("en-US")} ل.س</p>
          </div>
          <div className={`bg-white rounded-2xl border-2 p-4 text-center ${netProfitUSD>=0&&netProfitSYP>=0?"border-sky-100":"border-red-200"}`}>
            <p className="text-xs font-semibold text-gray-500 mb-1">صافي الربح</p>
            <p className={`text-lg font-bold ${netProfitUSD>=0?"text-sky-700":"text-red-600"}`}>
              {netProfitUSD<0&&<span className="text-sm">-</span>}{Math.abs(netProfitUSD).toLocaleString("en-US")}$
            </p>
            <p className={`text-sm font-bold ${netProfitSYP>=0?"text-sky-600":"text-red-500"}`}>
              {netProfitSYP<0&&<span className="text-sm">-</span>}{Math.abs(netProfitSYP).toLocaleString("en-US")} ل.س
            </p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-amber-100 p-4 text-center">
            <p className="text-xs font-semibold text-gray-500 mb-1">متبقي العلاجات</p>
            <p className="text-lg font-bold text-amber-600">${totalRemainingUSD.toLocaleString("en-US")}</p>
            <p className="text-sm font-bold text-amber-500">{totalRemainingSYP.toLocaleString("en-US")} ل.س</p>
          </div>
        </div>

        {/* التبويبات */}
        <div className="flex gap-2 mb-5 border-b border-gray-200">
          {([["income","الإيرادات",dateResults.length,"bg-emerald-100 text-emerald-600"],
             ["expenses","المصاريف",filteredExpenses.length,"bg-red-100 text-red-500"]] as const).map(([key,label,cnt,clr])=>(
            <button key={key} onClick={()=>setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${activeTab===key?"border-sky-500 text-sky-600":"border-transparent text-gray-400 hover:text-gray-600"}`}>
              {label}
              {cnt>0&&<span className={`mr-2 text-xs font-semibold px-1.5 py-0.5 rounded-lg ${clr}`}>{cnt}</span>}
            </button>
          ))}
        </div>

        {/* ───── تبويب الإيرادات ───── */}
        {activeTab==="income" && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" value={nameSearch} onChange={(e)=>setNameSearch(e.target.value)}
                placeholder="ابحث باسم المريض أو رقم الملف..."
                className="flex-1 text-sm bg-transparent outline-none text-right placeholder-gray-400"/>
              {nameSearch&&<button onClick={()=>setNameSearch("")} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-400">
                <div className="animate-spin w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full mx-auto mb-3"/>جاري التحميل...
              </div>
            ) : incomeResults.length===0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                {nameSearch.trim()
                  ? <><p className="text-base mb-1">لا نتائج للبحث عن "{nameSearch}"</p><p className="text-sm">جرب اسماً مختلفاً</p></>
                  : <><p className="text-base mb-1">لا توجد مدفوعات في هذه الفترة</p><p className="text-sm">جرب فترة زمنية مختلفة</p></>}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500 font-medium">{incomeResults.length} مريض • {incomeResults.reduce((s,r)=>s+r.paymentCount,0)} دفعة</p>
                  <p className="text-xs text-gray-400">
                    <span className="text-emerald-600 font-semibold">${totalIncomeUSD.toLocaleString("en-US")}</span>
                    <span className="mx-1">|</span>
                    <span className="text-emerald-500 font-semibold">{totalIncomeSYP.toLocaleString("en-US")} ل.س</span>
                  </p>
                  {nameSearch.trim()&&<span className="text-xs bg-sky-100 text-sky-600 font-semibold px-2.5 py-1 rounded-lg">نتائج: "{nameSearch}"</span>}
                </div>
                <div className="space-y-2">
                  {incomeResults.map((r)=>(
                    <div key={r.patientId} onClick={()=>openPatient(r.patientId)}
                      className="patient-card flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100 cursor-pointer hover:border-sky-200 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs text-sky-400 font-medium">رقم</span>
                        <span className="text-sm font-bold text-sky-700">{formatId(r.patientId)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">
                          {nameSearch.trim() ? highlightMatch(r.patientName, nameSearch.trim()) : r.patientName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.paymentCount} {r.paymentCount===1?"دفعة":"دفعات"}</p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        {r.totalPaidUSD > 0 && <p className="text-sm font-bold text-emerald-600">${r.totalPaidUSD.toLocaleString("en-US")}</p>}
                        {r.totalPaidSYP > 0 && <p className="text-sm font-bold text-emerald-500">{r.totalPaidSYP.toLocaleString("en-US")} ل.س</p>}
                        <p className="text-xs text-gray-400">مجموع المدفوع</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ───── تبويب المصاريف ───── */}
        {activeTab==="expenses" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 font-medium">
                {filteredExpenses.length>0
                  ? `${filteredExpenses.length} مصروف • ${totalExpenses.toLocaleString("en-US")} ل.س`
                  : "لا توجد مصاريف في هذه الفترة"}
              </p>
              <button onClick={showForm ? cancelForm : openAddForm}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  showForm ? "bg-gray-100 text-gray-600" : "bg-red-500 hover:bg-red-600 text-white shadow-sm"}`}>
                {showForm ? "إلغاء" : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>إضافة مصروف</>}
              </button>
            </div>

            {/* نموذج الإضافة / التعديل */}
            {showForm && (
              <div className="bg-white rounded-2xl border-2 border-red-100 p-5 mb-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">
                  {editingExp ? "تعديل المصروف" : "مصروف جديد"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">الوصف *</label>
                    <input type="text" value={newDesc} onChange={(e)=>setNewDesc(e.target.value)}
                      placeholder="مثال: إيجار الشهر، راتب مساعد..."
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">المبلغ *</label>
                    <div className="flex gap-2">
                      <input type="number" value={newAmount} onChange={(e)=>setNewAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none text-sm"/>
                      <select value={newCurrency} onChange={(e)=>setNewCurrency(e.target.value as "USD"|"SYP")}
                        className="px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none text-sm bg-white font-semibold cursor-pointer">
                        <option value="SYP">ل.س</option>
                        <option value="USD">$</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">الفئة</label>
                    <select value={newCategory} onChange={(e)=>setNewCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none text-sm bg-white">
                      {CATEGORIES.map((c)=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">التاريخ</label>
                    <input type="date" value={newDate} onChange={(e)=>setNewDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-red-300 focus:outline-none text-sm"/>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all">
                    {saving ? "جاري الحفظ..." : editingExp ? "حفظ التعديلات" : "حفظ المصروف"}
                  </button>
                  <button onClick={cancelForm}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all">
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* قائمة المصاريف */}
            {filteredExpenses.length===0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
                </svg>
                <p className="text-base mb-1">لا توجد مصاريف في هذه الفترة</p>
                <p className="text-sm">أضف مصروفاً بالضغط على الزر أعلاه</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map((exp)=>(
                  <div key={exp.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100">
                    <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate text-sm">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${CAT_COLORS[exp.category]??"bg-gray-100 text-gray-600"}`}>{exp.category}</span>
                        <span className="text-xs text-gray-400">{formatDateAr(exp.date)}</span>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-red-500">
                        {exp.currency === "USD" ? `$${exp.amount.toLocaleString("en-US")}` : `${exp.amount.toLocaleString("en-US")} ل.س`}
                      </p>
                    </div>
                    {/* تعديل */}
                    <button onClick={()=>openEditForm(exp)}
                      className="w-8 h-8 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-500 flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    {/* حذف */}
                    <button onClick={()=>handleDelete(exp)}
                      className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const idx = text.indexOf(query);
  if (idx===-1) return text;
  return <>{text.slice(0,idx)}<mark className="bg-sky-200 text-sky-900 rounded px-0.5 not-italic font-bold">{text.slice(idx,idx+query.length)}</mark>{text.slice(idx+query.length)}</>;
}
