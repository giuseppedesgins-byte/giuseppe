import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/pricing";

export type ProductCardData = {
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  brandName: string;
  isNewArrival?: boolean;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-giuseppe-line">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
          />
        )}
        {product.isNewArrival && (
          <span className="absolute left-3 top-3 bg-giuseppe-bg px-2 py-1 text-[10px] uppercase tracking-widest2 text-giuseppe-ink">
            New
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-giuseppe-muted">{product.brandName}</p>
          <p className="mt-1 font-body text-sm text-giuseppe-ink">{product.name}</p>
        </div>
        <p className="whitespace-nowrap text-sm text-giuseppe-ink">
          {formatPrice(product.priceCents, product.currency)}
        </p>
      </div>
    </Link>
  );
}
