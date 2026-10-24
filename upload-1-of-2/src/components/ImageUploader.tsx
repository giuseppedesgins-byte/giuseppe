"use client";

import { useState } from "react";

/**
 * Real drag-and-drop multi-image upload, used by both /admin/products/[id] (and /new)
 * and the seller "Propose a product" form. Renders one hidden <input type="hidden">
 * per uploaded URL under `fieldName` so the enclosing <form action={serverAction}> can
 * read them all via `formData.getAll(fieldName)` — no client-side state needs to reach
 * the server action separately.
 */
export function ImageUploader({
  brandId,
  sellerToken,
  fieldName = "imageUrls",
  initialUrls = [],
}: {
  brandId: string;
  sellerToken?: string;
  fieldName?: string;
  initialUrls?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("brandId", brandId);
        if (sellerToken) fd.append("sellerToken", sellerToken);
        const res = await fetch("/api/uploads/product-image", { method: "POST", body: fd });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Upload failed.");
        uploaded.push(result.url);
      }
      setUrls((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {urls.map((url, i) => (
        <input key={`${url}-${i}`} type="hidden" name={fieldName} value={url} />
      ))}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((u, idx) => idx !== i))}
                className="absolute right-1 top-1 hidden bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-widest2 group-hover:block"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        className="block cursor-pointer border border-dashed border-giuseppe-line px-4 py-6 text-center text-xs uppercase tracking-widest2 text-giuseppe-muted hover:border-giuseppe-ink"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? "Uploading..." : "Click or drag images here"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
