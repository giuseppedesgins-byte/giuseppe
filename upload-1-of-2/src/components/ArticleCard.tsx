import Link from "next/link";
import type { ArticleCategory } from "@prisma/client";
import { CATEGORY_META, formatArticleDate } from "@/lib/editorial";

export type ArticleCardData = {
  slug: string;
  title: string;
  dek: string | null;
  category: ArticleCategory;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
};

export function ArticleCard({ article, large = false }: { article: ArticleCardData; large?: boolean }) {
  return (
    <Link href={`/the-edit/${article.slug}`} className="group block">
      <div className={`${large ? "aspect-[16/10]" : "aspect-[4/5]"} overflow-hidden bg-giuseppe-line`}>
        {article.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? ""}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
          />
        )}
      </div>
      <p className="eyebrow mt-4">
        {CATEGORY_META[article.category].label}
        {article.publishedAt && <> &middot; {formatArticleDate(article.publishedAt)}</>}
      </p>
      <h3 className={`mt-2 font-display ${large ? "text-3xl sm:text-5xl uppercase leading-[0.95]" : "text-2xl"}`}>
        {article.title}
      </h3>
      {article.dek && <p className="mt-2 text-sm leading-relaxed text-giuseppe-muted">{article.dek}</p>}
    </Link>
  );
}
