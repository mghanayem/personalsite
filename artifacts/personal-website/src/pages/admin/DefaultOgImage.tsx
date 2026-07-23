/**
 * DefaultOgImage — admin card for uploading and removing the site-wide
 * default Open Graph image (1200×630 recommended).
 *
 * This image is shown on any page that has no per-page OG image set,
 * so social share cards always have a visual even before every page
 * has been individually configured.
 *
 * No crop step — users should upload a pre-sized 1200×630 image.
 */
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBrandingSettingsQueryKey } from "@workspace/api-client-react";

interface Props {
  currentImageUrl?: string | null;
}

export function DefaultOgImage({ currentImageUrl }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setError(null);
    setSaved(false);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch("/api/settings/default-og-image", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Upload failed",
        );
      }

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
      const res = await fetch("/api/settings/default-og-image", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove image");
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
          <ImageIcon className="w-4 h-4" />
          Default OG Image
        </CardTitle>
        <CardDescription>
          Shown in social share cards (LinkedIn, WhatsApp, Twitter/X, Facebook) for any page that doesn't have its own Open Graph image set.
          Recommended size: <strong>1200 × 630 px</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current image preview */}
        {currentImageUrl ? (
          <div className="rounded-xl overflow-hidden border border-border shadow-sm">
            <img
              src={currentImageUrl}
              alt="Default OG image"
              className="w-full object-cover aspect-[1200/630]"
            />
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-3 py-10">
            <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No default OG image set</p>
            <p className="text-xs text-muted-foreground/70">Pages without their own image will show a blank preview on social media</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {currentImageUrl ? "Replace image" : "Upload image"}
          </Button>

          {currentImageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Remove image
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && (
          <p className="text-sm text-green-600 font-medium">✓ Default OG image saved</p>
        )}
      </CardContent>
    </Card>
  );
}
