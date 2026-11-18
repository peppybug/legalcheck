"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { COUNTRIES, inCountry } from "@/lib/countries";
import { loadJson, loadIndex, loadCountryAnswers, loadCountryLaws, type DbIndex, type CountryDb, type LawDb, type Categories } from "@/lib/db";
import type { CheckResult } from "@/lib/verdict";

const LABELS: Record<CheckResult["verdict"], string> = {
  legal: "Legal",
  illegal: "Illegal",
  restricted: "Legal with conditions",
  depends: "It depends",
  unclear: "Unclear",
};

const answerHref = (a: { activity: string; country: string }) =>
  `/?a=${encodeURIComponent(a.activity)}&c=${a.country}#check`;

export default function Library() {
  const [country, setCountry] = useState("US");
  const [data, setData] = useState<{ index: DbIndex; countries: CountryDb; categories: Categories } | null>(null);
  const [answers, setAnswers] = useState<CheckResult[]>([]);
  const [laws, setLaws] = useState<LawDb["laws"]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get("c");
    const region = fromUrl ?? new Intl.Locale(navigator.language).maximize().region;
    if (region && COUNTRIES.some((c) => c.code === region)) setCountry(region);
    Promise.all([loadIndex(), loadJson<CountryDb>("countries"), loadJson<Categories>("categories").catch(() => ({}))])
      .then(([index, countries, categories]) => setData({ index, countries, categories }))
      .catch(() => setError("Couldn’t load the library. Please refresh the page."));
  }, []);

  useEffect(() => {
    if (!data) return;
    let current = true;
    Promise.all([loadCountryAnswers(country, data.index), data.index.countries[country] ? loadCountryLaws(country) : null]).then(
      ([a, l]) => {
        if (!current) return;
        setAnswers(a.answers);
        setLaws(l?.laws ?? []);
      },
    );
    return () => {
      current = false;
    };
  }, [data, country]);

  function pick(code: string) {
    setCountry(code);
    history.replaceState(null, "", `?c=${code}`);
  }

  const view = useMemo(() => {
    if (!data) return null;
    const sources = data.countries.countries.find((c) => c.country === country) ?? null;
    const groups = Object.entries(data.categories)
      .map(([cat, acts]) => [cat, answers.filter((a) => acts.includes(a.activity))] as const)
      .filter(([, list]) => list.length);
    const grouped = new Set(groups.flatMap(([, list]) => list));
    const other = answers.filter((a) => !grouped.has(a));
    if (other.length) groups.push(["Other", other]);
    return { sources, laws, answers, groups };
  }, [data, country, answers, laws]);

  const totals = data && {
    countries: data.countries.countries.length,
    laws: data.index.lawCount,
    answers: data.index.answerCount,
  };

  return (
    <div className="library">
      {totals && (
        <dl className="facts lib-totals">
          <div>
            <dt>Countries with law sources</dt>
            <dd>
              {totals.countries} of {COUNTRIES.length}
            </dd>
          </div>
          <div>
            <dt>Laws indexed</dt>
            <dd>{totals.laws}</dd>
          </div>
          <div>
            <dt>Answers</dt>
            <dd>{totals.answers}</dd>
          </div>
        </dl>
      )}

      <label className="lib-pick">
        <span>Country</span>
        <select value={country} onChange={(e) => pick(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="err-box">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}

      {view && (
        <>
          <h2>Where {cap(inCountry(country))} publishes its laws</h2>
          {view.sources ? (
            <div className="card lib-sources">
              <dl className="lib-meta">
                {view.sources.legal_system && (
                  <div>
                    <dt>Legal system</dt>
                    <dd>{view.sources.legal_system}</dd>
                  </div>
                )}
                {view.sources.official_languages.length > 0 && (
                  <div>
                    <dt>Languages of the law</dt>
                    <dd>{view.sources.official_languages.join(", ")}</dd>
                  </div>
                )}
              </dl>
              {view.sources.portals.length > 0 && (
                <div className="statement">
                  <p className="st-label">Official legislation</p>
                  <ul>
                    {view.sources.portals.map((p) => (
                      <li key={p.url || p.name}>
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer">
                            {p.name}
                          </a>
                        ) : (
                          <b>{p.name}</b>
                        )}
                        {p.description && <span className="muted"> · {p.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="list lib-links">
                {view.sources.gazette_name && (
                  <li>
                    <b>Official gazette: </b>
                    <MaybeLink name={view.sources.gazette_name} url={view.sources.gazette_url} />
                  </li>
                )}
                {view.sources.constitution_name && (
                  <li>
                    <b>Constitution: </b>
                    <MaybeLink name={view.sources.constitution_name} url={view.sources.constitution_url} />
                  </li>
                )}
                {view.sources.regional_law_note && (
                  <li>
                    <b>Regional law: </b>
                    {view.sources.regional_law_note}
                  </li>
                )}
              </ul>
              <p className="checked">
                Confidence: {view.sources.confidence} · Checked {new Date(view.sources.checkedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="muted">The law sources for {inCountry(country)} haven’t been researched yet.</p>
          )}

          <h2>Laws behind our answers</h2>
          {view.laws.length ? (
            <ul className="lib-laws">
              {view.laws.map((l) => (
                <li key={l.id} className="card">
                  <h3>
                    {l.url ? (
                      <a href={l.url} target="_blank" rel="noreferrer">
                        {l.name}
                      </a>
                    ) : (
                      l.name
                    )}
                  </h3>
                  <p className="muted">
                    {[l.year, l.sections.length ? `Sections cited: ${l.sections.join(", ")}` : ""].filter(Boolean).join(" · ")}
                  </p>
                  <p className="lib-cited">
                    Used for:{" "}
                    {l.citedBy.map((c, i) => (
                      <span key={c.activity}>
                        {i > 0 && ", "}
                        <Link href={answerHref({ activity: c.activity, country })}>{c.activity}</Link>
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No laws indexed for {inCountry(country)} yet. They’re added as answers are researched.</p>
          )}

          <h2>Answers for {inCountry(country)}</h2>
          {view.groups.length ? (
            view.groups.map(([cat, list]) => (
              <section key={cat} className="lib-group">
                <h3>{cat.replace(/^Myth: people think it's /, "Common myth: people think it’s ")}</h3>
                <ul>
                  {list.map((a) => (
                    <li key={a.activity}>
                      <Link href={answerHref(a)}>{a.activity}</Link>
                      <span className={`verdict v-${a.verdict}`}>{LABELS[a.verdict]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p className="muted">No answers for {inCountry(country)} yet.</p>
          )}
        </>
      )}
    </div>
  );
}

function MaybeLink({ name, url }: { name: string; url: string }) {
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      {name}
    </a>
  ) : (
    <>{name}</>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
