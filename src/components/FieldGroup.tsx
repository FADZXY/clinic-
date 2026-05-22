// ============================================================
// مكون المجموعة المحاطة بحد مع تسمية تقطع الحد العلوي
// يستخدم في جميع أقسام النموذج
// ============================================================
interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export default function FieldGroup({ label, children, className = "" }: FieldGroupProps) {
  return (
    <div className={`relative border-2 border-sky-200 rounded-xl p-4 pt-5 ${className}`}>
      {/* التسمية تقطع الحد العلوي من جهة اليمين */}
      <span className="absolute -top-3 right-4 bg-white px-2 text-xs font-bold text-sky-600">
        {label}
      </span>
      {children}
    </div>
  );
}
