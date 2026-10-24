import type { ReactNode } from "react";

/**
 * Tiny, dependency-free renderer for article bodies. It builds React elements directly (never raw
 * HTML), so editors can't inject scripts. Supported:
 *   ## Heading        ### Subheading
 *   > Pull quote      (only use real, sourced quotes — never invent them)
 *   ![alt text | Credit](https://image-url)   image on its own line; text after "|" is the photo credit
 *   **bold**  *italic*  [link text](https://url)
 * Blocks are separated by a blank line.
 */

function safeUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("/") ? url : null;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    } else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      const href = lm ? safeUrl(lm[2]) : null;
      out.push(
        href && lm ? (
          <a key={key} href={href} className="underline underline-offset-4" rel="noopener noreferrer">
            {lm[1]}
          </a>
        ) : (
          tok
        )
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ArticleBody({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="space-y-6 text-lg leading-[1.75]">
      {blocks.map((block, i) => {
        const key = `b${i}`;
        const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(block);
        if (img) {
          const [alt, credit] = img[1].split("|").map((s) => s.trim());
          const src = safeUrl(img[2]);
          if (!src) return null;
          return (
            <figure key={key} className="my-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt ?? ""} loading="lazy" className="w-full" />
              {credit && <figcaption className="mt-2 text-xs text-giuseppe-muted">Photo: {credit}</figcaption>}
            </figure>
          );
        }
        if (block.startsWith("### ")) {
          return (
            <h3 key={key} className="pt-4 font-display text-2xl">
              {renderInline(block.slice(4), key)}
            </h3>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={key} className="pt-6 font-display text-3xl uppercase">
              {renderInline(block.slice(3), key)}
            </h2>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <blockquote key={key} className="my-10 border-l-2 border-giuseppe-ink pl-6 font-display text-2xl italic leading-snug">
              {renderInline(block.replace(/^>\s?/gm, ""), key)}
            </blockquote>
          );
        }
        return <p key={key}>{renderInline(block.replace(/\n/g, " "), key)}</p>;
      })}
    </div>
  );
}
