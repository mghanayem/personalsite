import { useState } from "react";
import { useDeleteImage, useUpdateImage, SectionImage, ImageUpdate, getGetPageQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Loader2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function ImageManager({ sectionId, pageId, images }: { sectionId: number, pageId: number, images: SectionImage[] }) {
  const queryClient = useQueryClient();
  const deleteImage = useDeleteImage();
  const updateImage = useUpdateImage();
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", e.target.files[0]);
      fd.append("caption_ar", "");
      fd.append("caption_en", "");
      const res = await fetch(`/api/sections/${sectionId}/images`, { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: (body as { error?: string }).error ?? `Server error (${res.status})`,
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) });
    } catch (err) {
      console.error("Upload failed", err);
      toast({ variant: "destructive", title: "Upload failed", description: "Could not reach the server." });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ''; // reset file input
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    deleteImage.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) })
    });
  };

  return (
    <div className="space-y-4 mt-6 border-t pt-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Manage Images</h4>
        <div>
          <input type="file" id={`upload-${sectionId}`} className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          <Label htmlFor={`upload-${sectionId}`} className={`cursor-pointer inline-flex items-center gap-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 rounded-md ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Image
          </Label>
        </div>
      </div>
      
      {images.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8 bg-muted/10 rounded-md border border-dashed">
          No images uploaded yet.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {images.map((img) => (
          <ImageCard 
            key={img.id} 
            img={img} 
            onDelete={() => handleDelete(img.id)} 
            onUpdate={(data: ImageUpdate) => {
              updateImage.mutate({ id: img.id, data }, {
                onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(pageId) })
              });
            }} 
            isPending={updateImage.isPending || deleteImage.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function ImageCard({ img, onDelete, onUpdate, isPending }: any) {
  const [captionAr, setCaptionAr] = useState(img.captionAr || "");
  const [captionEn, setCaptionEn] = useState(img.captionEn || "");
  const [isDirty, setIsDirty] = useState(false);

  return (
    <div className="border rounded-md p-3 flex gap-4 bg-muted/5 relative group">
      <div className="w-24 h-24 shrink-0 bg-muted rounded overflow-hidden">
        <img src={img.url} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Caption (English)</Label>
          <Input className="h-8 text-sm" value={captionEn} onChange={e => { setCaptionEn(e.target.value); setIsDirty(true); }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Caption (Arabic)</Label>
          <Input className="h-8 text-sm" dir="rtl" value={captionAr} onChange={e => { setCaptionAr(e.target.value); setIsDirty(true); }} />
        </div>
        <div className="flex justify-end gap-2">
          {isDirty && (
            <Button size="sm" variant="default" onClick={() => {
              onUpdate({ captionAr, captionEn });
              setIsDirty(false);
            }} disabled={isPending}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={onDelete} disabled={isPending}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
