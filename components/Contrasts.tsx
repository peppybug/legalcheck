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
      <LadyJustice />
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
        <ul className="cmp-grid" key={activity}>
          {rows.map((r, i) => (
            <li key={r.country} style={{ "--i": i } as React.CSSProperties}>
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

/** Vrouwe Justitia (Lady Justice): blindfold, sword and scales. Drawn as a flat watermark in the accent colour. */
function LadyJustice() {
  return (
    <svg className="justitia" viewBox="0 0 420 600" aria-hidden="true" focusable="false">
      <defs>
        <mask id="justitia-cut">
          <rect width="420" height="600" fill="#fff" />
          {/* blindfold edges */}
          <path d="M184 140 Q210 134 236 140 M184 154 Q210 148 236 154" stroke="#000" strokeWidth="3" fill="none" />
          <path d="M236 147 L254 160 L248 172" stroke="#000" strokeWidth="3" fill="none" />
          {/* robe folds and belt */}
          <path d="M184 318 Q210 326 238 318" stroke="#000" strokeWidth="4" fill="none" />
          <path d="M196 330 Q186 450 170 556 M212 332 Q212 450 208 556 M226 330 Q238 450 250 556" stroke="#000" strokeWidth="3" fill="none" />
          <path d="M196 214 Q210 240 224 214" stroke="#000" strokeWidth="3" fill="none" />
        </mask>
      </defs>
      <g fill="currentColor" stroke="currentColor" mask="url(#justitia-cut)">
        {/* hair, head, neck */}
        <ellipse cx="210" cy="160" rx="34" ry="40" stroke="none" />
        <circle cx="210" cy="148" r="25" stroke="none" />
        <rect x="201" y="168" width="18" height="30" stroke="none" />
        {/* crown */}
        <path d="M186 124 L190 106 L199 118 L210 100 L221 118 L230 106 L234 124 Z" stroke="none" />
        {/* robe */}
        <path
          d="M176 198 Q210 186 244 198 L254 252 Q248 296 240 318 Q268 430 294 562 L126 562 Q152 430 180 318 Q172 296 166 252 Z"
          stroke="none"
        />
        {/* raised arm holding the scales */}
        <path d="M238 206 L276 140 L316 66" fill="none" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="318" cy="60" r="11" stroke="none" />
        {/* scales */}
        <path d="M318 50 V30" fill="none" strokeWidth="6" strokeLinecap="round" />
        <circle cx="318" cy="26" r="6" stroke="none" />
        <path d="M258 46 H378" fill="none" strokeWidth="6" strokeLinecap="round" />
        <path d="M258 46 L240 92 M258 46 L276 92 M378 46 L360 92 M378 46 L396 92" fill="none" strokeWidth="2" />
        <path d="M234 92 Q258 122 282 92 Z M354 92 Q378 122 402 92 Z" stroke="none" />
        {/* extended arm holding the sword */}
        <path d="M182 206 L132 242 L84 262" fill="none" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="78" cy="264" r="11" stroke="none" />
        {/* sword */}
        <path d="M71 252 V92 L78 58 L85 92 V252 Z" stroke="none" />
        <rect x="52" y="246" width="52" height="9" rx="3" stroke="none" />
        <rect x="74" y="255" width="8" height="30" stroke="none" />
        <circle cx="78" cy="292" r="7" stroke="none" />
        {/* plinth */}
        <rect x="110" y="562" width="200" height="22" rx="3" stroke="none" />
      </g>
    </svg>
  );
}
