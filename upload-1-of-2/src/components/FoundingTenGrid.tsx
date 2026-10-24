import Image from "next/image";
import Link from "next/link";

export type FoundingBrand = {
  slug: string;
  name: string;
  story: string | null;
  heroImageUrl: string | null;
  city: string | null;
  country: string | null;
  foundingSlot: number | null;
};

// Varied proportions give the magazine-spread feel. Cycles by position.
const ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[4/5]", "aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[4/5]", "aspect-square"];

function statement(story: string | null) {
  if (!story) return null;
  const clean = story.replace(/\s+/g, " ").trim();
  return clean.length > 140 ? `${clean.slice(0, 137).trimEnd()}…` : clean;
}

/**
 * Ten editorial positions. A position is "filled" only when an approved (ACTIVE) brand holds that
 * foundingSlot number; otherwise it shows a "To Be Discovered" placeholder. Nothing here is invented.
 */
export function FoundingTenGrid({ brands, showStatements = true }: { brands: FoundingBrand[]; showStatements?: boolean }) {
  const bySlot = new Map<number, FoundingBrand>();
  brands.forEach((b) => {
    if (b.foundingSlot) bySlot.set(b.foundingSlot, b);
  });

  return (
    <ol className="columns-2 gap-4 sm:gap-5 lg:columns-4">
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        const label = String(n).padStart(2, "0");
        const brand = bySlot.get(n);
        const aspect = ASPECTS[i];

        if (!brand) {
          return (
            <li key={n} className="mb-4 break-inside-avoid sm:mb-5">
              <div
                className={`${aspect} flex flex-col justify-between border border-giuseppe-line bg-giuseppe-panel p-4`}
                aria-label={`Position ${label}: to be discovered`}
              >
                <span className="eyebrow">Position {label}</span>
                <div>
                  <p className="outline-numeral font-display text-7xl leading-none sm:text-8xl">{label}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-widest2 text-giuseppe-ink">To Be Discovered</p>
                </div>
              </div>
            </li>
          );
        }

        const place = [brand.city, brand.country].filter(Boolean).join(", ");
        const blurb = showStatements ? statement(brand.story) : null;
        return (
          <li key={n} className="mb-4 break-inside-avoid sm:mb-5">
            <Link href={`/brands/${brand.slug}`} className="group block">
              <div className={`${aspect} relative overflow-hidden bg-giuseppe-ink`}>
                {brand.heroImageUrl && (
                  <Image
                    src={brand.heroImageUrl}
                    alt={brand.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
                  />
                )}
                <span className="absolute left-3 top-3 bg-giuseppe-bg px-2 py-1 text-[10px] uppercase tracking-widest2 text-giuseppe-ink">
                  {label}
                </span>
              </div>
              <p className="mt-3 font-display text-xl">{brand.name}</p>
              {place && <p className="mt-1 text-[11px] uppercase tracking-wide text-giuseppe-muted">{place}</p>}
              {blurb && <p className="mt-2 text-sm leading-relaxed text-giuseppe-muted">{blurb}</p>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
