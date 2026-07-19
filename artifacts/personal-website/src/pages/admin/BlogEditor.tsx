import { useState, useEffect, useRef } from "react";
import {
  useGetPost,
  useCreatePost,
  useUpdatePost,
  getListAdminPostsQueryKey,
  getGetPostQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, useParams } from "wouter";
import {
  Loader2,
  Save,
  ArrowLeft,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  FileCode2,
  Copy,
  Check,
  Plus,
  ImageIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { CropModal } from "@/components/admin/CropModal";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

type ContentLang = "ar" | "en";
type ImagePosition = "top" | "center" | "bottom";

const MAX_GALLERY = 6;
const FEATURED_ASPECT = 16 / 9;

interface GalleryImage {
  id: number;
  imageUrl: string;
  displayOrder: number;
}

// ── Position picker ───────────────────────────────────────────────────────
function PositionPicker({
  value,
  onChange,
}: {
  value: ImagePosition;
  onChange: (pos: ImagePosition) => void;
}) {
  const options: { value: ImagePosition; label: string }[] = [
    { value: "top", label: "Top" },
    { value: "center", label: "Center" },
    { value: "bottom", label: "Bottom" },
  ];
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-1 w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            value === opt.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Gallery image card ────────────────────────────────────────────────────
function GalleryCard({
  image,
  onRemove,
  onCopy,
  copied,
}: {
  image: GalleryImage;
  onRemove: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="group relative rounded-lg border border-border overflow-hidden aspect-video bg-muted">
      <img src={image.imageUrl} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2 gap-1.5 text-xs"
          onClick={onCopy}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy URL"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 gap-1.5 text-xs"
          onClick={onRemove}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function BlogEditor() {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const isNew = rawId === "new" || !rawId;
  const postId = isNew ? null : parseInt(rawId, 10);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Form state
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slugAr, setSlugAr] = useState("");
  const [slugEn, setSlugEn] = useState("");
  const [excerptAr, setExcerptAr] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [featuredImagePosition, setFeaturedImagePositionState] =
    useState<ImagePosition>("center");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [contentTab, setContentTab] = useState<ContentLang>("en");
  const [savedId, setSavedId] = useState<number | null>(postId);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Crop modal state
  const [cropPending, setCropPending] = useState<{
    file: File;
    kind: "featured" | "gallery";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing post
  const { data: existingPost, isLoading: postLoading } = useGetPost(
    postId as number,
    {
      query: {
        enabled: !!postId && !isNaN(postId as number),
        queryKey: getGetPostQueryKey(postId as number),
      },
    },
  );

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

  useEffect(() => {
    if (existingPost) {
      setTitleAr(existingPost.titleAr);
      setTitleEn(existingPost.titleEn);
      setSlugAr(existingPost.slugAr);
      setSlugEn(existingPost.slugEn);
      setExcerptAr(existingPost.excerptAr);
      setExcerptEn(existingPost.excerptEn);
      setContentAr(existingPost.contentAr);
      setContentEn(existingPost.contentEn);
      setIsPublished(existingPost.isPublished);
      setFeaturedImageUrl(existingPost.featuredImageUrl ?? null);
      const pos = existingPost.featuredImagePosition;
      if (pos === "top" || pos === "center" || pos === "bottom") {
        setFeaturedImagePositionState(pos);
      }
      setGalleryImages(
        (existingPost.galleryImages ?? []).map((g) => ({
          id: g.id,
          imageUrl: g.imageUrl,
          displayOrder: g.displayOrder,
        })),
      );
      setSavedId(existingPost.id);
    }
  }, [existingPost]);

  const handleTitleEnChange = (val: string) => {
    setTitleEn(val);
    if (isNew) {
      const s = slugify(val);
      setSlugEn(s);
      setSlugAr(s);
    }
  };

  const handleImportHtml = (lang: ContentLang) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".html,.htm";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const bodyHtml = doc.body.innerHTML;
      if (lang === "ar") setContentAr(bodyHtml);
      else setContentEn(bodyHtml);
    };
    input.click();
  };

  // ── Featured image position ─────────────────────────────────────────────
  const handlePositionChange = async (pos: ImagePosition) => {
    setFeaturedImagePositionState(pos);
    if (!savedId) return;
    try {
      await fetch(`/api/blog/${savedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ featuredImagePosition: pos }),
      });
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId) });
    } catch {
      // non-critical — position is still reflected in local state
    }
  };

  // ── Upload helpers (accept Blob from crop modal) ────────────────────────
  const uploadFeaturedImageBlob = async (blob: Blob) => {
    if (!savedId) {
      setSaveError("Save the post first before uploading a featured image.");
      return;
    }
    setUploadingImage(true);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", blob, "featured.jpg");
      const res = await fetch(`/api/blog/${savedId}/featured-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const updated = await res.json();
      setFeaturedImageUrl(updated.featuredImageUrl ?? null);
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId) });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadGalleryImageBlob = async (blob: Blob) => {
    if (!savedId) {
      setSaveError("Save the post first before uploading gallery images.");
      return;
    }
    if (galleryImages.length >= MAX_GALLERY) {
      setSaveError(`You can upload a maximum of ${MAX_GALLERY} gallery images.`);
      return;
    }
    setUploadingGallery(true);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", blob, "gallery.jpg");
      const res = await fetch(`/api/blog/${savedId}/gallery-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const newImg: GalleryImage = await res.json();
      setGalleryImages((prev) => [...prev, newImg]);
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId) });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Gallery upload failed");
    } finally {
      setUploadingGallery(false);
    }
  };

  // ── Crop modal callbacks ────────────────────────────────────────────────
  const handleCropConfirm = async (blob: Blob) => {
    const kind = cropPending?.kind;
    setCropPending(null);
    if (kind === "featured") await uploadFeaturedImageBlob(blob);
    else if (kind === "gallery") await uploadGalleryImageBlob(blob);
  };

  const handleCropCancel = () => setCropPending(null);

  // ── File input handlers (open crop modal, don't upload directly) ────────
  const handleFeaturedFileSelect = (file: File) => {
    if (!savedId) {
      setSaveError("Save the post first before uploading a featured image.");
      return;
    }
    setCropPending({ file, kind: "featured" });
  };

  const handleGalleryFileSelect = (file: File) => {
    if (!savedId) {
      setSaveError("Save the post first before uploading gallery images.");
      return;
    }
    if (galleryImages.length >= MAX_GALLERY) {
      setSaveError(`You can upload a maximum of ${MAX_GALLERY} gallery images.`);
      return;
    }
    setCropPending({ file, kind: "gallery" });
  };

  // ── Other image actions ─────────────────────────────────────────────────
  const handleDeleteFeaturedImage = async () => {
    if (!savedId) return;
    setSaveError("");
    try {
      await fetch(`/api/blog/${savedId}/featured-image`, {
        method: "DELETE",
        credentials: "include",
      });
      setFeaturedImageUrl(null);
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId) });
    } catch {
      setSaveError("Failed to remove image");
    }
  };

  const handleRemoveGalleryImage = async (imageId: number) => {
    if (!savedId) return;
    setSaveError("");
    try {
      const res = await fetch(`/api/blog/${savedId}/gallery-image/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove gallery image");
      setGalleryImages((prev) => prev.filter((g) => g.id !== imageId));
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId) });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to remove gallery image");
    }
  };

  const handleCopyUrl = async (img: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(img.imageUrl);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      const el = document.createElement("textarea");
      el.value = img.imageUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    setSaveError("");
    if (!slugEn.trim() || !slugAr.trim()) {
      setSaveError("Both slugs (AR and EN) are required.");
      return;
    }

    const baseData = {
      titleAr,
      titleEn,
      slugAr: slugAr.trim(),
      slugEn: slugEn.trim(),
      excerptAr,
      excerptEn,
      contentAr,
      contentEn,
      isPublished,
    };

    if (isNew) {
      createPost.mutate(
        { data: baseData },
        {
          onSuccess: (post) => {
            setSavedId(post.id);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
            setLocation(`/admin/blog/${post.id}`);
          },
          onError: (err: unknown) => {
            setSaveError(err instanceof Error ? err.message : "Failed to create post");
          },
        },
      );
    } else {
      updatePost.mutate(
        { id: savedId as number, data: { ...baseData, featuredImagePosition } },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
            queryClient.invalidateQueries({
              queryKey: getGetPostQueryKey(savedId as number),
            });
          },
          onError: (err: unknown) => {
            setSaveError(err instanceof Error ? err.message : "Failed to save post");
          },
        },
      );
    }
  };

  const isSaving = createPost.isPending || updatePost.isPending;

  if (!isNew && postLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-6">
        {/* Crop modal — rendered at root so it floats above everything */}
        <CropModal
          file={cropPending?.file ?? null}
          aspectRatio={cropPending?.kind === "featured" ? FEATURED_ASPECT : undefined}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/blog")}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{isNew ? "New Post" : "Edit Post"}</h1>
              {!isNew && (
                <p className="text-xs text-muted-foreground mt-0.5">ID: {savedId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
            <Button
              variant={isPublished ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setIsPublished(!isPublished)}
            >
              {isPublished ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              {isPublished ? "Published" : "Draft"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isNew ? "Create Post" : "Save"}
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {saveError}
          </div>
        )}

        {/* Titles & Slugs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Titles & Slugs</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Title (English)</Label>
              <Input
                value={titleEn}
                onChange={(e) => handleTitleEnChange(e.target.value)}
                placeholder="My First Blog Post"
              />
            </div>
            <div className="space-y-2">
              <Label>العنوان (عربي)</Label>
              <Input
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="أول مقال في المدونة"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Slug (EN) — used in /en/blog/…</span>
                <span className="text-xs text-muted-foreground font-normal">URL-safe</span>
              </Label>
              <Input
                value={slugEn}
                onChange={(e) =>
                  setSlugEn(e.target.value.toLowerCase().replace(/\s/g, "-"))
                }
                placeholder="my-first-blog-post"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Slug (AR) — used in /blog/…</span>
                <span className="text-xs text-muted-foreground font-normal">URL-safe</span>
              </Label>
              <Input
                value={slugAr}
                onChange={(e) =>
                  setSlugAr(e.target.value.toLowerCase().replace(/\s/g, "-"))
                }
                placeholder="my-first-blog-post"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Excerpts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Excerpts (optional summary shown on blog index)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Excerpt (English)</Label>
              <textarea
                value={excerptEn}
                onChange={(e) => setExcerptEn(e.target.value)}
                placeholder="A short summary of this post…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label>المقتطف (عربي)</Label>
              <textarea
                value={excerptAr}
                onChange={(e) => setExcerptAr(e.target.value)}
                placeholder="ملخص قصير للمقال…"
                rows={3}
                dir="rtl"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Featured Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Featured Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!savedId && (
              <p className="text-sm text-muted-foreground">
                Save the post first, then you can upload a featured image.
              </p>
            )}

            {featuredImageUrl ? (
              <div className="space-y-4">
                {/* Preview */}
                <div className="rounded-lg overflow-hidden border border-border w-full max-w-md aspect-video bg-muted">
                  <img
                    src={featuredImageUrl}
                    alt="Featured"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: featuredImagePosition }}
                  />
                </div>

                {/* Position picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Crop anchor — where to pin the image in the hero frame
                  </Label>
                  <PositionPicker
                    value={featuredImagePosition}
                    onChange={handlePositionChange}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!savedId || uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={handleDeleteFeaturedImage}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!savedId || uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingImage ? "Uploading…" : "Upload Featured Image"}
                </Button>
              </div>
            )}

            {/* Hidden file input — opens crop modal on select */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFeaturedFileSelect(file);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>

        {/* Gallery Images */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Gallery Images</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Up to {MAX_GALLERY} images · hover a thumbnail to copy its URL or
                  remove it
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                {galleryImages.length} / {MAX_GALLERY}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!savedId && (
              <p className="text-sm text-muted-foreground">
                Save the post first, then you can add gallery images.
              </p>
            )}

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((img) => (
                  <GalleryCard
                    key={img.id}
                    image={img}
                    onRemove={() => handleRemoveGalleryImage(img.id)}
                    onCopy={() => handleCopyUrl(img)}
                    copied={copiedId === img.id}
                  />
                ))}
              </div>
            )}

            {galleryImages.length === 0 && savedId && (
              <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg py-10 text-muted-foreground gap-2">
                <ImageIcon className="w-8 h-8 opacity-30" />
                <p className="text-sm">No gallery images yet</p>
              </div>
            )}

            {savedId && galleryImages.length < MAX_GALLERY && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={uploadingGallery}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  {uploadingGallery ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {uploadingGallery ? "Uploading…" : "Add Image"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {MAX_GALLERY - galleryImages.length} slot
                  {MAX_GALLERY - galleryImages.length !== 1 ? "s" : ""} remaining
                </span>
              </div>
            )}

            {savedId && galleryImages.length >= MAX_GALLERY && (
              <p className="text-xs text-muted-foreground">
                Gallery is full ({MAX_GALLERY}/{MAX_GALLERY}). Remove an image to add a
                new one.
              </p>
            )}

            {/* Hidden file input — opens crop modal on select */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleGalleryFileSelect(file);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>

        {/* HTML Content Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Content (HTML)</CardTitle>
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setContentTab("en")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    contentTab === "en"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setContentTab("ar")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    contentTab === "ar"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Raw HTML — paste or type content directly, or import from a{" "}
                <code>.html</code> file.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleImportHtml(contentTab)}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                Import HTML
              </Button>
            </div>

            {contentTab === "en" ? (
              <textarea
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                placeholder="<p>Start writing your English post content here…</p>"
                rows={18}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                spellCheck={false}
              />
            ) : (
              <textarea
                value={contentAr}
                onChange={(e) => setContentAr(e.target.value)}
                placeholder="<p>ابدأ بكتابة محتوى مقالتك بالعربية هنا…</p>"
                rows={18}
                dir="rtl"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                spellCheck={false}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
