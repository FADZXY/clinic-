// ============================================================
// صفحة الإحصائيات وسجل النشاط
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { ToastContainer } from "../components/Toast";
import {
  getAllPatients, getAllExpenses, getAllAppointments,
  parseAmount, formatId, formatDateAr, todayISO,
  Appointment, Expense, Patient,
} from "../lib/db";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_S  = ["ينا","فبر","مار","أبر","ماي","يون","يول","أغس","سبت","أكت","نوف","ديس"];

// ─── مخطط أعمدة ───
function BarChart({ values, color, emptyLabel = "لا بيانات" }: { values: number[]; color: string; emptyLabel?: string }) {
  const max = Math.max(...values, 1);
  const hasData = values.some((v) => v > 0);
  return (
    <div className="flex items-end gap-0.5 h-36">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end relative group cursor-default">
          {v > 0 && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow">
              {v.toLocaleString("en-US")} ل.س
            </div>
          )}
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max(v > 0 ? (v / max) * 100 : 0, v > 0 ? 4 : 0)}%`, background: color }}
          />
          <span className="text-[9px] text-gray-400 mt-1 leading-none">{MONTHS_S[i]}</span>
        </div>
      ))}
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">{emptyLabel}</div>
      )}
    </div>
  );
}

// ─── مخطط مقارنة (إيرادات vs مصاريف) ───
function ComboChart({ income, expenses }: { income: number[]; expenses: number[] }) {
  const max = Math.max(...income, ...expenses, 1);
  return (
    <div className="flex items-end gap-1 h-36">
      {income.map((inc, i) => {
        const exp = expenses[i];
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex items-end gap-0.5" style={{ height: "120px" }}>
              <div className="flex-1 rounded-t-sm bg-emerald-400 transition-all duration-500"
                style={{ height: `${Math.max(inc > 0 ? (inc / max) * 100 : 0, inc > 0 ? 4 : 0)}%` }} />
              <div className="flex-1 rounded-t-sm bg-red-300 transition-all duration-500"
                style={{ height: `${Math.max(exp > 0 ? (exp / max) * 100 : 0, exp > 0 ? 4 : 0)}%` }} />
            </div>
            <span className="text-[9px] text-gray-400 leading-none">{MONTHS_S[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── أنواع النشاط ───
interface ActivityItem {
  sortKey: string;
  type: "patient" | "appointment" | "expense";
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  dateLabel: string;
}

function buildActivity(patients: Patient[], appointments: Appointment[], expenses: Expense[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of patients) {
    if (!p.createdAt) continue;
    items.push({
      sortKey: p.createdAt,
      type: "patient",
      title: p.name,
      subtitle: `ملف رقم #${formatId(p.id)} • ${p.gender === "male" ? "ذكر" : "أنثى"}`,
      badge: "مريض جديد",
      badgeColor: "bg-sky-100 text-sky-700",
      dateLabel: formatDateAr(p.createdAt.split("T")[0]),
    });
  }

  for (const a of appointments) {
    const sortKey = a.date + "T" + (a.time || "00:00") + ":00";
    const statusLabel = a.status === "done" ? "مكتمل" : a.status === "cancelled" ? "ملغى" : "قادم";
    const statusColor = a.status === "done" ? "bg-emerald-100 text-emerald-700" : a.status === "cancelled" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700";
    items.push({
      sortKey,
      type: "appointment",
      title: a.patientName,
      subtitle: `موعد ${a.time || ""} • ${a.notes || "—"}`,
      badge: statusLabel,
      badgeColor: statusColor,
      dateLabel: formatDateAr(a.date),
    });
  }

  for (const e of expenses) {
    const sortKey = (e.createdAt || e.date + "T00:00:00");
    items.push({
      sortKey,
      type: "expense",
      title: e.description,
      subtitle: `${e.category} • ${e.amount.toLocaleString("en-US")} ل.س`,
      badge: "مصروف",
      badgeColor: "bg-red-100 text-red-600",
      dateLabel: formatDateAr(e.date),
    });
  }

  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 80);
}

