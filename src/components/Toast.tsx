// ============================================================
// مكون الإشعارات - يظهر ويختفي تلقائياً
// ============================================================
import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning";
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "bg-emerald-500 border-emerald-600",
    error: "bg-red-500 border-red-600",
    warning: "bg-amber-500 border-amber-600",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "!",
  };

  return (
    <div
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div
        className={`${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold min-w-[200px] justify-center`}
      >
        <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
          {icons[type]}
        </span>
        {message}
      </div>
    </div>
  );
}

// مدير الإشعارات
interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

let toastCounter = 0;
const toastListeners: ((toast: ToastItem | null) => void)[] = [];

export function showToast(message: string, type: "success" | "error" | "warning" = "success") {
  const toast: ToastItem = { id: toastCounter++, message, type };
  toastListeners.forEach((l) => l(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (toast: ToastItem | null) => {
      if (toast) {
        setToasts((prev) => [...prev, toast]);
      }
    };
    toastListeners.push(listener);
    return () => {
      const idx = toastListeners.indexOf(listener);
      if (idx >= 0) toastListeners.splice(idx, 1);
    };
  }, []);

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
