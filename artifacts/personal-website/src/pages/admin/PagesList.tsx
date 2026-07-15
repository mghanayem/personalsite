import { useListPages, useCreatePage, useDeletePage, getListPagesQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPage.mutate({ data: { titleAr, titleEn, slug, isPublished: false, showInNav: false } }, {
      onSuccess: (newPage) => {
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        setIsCreateOpen(false);
        setLocation(`/admin/pages/${newPage.id}`);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this page?")) {
      deletePage.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
            <p className="text-muted-foreground mt-1">Manage your website pages and navigation.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Page
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-4">
            {pages.map(page => (
              <Card key={page.id} className="p-4 flex items-center justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{page.titleEn} <span className="text-muted-foreground text-sm font-normal">/ {page.titleAr}</span></h3>
                    {page.isHomepage && <Badge variant="secondary">Homepage</Badge>}
                    {page.isPublished ? (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 shadow-none">Published</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 shadow-none">Draft</Badge>
                    )}
                    {page.showInNav && <Badge variant="outline">In Nav</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    /{page.isHomepage ? "" : page.slug}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/pages/${page.id}`}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Link>
                  </Button>
                  {!page.isHomepage && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(page.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
                <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Title (Arabic)</Label>
                <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} required dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required pattern="^[a-z0-9-]+$" placeholder="e.g. about-me" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPage.isPending}>
                {createPage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Page
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
