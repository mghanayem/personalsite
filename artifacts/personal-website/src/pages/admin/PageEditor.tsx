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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Plus, GripVertical, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SectionEditor } from "./SectionEditor";

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

  const [pageData, setPageData] = useState({ titleAr: "", titleEn: "", slug: "", isPublished: false, showInNav: false });
  const [isPageDirty, setIsPageDirty] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<typeof SectionInputType[keyof typeof SectionInputType]>("text");

  useEffect(() => {
    if (page) {
      setPageData({
        titleAr: page.titleAr,
        titleEn: page.titleEn,
        slug: page.slug,
        isPublished: page.isPublished,
        showInNav: page.showInNav
      });
      setIsPageDirty(false);
    }
  }, [page]);

  const handlePageSave = () => {
    updatePage.mutate({ id: pageId, data: pageData }, {
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
