"use client";

import { COUNTRIES, countryName } from "@/lib/countries";
import { AVAILABLE } from "@/lib/available";
import type { DbIndex } from "@/lib/match";
import type { CheckResult } from "@/lib/verdict";
import { SHORT } from "./Contrasts";

const flagOf = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? "";

/** A slow band of real, verified facts. Myths first, so the surprising ones show up most. */
export function Ticker({
  answers,
  categories,
  onPick,
}: {
  answers: CheckResult[];
  categories: Record<string, string[]>;
  onPick: (r: CheckResult) => void;
}) {
  const myths = new Set([...(categories["Myth: people think it's legal"] ?? []), ...(categories["Myth: people think it's illegal"] ?? [])]);
  const items = [...answers]
    .filter((a) => !a.general)
    .sort((a, b) => Number(myths.has(b.activity)) - Number(myths.has(a.activity)) || a.activity.localeCompare(b.activity))
    .slice(0, 18);
  if (items.length < 4) return null;
  const row = (hidden: boolean) =>
    items.map((a) => (
      <li key={`${hidden}-${a.country}-${a.activity}`} aria-hidden={hidden || undefined}>
        <button type="button" tabIndex={hidden ? -1 : 0} onClick={() => onPick(a)}>
          <span className="tk-flag">{flagOf(a.country)}</span>
          <span className="tk-act">{a.activity}</span>
          <span className={`tk-v v-${a.verdict}`}>{SHORT[a.verdict]}</span>
        </button>
      </li>
    ));
  return (
    <div className="ticker" aria-label="Facts from the database">
      <ul className="tk-track">
        {row(false)}
        {row(true)}
      </ul>
    </div>
  );
}

// Capitals of the EU member states (lon, lat), projected onto a simple map.
const EU: Record<string, [number, number]> = {
  PT: [-9.14, 38.72], ES: [-3.7, 40.42], FR: [2.35, 48.86], BE: [4.35, 50.85], NL: [4.9, 52.37], LU: [6.13, 49.61],
  DE: [13.4, 52.52], DK: [12.57, 55.68], IE: [-6.26, 53.35], IT: [12.5, 41.9], MT: [14.51, 35.9], AT: [16.37, 48.21],
  CZ: [14.42, 50.08], PL: [21.01, 52.23], SK: [17.11, 48.15], HU: [19.04, 47.5], SI: [14.51, 46.06], HR: [15.98, 45.81],
  RO: [26.1, 44.43], BG: [23.32, 42.7], GR: [23.73, 37.98], CY: [33.38, 35.19], SE: [18.07, 59.33], FI: [24.94, 60.17],
  EE: [24.75, 59.44], LV: [24.11, 56.95], LT: [25.28, 54.69],
};
const project = ([lon, lat]: [number, number]) => [(lon + 12) * 14, (62 - lat) * 18] as const;

/** EU capitals as a constellation: covered countries glow and are linked; the rest are coming. */
export function CoverageMap({ index }: { index: DbIndex | null }) {
  const covered = new Set(AVAILABLE.map((c) => c.code).filter((c) => EU[c]));
  const codes = Object.keys(EU);
  const done = codes.filter((c) => covered.has(c));
  // Link covered countries in a chain from west to east.
  const chain = [...done].sort((a, b) => EU[a][0] - EU[b][0]);
  const path = chain.map((c, i) => `${i ? "L" : "M"}${project(EU[c]).join(" ")}`).join(" ");
  const answers = index ? Object.entries(index.countries).filter(([c]) => EU[c]).reduce((n, [, v]) => n + v, 0) : 0;
  return (
    <section className="coverage" aria-labelledby="cov-title">
      <div className="wrap cov-grid">
        <div className="cov-copy rv">
          <p className="cov-kicker">Coverage</p>
          <h2 id="cov-title">
            Europe, <span>country by country.</span>
          </h2>
          <p>
            Every answer is checked against that country’s official law text before it goes in. We’re working through the EU,
            biggest countries first.
          </p>
          <dl className="cov-stats">
            <div>
              <dt>EU countries checked</dt>
              <dd>
                {done.length} <small>of 27</small>
              </dd>
            </div>
            <div>
              <dt>Verified answers</dt>
              <dd>{answers || "…"}</dd>
            </div>
          </dl>
          <ul className="cov-legend">
            <li className="lg-done">Checked</li>
            <li className="lg-next">Coming next</li>
          </ul>
        </div>
        <svg className="cov-map rv d1" viewBox="0 0 650 500" role="img" aria-label={`Map of EU capitals; ${done.length} of 27 countries checked`}>
          <defs>
            <radialGradient id="cov-glow">
              <stop offset="0" stopColor="currentColor" stopOpacity=".35" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* faint links between every capital and its nearest neighbours */}
          <g className="cov-mesh">
            {codes.flatMap((a) =>
              codes
                .filter((b) => b > a)
                .filter((b) => Math.hypot(EU[a][0] - EU[b][0], EU[a][1] - EU[b][1]) < 7.5)
                .map((b) => {
                  const [x1, y1] = project(EU[a]);
                  const [x2, y2] = project(EU[b]);
                  return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} />;
                }),
            )}
          </g>
          {path && <path className="cov-chain" d={path} pathLength={1} />}
          {codes.map((c, i) => {
            const [x, y] = project(EU[c]);
            const on = covered.has(c);
            return (
              <g key={c} className={on ? "cov-on" : "cov-off"} style={{ "--i": i } as React.CSSProperties}>
                <title>{`${countryName(c)}: ${on ? "checked" : "coming"}`}</title>
                {on && <circle className="cov-halo" cx={x} cy={y} r="26" fill="url(#cov-glow)" />}
                {on && <circle className="cov-ring" cx={x} cy={y} r="8" />}
                <circle className="cov-dot" cx={x} cy={y} r={on ? 6.5 : 3.5} />
                <text x={x + (on ? 11 : 7)} y={y + 4}>
                  {c}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
