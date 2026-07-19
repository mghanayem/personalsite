import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetPage, 
  useUpdatePage, 
  useCreateSection, 
  useDeleteSection, 
  useToggleSectionVisibility, 
  useReorderSections, 
  getGetPageQueryKey,
  SectionInputType
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Plus, GripVertical, Save, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SectionEditor } from "./SectionEditor";

type PageData = {
  titleAr: string;
  titleEn: string;
  slug: string;
  isPublished: boolean;
  showInNav: boolean;
  seoTitleAr: string;
  seoTitleEn: string;
  seoDescAr: string;
  seoDescEn: string;
  seoImageUrl: string;
};

/** Simulates a Google Search result snippet */
function GoogleSnippetPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayTitle = title || "Page title";
  const displayDesc = description || "Add a meta description for this page to control how it appears in search results.";
  const displayUrl = url || window.location.origin + "/p/example";

  return (
    <div className="rounded-lg border bg-white p-4 font-sans text-sm shadow-sm">
      <p className="text-xs text-green-700 mb-0.5 truncate">{displayUrl}</p>
      <p className="text-blue-700 text-lg font-medium leading-snug mb-1 line-clamp-1 hover:underline cursor-pointer">{displayTitle}</p>
      <p className="text-gray-600 leading-relaxed line-clamp-2">{displayDesc}</p>
    </div>
  );
}

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const pageId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  
  const { data: page, isLoading } = useGetPage(pageId, {
    query: { enabled: !!pageId, queryKey: getGetPageQueryKey(pageId) }
  });

  const updatePage = useUpdatePage();
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();
  const toggleVisibility = useToggleSectionVisibility();
  const reorderSections = useReorderSections();

  const [pageData, setPageData] = useState<PageData>({
    titleAr: "", titleEn: "", slug: "", isPublished: false, showInNav: false,
    seoTitleAr: "", seoTitleEn: "", seoDescAr: "", seoDescEn: "", seoImageUrl: "",
  });
  const [isPageDirty, setIsPageDirty] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<typeof SectionInputType[keyof typeof SectionInputType]>("text");
  const [seoExpanded, setSeoExpanded] = useState(false);

  useEffect(() => {
    if (page) {
      setPageData({
        titleAr: page.titleAr,
        titleEn: page.titleEn,
        slug: page.slug,
        isPublished: page.isPublished,
        showInNav: page.showInNav,
        seoTitleAr: page.seoTitleAr ?? "",
        seoTitleEn: page.seoTitleEn ?? "",
        seoDescAr: page.seoDescAr ?? "",
        seoDescEn: page.seoDescEn ?? "",
        seoImageUrl: page.seoImageUrl ?? "",
      });
      setIsPageDirty(false);
    }
  }, [page]);

  const handlePageSave = () => {
    updatePage.mutate({
      id: pageId,
      data: {
        ...pageData,
        seoTitleAr: pageData.seoTitleAr || null,
        seoTitleEn: pageData.seoTitleEn || null,
        seoDescAr: pageData.seoDescAr || null,
        seoDescEn: pageData.seoDescEn || null,
        seoImageUrl: pageData.seoImageUrl || null,
      } as unknown as Parameters<typeof updatePage.mutate>[0]["data"]
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) });
        setIsPageDirty(false);
      }
    });
  };

  const handleAddSection = () => {
    createSection.mutate({
      pageId,
      data: { type: newSectionType, data: {} }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) });
        setIsAddSectionOpen(false);
      }
    });
  };

  const handleDeleteSection = (sectionId: number) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    deleteSection.mutate({ id: sectionId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) })
    });
  };

  const handleToggleVisibility = (sectionId: number, isVisible: boolean) => {
    toggleVisibility.mutate({ id: sectionId, data: { isVisible } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) })
    });
  };

  const handleReorder = (currentIndex: number, direction: 'up' | 'down') => {
    if (!page || !page.sections) return;
    const sorted = [...page.sections].sort((a, b) => a.sortOrder - b.sortOrder);
    
    if (direction === 'up' && currentIndex > 0) {
      const temp = sorted[currentIndex];
      sorted[currentIndex] = sorted[currentIndex - 1];
      sorted[currentIndex - 1] = temp;
    } else if (direction === 'down' && currentIndex < sorted.length - 1) {
      const temp = sorted[currentIndex];
      sorted[currentIndex] = sorted[currentIndex + 1];
      sorted[currentIndex + 1] = temp;
    } else {
      return;
    }

    const ids = sorted.map(s => s.id);
    reorderSections.mutate({ pageId, data: { ids } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) })
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  if (!page) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-muted-foreground">Page not found.</div>
      </AdminLayout>
    );
  }

  const sections = [...(page.sections || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const sectionTypes = [
    { value: "hero", label: "Hero Header" },
    { value: "text", label: "Rich Text" },
    { value: "text_with_image", label: "Text + Image" },
    { value: "image_gallery", label: "Image Gallery" },
    { value: "cards_grid", label: "Cards Grid" },
    { value: "timeline", label: "Timeline" },
    { value: "contact_strip", label: "Contact Strip" },
  ];

  const seoPreviewUrlAr = `${window.location.origin}${page.isHomepage ? "/" : "/p/" + page.slug}`;
  const seoPreviewUrlEn = `${window.location.origin}${page.isHomepage ? "/en" : "/en/p/" + page.slug}`;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/admin/pages"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Page</h1>
              <p className="text-muted-foreground mt-1">/{page.isHomepage ? "" : page.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <a href={page.isHomepage ? "/" : `/p/${page.slug}`} target="_blank" rel="noopener noreferrer">View Live</a>
            </Button>
          </div>
        </div>

        {/* ── Page Settings ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Page Settings</CardTitle>
              <Button 
                onClick={handlePageSave} 
                disabled={!isPageDirty || updatePage.isPending}
                size="sm"
              >
                {updatePage.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Title (English)</Label>
                <Input 
                  value={pageData.titleEn} 
                  onChange={e => { setPageData(p => ({ ...p, titleEn: e.target.value })); setIsPageDirty(true); }} 
                />
              </div>
              <div className="space-y-2">
                <Label>Title (Arabic)</Label>
                <Input 
                  value={pageData.titleAr} 
                  onChange={e => { setPageData(p => ({ ...p, titleAr: e.target.value })); setIsPageDirty(true); }} 
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug {page.isHomepage && "(Homepage cannot have a slug)"}</Label>
                <Input 
                  value={pageData.slug} 
                  onChange={e => { setPageData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })); setIsPageDirty(true); }} 
                  disabled={page.isHomepage}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-8 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="published" 
                  checked={pageData.isPublished} 
                  onCheckedChange={c => { setPageData(p => ({ ...p, isPublished: c })); setIsPageDirty(true); }} 
                />
                <Label htmlFor="published">Published</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="nav" 
                  checked={pageData.showInNav} 
                  onCheckedChange={c => { setPageData(p => ({ ...p, showInNav: c })); setIsPageDirty(true); }} 
                />
                <Label htmlFor="nav">Show in Navigation</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── SEO Settings ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => setSeoExpanded(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <CardTitle>SEO Settings</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {(pageData.seoTitleEn || pageData.seoTitleAr || pageData.seoDescEn || pageData.seoDescAr) && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Configured</span>
                )}
                {seoExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            <CardDescription className="mt-1">
              Control how this page appears in Google and on social media. Leave blank to use the page title.
            </CardDescription>
          </CardHeader>

          {seoExpanded && (
            <CardContent className="space-y-8">
              {/* English SEO */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">English</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>SEO Title (English)</Label>
                    <span className="text-xs text-muted-foreground">{pageData.seoTitleEn.length}/60</span>
                  </div>
                  <Input
                    value={pageData.seoTitleEn}
                    placeholder={pageData.titleEn || "e.g. Mohammad Ghanayem | Technical Project Manager"}
                    maxLength={60}
                    onChange={e => { setPageData(p => ({ ...p, seoTitleEn: e.target.value })); setIsPageDirty(true); }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Description (English)</Label>
                    <span className={`text-xs ${pageData.seoDescEn.length > 155 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {pageData.seoDescEn.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={pageData.seoDescEn}
                    placeholder="Describe this page in 1-2 sentences for search engines…"
                    maxLength={160}
                    rows={3}
                    onChange={e => { setPageData(p => ({ ...p, seoDescEn: e.target.value })); setIsPageDirty(true); }}
                  />
                </div>
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Google snippet preview</p>
                  <GoogleSnippetPreview
                    title={pageData.seoTitleEn || pageData.titleEn}
                    description={pageData.seoDescEn}
                    url={seoPreviewUrlEn}
                  />
                </div>
              </div>

              {/* Arabic SEO */}
              <div className="space-y-4 pt-6 border-t" dir="rtl">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">العربية</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>عنوان SEO (عربي)</Label>
                    <span className="text-xs text-muted-foreground">{pageData.seoTitleAr.length}/60</span>
                  </div>
                  <Input
                    value={pageData.seoTitleAr}
                    placeholder={pageData.titleAr || "مثال: محمد غنايم | مدير مشاريع تقنية"}
                    maxLength={60}
                    dir="rtl"
                    onChange={e => { setPageData(p => ({ ...p, seoTitleAr: e.target.value })); setIsPageDirty(true); }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>وصف التعريف (عربي)</Label>
                    <span className={`text-xs ${pageData.seoDescAr.length > 155 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {pageData.seoDescAr.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={pageData.seoDescAr}
                    placeholder="وصف مختصر لهذه الصفحة لمحركات البحث…"
                    maxLength={160}
                    rows={3}
                    dir="rtl"
                    onChange={e => { setPageData(p => ({ ...p, seoDescAr: e.target.value })); setIsPageDirty(true); }}
                  />
                </div>
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">معاينة نتيجة Google</p>
                  <GoogleSnippetPreview
                    title={pageData.seoTitleAr || pageData.titleAr}
                    description={pageData.seoDescAr}
                    url={seoPreviewUrlAr}
                  />
                </div>
              </div>

              {/* Shared OG image */}
              <div className="space-y-2 pt-6 border-t" dir="ltr">
                <Label>Open Graph / Social Image URL</Label>
                <Input
                  value={pageData.seoImageUrl}
                  placeholder="https://example.com/og-image.jpg (1200×630 recommended)"
                  onChange={e => { setPageData(p => ({ ...p, seoImageUrl: e.target.value })); setIsPageDirty(true); }}
                />
                <p className="text-xs text-muted-foreground">
                  Shown when this page is shared on LinkedIn, Twitter/X, WhatsApp, etc. Use an absolute URL.
                </p>
                {pageData.seoImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border">
                    <img
                      src={pageData.seoImageUrl}
                      alt="OG preview"
                      className="w-full max-h-48 object-cover"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── Sections ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-2xl font-bold tracking-tight">Sections</h2>
            <Button onClick={() => setIsAddSectionOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Section
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-lg text-muted-foreground shadow-sm">
              <p>No sections added yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddSectionOpen(true)}>Add your first section</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <div key={section.id} className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 mt-1 bg-card border rounded-md p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      disabled={index === 0 || reorderSections.isPending}
                      onClick={() => handleReorder(index, 'up')}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <div className="flex items-center justify-center h-6 text-muted-foreground/50">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      disabled={index === sections.length - 1 || reorderSections.isPending}
                      onClick={() => handleReorder(index, 'down')}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center justify-end gap-2 pr-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-7 px-2 text-xs ${section.isVisible ? "text-emerald-600" : "text-muted-foreground"}`}
                        onClick={() => handleToggleVisibility(section.id, !section.isVisible)}
                      >
                        {section.isVisible ? <><Eye className="w-3 h-3 mr-1.5" /> Visible</> : <><EyeOff className="w-3 h-3 mr-1.5" /> Hidden</>}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                      </Button>
                    </div>
                    
                    <div className={!section.isVisible ? "opacity-60 grayscale-[0.3]" : ""}>
                      <SectionEditor section={section} pageId={pageId} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Section Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newSectionType} 
                onChange={e => setNewSectionType(e.target.value as any)}
              >
                {sectionTypes.map(st => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSectionOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSection} disabled={createSection.isPending}>
              {createSection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
