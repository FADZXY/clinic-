// ============================================================
// مكون اللوغو - يظهر في أعلى الصفحة ويختفي عند النزول
// ويعود عند الصعود لأعلى
// ============================================================
import { useState, useEffect } from "react";

export default function Logo() {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY < lastScrollY) {
        // التمرير للأعلى - إظهار اللوغو
        setVisible(true);
      } else {
        // التمرير للأسفل - إخفاء اللوغو
        setVisible(false);
      }
      setLastScrollY(currentScrollY);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className="flex items-center gap-3 transition-all duration-300 overflow-hidden"
      style={{
        maxHeight: visible ? "60px" : "0px",
        opacity: visible ? 1 : 0,
        marginBottom: visible ? "0" : "0",
      }}
    >
      {/* أيقونة الأسنان */}
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-sky-100 flex-shrink-0">
        <svg viewBox="0 0 64 64" className="w-7 h-7" fill="none">
          <path
            d="M32 8C24 8 18 14 18 22C18 25 19 28 20.5 31L26 42L32 52L38 42L43.5 31C45 28 46 25 46 22C46 14 40 8 32 8Z"
            fill="#0ea5e9"
          />
          <circle cx="32" cy="22" r="6" fill="white" />
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-bold text-sky-700 leading-tight">عيادة الأسنان</h1>
        <p className="text-xs text-gray-400">نظام إدارة المرضى</p>
      </div>
    </div>
  );
}
