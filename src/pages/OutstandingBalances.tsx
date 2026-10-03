import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { calculatePatientFinancials, getAllPatients, formatId, Patient } from "../lib/db";

interface PatientBalance {
  patient: Patient;
  remainingUSD: number;
  remainingSYP: number;
}

export default function OutstandingBalances() {
  const [patients, setPatients] = useState<PatientBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPatients().then((records) => {
      const balances = records.map((patient): PatientBalance => {
        const financials = calculatePatientFinancials(patient.treatments || [], patient.payments || []);
        return { patient, remainingUSD: financials.remaining.usd, remainingSYP: financials.remaining.syp };
      }).filter((balance) =>
        balance.remainingUSD > 0 || balance.remainingSYP > 0
      );
      setPatients(balances);
      setLoading(false);
    });
  }, []);

  const totalUSD = patients.reduce((sum, balance) => sum + Math.max(0, balance.remainingUSD), 0);
  const totalSYP = patients.reduce((sum, balance) => sum + Math.max(0, balance.remainingSYP), 0);

  function openPatient(patientId: number) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${base}/patient/${patientId}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <main className="pt-20 max-w-5xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-3 mt-4 mb-5">
          <div>
            <h1 className="text-xl font-bold text-sky-700">متبقي العلاجات</h1>
            <p className="text-sm text-gray-500 mt-1">{patients.length} مريض لديهم رصيد مستحق</p>
          </div>
          <div className="text-left">
            <p className="text-lg font-bold text-amber-700">${totalUSD.toLocaleString("en-US")}</p>
            <p className="text-sm font-bold text-amber-600">{totalSYP.toLocaleString("en-US")} ل.س</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">جاري تحميل الأرصدة...</div>
        ) : patients.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl py-12 text-center text-gray-500">
            لا يوجد مرضى عليهم مبالغ مستحقة
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "700px" }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-right text-xs text-gray-600">
                    <th className="px-4 py-3">رقم الملف</th>
                    <th className="px-4 py-3">اسم المريض</th>
                    <th className="px-4 py-3">المتبقي بالدولار</th>
                    <th className="px-4 py-3">المتبقي بالليرة</th>
                    <th className="px-4 py-3">فتح الملف</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((balance) => {
                    return (
                      <tr key={balance.patient.id} className="border-b border-gray-50 hover:bg-sky-50/40">
                        <td className="px-4 py-3 font-semibold text-sky-700">{formatId(balance.patient.id)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{balance.patient.name}</td>
                        <td className="px-4 py-3 font-semibold text-amber-700">{balance.remainingUSD > 0 ? `$${balance.remainingUSD.toLocaleString("en-US")}` : "-"}</td>
                        <td className="px-4 py-3 font-semibold text-amber-700">{balance.remainingSYP > 0 ? `${balance.remainingSYP.toLocaleString("en-US")} ل.س` : "-"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openPatient(balance.patient.id)}
                            className="text-sky-700 hover:text-sky-900 font-semibold">ملف المريض</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}