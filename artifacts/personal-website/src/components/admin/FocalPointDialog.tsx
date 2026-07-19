import { useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { GripHorizontal, X, Loader2 } from "lucide-react";
import { FocalPointPicker } from "./FocalPointPicker";
import { Button } from "@/components/ui/button";

interface FocalPointDialogProps {
  imageUrl: string;
  /** Starting position (the currently-saved value). */
  initialValue: string;
  /** CSS aspect-ratio string for the picker, e.g. "16/9" or "4/3". */
  aspectRatio?: string;
  /** Header title. */
  title?: string;
  /** Called with the final position when the user clicks Done. May be async. */
  onSave: (pos: string) => void | Promise<void>;
  /** Called when the dialog is dismissed (Done or Cancel or ×). */
  onClose: () => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = () => Math.min(900, window.innerWidth - 32);
const DEFAULT_WIDTH = () => Math.min(720, window.innerWidth - 32);

/**
 * Draggable, resizable floating dialog that wraps FocalPointPicker.
 * Rendered via portal so it floats above all editor content.
 * - Drag the header to reposition anywhere on screen.
 * - Drag the bottom-right corner handle to resize width (height follows aspect-ratio).
 * - Saves only when Done is clicked; Cancel discards changes.
 */
export function FocalPointDialog({
  imageUrl,
  initialValue,
  aspectRatio = "16/9",
  title = "Adjust crop position",
  onSave,
  onClose,
}: FocalPointDialogProps) {
  const [pos, setPos] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  // Dialog position — null = not yet measured → CSS centering via transform.
  const [dialogPos, setDialogPos] = useState<{ x: number; y: number } | null>(null);
  // Dialog width (height follows from content + aspect-ratio of picker).
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  const dialogRef = useRef<HTMLDivElement>(null);

  // ── Header drag ────────────────────────────────────────────────────────
  const dragOrigin = useRef<{ mx: number; my: number; dx: number; dy: number } | null>(null);

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dialogPos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { mx: e.clientX, my: e.clientY, dx: dialogPos.x, dy: dialogPos.y };
  };

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragOrigin.current;
    if (!d || !dialogRef.current) return;
    const { width: w, height: h } = dialogRef.current.getBoundingClientRect();
    const newX = d.dx + (e.clientX - d.mx);
    const newY = d.dy + (e.clientY - d.my);
    setDialogPos({
      x: Math.max(0, Math.min(window.innerWidth - w, newX)),
      y: Math.max(0, Math.min(window.innerHeight - h, newY)),
    });
  };

  const onHeaderPointerUp = () => { dragOrigin.current = null; };

  // ── Corner resize ──────────────────────────────────────────────────────
  const resizeOrigin = useRef<{ mx: number; startW: number } | null>(null);

  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // prevent header-drag from firing
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeOrigin.current = { mx: e.clientX, startW: width };
  };

  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeOrigin.current;
    if (!r) return;
    const newW = r.startW + (e.clientX - r.mx);
    setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH(), newW)));
  };

  const onResizePointerUp = () => { resizeOrigin.current = null; };

  // ── Position on first paint ────────────────────────────────────────────
  // Fixed top offset (80 px) keeps the dialog near the top of the viewport
  // regardless of dialog height or viewport size. Horizontal centering only
  // needs the dialog width, not height — no vertical clamping needed.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const { width: w } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    setDialogPos({
      x: Math.max(16, (vw - w) / 2),
      y: 80,
    });
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────
  const handleDone = async () => {
    setSaving(true);
    try {
      await onSave(pos);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  // Before measurement: pin to top: 80px, horizontally centered via transform.
  // After measurement: switch to absolute pixel coords so drag works correctly.
  const posStyle: React.CSSProperties = dialogPos
    ? { left: dialogPos.x, top: dialogPos.y, transform: "none" }
    : { left: "50%", top: "80px", transform: "translateX(-50%)" };

  const dialog = (
    <div
      ref={dialogRef}
      style={{
        position: "fixed",
        width,
        zIndex: 9999,
        ...posStyle,
      }}
      className="bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* ── Draggable header ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/60 cursor-grab active:cursor-grabbing select-none shrink-0"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <div className="flex items-center gap-2 text-sm font-medium min-w-0">
          <GripHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Picker ── */}
      <div className="p-4 space-y-2">
        <FocalPointPicker
          imageUrl={imageUrl}
          value={pos}
          onChange={setPos}
          aspectRatio={aspectRatio}
          showPosition={true}
        />
        <p className="text-[11px] text-muted-foreground">
          Drag the dot to set the focal point. Drag the header to move this window. Drag{" "}
          <span className="font-medium">⌟</span> to resize. Click <strong>Done</strong> to save.
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-end gap-2 px-4 pb-4 shrink-0">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleDone} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Done"
          )}
        </Button>
      </div>

      {/* ── Bottom-right resize handle ── */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize touch-none select-none flex items-end justify-end pb-0.5 pr-0.5"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        aria-label="Resize dialog"
      >
        {/* Three diagonal dots — classic resize indicator */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <circle cx="8.5" cy="8.5" r="1" fill="currentColor" className="text-muted-foreground/50" />
          <circle cx="5"   cy="8.5" r="1" fill="currentColor" className="text-muted-foreground/50" />
          <circle cx="8.5" cy="5"   r="1" fill="currentColor" className="text-muted-foreground/50" />
        </svg>
      </div>
    </div>
  );

  return ReactDOM.createPortal(dialog, document.body);
}
