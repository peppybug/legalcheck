import type { CheckResult, Verdict } from "./verdict";
import { normalize } from "./match";

export type LawEntry = {
  id: string;
  country: string;
  name: string;
  year: string;
  url: string;
  sections: string[];
  citedBy: { activity: string; verdict: Verdict["verdict"] }[];
};

/** Collects every law cited in the answers into one de-duplicated list per country. */
export function buildLaws(answers: CheckResult[]): LawEntry[] {
  const laws = new Map<string, LawEntry>();
  for (const a of answers) {
    for (const l of a.laws) {
      const name = l.name.trim();
      if (!name) continue;
      const id = `${a.country}:${normalize(name)}`;
      const entry =
        laws.get(id) ?? { id, country: a.country, name, year: "", url: "", sections: [], citedBy: [] };
      if (l.year && l.year > entry.year) entry.year = l.year;
      if (!entry.url && l.url) entry.url = l.url;
      if (l.section && !entry.sections.includes(l.section)) entry.sections.push(l.section);
      if (!entry.citedBy.some((c) => c.activity === a.activity)) entry.citedBy.push({ activity: a.activity, verdict: a.verdict });
      laws.set(id, entry);
    }
  }
  return [...laws.values()].sort((x, y) => x.country.localeCompare(y.country) || x.name.localeCompare(y.name));
}
