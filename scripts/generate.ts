/**
 * Builds the Legalcheck database in public/data/:
 *   countries.json  official law sources per country (researched with Claude + web search)
 *   answers/XX.json legality answers per country (master copy: data/db/answers.json; researched with Claude + web search)
 *   laws/XX.json    every law cited in the answers, de-duplicated per country (built locally, no API calls)
 *   index.json      which activities exist in which countries, plus totals
 *
 * Run by .github/workflows/refresh-answers.yml, or locally: ANTHROPIC_API_KEY=... npm run generate
 *   MAX            answers to research this run (default 40)
 *   MAX_COUNTRIES  country source entries to research this run (default 20)
 *   REFRESH_DAYS   re-research anything older than this (default 180)
 *   CLAUDE_MODEL   claude-opus-5-5 (default) or claude-sonnet-5-5
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { runCheck } from "../lib/check";
import { researchCountry, type CountrySources } from "../lib/sources";
import { buildLaws } from "../lib/laws";
import { answerKey, type AnswerDb } from "../lib/match";
import { COUNTRIES, COUNTRY_CODES } from "../lib/countries";
import type { CheckResult } from "../lib/verdict";

const DIR = "public/data";
const MAX = Number(process.env.MAX ?? 40);
const MAX_COUNTRIES = Number(process.env.MAX_COUNTRIES ?? 20);
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS ?? 180);
const CONCURRENCY = 4;
const staleBefore = Date.now() - REFRESH_DAYS * 86_400_000;
const isStale = (iso?: string) => !iso || Date.parse(iso) < staleBefore;

type Pair = { activity: string; country: string };
type Config = { categories: Record<string, string[]>; countries: "all" | string[]; priority: string[]; extra: Pair[] };

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}
function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 1) + "\n");
}

async function pool<T>(items: T[], work: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
    }),
  );
}

const config = readJson<Config>("data/checks.json", { categories: {}, countries: [], priority: [], extra: [] });
const activities = Object.values(config.categories).flat();
const allCodes = config.countries === "all" ? COUNTRIES.map((c) => c.code) : config.countries;
const ordered = [...new Set([...config.priority, ...allCodes])].filter((c) => {
  if (COUNTRY_CODES.has(c)) return true;
  console.warn(`Skipping unknown country code ${c}`);
  return false;
});

let failed = 0;
let done = 0;
const reviewCountries: CountrySources[] = [];
const reviewAnswers: { result: CheckResult; previous?: CheckResult }[] = [];
const failures: string[] = [];

// 1. Country law sources
const countriesPath = `${DIR}/countries.json`;
const countryDb = readJson<{ updatedAt: string | null; countries: CountrySources[] }>(countriesPath, {
  updatedAt: null,
  countries: [],
});
const byCountry = new Map(countryDb.countries.map((c) => [c.country, c]));
const countryTodo = ordered.filter((c) => isStale(byCountry.get(c)?.checkedAt)).slice(0, MAX_COUNTRIES);
console.log(`Countries: ${byCountry.size}/${ordered.length} saved, researching ${countryTodo.length}.`);

const saveCountries = () =>
  writeJson(countriesPath, {
    updatedAt: new Date().toISOString(),
    countries: [...byCountry.values()].sort((a, b) => a.country.localeCompare(b.country)),
  });

await pool(countryTodo, async (code) => {
  try {
    const result = await researchCountry(code);
    byCountry.set(code, result);
    reviewCountries.push(result);
    saveCountries();
    console.log(`✓ sources ${code}`);
    done++;
  } catch (err) {
    console.error(`✗ sources ${code}:`, err instanceof Error ? err.message : err);
    failures.push(`Law sources for ${code}`);
    failed++;
  }
});

// 2. Legality answers: extra pairs, then each country in priority order with every activity.
// The master copy lives in data/db/ (not served); the site gets one small file per country.
const MASTER = "data/db/answers.json";
const answerDb = readJson<AnswerDb>(MASTER, { updatedAt: null, answers: [] });
const byKey = new Map(answerDb.answers.map((a) => [answerKey(a.activity, a.country), a]));
const pairs: Pair[] = [...config.extra, ...ordered.flatMap((country) => activities.map((activity) => ({ activity, country })))];
const answerTodo = pairs.filter((p) => isStale(byKey.get(answerKey(p.activity, p.country))?.checkedAt)).slice(0, MAX);
console.log(`Answers: ${byKey.size}/${pairs.length} saved, researching ${answerTodo.length}.`);

const sortedAnswers = () =>
  [...byKey.values()].sort((a, b) => a.country.localeCompare(b.country) || a.activity.localeCompare(b.activity));
const saveMaster = () => writeJson(MASTER, { updatedAt: new Date().toISOString(), answers: sortedAnswers() });

let sinceSave = 0;
await pool(answerTodo, async (p) => {
  try {
    const result = await runCheck(p.activity, p.country);
    reviewAnswers.push({ result, previous: byKey.get(answerKey(p.activity, p.country)) });
    byKey.set(answerKey(p.activity, p.country), result);
    if (++sinceSave >= 10) {
      saveMaster(); // keep progress if the run is cut off
      sinceSave = 0;
    }
    console.log(`✓ ${p.activity} · ${p.country}: ${result.verdict}`);
    done++;
  } catch (err) {
    console.error(`✗ ${p.activity} · ${p.country}:`, err instanceof Error ? err.message : err);
    failures.push(`${p.activity} · ${p.country}`);
    failed++;
  }
});
saveMaster();

// 3. Files the site loads: answers and laws per country, plus a small index for search and totals
const answers: CheckResult[] = sortedAnswers();
const laws = buildLaws(answers);
const now = new Date().toISOString();
rmSync(`${DIR}/answers`, { recursive: true, force: true });
rmSync(`${DIR}/laws`, { recursive: true, force: true });
mkdirSync(`${DIR}/answers`, { recursive: true });
mkdirSync(`${DIR}/laws`, { recursive: true });
const byCountryCode = Map.groupBy(answers, (a) => a.country);
for (const [code, list] of byCountryCode) writeJson(`${DIR}/answers/${code}.json`, { updatedAt: now, answers: list });
for (const [code, list] of Map.groupBy(laws, (l) => l.country)) writeJson(`${DIR}/laws/${code}.json`, { updatedAt: now, laws: list });
const activityIndex: Record<string, string[]> = {};
for (const a of answers) (activityIndex[a.activity] ??= []).push(a.country);
writeJson(`${DIR}/index.json`, {
  updatedAt: now,
  answerCount: answers.length,
  lawCount: laws.length,
  countries: Object.fromEntries([...byCountryCode].map(([code, list]) => [code, list.length])),
  activities: activityIndex,
});
writeJson(`${DIR}/categories.json`, config.categories);
console.log(`Laws: ${laws.length} indexed. Site files written for ${byCountryCode.size} countries.`);

writeReviewSummary();
console.log(`Done: ${done} researched, ${failed} failed.`);
if (failed && !done) process.exit(1);

/** Markdown summary of this run for the review pull request (review-summary.md, not committed). */
function writeReviewSummary() {
  const link = (name: string, url: string) => (url ? `[${name}](${url})` : name);
  const lines: string[] = [
    "Research from this run. **Nothing is published until this pull request is merged.**",
    "",
    "Check each item against the linked official sources. To fix something, edit `public/data/*.json` on this branch",
    "(then re-run `npm run generate` with `MAX=0 MAX_COUNTRIES=0` locally, or just fix `laws.json` too); to drop an item, delete it from the JSON.",
    "",
    `**${reviewAnswers.length} answers · ${reviewCountries.length} countries' law sources · ${failures.length} failed**`,
  ];
  if (reviewAnswers.length) {
    lines.push("", "## Answers", "");
    for (const { result: r, previous } of reviewAnswers) {
      const changed = previous && previous.verdict !== r.verdict ? ` ⚠️ was **${previous.verdict}**` : previous ? " (refresh)" : "";
      lines.push(
        `<details><summary><b>${r.activity} · ${r.country}</b>: ${r.verdict} (${r.confidence})${changed}</summary>`,
        "",
        `**${r.headline}**`,
        "",
        r.summary,
        ...(r.conditions.length ? ["", `Conditions: ${r.conditions.join("; ")}`] : []),
        ...(r.penalties ? ["", `Penalties: ${r.penalties}`] : []),
        ...(r.regional_variation ? ["", `Regional: ${r.regional_variation}`] : []),
        "",
        "Laws: " + (r.laws.map((l) => link([l.name, l.section, l.year].filter(Boolean).join(" · "), l.url)).join("; ") || "none cited"),
        "",
        "</details>",
      );
    }
  }
  if (reviewCountries.length) {
    lines.push("", "## Country law sources", "");
    for (const c of reviewCountries) {
      lines.push(
        `- **${c.country}** (${c.confidence}): ` +
          [
            ...c.portals.map((p) => link(p.name, p.url)),
            c.gazette_name && `Gazette: ${link(c.gazette_name, c.gazette_url)}`,
            c.constitution_name && `Constitution: ${link(c.constitution_name, c.constitution_url)}`,
          ]
            .filter(Boolean)
            .join(" · "),
      );
    }
  }
  if (failures.length) lines.push("", "## Failed (will be retried next run)", "", ...failures.map((f) => `- ${f}`));
  let body = lines.join("\n");
  if (body.length > 60000) body = body.slice(0, 60000) + "\n\n… summary truncated; see the JSON diff for the rest.";
  writeFileSync("review-summary.md", body + "\n");
}
