// ============================================================
// شريط التنقل الثابت — مع عداد مواعيد اليوم
// ============================================================
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { getAllAppointments, todayISO } from "../lib/db";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [todayCount, setTodayCount] = useState(0);

  // تحميل عدد مواعيد اليوم القادمة
  useEffect(() => {
    const today = todayISO();
    getAllAppointments().then((appts) => {
      setTodayCount(appts.filter((a) => a.date === today && a.status === "pending").length);
    }).catch(() => {});
  }, [location]); // يُعاد عند تغيير الصفحة

  function handleLogout() {
    localStorage.removeItem("isLoggedIn");
    setLocation("/");
  }

  const navItems = [
    { path: "/dashboard",    label: "الملفات"    },
    { path: "/appointments", label: "المواعيد",  badge: todayCount },
    { path: "/accounting",   label: "المحاسبة"  },
    { path: "/statistics",   label: "الإحصائيات" },
    { path: "/admin",        label: "الإدارة"    },
  ];

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-50 bg-white border-b border-sky-100 no-print"
      style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.08)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <Logo />

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    location === item.path
                      ? "bg-sky-50 text-sky-600 border border-sky-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-sky-600"
                  }`}
                  data-testid={`nav-${item.label}`}
                >
                  {item.label}
                  {/* عداد مواعيد اليوم */}
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </a>
              </Link>
            ))}

            <button
              onClick={handleLogout}
              className="mr-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
              data-testid="button-logout"
            >
              خروج
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
