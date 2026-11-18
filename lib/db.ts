import type { AnswerDb, DbIndex } from "./match";
import type { CountrySources } from "./sources";
import type { LawEntry } from "./laws";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type CountryDb = { updatedAt: string | null; countries: CountrySources[] };
export type LawDb = { updatedAt: string | null; laws: LawEntry[] };
export type Categories = Record<string, string[]>;

export async function loadJson<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}/data/${name}.json`);
  if (!res.ok) throw new Error(`Could not load ${name}`);
  return res.json();
}

export type { AnswerDb, DbIndex };

const EMPTY_INDEX: DbIndex = { updatedAt: null, answerCount: 0, lawCount: 0, countries: {}, activities: {} };
export const loadIndex = () => loadJson<DbIndex>("index").catch(() => EMPTY_INDEX);

const answerCache = new Map<string, Promise<AnswerDb>>();
/** Answers for one country (empty if none researched yet). Cached per page load. */
export function loadCountryAnswers(code: string, index: DbIndex | null): Promise<AnswerDb> {
  if (index && !index.countries[code]) return Promise.resolve({ updatedAt: null, answers: [] });
  if (!answerCache.has(code)) {
    answerCache.set(code, loadJson<AnswerDb>(`answers/${code}`).catch(() => ({ updatedAt: null, answers: [] })));
  }
  return answerCache.get(code)!;
}

export const loadCountryLaws = (code: string) =>
  loadJson<LawDb>(`laws/${code}`).catch((): LawDb => ({ updatedAt: null, laws: [] }));