const ACTIVITY_ICONS: Record<ActivityItem["type"], React.ReactElement> = {
  patient: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  appointment: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  expense: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
};
const ACTIVITY_BG: Record<ActivityItem["type"], string> = {
  patient:     "bg-sky-50 text-sky-500",
  appointment: "bg-violet-50 text-violet-500",
  expense:     "bg-red-50 text-red-400",
};

// ============================================================
// الصفحة
// ============================================================
export default function Statistics() {
  const todayDate = new Date(todayISO());
  const currentYear = todayDate.getFullYear();

  const [patients,     setPatients]     = useState<Patient[]>([]);
  const [expenses,     setExpenses]     = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<"stats" | "activity">("stats");
  const [year,         setYear]         = useState(currentYear);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, e, a] = await Promise.all([getAllPatients(), getAllExpenses(), getAllAppointments()]);
      setPatients(p); setExpenses(e); setAppointments(a);
      setLoading(false);
    })();
  }, []);

  // ─── حسابات الإيرادات الشهرية ───
  const monthlyIncome = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const patient of patients) {
      for (const row of patient.treatments) {
        if (!row.date || !row.paidAmount) continue;
        const paid = parseAmount(row.paidAmount);
        if (paid === 0) continue;
        const parts = row.date.split("/");
        if (parts.length !== 3) continue;
        const [, m, y] = parts.map(Number);
        if (y === year) arr[m - 1] += paid;
      }
    }
    return arr;
  }, [patients, year]);

  // ─── حسابات المصاريف الشهرية ───
  const monthlyExpenses = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const e of expenses) {
      const [y, m] = e.date.split("-").map(Number);
      if (y === year) arr[m - 1] += e.amount;
    }
    return arr;
  }, [expenses, year]);

  // ─── مرضى جدد شهرياً ───
  const monthlyNewPatients = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const p of patients) {
      if (!p.createdAt) continue;
      const d = new Date(p.createdAt);
      if (d.getFullYear() === year) arr[d.getMonth()]++;
    }
    return arr;
  }, [patients, year]);

  // ─── أكثر العلاجات شيوعاً ───
  const topTreatments = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of patients) {
      for (const row of p.treatments) {
        if (row.diagnosis?.trim()) {
          const key = row.diagnosis.trim();
          map[key] = (map[key] || 0) + 1;
        }
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [patients]);

  const maxTreatment = topTreatments[0]?.[1] || 1;

  // ─── مجاميع السنة ───
  const yearIncome   = monthlyIncome.reduce((s, v) => s + v, 0);
  const yearExpenses = monthlyExpenses.reduce((s, v) => s + v, 0);
  const yearNet      = yearIncome - yearExpenses;
  const yearPatients = monthlyNewPatients.reduce((s, v) => s + v, 0);

  // ─── سجل النشاط ───
  const activityItems = useMemo(() =>
    buildActivity(patients, appointments, expenses),
  [patients, appointments, expenses]);

  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Navbar />
        <div className="pt-32 flex justify-center text-gray-400">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full mx-auto mb-3" />
            جاري التحميل...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <ToastContainer />

      <div className="pt-20 max-w-4xl mx-auto px-4 pb-12">

        {/* رأس الصفحة */}
        <div className="flex items-center justify-between mt-4 mb-5">
          <h1 className="text-xl font-bold text-sky-700">الإحصائيات</h1>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 rounded-xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-sm bg-white font-semibold text-sky-700">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* تبويبات */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {([["stats", "الإحصائيات"], ["activity", "سجل النشاط"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${
                activeTab === key
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ===== تبويب الإحصائيات ===== */}
        {activeTab === "stats" && (
          <>
            {/* بطاقات الملخص */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-2xl border-2 border-sky-100 p-4 text-center">
                <p className="text-xs font-semibold text-gray-400 mb-1">مرضى جدد</p>
                <p className="text-2xl font-bold text-sky-700">{yearPatients}</p>
                <p className="text-xs text-gray-400 mt-0.5">هذا العام</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-emerald-100 p-4 text-center">
                <p className="text-xs font-semibold text-gray-400 mb-1">الإيرادات</p>
                <p className="text-lg font-bold text-emerald-600">{(yearIncome / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-400 mt-0.5">ل.س</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-red-100 p-4 text-center">
                <p className="text-xs font-semibold text-gray-400 mb-1">المصاريف</p>
                <p className="text-lg font-bold text-red-500">{(yearExpenses / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-400 mt-0.5">ل.س</p>
              </div>
              <div className={`bg-white rounded-2xl border-2 p-4 text-center ${yearNet >= 0 ? "border-violet-100" : "border-red-200"}`}>
                <p className="text-xs font-semibold text-gray-400 mb-1">صافي الربح</p>
                <p className={`text-lg font-bold ${yearNet >= 0 ? "text-violet-600" : "text-red-600"}`}>
                  {yearNet < 0 ? "-" : ""}{(Math.abs(yearNet) / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-gray-400 mt-0.5">ل.س</p>
              </div>
            </div>

            {/* مخطط المقارنة */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">الإيرادات مقابل المصاريف شهرياً</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"/> إيرادات</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block"/> مصاريف</span>
                </div>
              </div>
              <ComboChart income={monthlyIncome} expenses={monthlyExpenses} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* مخطط المرضى الجدد */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4">مرضى جدد شهرياً</h3>
                <div className="flex items-end gap-0.5 h-36">
                  {monthlyNewPatients.map((v, i) => {
                    const max = Math.max(...monthlyNewPatients, 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end relative group">
                        {v > 0 && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                            {v} مريض
                          </div>
                        )}
                        <div className="w-full rounded-t-md bg-sky-400 transition-all duration-500"
                          style={{ height: `${Math.max(v > 0 ? (v / max) * 100 : 0, v > 0 ? 8 : 0)}%` }} />
                        <span className="text-[9px] text-gray-400 mt-1 leading-none">{MONTHS_S[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* أكثر العلاجات */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4">أكثر العلاجات شيوعاً</h3>
                {topTreatments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-2.5">
                    {topTreatments.map(([name, count]) => (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700 font-medium truncate max-w-[60%]">{name}</span>
                          <span className="text-xs font-bold text-sky-600">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 rounded-full transition-all duration-500"
                            style={{ width: `${(count / maxTreatment) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* مخطط صافي الربح */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">صافي الربح الشهري</h3>
              <div className="flex items-end gap-0.5 h-36">
                {monthlyIncome.map((inc, i) => {
                  const net = inc - monthlyExpenses[i];
                  const maxAbs = Math.max(...monthlyIncome.map((v, j) => Math.abs(v - monthlyExpenses[j])), 1);
                  const pct = Math.max(Math.abs(net) > 0 ? (Math.abs(net) / maxAbs) * 80 : 0, Math.abs(net) > 0 ? 4 : 0);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-center relative group">
                      {net > 0 && (
                        <div className="w-full rounded-t-md bg-violet-400 mb-0.5 transition-all duration-500" style={{ height: `${pct}%` }} />
                      )}
                      <div className="w-0.5 bg-gray-200 h-0.5" />
                      {net < 0 && (
                        <div className="w-full rounded-b-md bg-red-300 mt-0.5 transition-all duration-500" style={{ height: `${pct}%` }} />
                      )}
                      <span className="text-[9px] text-gray-400 absolute bottom-0 leading-none">{MONTHS_S[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-violet-400 inline-block"/> ربح</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-300 inline-block"/> خسارة</span>
              </div>
            </div>
          </>
        )}

        {/* ===== تبويب سجل النشاط ===== */}
        {activeTab === "activity" && (
          <>
            <p className="text-sm text-gray-400 mb-4 font-medium">آخر {activityItems.length} حدث في العيادة</p>
            {activityItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-base">لا توجد بيانات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-gray-100">
                    {/* أيقونة */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ACTIVITY_BG[item.type]}`}>
                      {ACTIVITY_ICONS[item.type]}
                    </div>

                    {/* النص */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                    </div>

                    {/* التاريخ والشارة */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                      <span className="text-xs text-gray-400">{item.dateLabel}</span>
                    </div>
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
