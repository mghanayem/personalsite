import {
  useListPages,
  useCreatePage,
  useDeletePage,
  useUpdatePage,
  getListPagesQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { IconPicker } from "@/components/admin/IconPicker";

/** Inline editable title for a page row */
function InlineTitle({
  pageId,
  initialEn,
  initialAr,
  onSaved,
}: {
  pageId: number;
  initialEn: string;
  initialAr: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [titleEn, setTitleEn] = useState(initialEn);
  const [titleAr, setTitleAr] = useState(initialAr);
  const updatePage = useUpdatePage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep in sync when parent data refreshes
  useEffect(() => {
    if (!editing) {
      setTitleEn(initialEn);
      setTitleAr(initialAr);
    }
  }, [initialEn, initialAr, editing]);

  const save = () => {
    if (!titleEn.trim() || !titleAr.trim()) return;
    updatePage.mutate(
      { id: pageId, data: { titleEn: titleEn.trim(), titleAr: titleAr.trim() } },
      {
        onSuccess: () => {
          setEditing(false);
          onSaved();
        },
      },
    );
  };

  const cancel = () => {
    setTitleEn(initialEn);
    setTitleAr(initialAr);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="text-left group flex items-start gap-1"
        onClick={() => {
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        title="Click to rename"
      >
        <span className="font-semibold text-lg group-hover:text-primary transition-colors">
          {initialEn}
        </span>
        <span className="text-muted-foreground text-sm font-normal mt-1">
          {" "}
          / {initialAr}
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-xs text-muted-foreground mt-1.5">
          ✎
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-8 text-sm w-40"
          placeholder="English title"
        />
        <Input
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-8 text-sm w-36"
          placeholder="العنوان بالعربي"
          dir="rtl"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          onClick={save}
          disabled={updatePage.isPending}
        >
          {updatePage.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={cancel}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function PagesList() {
  const { data: pages = [], isLoading } = useListPages();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");

  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const updatePage = useUpdatePage();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPage.mutate(
      { data: { titleAr, titleEn, slug, isPublished: false, showInNav: false } },
      {
        onSuccess: (newPage) => {
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
          setIsCreateOpen(false);
          setLocation(`/admin/pages/${newPage.id}`);
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this page?")) {
      deletePage.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
          },
        },
      );
    }
  };

  const handleIconChange = (pageId: number, icon: string | null) => {
    updatePage.mutate(
      { id: pageId, data: { icon } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        },
      },
    );
  };

  const invalidatePages = () => {
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
            <p className="text-muted-foreground mt-1">
              Manage your website pages and navigation.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Page
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {pages.map((page) => (
              <Card
                key={page.id}
                className="p-4 flex items-center justify-between hover:border-primary/50 transition-colors gap-4"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Icon picker */}
                  <div className="mt-0.5">
                    <IconPicker
                      value={page.icon}
                      onChange={(icon) => handleIconChange(page.id, icon)}
                      compact
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <InlineTitle
                        pageId={page.id}
                        initialEn={page.titleEn}
                        initialAr={page.titleAr}
                        onSaved={invalidatePages}
                      />
                      {page.isHomepage && (
                        <Badge variant="secondary">Homepage</Badge>
                      )}
                      {page.isPublished ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 shadow-none"
                        >
                          Published
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 shadow-none"
                        >
                          Draft
                        </Badge>
                      )}
                      {page.showInNav && (
                        <Badge variant="outline">In Nav</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      /{page.isHomepage ? "" : page.slug}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/pages/${page.id}`}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Link>
                  </Button>
                  {!page.isHomepage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(page.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title (English)</Label>
                <Input
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Title (Arabic)</Label>
                <Input
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  required
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  required
                  pattern="^[a-z0-9-]+$"
                  placeholder="e.g. about-me"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPage.isPending}>
                {createPage.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Page
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
