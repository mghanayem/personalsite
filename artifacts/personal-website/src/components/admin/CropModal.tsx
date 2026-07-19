import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// ── Canvas export ─────────────────────────────────────────────────────────────
const MAX_EXPORT_PX = 1920;
const JPEG_QUALITY = 0.88;

function exportCrop(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const srcX = crop.x * scaleX;
  const srcY = crop.y * scaleY;
  const srcW = crop.width * scaleX;
  const srcH = crop.height * scaleY;

  // Scale down to MAX_EXPORT_PX on the longest side
  const longest = Math.max(srcW, srcH);
  const scale = longest > MAX_EXPORT_PX ? MAX_EXPORT_PX / longest : 1;
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D context unavailable"));

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob produced null"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

// ── Initial crop helper ───────────────────────────────────────────────────────
function makeInitialCrop(
  imageWidth: number,
  imageHeight: number,
  aspect: number | undefined,
): Crop {
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspect, imageWidth, imageHeight),
      imageWidth,
      imageHeight,
    );
  }
  // Free crop: start with an 80% centered square
  const pct = 80;
  return { unit: "%", x: (100 - pct) / 2, y: (100 - pct) / 2, width: pct, height: pct };
}

// ── Fit-to-aspect export ──────────────────────────────────────────────────────
function exportFit(img: HTMLImageElement, aspect: number): Promise<Blob> {
  const canvasW = MAX_EXPORT_PX;
  const canvasH = Math.round(canvasW / aspect);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D context unavailable"));

  // Letterbox background matching site warm tone
  ctx.fillStyle = "#FAF6F0";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Scale image to fit (contain) — preserves full image, no cropping
  const imgAspect = img.naturalWidth / img.naturalHeight;
  let drawW: number, drawH: number;
  if (imgAspect >= aspect) {
    drawW = canvasW;
    drawH = canvasW / imgAspect;
  } else {
    drawH = canvasH;
    drawW = canvasH * imgAspect;
  }
  const drawX = (canvasW - drawW) / 2;
  const drawY = (canvasH - drawH) / 2;

  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, drawW, drawH);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob produced null"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface CropModalProps {
  /** The file to crop. Pass null to close. */
  file: File | null;
  /**
   * Locked aspect ratio (e.g. 16/9 for featured hero).
   * Omit or pass undefined for free-form crop.
   */
  aspectRatio?: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function CropModal({
  file,
  aspectRatio,
  onConfirm,
  onCancel,
}: CropModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [exporting, setExporting] = useState(false);
  const [fitting, setFitting] = useState(false);
  const [error, setError] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Create / revoke the object URL whenever the file changes
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setError("");
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const initial = makeInitialCrop(naturalWidth, naturalHeight, aspectRatio);
      setCrop(initial);
    },
    [aspectRatio],
  );

  const handleFit = async () => {
    const img = imgRef.current;
    if (!img || !aspectRatio) return;
    setFitting(true);
    setError("");
    try {
      const blob = await exportFit(img, aspectRatio);
      onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fit export failed");
    } finally {
      setFitting(false);
    }
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      setError("Please select a crop area first.");
      return;
    }
    setExporting(true);
    setError("");
    try {
      const blob = await exportCrop(img, completedCrop);
      onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const open = !!file && !!objectUrl;

  return (
    <>
      {/* Override react-image-crop's default blue with a neutral tone */}
      <style>{`
        .ReactCrop__crop-selection {
          border-color: rgba(255,255,255,0.85) !important;
          box-shadow: 0 0 0 9999em rgba(0,0,0,0.55);
        }
        .ReactCrop__drag-handle::after {
          background-color: rgba(255,255,255,0.9) !important;
          border-color: rgba(255,255,255,0.9) !important;
          width: 10px !important;
          height: 10px !important;
        }
        .ReactCrop__drag-handle:nth-child(1)::after,
        .ReactCrop__drag-handle:nth-child(2)::after,
        .ReactCrop__drag-handle:nth-child(3)::after,
        .ReactCrop__drag-handle:nth-child(4)::after {
          border-radius: 50%;
        }
      `}</style>

      <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
        <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base">
              {aspectRatio ? "Crop featured image (16:9)" : "Crop gallery image"}
            </DialogTitle>
            {aspectRatio && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag the handles to frame the hero crop. The ratio is locked to 16:9 to match the post header.
              </p>
            )}
            {!aspectRatio && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag the handles to select the area you want to keep.
              </p>
            )}
          </DialogHeader>

          {/* Crop canvas */}
          <div className="flex items-center justify-center bg-[#1a1a1a] min-h-[200px] max-h-[60vh] overflow-auto p-4">
            {objectUrl && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                minWidth={40}
                minHeight={40}
                keepSelection
              >
                <img
                  ref={imgRef}
                  src={objectUrl}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: "55vh", maxWidth: "100%", display: "block" }}
                />
              </ReactCrop>
            )}
          </div>

          {error && (
            <p className="px-5 py-2 text-xs text-destructive bg-destructive/5 border-t border-destructive/20">
              {error}
            </p>
          )}

          <DialogFooter className="px-5 py-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={exporting || fitting}>
              Cancel
            </Button>
            {aspectRatio && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFit}
                disabled={exporting || fitting}
                className="gap-2"
              >
                {fitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {fitting ? "Fitting…" : "Fit to 16:9 & Upload"}
              </Button>
            )}
            <Button size="sm" onClick={handleConfirm} disabled={exporting || fitting} className="gap-2">
              {exporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {exporting ? "Exporting…" : "Crop & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
