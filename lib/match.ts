import type { CheckResult } from "./verdict";

export type AnswerDb = { updatedAt: string | null; answers: CheckResult[] };

const STOP = new Set(
  "a an the to in on of for my your our is it its be at with and or i me we can am are allowed legal illegal permitted do doing".split(" "),
);

export function normalize(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function answerKey(activity: string, country: string) {
  return `${country}:${normalize(activity)}`;
}

function stem(w: string) {
  return w.length > 4 ? w.replace(/(ing|s)$/, "") : w;
}

function tokens(s: string) {
  return new Set(normalize(s).split(" ").filter((w) => w && !STOP.has(w)).map(stem));
}

function score(query: Set<string>, entry: Set<string>) {
  if (!query.size || !entry.size) return 0;
  let hit = 0;
  query.forEach((t) => entry.has(t) && hit++);
  return (hit / query.size) * 0.7 + (hit / entry.size) * 0.3;
}

/** Best answer for this activity in this country, plus the countries that have a matching answer. */
export function findAnswer(answers: CheckResult[], activity: string, country: string) {
  const q = tokens(activity);
  let best: CheckResult | null = null;
  let bestScore = 0;
  const others = new Map<string, CheckResult>();
  for (const a of answers) {
    const s = score(q, tokens(a.activity));
    if (s < 0.6) continue;
    if (a.country === country) {
      if (s > bestScore) [best, bestScore] = [a, s];
    } else if (!others.has(a.country)) {
      others.set(a.country, a);
    }
  }
  return { answer: best, others: [...others.values()] };
}
