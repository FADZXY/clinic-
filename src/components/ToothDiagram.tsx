// ============================================================
// مخطط أسنان الإنسان - نظام FDI الدولي
// يدعم: تحديد الأسنان، ملاحظات، تلوين حسب الحالة
// ============================================================
import { useState, useEffect, useRef } from "react";

interface ToothDiagramProps {
  treatedTeeth: string[];
  toothNotes: Record<string, string>;
  onNotesChange: (notes: Record<string, string>) => void;
}

// ترتيب الأسنان - نظام FDI (يمين المريض يظهر على اليسار في الخريطة)
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];

// عرض السن بناءً على نوعه (الرقم الثاني في FDI)
function toothWidth(num: number): string {
  const t = num % 10;
  if (t >= 6) return "w-9";   // ضرس كبير
  if (t >= 4) return "w-7";   // ضرس صغير
  return "w-6";               // ثنية / ناب
}

export default function ToothDiagram({ treatedTeeth, toothNotes, onNotesChange }: ToothDiagramProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [hoveredTooth,  setHoveredTooth]  = useState<string | null>(null);
  const [noteValue,     setNoteValue]     = useState("");
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // مزامنة حقل الملاحظة عند تغيير السن المحدد
  useEffect(() => {
    setNoteValue(selectedTooth ? (toothNotes[selectedTooth] || "") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTooth]);

  // تحديد حالة السن
  function getStatus(key: string): "both" | "treated" | "noted" | "normal" {
    const treated = treatedTeeth.includes(key);
    const noted   = !!toothNotes[key]?.trim();
    if (treated && noted) return "both";
    if (treated) return "treated";
    if (noted)   return "noted";
    return "normal";
  }

  // حفظ الملاحظة بعد 700ms من التوقف
  function handleNoteChange(value: string) {
    setNoteValue(value);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (saveTimer.current)  clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      if (!selectedTooth) return;
      const updated = { ...toothNotes };
      if (value.trim()) {
        updated[selectedTooth] = value.trim();
      } else {
        delete updated[selectedTooth];
      }
      onNotesChange(updated);
      // إغلاق تلقائي بعد ثانيتين من الحفظ
      closeTimer.current = setTimeout(() => setSelectedTooth(null), 2000);
    }, 700);
  }

  // رسم سن واحد
  function renderTooth(num: number) {
    const key       = String(num);
    const status    = getStatus(key);
    const isSelected = selectedTooth === key;
    const isHovered  = hoveredTooth  === key;
    const note      = toothNotes[key] || "";
    const wClass    = toothWidth(num);

    let colorClass = "bg-white border-gray-300 text-gray-500 hover:bg-sky-50 hover:border-sky-300";
    if (status === "both")    colorClass = "bg-purple-100 border-purple-500 text-purple-900";
    else if (status === "treated") colorClass = "bg-sky-100 border-sky-500 text-sky-900";
    else if (status === "noted")   colorClass = "bg-amber-100 border-amber-400 text-amber-900";

    const ringClass = isSelected ? "ring-2 ring-sky-500 ring-offset-1 z-10" : "";

    return (
      <div key={num} className="relative">
        <button
          type="button"
          className={`relative ${wClass} h-8 rounded-md border-2 text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer select-none ${colorClass} ${ringClass}`}
          onClick={() => setSelectedTooth(isSelected ? null : key)}
          onMouseEnter={() => setHoveredTooth(key)}
          onMouseLeave={() => setHoveredTooth(null)}
          title={`سن ${num}${note ? ` — ${note}` : ""}`}
        >
          {num}
        </button>

        {/* Tooltip عند التحويم (فقط إذا كانت هناك ملاحظة) */}
        {isHovered && note && !isSelected && (
          <div
            className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none"
            style={{ minWidth: "70px", maxWidth: "160px", whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "right" }}
          >
            {note}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div dir="rtl">

      {/* ===== خريطة الأسنان ===== */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max mx-auto">

          {/* الفك العلوي */}
          <div className="flex justify-center items-end gap-px mb-0.5">
            <div className="flex gap-px">{UPPER_RIGHT.map(renderTooth)}</div>
            <div className="mx-1.5 self-center h-7 border-r-2 border-dashed border-gray-300" />
            <div className="flex gap-px">{UPPER_LEFT.map(renderTooth)}</div>
          </div>

          {/* خط الإطباق */}
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
            <span className="text-[9px] text-gray-400 whitespace-nowrap px-1">خط الإطباق</span>
            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
          </div>

          {/* الفك السفلي */}
          <div className="flex justify-center items-start gap-px mt-0.5">
            <div className="flex gap-px">{LOWER_RIGHT.map(renderTooth)}</div>
            <div className="mx-1.5 self-center h-7 border-r-2 border-dashed border-gray-300" />
            <div className="flex gap-px">{LOWER_LEFT.map(renderTooth)}</div>
          </div>

        </div>
      </div>

      {/* ===== منطقة تحرير الملاحظة ===== */}
      {selectedTooth && (
        <div
          className="mt-3 p-3 bg-sky-50 rounded-xl border-2 border-sky-200 animate-fadeIn"
          onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
          onMouseLeave={() => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
            closeTimer.current = setTimeout(() => setSelectedTooth(null), 1500);
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-700">
              ملاحظة السن رقم {selectedTooth}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTooth(null)}
              className="text-gray-400 hover:text-gray-600 text-sm leading-none w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <textarea
            value={noteValue}
            onChange={(e) => handleNoteChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-sm bg-white text-right resize-none"
            rows={2}
            placeholder="اكتب ملاحظتك هنا..."
            autoFocus
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            تُحفظ تلقائياً • تُغلق عند إبعاد الفأرة
          </p>
        </div>
      )}

      {/* ===== مفتاح الألوان ===== */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-sky-100 border-2 border-sky-500 inline-block" />
          قيد العلاج
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border-2 border-amber-400 inline-block" />
          عليه ملاحظة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-purple-100 border-2 border-purple-500 inline-block" />
          علاج وملاحظة
        </span>
      </div>
    </div>
  );
}
