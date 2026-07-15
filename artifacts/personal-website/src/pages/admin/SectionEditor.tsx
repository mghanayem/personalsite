import { useState, useEffect } from "react";
import { useUpdateSection, SectionWithImages, getGetPageQueryKey, SectionData } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageManager } from "./ImageManager";

export function SectionEditor({ section, pageId }: { section: SectionWithImages, pageId: number }) {
  const queryClient = useQueryClient();
  const updateSection = useUpdateSection();
  const [data, setData] = useState<SectionData>(section.data);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setData(section.data);
    setIsDirty(false);
  }, [section.data]);

  const handleSave = () => {
    updateSection.mutate({ id: section.id, data: { data } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) });
        setIsDirty(false);
      }
    });
  };

  const updateData = (updates: Partial<SectionData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const typeLabels: Record<string, string> = {
    hero: "Hero Header",
    text: "Rich Text",
    text_with_image: "Text + Image",
    image_gallery: "Image Gallery",
    cards_grid: "Cards Grid",
    timeline: "Timeline",
    contact_strip: "Contact Strip"
  };

  const t = section.type;

  return (
    <div className="border rounded-md overflow-hidden bg-card shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">
            {typeLabels[section.type] || section.type}
          </div>
          <span className="font-medium text-sm">
            {data.titleEn || data.titleAr || "Untitled Section"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />}
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-muted/10">
          <div className="space-y-6">
            
            {/* Common Fields */}
            {(t !== "image_gallery") && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (English)</Label>
                  <Input value={data.titleEn || ""} onChange={e => updateData({ titleEn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Title (Arabic)</Label>
                  <Input value={data.titleAr || ""} onChange={e => updateData({ titleAr: e.target.value })} dir="rtl" />
                </div>
              </div>
            )}

            {(t === "hero" || t === "text" || t === "text_with_image" || t === "cards_grid" || t === "timeline") && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Content / Description (English)</Label>
                  <Textarea value={data.contentEn || ""} onChange={e => updateData({ contentEn: e.target.value })} className="min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <Label>Content / Description (Arabic)</Label>
                  <Textarea value={data.contentAr || ""} onChange={e => updateData({ contentAr: e.target.value })} dir="rtl" className="min-h-[100px]" />
                </div>
              </div>
            )}

            {/* Specific Fields */}
            {t === "hero" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location (English)</Label>
                  <Input value={data.locationEn || ""} onChange={e => updateData({ locationEn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location (Arabic)</Label>
                  <Input value={data.locationAr || ""} onChange={e => updateData({ locationAr: e.target.value })} dir="rtl" />
                </div>
              </div>
            )}

            {t === "contact_strip" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={data.email || ""} onChange={e => updateData({ email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input type="url" value={data.linkedin || ""} onChange={e => updateData({ linkedin: e.target.value })} />
                </div>
              </div>
            )}

            {t === "text_with_image" && (
              <div className="space-y-2 max-w-xs">
                <Label>Image Position</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={data.imagePosition || "right"} 
                  onChange={e => updateData({ imagePosition: e.target.value })}
                >
                  <option value="right">Right (LTR) / Left (RTL)</option>
                  <option value="left">Left (LTR) / Right (RTL)</option>
                </select>
              </div>
            )}

            {/* Items for timeline and cards_grid */}
            {(t === "timeline" || t === "cards_grid") && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Items</h4>
                  <Button size="sm" variant="outline" onClick={() => {
                    const newItem = { id: Math.random().toString(36).substring(2), titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", subheadingAr: "", subheadingEn: "", date: "", icon: "", bullets: [] };
                    updateData({ items: [...(data.items || []), newItem] });
                  }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {(data.items || []).map((item, idx) => (
                    <div key={item.id} className="border p-4 rounded-md bg-background relative space-y-4">
                      <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => {
                        const newItems = [...(data.items || [])];
                        newItems.splice(idx, 1);
                        updateData({ items: newItems });
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <div className="grid md:grid-cols-2 gap-4 pr-8">
                        <div className="space-y-2">
                          <Label className="text-xs">Title (EN)</Label>
                          <Input className="h-8 text-sm" value={item.titleEn || ""} onChange={e => {
                            const newItems = [...(data.items || [])];
                            newItems[idx].titleEn = e.target.value;
                            updateData({ items: newItems });
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Title (AR)</Label>
                          <Input className="h-8 text-sm" dir="rtl" value={item.titleAr || ""} onChange={e => {
                            const newItems = [...(data.items || [])];
                            newItems[idx].titleAr = e.target.value;
                            updateData({ items: newItems });
                          }} />
                        </div>
                      </div>

                      {t === "timeline" && (
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Date / Period</Label>
                            <Input className="h-8 text-sm" value={item.date || ""} onChange={e => {
                              const newItems = [...(data.items || [])];
                              newItems[idx].date = e.target.value;
                              updateData({ items: newItems });
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Subheading (EN)</Label>
                            <Input className="h-8 text-sm" value={item.subheadingEn || ""} onChange={e => {
                              const newItems = [...(data.items || [])];
                              newItems[idx].subheadingEn = e.target.value;
                              updateData({ items: newItems });
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Subheading (AR)</Label>
                            <Input className="h-8 text-sm" dir="rtl" value={item.subheadingAr || ""} onChange={e => {
                              const newItems = [...(data.items || [])];
                              newItems[idx].subheadingAr = e.target.value;
                              updateData({ items: newItems });
                            }} />
                          </div>
                        </div>
                      )}

                      {t === "cards_grid" && (
                        <div className="space-y-2 max-w-xs">
                          <Label className="text-xs">Icon (text/emoji fallback)</Label>
                          <Input className="h-8 text-sm" value={item.icon || ""} onChange={e => {
                            const newItems = [...(data.items || [])];
                            newItems[idx].icon = e.target.value;
                            updateData({ items: newItems });
                          }} placeholder="e.g. 💼 or M" />
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Description (EN)</Label>
                          <Textarea className="min-h-[60px] text-sm" value={item.descriptionEn || ""} onChange={e => {
                            const newItems = [...(data.items || [])];
                            newItems[idx].descriptionEn = e.target.value;
                            updateData({ items: newItems });
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Description (AR)</Label>
                          <Textarea className="min-h-[60px] text-sm" dir="rtl" value={item.descriptionAr || ""} onChange={e => {
                            const newItems = [...(data.items || [])];
                            newItems[idx].descriptionAr = e.target.value;
                            updateData({ items: newItems });
                          }} />
                        </div>
                      </div>

                      {/* Bullets inside timeline */}
                      {t === "timeline" && (
                        <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Bullet Points</Label>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                              const newItems = [...(data.items || [])];
                              if (!newItems[idx].bullets) newItems[idx].bullets = [];
                              newItems[idx].bullets!.push({ id: Math.random().toString(36).substring(2), textAr: "", textEn: "" });
                              updateData({ items: newItems });
                            }}>
                              <Plus className="w-3 h-3 mr-1" /> Add Bullet
                            </Button>
                          </div>
                          {(item.bullets || []).map((bullet, bIdx) => (
                            <div key={bullet.id} className="flex gap-2 items-start">
                              <Input className="h-8 text-sm flex-1" placeholder="English text" value={bullet.textEn || ""} onChange={e => {
                                const newItems = [...(data.items || [])];
                                newItems[idx].bullets![bIdx].textEn = e.target.value;
                                updateData({ items: newItems });
                              }} />
                              <Input className="h-8 text-sm flex-1" placeholder="Arabic text" dir="rtl" value={bullet.textAr || ""} onChange={e => {
                                const newItems = [...(data.items || [])];
                                newItems[idx].bullets![bIdx].textAr = e.target.value;
                                updateData({ items: newItems });
                              }} />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                                const newItems = [...(data.items || [])];
                                newItems[idx].bullets!.splice(bIdx, 1);
                                updateData({ items: newItems });
                              }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!data.items || data.items.length === 0) && (
                    <div className="text-sm text-center text-muted-foreground py-4 border rounded border-dashed">
                      No items added yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Images Manager */}
            {(t === "image_gallery" || t === "text_with_image") && (
              <ImageManager sectionId={section.id} pageId={pageId} images={section.images} />
            )}

            <div className="flex justify-end pt-4 border-t mt-6">
              <Button onClick={handleSave} disabled={!isDirty || updateSection.isPending} className="gap-2">
                {updateSection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Section Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
