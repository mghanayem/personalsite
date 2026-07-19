import { useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";

/**
 * Parses a CSS object-position value (keywords or percentages) into
 * numeric x/y percentages for positioning the crosshair dot.
 */
export function parseObjectPosition(pos: string): { x: number; y: number } {
  const parts = pos.trim().split(/\s+/);
  const resolveX = (s: string) => {
    if (s === "left") return 0;
    if (s === "center") return 50;
    if (s === "right") return 100;
    return parseFloat(s) || 50;
  };
  const resolveY = (s: string) => {
    if (s === "top") return 0;
    if (s === "center") return 50;
    if (s === "bottom") return 100;
    return parseFloat(s) || 50;
  };
  if (parts.length === 1) {
    switch (parts[0]) {
      case "top":    return { x: 50, y: 0 };
      case "bottom": return { x: 50, y: 100 };
      case "left":   return { x: 0,  y: 50 };
      case "right":  return { x: 100, y: 50 };
      case "center": return { x: 50, y: 50 };
      default: { const v = parseFloat(parts[0]) || 50; return { x: v, y: v }; }
    }
  }
  return { x: resolveX(parts[0]), y: resolveY(parts[1]) };
}

interface FocalPointPickerProps {
  imageUrl: string;
  /** CSS object-position string, e.g. "50% 30%" or "center" */
  value: string;
  onChange: (pos: string) => void;
  /** CSS aspect-ratio value. Defaults to "16/9" (featured hero). Use "4/3" for gallery. */
  aspectRatio?: string;
  /** Optional label rendered above the picker. Omit to skip the label. */
  label?: string;
  /** Show the current position value below the picker. Default true. */
  showPosition?: boolean;
}

export function FocalPointPicker({
  imageUrl,
  value,
  onChange,
  aspectRatio = "16/9",
  label,
  showPosition = true,
}: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const { x, y } = parseObjectPosition(value);

  const getPos = useCallback(
    (clientX: number, clientY: number): string | null => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const px = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const py = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      return `${Math.round(px)}% ${Math.round(py)}%`;
    },
    [],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e.clientX, e.clientY);
    if (pos) onChange(pos);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const pos = getPos(e.clientX, e.clientY);
    if (pos) onChange(pos);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs text-muted-foreground">{label}</Label>
      )}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-border w-full bg-muted cursor-crosshair select-none touch-none"
        style={{ aspectRatio }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: value }}
          draggable={false}
        />
        {/* Crosshair dot */}
        <div
          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.55)]" />
          <div className="absolute inset-[5px] rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
        </div>
      </div>
      {showPosition && (
        <p className="text-[11px] text-muted-foreground tabular-nums">{value}</p>
      )}
    </div>
  );
}
