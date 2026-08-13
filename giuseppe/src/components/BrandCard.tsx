import Image from "next/image";
import Link from "next/link";

export type BrandCardData = {
  slug: string;
  name: string;
  country: string | null;
  descriptor: string | null;
  heroImageUrl: string | null;
  foundingBrand: boolean;
};

export function BrandCard({ brand }: { brand: BrandCardData }) {
  return (
    <Link href={`/brands/${brand.slug}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-giuseppe-line">
        {brand.heroImageUrl && (
          <Image
            src={brand.heroImageUrl}
            alt={brand.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
          />
        )}
        {brand.foundingBrand && (
          <span className="absolute left-3 top-3 bg-giuseppe-bg px-2 py-1 text-[10px] uppercase tracking-widest2 text-giuseppe-ink">
            Founding Brand
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-display text-lg text-giuseppe-ink">{brand.name}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-giuseppe-muted">
          {brand.country ?? "—"}
        </p>
        {brand.descriptor && (
          <p className="mt-1 line-clamp-2 text-sm text-giuseppe-muted">{brand.descriptor}</p>
        )}
      </div>
    </Link>
  );
}
