import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleBody } from "@/lib/markdown";
import {
  CATEGORY_META,
  EDITORIAL_INDEPENDENCE_NOTE,
  formatArticleDate,
  getPublicArticle,
  getRelatedArticles,
  isMarketplaceSubject,
} from "@/lib/editorial";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getPublicArticle(params.slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.dek ?? undefined,
    openGraph: { title: a.title, description: a.dek ?? undefined, images: a.coverImageUrl ? [a.coverImageUrl] : [] },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getPublicArticle(params.slug);
  if (!article) notFound();

  const related = await getRelatedArticles(article.id, article.category, article.subjects.map((s) => s.id));
  const cat = CATEGORY_META[article.category];

  return (
    <article>
      <header className="editorial-container max-w-4xl pb-10 pt-14 sm:pt-20">
        <Link href={`/the-edit?category=${cat.slug}`} className="eyebrow link-underline text-giuseppe-ink">
          {cat.label}
        </Link>
        <h1 className="mt-5 font-display text-4xl uppercase leading-[0.95] tracking-tight sm:text-6xl">{article.title}</h1>
        {article.dek && <p className="mt-6 max-w-2xl text-xl leading-relaxed text-giuseppe-muted">{article.dek}</p>}
        <p className="mt-6 text-[11px] uppercase tracking-widest2 text-giuseppe-muted">
          {article.authorName && <>By {article.authorName} &middot; </>}
          {formatArticleDate(article.publishedAt)}
        </p>
      </header>

      {article.coverImageUrl && (
        <figure className="editorial-container max-w-5xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.coverImageUrl} alt={article.coverImageAlt ?? ""} className="w-full" />
          {article.coverImageCredit && (
            <figcaption className="mt-2 text-xs text-giuseppe-muted">Photo: {article.coverImageCredit}</figcaption>
          )}
        </figure>
      )}

      <div className="editorial-container max-w-2xl py-14 sm:py-20">
        <ArticleBody source={article.body} />
      </div>

      {/* Featured designers: clearly separates marketplace partners from editorial-only subjects */}
      {article.subjects.length > 0 && (
        <section className="border-y border-giuseppe-line bg-giuseppe-panel py-14">
          <div className="editorial-container max-w-4xl">
            <p className="eyebrow mb-6">In this story</p>
            <div className="space-y-8">
              {article.subjects.map((s) => {
                const marketplace = isMarketplaceSubject(s);
                return (
                  <div key={s.id} className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <p className="font-display text-2xl">{s.name}</p>
                      {s.location && <p className="mt-1 text-[11px] uppercase tracking-wide text-giuseppe-muted">{s.location}</p>}
                    </div>
                    <div className="sm:col-span-8">
                      <p className="mb-2 inline-block border border-giuseppe-ink px-2 py-1 text-[10px] uppercase tracking-widest2">
                        {marketplace ? "Giuseppe designer" : "Editorial feature"}
                      </p>
                      {marketplace && s.brand ? (
                        <>
                          <p className="text-sm leading-relaxed text-giuseppe-muted">
                            This designer sells through Giuseppe. Giuseppe may earn a commission on their sales.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <Link href={`/brands/${s.brand.slug}`} className="underline underline-offset-4">
                              Visit their Giuseppe page
                            </Link>
                          </div>
                          {s.brand.products.length > 0 && (
                            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {s.brand.products.map((p) => (
                                <li key={p.slug}>
                                  <Link href={`/products/${p.slug}`} className="group block">
                                    <div className="relative aspect-square overflow-hidden bg-giuseppe-line">
                                      {p.images[0] && (
                                        <Image src={p.images[0].url} alt={p.name} fill sizes="25vw" className="object-cover" />
                                      )}
                                    </div>
                                    <p className="mt-1 text-xs">{p.name}</p>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-sm leading-relaxed text-giuseppe-muted">
                            Featured editorially. Not a Giuseppe marketplace designer: no partnership or endorsement is
                            implied, and their work is not sold through Giuseppe.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            {s.website && (
                              <a href={s.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                                Website
                              </a>
                            )}
                            {s.instagram && (
                              <a
                                href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-4"
                              >
                                Instagram
                              </a>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="editorial-container max-w-2xl py-10 text-xs leading-relaxed text-giuseppe-muted">
        {article.disclosure && <p className="mb-3 text-giuseppe-ink">Disclosure: {article.disclosure}</p>}
        <p>{EDITORIAL_INDEPENDENCE_NOTE}</p>
      </div>

      {related.length > 0 && (
        <section className="editorial-container border-t border-giuseppe-line py-16">
          <p className="eyebrow mb-8">Related reading</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
