// ============================================================
// مخطط أسنان الإنسان - نظام FDI الدولي
// يدعم: تحديد الأسنان، ملاحظات، تلوين حسب الحالة
// ============================================================
import { useState, useEffect, useRef } from "react";
import AdultDentalChart from "./AdultDentalChart";
import ChildDentalChart from "./ChildDentalChart";

interface ToothDiagramProps {
  treatedTeeth: string[];
  toothNotes: Record<string, string>;
  onNotesChange: (notes: Record<string, string>) => void;
  isChild?: boolean;
}

function getStatus(
  key: string,
  treatedTeeth: string[],
  toothNotes: Record<string, string>,
): "both" | "treated" | "noted" | "normal" {
  const treated = treatedTeeth.includes(key);
  const noted = !!toothNotes[key]?.trim();
  if (treated && noted) return "both";
  if (treated) return "treated";
  if (noted) return "noted";
  return "normal";
}

function buildColorMap(
  treatedTeeth: string[],
  toothNotes: Record<string, string>,
): { colors: Record<number, string>; strokes: Record<number, string> } {
  const colors: Record<number, string> = {};
  const strokes: Record<number, string> = {};
  const ranges = [
    [11, 18], [21, 28], [31, 38], [41, 48],
    [51, 55], [61, 65], [71, 75], [81, 85],
  ];
  for (const [lo, hi] of ranges) {
    for (let n = lo; n <= hi; n++) {
      const key = String(n);
      const status = getStatus(key, treatedTeeth, toothNotes);
      if (status === "both") {
        colors[n] = "#f3e8ff";
        strokes[n] = "#a855f7";
      } else if (status === "treated") {
        colors[n] = "#e0f2fe";
        strokes[n] = "#0ea5e9";
      } else if (status === "noted") {
        colors[n] = "#fef3c7";
        strokes[n] = "#f59e0b";
      }
    }
  }
  return { colors, strokes };
}

export default function ToothDiagram({ treatedTeeth, toothNotes, onNotesChange, isChild = false }: ToothDiagramProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNoteValue(selectedTooth ? (toothNotes[selectedTooth] || "") : "");
  }, [selectedTooth]);

  function handleNoteChange(value: string) {
    setNoteValue(value);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      if (!selectedTooth) return;
      const updated = { ...toothNotes };
      if (value.trim()) {
        updated[selectedTooth] = value.trim();
      } else {
        delete updated[selectedTooth];
      }
      onNotesChange(updated);
      closeTimer.current = setTimeout(() => setSelectedTooth(null), 2000);
    }, 700);
  }

  function handleToothSelect(num: number) {
    const key = String(num);
    setSelectedTooth((prev) => (prev === key ? null : key));
  }

  const { colors, strokes } = buildColorMap(treatedTeeth, toothNotes);

  return (
    <div dir="rtl">
      {isChild ? (
        <ChildDentalChart
          onToothSelect={handleToothSelect}
          selectedTooth={selectedTooth ? Number(selectedTooth) : null}
          toothColors={colors}
          toothStrokes={strokes}
        />
      ) : (
        <AdultDentalChart
          onToothSelect={handleToothSelect}
          selectedTooth={selectedTooth ? Number(selectedTooth) : null}
          toothColors={colors}
          toothStrokes={strokes}
        />
      )}

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
