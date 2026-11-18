/**
 * Researches answers with Claude and saves them to public/data/answers.json.
 * Run by .github/workflows/refresh-answers.yml, or locally: ANTHROPIC_API_KEY=... npm run generate
 *
 *   MAX            how many answers to research this run (default 40)
 *   REFRESH_DAYS   re-research answers older than this (default 180)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { runCheck } from "../lib/check";
import { answerKey, type AnswerDb } from "../lib/match";
import { COUNTRY_CODES } from "../lib/countries";

const DB_PATH = "public/data/answers.json";
const MAX = Number(process.env.MAX ?? 40);
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS ?? 180);
const CONCURRENCY = 3;

type Pair = { activity: string; country: string };
const config = JSON.parse(readFileSync("data/checks.json", "utf8")) as {
  activities: string[];
  countries: string[];
  extra: Pair[];
};

const pairs: Pair[] = [
  ...config.extra,
  ...config.activities.flatMap((activity) => config.countries.map((country) => ({ activity, country }))),
].filter((p) => {
  if (COUNTRY_CODES.has(p.country)) return true;
  console.warn(`Skipping unknown country code ${p.country}`);
  return false;
});

const db = JSON.parse(readFileSync(DB_PATH, "utf8")) as AnswerDb;
const byKey = new Map(db.answers.map((a) => [answerKey(a.activity, a.country), a]));
const staleBefore = Date.now() - REFRESH_DAYS * 86_400_000;

const todo = pairs
  .filter((p) => {
    const existing = byKey.get(answerKey(p.activity, p.country));
    return !existing || Date.parse(existing.checkedAt) < staleBefore;
  })
  .slice(0, MAX);

console.log(`${pairs.length} pairs configured, ${byKey.size} answers saved, researching ${todo.length} now.`);

function save() {
  const answers = [...byKey.values()].sort(
    (a, b) => a.activity.localeCompare(b.activity) || a.country.localeCompare(b.country),
  );
  writeFileSync(DB_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), answers }, null, 1) + "\n");
}

let done = 0;
let failed = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const result = await runCheck(p.activity, p.country);
        byKey.set(answerKey(p.activity, p.country), result);
        save();
        console.log(`✓ ${p.activity} · ${p.country}: ${result.verdict}`);
        done++;
      } catch (err) {
        console.error(`✗ ${p.activity} · ${p.country}:`, err instanceof Error ? err.message : err);
        failed++;
      }
    }
  }),
);

console.log(`Done: ${done} researched, ${failed} failed.`);
if (failed && !done) process.exit(1);
