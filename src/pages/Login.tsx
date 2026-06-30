// ============================================================
// صفحة تسجيل الدخول
// بيانات الدخول: admin / كلمة المرور المحفوظة (افتراضي: 12345)
// ============================================================
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    setTimeout(() => {
      const savedPassword = localStorage.getItem("clinicPassword") || "12345";
      if (username === "admin" && password === savedPassword) {
        localStorage.setItem("isLoggedIn", "true");
        setLocation("/dashboard");
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-white">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-slideUp">
        {/* بطاقة الدخول */}
        <div className="bg-white rounded-2xl shadow-xl border border-sky-100 overflow-hidden">
          {/* رأس البطاقة */}
          <div className="bg-gradient-to-l from-sky-600 to-blue-700 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
                <circle cx="32" cy="32" r="28" fill="#0ea5e9" opacity="0.15" />
                <path d="M32 14 C26 14 22 18 22 24 C22 26 22.5 28 23.5 30 L28 38 L32 44 L36 38 L40.5 30 C41.5 28 42 26 42 24 C42 18 38 14 32 14Z" fill="#0ea5e9" />
                <circle cx="32" cy="24" r="5" fill="white" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">عيادة الأسنان</h1>
            <p className="text-sky-200 text-sm">نظام إدارة ملفات المرضى</p>
          </div>

          {/* نموذج الدخول */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">تسجيل الدخول</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none transition-colors text-right bg-gray-50 focus:bg-white"
                  data-testid="input-username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none transition-colors text-right bg-gray-50 focus:bg-white"
                  data-testid="input-password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-l from-sky-500 to-blue-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md disabled:opacity-60 text-base"
                data-testid="button-login"
              >
                {loading ? "جاري الدخول..." : "دخول"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">نظام محلي - لا يحتاج إنترنت</p>
      </div>
    </div>
  );
}
