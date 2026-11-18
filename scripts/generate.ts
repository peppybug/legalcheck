/**
 * Builds the Legalcheck database in public/data/:
 *   countries.json  official law sources per country (researched with Claude + web search)
 *   answers.json    legality answers per activity and country (researched with Claude + web search)
 *   laws.json       every law cited in the answers, de-duplicated per country (built locally, no API calls)
 *
 * Run by .github/workflows/refresh-answers.yml, or locally: ANTHROPIC_API_KEY=... npm run generate
 *   MAX            answers to research this run (default 40)
 *   MAX_COUNTRIES  country source entries to research this run (default 20)
 *   REFRESH_DAYS   re-research anything older than this (default 180)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
const CONCURRENCY = 3;
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
    byCountry.set(code, await researchCountry(code));
    saveCountries();
    console.log(`✓ sources ${code}`);
    done++;
  } catch (err) {
    console.error(`✗ sources ${code}:`, err instanceof Error ? err.message : err);
    failed++;
  }
});

// 2. Legality answers: extra pairs, then each country in priority order with every activity
const answersPath = `${DIR}/answers.json`;
const answerDb = readJson<AnswerDb>(answersPath, { updatedAt: null, answers: [] });
const byKey = new Map(answerDb.answers.map((a) => [answerKey(a.activity, a.country), a]));
const pairs: Pair[] = [...config.extra, ...ordered.flatMap((country) => activities.map((activity) => ({ activity, country })))];
const answerTodo = pairs.filter((p) => isStale(byKey.get(answerKey(p.activity, p.country))?.checkedAt)).slice(0, MAX);
console.log(`Answers: ${byKey.size}/${pairs.length} saved, researching ${answerTodo.length}.`);

const saveAnswers = () => {
  const answers = [...byKey.values()].sort(
    (a, b) => a.activity.localeCompare(b.activity) || a.country.localeCompare(b.country),
  );
  writeJson(answersPath, { updatedAt: new Date().toISOString(), answers });
  return answers;
};

await pool(answerTodo, async (p) => {
  try {
    const result = await runCheck(p.activity, p.country);
    byKey.set(answerKey(p.activity, p.country), result);
    saveAnswers();
    console.log(`✓ ${p.activity} · ${p.country}: ${result.verdict}`);
    done++;
  } catch (err) {
    console.error(`✗ ${p.activity} · ${p.country}:`, err instanceof Error ? err.message : err);
    failed++;
  }
});

// 3. Law index, rebuilt from all answers
const answers: CheckResult[] = [...byKey.values()];
const laws = buildLaws(answers);
writeJson(`${DIR}/laws.json`, { updatedAt: new Date().toISOString(), laws });
writeJson(`${DIR}/categories.json`, config.categories);
console.log(`Laws: ${laws.length} indexed.`);

console.log(`Done: ${done} researched, ${failed} failed.`);
if (failed && !done) process.exit(1);
