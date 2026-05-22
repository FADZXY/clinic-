// ============================================================
// مربع حوار التأكيد - للحذف والإلغاء
// ============================================================
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* خلفية شفافة */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* مربع الحوار */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
        <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              danger
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-sky-500 hover:bg-sky-600 text-white"
            }`}
            data-testid="button-confirm-dialog"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
            data-testid="button-cancel-dialog"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
