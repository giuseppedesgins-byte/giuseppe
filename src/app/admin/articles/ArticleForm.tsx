import { ArticleStatus } from "@prisma/client";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/editorial";
import { saveArticle } from "./actions";

type Subject = { id: string; name: string; brandId: string | null };
type ArticleValues = {
  id: string;
  title: string;
  dek: string | null;
  body: string;
  category: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  featured: boolean;
  authorName: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  coverImageCredit: string | null;
  disclosure: string | null;
  subjectIds: string[];
};

const input = "w-full border border-giuseppe-line bg-white px-3 py-2 text-sm";
const label = "mb-1 block text-xs uppercase tracking-widest2 text-giuseppe-muted";

function toLocalInput(d: Date | null) {
  return d ? d.toISOString().slice(0, 16) : "";
}

export function ArticleForm({ article, subjects }: { article?: ArticleValues; subjects: Subject[] }) {
  return (
    <form action={saveArticle} className="max-w-3xl space-y-6 border border-giuseppe-line bg-white p-6">
      {article && <input type="hidden" name="id" value={article.id} />}

      <div>
        <label className={label} htmlFor="title">Title</label>
        <input id="title" name="title" required defaultValue={article?.title ?? ""} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="dek">Standfirst (short summary under the headline)</label>
        <textarea id="dek" name="dek" rows={2} defaultValue={article?.dek ?? ""} className={input} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="category">Category</label>
          <select id="category" name="category" required defaultValue={article?.category ?? ""} className={input}>
            <option value="" disabled>Choose…</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="authorName">Byline</label>
          <input id="authorName" name="authorName" defaultValue={article?.authorName ?? ""} className={input} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="body">Body</label>
        <textarea id="body" name="body" rows={18} required defaultValue={article?.body ?? ""} className={`${input} font-mono`} />
        <p className="mt-2 text-xs leading-relaxed text-giuseppe-muted">
          Separate paragraphs with a blank line. <code>## Heading</code>, <code>&gt; quote</code>, <code>**bold**</code>,{" "}
          <code>*italic*</code>, <code>[link](https://…)</code>. Image on its own line:{" "}
          <code>![description | Photographer credit](https://…)</code>. Only publish real, sourced quotes. Never invent
          interviews, quotes, or partnerships, and only use photography you own or are licensed to use.
        </p>
      </div>

      <fieldset className="space-y-3 border border-giuseppe-line p-4">
        <legend className="px-2 text-xs uppercase tracking-widest2 text-giuseppe-muted">Cover image</legend>
        <div>
          <label className={label} htmlFor="coverImageUrl">Image URL (https)</label>
          <input id="coverImageUrl" name="coverImageUrl" defaultValue={article?.coverImageUrl ?? ""} className={input} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="coverImageAlt">Alt text (describe the image)</label>
            <input id="coverImageAlt" name="coverImageAlt" defaultValue={article?.coverImageAlt ?? ""} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="coverImageCredit">Photo credit / licence (required with an image)</label>
            <input id="coverImageCredit" name="coverImageCredit" defaultValue={article?.coverImageCredit ?? ""} className={input} />
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-giuseppe-line p-4">
        <legend className="px-2 text-xs uppercase tracking-widest2 text-giuseppe-muted">Designers featured in this story</legend>
        {subjects.length === 0 ? (
          <p className="text-sm text-giuseppe-muted">No subjects yet. Add them under Subjects.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subjects.map((s) => (
              <li key={s.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={article?.subjectIds.includes(s.id)} />
                  {s.name}
                  <span className="text-xs text-giuseppe-muted">{s.brandId ? "(Giuseppe designer)" : "(editorial only)"}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-giuseppe-muted">
          The public label ("Giuseppe designer" vs "Editorial feature") is set automatically from whether the subject is linked to an
          approved Giuseppe brand.
        </p>
      </fieldset>

      <div>
        <label className={label} htmlFor="disclosure">Disclosure (optional)</label>
        <input
          id="disclosure"
          name="disclosure"
          defaultValue={article?.disclosure ?? ""}
          placeholder="e.g. Product was gifted. Leave blank if none."
          className={input}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={article?.featured} /> Lead cover story on The Edit (only one at a time)
      </label>

      <div>
        <label className={label} htmlFor="publishedAt">Publish date and time (UTC). Leave blank for now; a future time schedules it</label>
        <input id="publishedAt" type="datetime-local" name="publishedAt" defaultValue={toLocalInput(article?.publishedAt ?? null)} className={input} />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-giuseppe-line pt-6">
        <button name="intent" value="draft" className="border border-giuseppe-ink px-5 py-3 text-[11px] uppercase tracking-widest2">
          Save
        </button>
        <button name="intent" value="review" className="border border-giuseppe-ink px-5 py-3 text-[11px] uppercase tracking-widest2">
          Mark as in review
        </button>
        <button name="intent" value="publish" className="bg-giuseppe-ink px-5 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
          Publish / schedule
        </button>
        {article?.status === "PUBLISHED" && (
          <button name="intent" value="unpublish" className="border border-red-700 px-5 py-3 text-[11px] uppercase tracking-widest2 text-red-700">
            Unpublish
          </button>
        )}
      </div>
    </form>
  );
}
