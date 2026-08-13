import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/queries";
import { formatPrice } from "@/lib/pricing";
import { AddToCartButton } from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${product.brand.name}`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images[0] ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: product.brand.name },
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency.toUpperCase(),
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="editorial-container py-10 sm:py-16">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-8 text-xs text-giuseppe-muted">
        <Link href="/discover" className="link-underline">Discover</Link> /{" "}
        <Link href={`/brands/${product.brand.slug}`} className="link-underline">{product.brand.name}</Link>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-3">
          {product.images.length > 0 ? (
            product.images.map((img) => (
              <div key={img.id} className="relative aspect-[4/5] w-full overflow-hidden bg-giuseppe-line">
                <Image
                  src={img.url}
                  alt={img.altText ?? product.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))
          ) : (
            <div className="aspect-[4/5] w-full bg-giuseppe-line" />
          )}
          {product.videos.map((v) => (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video key={v.id} src={v.url} controls className="w-full" />
          ))}
        </div>

        {/* Details */}
        <div>
          <p className="eyebrow mb-2">{product.brand.name}</p>
          <h1 className="font-display text-3xl sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-xl">{formatPrice(product.priceCents, product.currency)}</p>

          <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-giuseppe-ink">
            {product.description}
          </p>

          <div className="mt-10">
            <AddToCartButton
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                brandId: product.brand.id,
                brandSlug: product.brand.slug,
                brandName: product.brand.name,
                priceCents: product.priceCents,
                currency: product.currency,
                imageUrl: product.images[0]?.url ?? null,
              }}
              colorOptions={product.colorOptions}
            />
          </div>

          <dl className="mt-12 space-y-4 border-t border-giuseppe-line pt-8 text-sm">
            {product.materials && (
              <Detail label="Materials" value={product.materials} />
            )}
            {product.sizingInfo && <Detail label="Sizing" value={product.sizingInfo} />}
            {product.processingTime && <Detail label="Processing time" value={product.processingTime} />}
            <Detail
              label="Shipping"
              value={
                product.brand.shippingOptions.length > 0
                  ? product.brand.shippingOptions
                      .map((s) => `${s.method}: ${formatPrice(s.costCents, s.currency)} (${s.estDeliveryDaysMin ?? "?"}-${s.estDeliveryDaysMax ?? "?"} days)`)
                      .join(" · ")
                  : "Shipping options provided at checkout."
              }
            />
            {product.returnPolicy && <Detail label="Returns" value={product.returnPolicy} />}
            {product.refundPolicy && <Detail label="Refunds" value={product.refundPolicy} />}
            <Detail label="Sold by" value={product.brand.name} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest2 text-giuseppe-muted">{label}</dt>
      <dd className="mt-1 text-giuseppe-ink">{value}</dd>
    </div>
  );
}
