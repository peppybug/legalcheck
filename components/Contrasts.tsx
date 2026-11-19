"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, countryName } from "@/lib/countries";
import { loadCountryAnswers } from "@/lib/db";
import type { DbIndex } from "@/lib/match";
import type { CheckResult } from "@/lib/verdict";

const flagOf = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? "";

export const SHORT: Record<CheckResult["verdict"], string> = {
  legal: "Legal",
  illegal: "Illegal",
  restricted: "With conditions",
  depends: "It depends",
  unclear: "Unclear",
};

export type Contrast = { activity: string; a: CheckResult; b: CheckResult };

const rank = (v: CheckResult["verdict"]) => ({ legal: 0, restricted: 1, depends: 2, unclear: 2, illegal: 3 })[v];

/** Activities whose answer differs between countries, most opposite first (legal vs illegal). */
export function findContrasts(answers: CheckResult[]): Contrast[] {
  const byActivity = new Map<string, CheckResult[]>();
  for (const a of answers) if (!a.general) byActivity.set(a.activity, [...(byActivity.get(a.activity) ?? []), a]);
  const out: (Contrast & { gap: number })[] = [];
  for (const [activity, list] of byActivity) {
    const sorted = [...list].sort((x, y) => rank(x.verdict) - rank(y.verdict));
    const a = sorted[0];
    const b = sorted[sorted.length - 1];
    const gap = rank(b.verdict) - rank(a.verdict);
    if (gap > 0) out.push({ activity, a, b, gap });
  }
  return out.sort((x, y) => y.gap - x.gap).map(({ gap: _gap, ...c }) => c);
}

function Stamp({ v }: { v: CheckResult["verdict"] }) {
  return <span className={`stamp-sm v-${v}`}>{SHORT[v]}</span>;
}

/** Hero card stack: real answers that flip from one country to the next. */
export function Evidence({ contrasts, onPick }: { contrasts: Contrast[] | null; onPick: (r: CheckResult) => void }) {
  const cards = (contrasts ?? []).slice(0, 3);
  return (
    <div className="evidence" aria-label="Same activity, different answer">
      <p className="ev-label">Same activity, different country</p>
      <div className="ev-stack">
        {cards.length === 0
          ? [0, 1, 2].map((i) => <div key={i} className="ev-card ev-ghost" aria-hidden="true" />)
          : cards.map((c, i) => (
              <article key={c.activity} className={`ev-card ev-${i}`}>
                <p className="ev-no">Exhibit {String.fromCharCode(65 + i)}</p>
                <h3>{c.activity}</h3>
                <ul>
                  {[c.a, c.b].map((r) => (
                    <li key={r.country}>
                      <button type="button" onClick={() => onPick(r)}>
                        <span>
                          {flagOf(r.country)} {countryName(r.country)}
                        </span>
                        <Stamp v={r.verdict} />
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
      </div>
    </div>
  );
}

/** Pick an activity, see the verdict in every country that has it. */
export function Compare({
  index,
  preferred,
  onPick,
}: {
  index: DbIndex | null;
  preferred?: string;
  onPick: (r: CheckResult) => void;
}) {
  const activities = useMemo(
    () =>
      Object.entries(index?.activities ?? {})
        .filter(([, codes]) => codes.length > 1)
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .map(([name]) => name),
    [index],
  );
  const [picked, setPicked] = useState("");
  const [rows, setRows] = useState<CheckResult[]>([]);
  const activity = picked || (preferred && activities.includes(preferred) ? preferred : activities[0]) || "";

  useEffect(() => {
    if (!index || !activity) return;
    let current = true;
    const codes = index.activities[activity] ?? [];
    Promise.all(codes.map((c) => loadCountryAnswers(c, index))).then((dbs) => {
      if (!current) return;
      const found = dbs.flatMap((d) => d.answers.filter((a) => a.activity === activity));
      setRows(found.sort((a, b) => countryName(a.country).localeCompare(countryName(b.country))));
    });
    return () => {
      current = false;
    };
  }, [index, activity]);

  if (!activities.length) return null;
  return (
    <section id="compare" className="compare">
      <div className="wrap">
        <div className="sec-head rv">
          <h2>
            Same question. <span>Different country.</span>
          </h2>
          <p>What’s fine at home can get you fined across the border. Pick an activity and compare.</p>
        </div>
        <div className="cmp-pick rv">
          <label htmlFor="cmp">Activity</label>
          <select id="cmp" value={activity} onChange={(e) => setPicked(e.target.value)}>
            {activities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <ul className="cmp-grid">
          {rows.map((r) => (
            <li key={r.country}>
              <button type="button" className={`cmp-card v-${r.verdict}`} onClick={() => onPick(r)}>
                <span className="cmp-country">
                  {flagOf(r.country)} {countryName(r.country)}
                </span>
                <Stamp v={r.verdict} />
                <span className="cmp-head">{r.headline}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
