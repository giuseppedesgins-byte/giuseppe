import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase Storage client using the service role key — only ever called from
 * server actions / API routes, never exposed to the browser. Product images live in a
 * "product-media" bucket (create it in Supabase Storage as a public bucket before this
 * will work — see README). Callers must verify the uploader actually owns the brand
 * before calling this; see /api/uploads/product-image/route.ts for the authorization check.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function isUploadConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const BUCKET = "product-media";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadProductImage(params: { brandId: string; file: File }) {
  const { brandId, file } = params;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type — use JPG, PNG, WEBP, or GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large — 8MB max per image.");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Image uploads aren't configured yet (missing Supabase Storage credentials).");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  // Path is namespaced by brandId so one brand's uploads can never collide with or
  // overwrite another's, and so storage usage per brand is easy to audit later.
  const path = `${brandId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
