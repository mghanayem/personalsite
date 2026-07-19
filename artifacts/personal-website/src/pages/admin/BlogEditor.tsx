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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
  const [contentTab, setContentTab] = useState<ContentLang>("en");
  const [savedId, setSavedId] = useState<number | null>(postId);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing post data
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

  // Populate form when post data loads
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
      setSavedId(existingPost.id);
    }
  }, [existingPost]);

  // Auto-generate slugs from English title (only when creating new)
  const handleTitleEnChange = (val: string) => {
    setTitleEn(val);
    if (isNew) {
      const s = slugify(val);
      setSlugEn(s);
      setSlugAr(s); // default Arabic slug to same; admin can customise
    }
  };

  // Import HTML from file
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

  // Upload featured image
  const handleFeaturedImageSelect = async (file: File) => {
    if (!savedId) {
      setSaveError("Save the post first before uploading a featured image.");
      return;
    }
    setUploadingImage(true);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/blog/${savedId}/featured-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const updated = await res.json();
      setFeaturedImageUrl(updated.featuredImageUrl ?? null);
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId) });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  // Delete featured image
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

  // Save (create or update)
  const handleSave = () => {
    setSaveError("");
    if (!slugEn.trim() || !slugAr.trim()) {
      setSaveError("Both slugs (AR and EN) are required.");
      return;
    }

    const data = {
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
        { data },
        {
          onSuccess: (post) => {
            setSavedId(post.id);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
            setLocation(`/admin/blog/${post.id}`);
          },
          onError: (err: unknown) => {
            const msg =
              err instanceof Error ? err.message : "Failed to create post";
            setSaveError(msg);
          },
        },
      );
    } else {
      updatePost.mutate(
        { id: savedId as number, data },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(savedId as number) });
          },
          onError: (err: unknown) => {
            const msg =
              err instanceof Error ? err.message : "Failed to save post";
            setSaveError(msg);
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
              <h1 className="text-xl font-bold">
                {isNew ? "New Post" : "Edit Post"}
              </h1>
              {!isNew && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {savedId}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Saved</span>
            )}
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
                onChange={(e) => setSlugEn(e.target.value.toLowerCase().replace(/\s/g, "-"))}
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
                onChange={(e) => setSlugAr(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                placeholder="my-first-blog-post"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Excerpts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Excerpts (optional summary shown on blog index)</CardTitle>
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
          <CardContent>
            {!savedId && (
              <p className="text-sm text-muted-foreground mb-3">
                Save the post first, then you can upload a featured image.
              </p>
            )}
            {featuredImageUrl ? (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-border w-full max-w-md aspect-video bg-muted">
                  <img
                    src={featuredImageUrl}
                    alt="Featured"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleDeleteFeaturedImage}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Image
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFeaturedImageSelect(file);
                    e.target.value = "";
                  }}
                />
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
                placeholder="<p>ابدأ كتابة محتوى المقال بالعربية هنا…</p>"
                rows={18}
                dir="rtl"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                spellCheck={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Bottom save bar */}
        <div className="flex items-center justify-between pb-8">
          <div>
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {saved && (
              <p className="text-sm text-green-600 font-medium">✓ Changes saved</p>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isNew ? "Create Post" : "Save Changes"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
