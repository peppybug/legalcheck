import index from "../public/data/index.json";
import { COUNTRIES } from "./countries";

// Countries that have at least one answer in the database. Read at build time,
// so it always matches the data that's deployed (the deploy runs build-db first).
const counts = (index as { countries: Record<string, number> }).countries;

export const AVAILABLE = COUNTRIES.filter((c) => counts[c.code]);
export const isAvailable = (code: string) => AVAILABLE.some((c) => c.code === code);

/** Default selection: the country with the most answers. */
export const DEFAULT_COUNTRY =
  [...AVAILABLE].sort((a, b) => counts[b.code] - counts[a.code])[0]?.code ?? "NL";
