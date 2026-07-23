import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleFrame } from "@/components/public/ModuleFrame";
import {
  Upload, Trash2, Eye, EyeOff, Plus, Loader2, Puzzle,
  Link as LinkIcon, X, Monitor
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// ── Types ──────────────────────────────────────────────────────────────────

interface Module {
  id: number;
  name: string;
  description: string | null;
  filePath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Placement {
  id: number;
  moduleId: number;
  pageId: number;
  sectionPosition: string;
  isAdminOnly: boolean;
}

interface Page {
  id: number;
  titleEn: string;
  titleAr: string;
}

// ── Fetcher helpers (direct fetch, consistent with ImageManager pattern) ───────

const MODULES_KEY = ["modules"];

async function fetchModules(): Promise<Module[]> {
  const r = await fetch("/api/modules");
  if (!r.ok) throw new Error("Failed to load modules");
  return r.json() as Promise<Module[]>;
}

async function fetchPlacements(moduleId: number): Promise<Placement[]> {
  const r = await fetch(`/api/modules/${moduleId}/placements`);
  if (!r.ok) throw new Error("Failed to load placements");
  return r.json() as Promise<Placement[]>;
}

async function fetchPages(): Promise<Page[]> {
  const r = await fetch("/api/pages");
  if (!r.ok) throw new Error("Failed to load pages");
  return r.json() as Promise<Page[]>;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Modules() {
  const queryClient = useQueryClient();
  const [modules, setModules] = useState<Module[] | null>(null);
  const [loadingModules, setLoadingModules] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load modules on mount
  useEffect(() => {
    fetchModules()
      .then(setModules)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingModules(false));
  }, []);

  const reload = () => {
    setLoadingModules(true);
    fetchModules()
      .then(setModules)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingModules(false));
  };

  const handleToggle = async (mod: Module) => {
    setTogglingId(mod.id);
    try {
      const r = await fetch(`/api/modules/${mod.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !mod.isActive }),
      });
      if (!r.ok) throw new Error("Toggle failed");
      reload();
      // Invalidate public page caches so deactivation is reflected immediately
      queryClient.invalidateQueries();
    } catch {
      setError("Failed to toggle module status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (mod: Module) => {
    if (!confirm(`Delete "${mod.name}"? This cannot be undone.`)) return;
    setDeletingId(mod.id);
    try {
      const r = await fetch(`/api/modules/${mod.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      if (previewId === mod.id) setPreviewId(null);
      if (assigningId === mod.id) setAssigningId(null);
      reload();
      queryClient.invalidateQueries();
    } catch {
      setError("Failed to delete module");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Modules</h1>
            <p className="text-muted-foreground mt-1">
              Upload self-contained HTML modules and place them on any page.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}{" "}
            <button className="underline" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Upload form */}
        <UploadForm onSuccess={reload} />

        {/* Module list */}
        {loadingModules ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : modules && modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <Puzzle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold mb-1">No modules yet</p>
            <p className="text-sm text-muted-foreground">Upload your first .html module above.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Module</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Uploaded</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(modules ?? []).map((mod) => (
                  <tr
                    key={mod.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{mod.name}</div>
                      {mod.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{mod.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          mod.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {mod.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(mod.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {/* Preview */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          title="Preview"
                          onClick={() => setPreviewId(previewId === mod.id ? null : mod.id)}
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                        {/* Assign to page */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          title="Assign to page"
                          onClick={() => setAssigningId(assigningId === mod.id ? null : mod.id)}
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                        {/* Toggle active */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          title={mod.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggle(mod)}
                          disabled={togglingId === mod.id}
                        >
                          {togglingId === mod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : mod.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(mod)}
                          disabled={deletingId === mod.id}
                        >
                          {deletingId === mod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Live preview panel */}
        {previewId !== null && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
              <span className="text-sm font-medium">
                Preview — {modules?.find((m) => m.id === previewId)?.name}
              </span>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setPreviewId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 bg-background">
              <ModuleFrame moduleId={previewId} minHeight={200} />
            </div>
          </div>
        )}

        {/* Assign to page panel */}
        {assigningId !== null && (
          <AssignPanel
            moduleId={assigningId}
            moduleName={modules?.find((m) => m.id === assigningId)?.name ?? "Module"}
            onClose={() => setAssigningId(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// ── Upload form ────────────────────────────────────────────────────────────

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFilename(f.name);
    else setFilename(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a .html file"); return; }
    if (!name.trim()) { setError("Module name is required"); return; }

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      fd.append("description", description.trim());

      const r = await fetch("/api/modules/upload", { method: "POST", body: fd });
      const body = await r.json() as { error?: string };
      if (!r.ok) throw new Error(body.error ?? `Server error (${r.status})`);

      setName("");
      setDescription("");
      setFilename(null);
      if (fileRef.current) fileRef.current.value = "";
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6 space-y-4"
    >
      <h2 className="font-semibold text-base">Upload Module</h2>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mod-name">Module name *</Label>
          <Input
            id="mod-name"
            placeholder="My Calculator"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={uploading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mod-desc">Description (optional)</Label>
          <Input
            id="mod-desc"
            placeholder="A short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>HTML file *</Label>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            id="mod-file"
            accept=".html"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Label
            htmlFor="mod-file"
            className={`cursor-pointer inline-flex items-center gap-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 rounded-md ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Upload className="w-4 h-4" />
            Choose .html file
          </Label>
          {filename && (
            <span className="text-sm text-muted-foreground font-mono">{filename}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Single self-contained .html file with inline &lt;style&gt; and &lt;script&gt;. Max 2 MB.
          Modules run in a sandboxed iframe with <code>sandbox="allow-scripts"</code> only.
        </p>
      </div>

      <Button type="submit" disabled={uploading} className="gap-2">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Upload Module
      </Button>
    </form>
  );
}

// ── Assign panel ───────────────────────────────────────────────────────────

function AssignPanel({
  moduleId,
  moduleName,
  onClose,
}: {
  moduleId: number;
  moduleName: string;
  onClose: () => void;
}) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [pageId, setPageId] = useState<string>("");
  const [position, setPosition] = useState("new_section");
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load pages + current placements
  useEffect(() => {
    void Promise.all([fetchPages(), fetchPlacements(moduleId)]).then(
      ([p, pl]) => { setPages(p); setPlacements(pl); },
    );
  }, [moduleId]);

  const reloadPlacements = () =>
    fetchPlacements(moduleId).then(setPlacements);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId) { setError("Select a page"); return; }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/modules/${moduleId}/placements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: Number(pageId), sectionPosition: position, isAdminOnly }),
      });
      const body = await r.json() as { error?: string };
      if (!r.ok) throw new Error(body.error ?? "Failed to assign");
      await reloadPlacements();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    setRemoving(id);
    try {
      await fetch(`/api/module-placements/${id}`, { method: "DELETE" });
      await reloadPlacements();
    } catch {
      setError("Failed to remove placement");
    } finally {
      setRemoving(null);
    }
  };

  const pageTitle = (p: Page) => p.titleEn || p.titleAr || `Page ${p.id}`;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="text-sm font-medium">Assign "{moduleName}" to a page</span>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Add placement form */}
        <form onSubmit={handleAdd} className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <div className="space-y-1">
            <Label>Page</Label>
            {!pages ? (
              <div className="h-9 flex items-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : (
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
              >
                <option value="">Select page…</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{pageTitle(p)}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <Label>Position</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="new_section">New section (end of page)</option>
              <option value="before:0">Before first section</option>
              <option value="after:0">After first section</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>Visibility</Label>
            <div className="flex items-center h-9 gap-2">
              <input
                type="checkbox"
                id="admin-only"
                checked={isAdminOnly}
                onChange={(e) => setIsAdminOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="admin-only" className="cursor-pointer font-normal text-sm">
                Admin only
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="gap-2 self-end h-9">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Assign
          </Button>
        </form>

        {/* Existing placements */}
        {placements && placements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Current placements
            </p>
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {placements.map((pl) => {
                const pg = pages?.find((p) => p.id === pl.pageId);
                return (
                  <div key={pl.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{pg ? pageTitle(pg) : `Page ${pl.pageId}`}</span>
                      <span className="text-muted-foreground ml-2">— {pl.sectionPosition}</span>
                      {pl.isAdminOnly && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          admin only
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleRemove(pl.id)}
                      disabled={removing === pl.id}
                    >
                      {removing === pl.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
