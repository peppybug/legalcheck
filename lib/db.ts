import type { AnswerDb } from "./match";
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

export type { AnswerDb };
