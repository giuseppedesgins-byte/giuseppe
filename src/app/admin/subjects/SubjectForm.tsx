import { saveSubject } from "../articles/actions";

type Values = {
  id: string;
  name: string;
  location: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
  imageUrl: string | null;
  imageCredit: string | null;
  brandId: string | null;
};
type BrandOption = { id: string; name: string };

const input = "w-full border border-giuseppe-line bg-white px-3 py-2 text-sm";
const label = "mb-1 block text-xs uppercase tracking-widest2 text-giuseppe-muted";

export function SubjectForm({ subject, brands }: { subject?: Values; brands: BrandOption[] }) {
  return (
    <form action={saveSubject} className="max-w-2xl space-y-4 border border-giuseppe-line bg-white p-6">
      {subject && <input type="hidden" name="id" value={subject.id} />}
      <div>
        <label className={label} htmlFor="name">Designer / brand / movement name</label>
        <input id="name" name="name" required defaultValue={subject?.name ?? ""} className={input} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="location">Location (only if publicly shared)</label>
          <input id="location" name="location" defaultValue={subject?.location ?? ""} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="instagram">Instagram handle</label>
          <input id="instagram" name="instagram" defaultValue={subject?.instagram ?? ""} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="website">Website</label>
        <input id="website" name="website" defaultValue={subject?.website ?? ""} placeholder="https://" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="bio">Short bio (your own words, factual)</label>
        <textarea id="bio" name="bio" rows={3} defaultValue={subject?.bio ?? ""} className={input} />
      </div>
      <div>
        <label className={label} htmlFor="brandId">Giuseppe marketplace brand (leave blank if NOT a Giuseppe designer)</label>
        <select id="brandId" name="brandId" defaultValue={subject?.brandId ?? ""} className={input}>
          <option value="">Not a Giuseppe designer (editorial only)</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <p className="mt-2 text-xs leading-relaxed text-giuseppe-muted">
          Linking a brand makes articles show a "Giuseppe designer" label and link to their storefront and products (only while
          the brand is approved and active). Leave blank for anyone who does not sell through Giuseppe, so no partnership is implied.
        </p>
      </div>
      <button className="bg-giuseppe-ink px-6 py-3 text-[11px] uppercase tracking-widest2 text-giuseppe-bg">
        {subject ? "Save subject" : "Add subject"}
      </button>
    </form>
  );
}
