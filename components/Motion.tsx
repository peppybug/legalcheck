"use client";

import map from "../public/data/worldmap.json";
import { COUNTRIES, countryName } from "@/lib/countries";
import { AVAILABLE } from "@/lib/available";
import type { DbIndex } from "@/lib/match";

type WorldMapData = { width: number; height: number; land: number[][]; covered: Record<string, number[][]>; pins: Record<string, number[]> };
const M = map as WorldMapData;
const flagOf = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? "";

/** Dotted world map (built by scripts/build-map.ts): covered countries light up and pulse. */
export function WorldMap({ index }: { index: DbIndex | null }) {
  const codes = Object.keys(M.covered);
  const answers = index?.answerCount ?? 0;
  return (
    <section className="coverage" aria-labelledby="cov-title">
      <div className="wrap">
        <div className="cov-head rv">
          <div>
            <p className="cov-kicker">Coverage</p>
            <h2 id="cov-title">
              The world, <span>country by country.</span>
            </h2>
            <p>
              Every answer is checked against that country’s official law text before it goes in. We’re starting with Europe
              and working outwards.
            </p>
          </div>
          <dl className="cov-stats">
            <div>
              <dt>Countries checked</dt>
              <dd>
                {AVAILABLE.length} <small>of {COUNTRIES.length}</small>
              </dd>
            </div>
            <div>
              <dt>Verified answers</dt>
              <dd>{answers || "…"}</dd>
            </div>
          </dl>
        </div>
        <svg
          className="world rv d1"
          viewBox={`-1 -1 ${M.width + 2} ${M.height + 2}`}
          role="img"
          aria-label={`World map. Countries checked: ${codes.map(countryName).join(", ")}`}
        >
          <g className="w-land">
            {M.land.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={0.3} style={{ "--d": `${(x / M.width) * 1.2}s` } as React.CSSProperties} />
            ))}
          </g>
          {codes.map((c, ci) => (
            <g key={c} className="w-country" style={{ "--c": ci } as React.CSSProperties}>
              <title>{`${countryName(c)}: checked`}</title>
              {M.covered[c].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={0.42} />
              ))}
            </g>
          ))}
          {codes.map((c, ci) =>
            M.pins[c] ? (
              <g key={c} className="w-pin" style={{ "--c": ci } as React.CSSProperties}>
                <circle className="w-ring" cx={M.pins[c][0]} cy={M.pins[c][1]} r={0.9} />
                <circle className="w-core" cx={M.pins[c][0]} cy={M.pins[c][1]} r={0.55} />
              </g>
            ) : null,
          )}
        </svg>
        <ul className="cov-list rv d1">
          {codes.map((c) => (
            <li key={c}>
              {flagOf(c)} {countryName(c)}
            </li>
          ))}
          <li className="cov-next">More coming</li>
        </ul>
      </div>
    </section>
  );
}
