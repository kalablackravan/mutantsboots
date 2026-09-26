// Supplied artwork, served from the asset CDN. Keyed by original filename.
const mods = import.meta.glob("../assets/fomies/*.asset.json", { eager: true }) as Record<
  string,
  { default: { url: string; original_filename: string } }
>;
export const A: Record<string, string> = {};
for (const m of Object.values(mods)) A[m.default.original_filename] = m.default.url;
export const art = (name: string) => A[name] ?? "";
