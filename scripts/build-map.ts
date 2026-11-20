/**
 * Builds public/data/worldmap.json: a dotted world map with the dots of every country that has answers
 * marked as covered, plus a pin at each covered country's capital. Runs as part of `npm run build-db`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import DottedMap, { getMapJSON } from "dotted-map";
import countries from "i18n-iso-countries";

const HEIGHT = 64;
const GRID = "diagonal" as const;

// Capitals (lat, lng), used for the pulsing pin and for countries too small to get their own dots.
const CAPITALS: Record<string, [number, number]> = {
  PT: [38.72, -9.14], ES: [40.42, -3.7], FR: [48.86, 2.35], BE: [50.85, 4.35], NL: [52.37, 4.9], LU: [49.61, 6.13],
  DE: [52.52, 13.4], DK: [55.68, 12.57], IE: [53.35, -6.26], IT: [41.9, 12.5], MT: [35.9, 14.51], AT: [48.21, 16.37],
  CZ: [50.08, 14.42], PL: [52.23, 21.01], SK: [48.15, 17.11], HU: [47.5, 19.04], SI: [46.06, 14.51], HR: [45.81, 15.98],
  RO: [44.43, 26.1], BG: [42.7, 23.32], GR: [37.98, 23.73], CY: [35.19, 33.38], SE: [59.33, 18.07], FI: [60.17, 24.94],
  EE: [59.44, 24.75], LV: [56.95, 24.11], LT: [54.69, 25.28], GB: [51.51, -0.13], NO: [59.91, 10.75], CH: [46.95, 7.45],
  US: [38.9, -77.04], CA: [45.42, -75.7], AU: [-35.28, 149.13], JP: [35.68, 139.69], SG: [1.29, 103.85],
};

const index = JSON.parse(readFileSync("public/data/index.json", "utf8")) as { countries: Record<string, number> };
const covered = Object.keys(index.countries).sort();

const base = JSON.parse(getMapJSON({ height: HEIGHT, grid: GRID })) as { region: unknown; width: number; height: number };
const world = new DottedMap({ height: HEIGHT, grid: GRID });
const r2 = (n: number) => Math.round(n * 100) / 100;
const key = (p: { x: number; y: number }) => `${r2(p.x)},${r2(p.y)}`;
const land = world.getPoints().map((p) => [r2(p.x), r2(p.y)]);

const coveredDots: Record<string, number[][]> = {};
const pins: Record<string, number[]> = {};
for (const code of covered) {
  const iso3 = countries.alpha2ToAlpha3(code);
  let dots: number[][] = [];
  if (iso3) {
    try {
      const m = new DottedMap({ height: HEIGHT, grid: GRID, countries: [iso3], region: base.region as never });
      dots = m.getPoints().map((p) => [r2(p.x), r2(p.y)]);
    } catch {
      dots = [];
    }
  }
  const capital = CAPITALS[code];
  if (capital) {
    const pinMap = new DottedMap({ height: HEIGHT, grid: GRID });
    pinMap.addPin({ lat: capital[0], lng: capital[1], data: code });
    const pin = pinMap.getPoints().find((p) => (p as { data?: unknown }).data === code);
    if (pin) {
      pins[code] = [r2(pin.x), r2(pin.y)];
      if (!dots.length) dots = [[r2(pin.x), r2(pin.y)]];
    }
  }
  if (!pins[code] && dots.length) {
    const cx = dots.reduce((s, d) => s + d[0], 0) / dots.length;
    const cy = dots.reduce((s, d) => s + d[1], 0) / dots.length;
    pins[code] = [r2(cx), r2(cy)];
  }
  if (dots.length) coveredDots[code] = dots;
  else console.warn(`No dots for ${code}; add its capital to CAPITALS in scripts/build-map.ts`);
}

const coveredKeys = new Set(Object.values(coveredDots).flat().map(([x, y]) => key({ x, y })));
writeFileSync(
  "public/data/worldmap.json",
  JSON.stringify({
    width: base.width,
    height: base.height,
    land: land.filter(([x, y]) => !coveredKeys.has(key({ x, y }))),
    covered: coveredDots,
    pins,
  }) + "\n",
);
console.log(`World map: ${land.length} dots, ${covered.length} covered countries.`);
