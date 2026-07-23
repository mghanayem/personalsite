/**
 * BlogProfilePhoto — admin card for uploading, cropping, and removing
 * the author profile photo shown on the blog index and post pages.
 *
 * Uses react-image-crop for client-side circular crop before upload.
 */
import { useRef, useState, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, UserCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBrandingSettingsQueryKey } from "@workspace/api-client-react";

function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const size = Math.min(crop.width, crop.height) * Math.max(scaleX, scaleY);
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Clip to circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

interface Props {
  currentPhotoUrl?: string | null;
}

export function BlogProfilePhoto({ currentPhotoUrl }: Props) {
  const queryClient = useQueryClient();

  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSaved(false);
    const reader = new FileReader();
    reader.onload = () => setSrcUrl(reader.result as string);
    reader.readAsDataURL(file);
    // reset so same file can be picked again
    e.target.value = "";
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centerAspectCrop(naturalWidth, naturalHeight));
  }, []);

  const handleSave = async () => {
    if (!imgRef.current || !completedCrop) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const form = new FormData();
      form.append("file", blob, "profile.jpg");

      const res = await fetch("/api/settings/profile-photo", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Upload failed");
      }
      setSrcUrl(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: getGetBrandingSettingsQueryKey() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/profile-photo", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove photo");
      setSrcUrl(null);
      queryClient.invalidateQueries({ queryKey: getGetBrandingSettingsQueryKey() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle2 className="w-4 h-4" />
          Blog Profile Photo
        </CardTitle>
        <CardDescription>
          Shown in the blog author hero and on individual post pages. Upload any photo — you can crop it to a circle before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Current photo or placeholder */}
        {!srcUrl && (
          <div className="flex items-center gap-5">
            {currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border border-border shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                <UserCircle2 className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {currentPhotoUrl ? "Replace photo" : "Upload photo"}
              </Button>
              {currentPhotoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remove photo
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Crop UI */}
        {srcUrl && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag to reposition · scroll to zoom · the circle shows the final crop
            </p>
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                minWidth={80}
                minHeight={80}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={srcUrl}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: 400, maxWidth: "100%", display: "block" }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleSave}
                disabled={uploading || !completedCrop}
                className="gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Save photo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setSrcUrl(null); setCrop(undefined); setCompletedCrop(undefined); }}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-600 font-medium">✓ Profile photo saved</p>}
      </CardContent>
    </Card>
  );
}
