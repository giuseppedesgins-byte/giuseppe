export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  let slug = slugify(base) || "brand";
  let i = 1;
  while (await exists(slug)) {
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
  return slug;
}
