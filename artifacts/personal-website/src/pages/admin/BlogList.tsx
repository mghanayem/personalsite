import { useState } from "react";
import {
  useListAdminPosts,
  useDeletePost,
  useUpdatePost,
  getListAdminPostsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Loader2, PenLine, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function BlogList() {
  const [, setLocation] = useLocation();
  const { data: posts = [], isLoading } = useListAdminPosts();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    deletePost.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
          setDeletingId(null);
        },
        onError: () => setDeletingId(null),
      },
    );
  };

  const handleTogglePublish = (id: number, isPublished: boolean) => {
    setTogglingId(id);
    updatePost.mutate(
      { id, data: { isPublished: !isPublished } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
          setTogglingId(null);
        },
        onError: () => setTogglingId(null),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blog Posts</h1>
            <p className="text-muted-foreground mt-1">Write and manage your bilingual blog.</p>
          </div>
          <Button onClick={() => setLocation("/admin/blog/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <PenLine className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold mb-1">No posts yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first post to get started.
            </p>
            <Button
              onClick={() => setLocation("/admin/blog/new")}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Slug (EN)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const displayTitle = post.titleEn || post.titleAr || "(Untitled)";
                  return (
                    <tr
                      key={post.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{displayTitle}</div>
                        {post.titleAr && post.titleAr !== post.titleEn && (
                          <div className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                            {post.titleAr}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {post.slugEn}
                        </code>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                            post.isPublished
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {post.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            title={post.isPublished ? "Unpublish" : "Publish"}
                            onClick={() => handleTogglePublish(post.id, post.isPublished)}
                            disabled={togglingId === post.id}
                          >
                            {togglingId === post.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : post.isPublished ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            title="Edit"
                            onClick={() => setLocation(`/admin/blog/${post.id}`)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => handleDelete(post.id, displayTitle)}
                            disabled={deletingId === post.id}
                          >
                            {deletingId === post.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
