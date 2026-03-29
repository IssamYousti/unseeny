"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

type ImageRecord = {
  id: string;
  storage_path: string;
  position: number;
};

export default function ListingImageUpload({
  listingId,
  userId,
  existingImages,
}: {
  listingId: string;
  userId: string;
  existingImages: ImageRecord[];
}) {
  const [images, setImages] = useState<ImageRecord[]>(
    [...existingImages].sort((a, b) => a.position - b.position)
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const getPublicUrl = (path: string) =>
    supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;

  const uploadFiles = async (files: FileList) => {
    setError(null);

    const remaining = 8 - images.length;
    if (remaining <= 0) {
      setError("Maximum 8 photos per listing.");
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) {
        setError("Each photo must be under 10 MB.");
        continue;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError("Upload failed. Please try again.");
        continue;
      }

      const { data, error: dbError } = await supabase
        .from("listing_images")
        .insert({ listing_id: listingId, storage_path: path, position: images.length })
        .select()
        .single();

      if (dbError) {
        setError("Could not save image record.");
        continue;
      }

      setImages((prev) => [...prev, data]);
    }

    setUploading(false);
  };

  const deleteImage = async (img: ImageRecord) => {
    await supabase.storage.from("listing-images").remove([img.storage_path]);
    await supabase.from("listing_images").delete().eq("id", img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
  };

  return (
    <div className="space-y-4">

      {/* Drop zone */}
      <label
        className={`
          flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-2xl p-10 cursor-pointer
          transition-all duration-200
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); }}
          disabled={uploading}
        />

        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? "bg-primary/10" : "bg-muted"}`}>
          {uploading
            ? <Loader2 className="h-6 w-6 text-primary animate-spin" />
            : <Upload className={`h-6 w-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
          }
        </div>

        <div className="text-center">
          <p className="text-sm font-medium">
            {uploading ? "Uploading…" : dragOver ? "Drop to upload" : "Drop photos here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse — JPG, PNG, WebP · max 10 MB · up to 8 photos
          </p>
        </div>
      </label>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Uploaded image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPublicUrl(img.storage_path)}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />

              <button
                type="button"
                onClick={() => deleteImage(img)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {i === 0 && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/85 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <ImageIcon className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium">Cover</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
