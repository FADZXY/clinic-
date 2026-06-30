import { useState, useCallback } from "react";
import { getToothShape } from "./tooth-paths";

interface ToothConfig {
  num: number;
  x: number;
  y: number;
}

const TOOTH_W = 52;
const TOOTH_H = 72;

function buildTeeth(): ToothConfig[] {
  const centerX = 350;
  const spacing = TOOTH_W;
  const baseY_up = 80;
  const baseY_low = 360;
  const archDrop = 4;
  const result: ToothConfig[] = [];

  for (let i = 0; i < 5; i++) {
    result.push({ num: 51 + i, x: centerX - spacing * (0.5 + i), y: baseY_up + i * archDrop });
  }
  for (let i = 0; i < 5; i++) {
    result.push({ num: 61 + i, x: centerX + spacing * (0.5 + i), y: baseY_up + i * archDrop });
  }
  for (let i = 0; i < 5; i++) {
    result.push({ num: 81 + i, x: centerX - spacing * (0.5 + i), y: baseY_low - i * archDrop });
  }
  for (let i = 0; i < 5; i++) {
    result.push({ num: 71 + i, x: centerX + spacing * (0.5 + i), y: baseY_low - i * archDrop });
  }

  return result;
}

const TEETH = buildTeeth();

interface ChildDentalChartProps {
  onToothSelect?: (toothNumber: number) => void;
  onHover?: (toothNumber: number | null) => void;
  selectedTooth?: number | null;
  toothColors?: Record<number, string>;
  toothStrokes?: Record<number, string>;
  className?: string;
}

const DEFAULT_FILL = "#ffffff";
const DEFAULT_STROKE = "#d1d5db";
const GROOVE_STROKE = "#cbd5e1";

export default function ChildDentalChart({
  onToothSelect,
  onHover,
  selectedTooth,
  toothColors,
  toothStrokes,
  className = "",
}: ChildDentalChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const handleClick = useCallback(
    (num: number) => { if (onToothSelect) onToothSelect(num); },
    [onToothSelect],
  );

  const handleHover = useCallback(
    (num: number | null) => {
      setHovered(num);
      if (onHover) onHover(num);
    },
    [onHover],
  );

  return (
    <svg
      viewBox="0 0 700 480"
      className={`w-full h-auto max-w-2xl mx-auto ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="tooth-shadow-child" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
        </filter>
      </defs>

      {TEETH.map((t) => {
        const isSelected = selectedTooth === t.num;
        const isHovered = hovered === t.num;
        const fill = toothColors?.[t.num] ?? DEFAULT_FILL;
        const stroke = toothStrokes?.[t.num] ?? DEFAULT_STROKE;

        let fillColor = fill;
        let strokeColor = stroke;
        let strokeWidth = 1.5;

        if (isSelected) {
          strokeColor = "#0ea5e9";
          strokeWidth = 2.5;
        } else if (isHovered) {
          strokeColor = "#38bdf8";
          strokeWidth = 2;
        }

        const shape = getToothShape(t.num);
        const tx = `translate(${t.x}, ${t.y})`;

        return (
          <g
            key={t.num}
            onClick={() => handleClick(t.num)}
            onMouseEnter={() => handleHover(t.num)}
            onMouseLeave={() => handleHover(null)}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(t.num); }}
          >
            <title>{t.num}</title>

            <path
              d={shape.outer}
              transform={tx}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={isSelected ? "url(#tooth-shadow-child)" : undefined}
              className="transition-all duration-150"
            />

            {shape.grooves.map((g, i) => (
              <path
                key={i}
                d={g}
                transform={tx}
                fill="none"
                stroke={GROOVE_STROKE}
                strokeWidth={1}
                strokeLinecap="round"
                opacity={0.7}
              />
            ))}

            <text
              x={t.x + TOOTH_W / 2}
              y={t.y + TOOTH_H + 12}
              textAnchor="middle"
              className="fill-gray-500 text-[11px] select-none"
              style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 600 }}
            >
              {t.num}
            </text>
          </g>
        );
      })}

      <text x={350} y={60} textAnchor="middle" className="fill-sky-600 text-[13px] select-none" style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 700 }}>
        الفك العلوي
      </text>
      <text x={350} y={440} textAnchor="middle" className="fill-sky-600 text-[13px] select-none" style={{ fontFamily: "Tajawal, sans-serif", fontWeight: 700 }}>
        الفك السفلي
      </text>
    </svg>
  );
}
