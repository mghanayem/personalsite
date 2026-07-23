import { useState, useEffect } from "react";
import { useUpdateSection, SectionWithImages, getGetPageQueryKey, SectionData } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Save, Sparkles, Link2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageManager } from "./ImageManager";
import { AiAssistPanel } from "@/components/admin/AiAssistPanel";

interface PageOption {
  id: number;
  slug: string;
  titleAr: string;
  titleEn: string;
  isHomepage: boolean;
}

export function SectionEditor({ section, pageId }: { section: SectionWithImages, pageId: number }) {
  const queryClient = useQueryClient();
  const updateSection = useUpdateSection();
  const [data, setData] = useState<SectionData>(section.data);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [pages, setPages] = useState<PageOption[]>([]);

  useEffect(() => {
    setData(section.data);
    setIsDirty(false);
  }, [section.data]);

  // Fetch pages for the internal link picker — only needed for cards_grid sections
  useEffect(() => {
    if (section.type !== "cards_grid") return;
    fetch("/api/pages")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((ps: PageOption[]) => setPages(ps))
      .catch(() => { /* non-critical; leave pages empty */ });
  }, [section.type]);

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
          <button
            onClick={(e) => { e.stopPropagation(); setAiOpen(true); }}
            title="AI Assist"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </div>
      <AiAssistPanel
        open={aiOpen}
        onOpenChange={setAiOpen}
        title={`AI — ${typeLabels[section.type] || section.type}`}
        contextDescription={`You are assisting with a "${section.type}" section. Current English title: "${data.titleEn || "none"}". Current English content: "${(data.contentEn || "").slice(0, 300)}". Write bilingual content — label outputs [EN] and [AR].`}
        initialPrompt="Rewrite this section with a strong, professional, bilingual version."
      />

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
              <>
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

                {/* CTA Button 1 */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Primary Button (CTA 1)</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Label (English)</Label>
                      <Input value={data.cta1En || ""} onChange={e => updateData({ cta1En: e.target.value })} placeholder="View Experience" />
                    </div>
                    <div className="space-y-2">
                      <Label>Label (Arabic)</Label>
                      <Input value={data.cta1Ar || ""} onChange={e => updateData({ cta1Ar: e.target.value })} dir="rtl" placeholder="استعرض الخبرات" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input value={data.cta1Url || ""} onChange={e => updateData({ cta1Url: e.target.value })} placeholder="#experience or https://..." />
                  </div>
                </div>

                {/* CTA Button 2 */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Secondary Button (CTA 2)</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Label (English)</Label>
                      <Input value={data.cta2En || ""} onChange={e => updateData({ cta2En: e.target.value })} placeholder="Contact Me" />
                    </div>
                    <div className="space-y-2">
                      <Label>Label (Arabic)</Label>
                      <Input value={data.cta2Ar || ""} onChange={e => updateData({ cta2Ar: e.target.value })} dir="rtl" placeholder="تواصل معي" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input value={data.cta2Url || ""} onChange={e => updateData({ cta2Url: e.target.value })} placeholder="#contact or https://..." />
                  </div>
                </div>
              </>
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
                        <div className="space-y-4">
                          {/* Icon */}
                          <div className="space-y-2 max-w-xs">
                            <Label className="text-xs">Icon (text/emoji fallback)</Label>
                            <Input className="h-8 text-sm" value={item.icon || ""} onChange={e => {
                              const newItems = [...(data.items || [])];
                              newItems[idx].icon = e.target.value;
                              updateData({ items: newItems });
                            }} placeholder="e.g. 💼 or M" />
                          </div>

                          {/* Link */}
                          <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Card Link</Label>
                            </div>

                            {/* Link type selector */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Link type</Label>
                              <select
                                className="w-full border border-input rounded-md text-sm px-3 h-8 bg-background"
                                value={item.linkType || "none"}
                                onChange={e => {
                                  const newItems = [...(data.items || [])];
                                  newItems[idx].linkType = e.target.value as "none" | "internal" | "external";
                                  // Reset value when switching type
                                  newItems[idx].linkValue = "";
                                  if (e.target.value === "external") newItems[idx].linkNewTab = true;
                                  updateData({ items: newItems });
                                }}
                              >
                                <option value="none">None</option>
                                <option value="internal">Link to a page on this site</option>
                                <option value="external">Link to an external URL</option>
                              </select>
                            </div>

                            {/* Internal: page picker */}
                            {(item.linkType === "internal") && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">Target page</Label>
                                <select
                                  className="w-full border border-input rounded-md text-sm px-3 h-8 bg-background"
                                  value={item.linkValue || ""}
                                  onChange={e => {
                                    const newItems = [...(data.items || [])];
                                    newItems[idx].linkValue = e.target.value;
                                    updateData({ items: newItems });
                                  }}
                                >
                                  <option value="">— select a page —</option>
                                  {pages.map(p => {
                                    const label = [p.titleEn, p.titleAr].filter(Boolean).join(" — ") || p.slug || "(untitled)";
                                    const value = p.isHomepage ? "" : p.slug;
                                    return <option key={p.id} value={value}>{label}</option>;
                                  })}
                                </select>
                                <p className="text-xs text-muted-foreground">The correct language version will be shown to each visitor automatically.</p>
                              </div>
                            )}

                            {/* External: URL + new-tab checkbox */}
                            {(item.linkType === "external") && (
                              <div className="space-y-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">URL</Label>
                                  <Input
                                    className="h-8 text-sm"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={item.linkValue || ""}
                                    onChange={e => {
                                      const newItems = [...(data.items || [])];
                                      newItems[idx].linkValue = e.target.value;
                                      updateData({ items: newItems });
                                    }}
                                  />
                                  {item.linkValue && !/^https?:\/\//i.test(item.linkValue) && (
                                    <p className="text-xs text-destructive">URL must start with http:// or https://</p>
                                  )}
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    className="rounded"
                                    checked={item.linkNewTab !== false}
                                    onChange={e => {
                                      const newItems = [...(data.items || [])];
                                      newItems[idx].linkNewTab = e.target.checked;
                                      updateData({ items: newItems });
                                    }}
                                  />
                                  Open in new tab
                                </label>
                              </div>
                            )}
                          </div>
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

            {/* Profile photo for hero */}
            {t === "hero" && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Upload a photo to display alongside your name in the hero section. Only the first image is used.</p>
                <ImageManager sectionId={section.id} pageId={pageId} images={section.images} />
              </div>
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
