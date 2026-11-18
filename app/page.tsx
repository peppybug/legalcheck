"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES, countryName, inCountry } from "@/lib/countries";
import type { CheckResult } from "@/lib/verdict";
import { SiteHeader, SiteFooter, CONTACT_EMAIL } from "@/components/SiteChrome";
import { findAnswer, type AnswerDb } from "@/lib/match";
import { findCrime, crimeAnswer } from "@/lib/crimes";
import type { CountryDb } from "@/lib/db";
import type { CountrySources } from "@/lib/sources";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Lookup service for questions that aren't in the database (worker/). Set at build time; empty = database only.
const LOOKUP_URL = process.env.NEXT_PUBLIC_LOOKUP_URL ?? "";

const flagOf = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? "";

const TRY = ["Wild camping", "Flying a drone", "Owning a pet fox"];

const LABELS: Record<CheckResult["verdict"], string> = {
  legal: "Legal",
  illegal: "Illegal",
  restricted: "Legal with conditions",
  depends: "It depends",
  unclear: "Unclear",
};

export default function Home() {
  const [activity, setActivity] = useState("");
  const [country, setCountry] = useState("US");
  const [db, setDb] = useState<AnswerDb | null>(null);
  const [loading, setLoading] = useState(false);
  const lookupId = useRef(0);
  const [sourcesDb, setSourcesDb] = useState<CountryDb | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [missing, setMissing] = useState<{ activity: string; country: string; others: CheckResult[] } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("js");
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region && COUNTRIES.some((c) => c.code === region)) setCountry(region);

    fetch(`${BASE}/data/answers.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDb)
      .catch(() => setError("Couldn’t load the answers. Please refresh the page."));
    fetch(`${BASE}/data/countries.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSourcesDb)
      .catch(() => {});

    // Scroll reveal: fade sections up as they come into view.
    const els = document.querySelectorAll(".rv");
    const reveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            reveal.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((e) => reveal.observe(e));

    // Scroll-driven steps: highlight the matching part of the illustration (wide screens only).
    const steps = document.querySelectorAll<HTMLElement>(".step");
    const parts = document.querySelectorAll<HTMLElement>(".mini .part");
    const show = (n: string) => {
      steps.forEach((s) => s.classList.toggle("on", s.dataset.part === n));
      parts.forEach((p) => p.classList.toggle("on", p.dataset.part === n));
    };
    show("1");
    const stepper = new IntersectionObserver(
      (es) => {
        if (window.innerWidth <= 900) return;
        es.forEach((e) => e.isIntersecting && show((e.target as HTMLElement).dataset.part!));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.forEach((s) => stepper.observe(s));

    return () => {
      reveal.disconnect();
      stepper.disconnect();
    };
  }, []);

  // 1. reviewed answers in the database, 2. built-in serious crimes, 3. the live lookup service.
  async function check(text: string, code: string, key: string | null = null) {
    if (!db || text.trim().length < 2) return;
    const id = ++lookupId.current;
    setActivity(text);
    setCountry(code);
    setActive(key);
    setError("");
    windowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const found = findAnswer(db.answers, text, code);
    const crime = found.answer ? null : findCrime(text);
    const answer = found.answer ?? (crime && crimeAnswer(crime, text, code));
    if (answer || !LOOKUP_URL || text.trim().length < 3) {
      setLoading(false);
      setResult(answer);
      setMissing(answer ? null : { activity: text, country: code, others: found.others });
      return;
    }

    setResult(null);
    setMissing(null);
    setLoading(true);
    try {
      const res = await fetch(`${LOOKUP_URL}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: text, country: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (id !== lookupId.current) return; // a newer search started meanwhile
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setResult(data as CheckResult);
    } catch (err) {
      if (id !== lookupId.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMissing({ activity: text, country: code, others: found.others });
    } finally {
      if (id === lookupId.current) setLoading(false);
    }
  }

  // Links from the law library open a specific answer: /?a=<activity>&c=<country>
  useEffect(() => {
    if (!db) return;
    const params = new URLSearchParams(location.search);
    const a = params.get("a");
    const c = params.get("c");
    if (a && c && COUNTRIES.some((x) => x.code === c)) check(a, c, a + c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const sourcesFor = (code: string) => sourcesDb?.countries.find((c) => c.country === code);
  const popular = db?.answers ?? [];
  const countriesCovered = new Set(popular.map((a) => a.country)).size;

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <SiteHeader current="home" />

      <main id="top">
        <div className="wrap hero">
          <p className="pill-note">Free legality check · every country · no account needed</p>
          <h1>
            <span>Before you do it,</span> <span className="two">check the law.</span>
          </h1>
          <p className="lead">
            Type an activity and pick a country. We read the current laws, including new acts and amendments, and tell you
            whether it’s legal there. In plain language.
          </p>
          <form
            className="search"
            role="search"
            aria-label="Legality check"
            onSubmit={(e) => {
              e.preventDefault();
              check(activity, country);
            }}
          >
            <label htmlFor="q" className="sr">
              Activity
            </label>
            <input
              id="q"
              ref={inputRef}
              type="search"
              placeholder="What do you want to do?"
              autoComplete="off"
              minLength={2}
              maxLength={200}
              required
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
            <label htmlFor="country" className="sr">
              Country
            </label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <button className="btn" type="submit" disabled={!db || loading}>
              {loading ? "Checking…" : "Check the law"}
            </button>
          </form>
          <p className="try">
            Try
            {TRY.map((t) => (
              <button key={t} type="button" onClick={() => check(t, country)}>
                {t}
              </button>
            ))}
          </p>
          <p className="sub-note">Ask about anything. Every answer cites the laws it’s based on.</p>
        </div>

        <div className="wrap window-wrap" id="check" ref={windowRef}>
          <div className="window" role="group" aria-label="Legality report">
            <div className="win-bar">
              <div className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="win-title">
                <b aria-hidden="true">§</b>Legality report
              </div>
              <div className="win-hint">Researched from current law</div>
            </div>
            <div className="win-body">
              <div className="side">
                <h2>Popular checks</h2>
                <ul className="browse" aria-label="Answers in the database">
                  {popular.map((p) => {
                    const key = p.activity + p.country;
                    return (
                      <li key={key}>
                        <button type="button" aria-pressed={active === key} onClick={() => check(p.activity, p.country, key)}>
                          <b>{p.activity}</b>
                          <small>
                            {flagOf(p.country)} {countryName(p.country)}
                          </small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {db && (
                  <p className="count">
                    {popular.length
                      ? `${popular.length} answers in ${countriesCovered} countries`
                      : "Answers are being researched. Check back soon."}
                  </p>
                )}
              </div>
              <div className="main-pane" aria-live="polite">
                {error && <p className="err-box">{error}</p>}
                {loading && <Loading activity={activity} country={country} />}
                {result && !loading && <Result r={result} sources={sourcesFor(result.country)} />}
                {missing && !loading && <Missing {...missing} onPick={(r) => check(r.activity, r.country, r.activity + r.country)} />}
                {!error && !loading && !result && !missing && <Empty onFocus={() => inputRef.current?.focus()} />}
              </div>
            </div>
          </div>
          <p className="muted rv" style={{ textAlign: "center", marginTop: 20 }}>
            Missing an activity? <Link href="/contact">Suggest one</Link> and we’ll research it.
          </p>
        </div>

        <section id="how">
          <div className="wrap">
            <div className="sec-head rv">
              <h2>
                Three steps. <span>No legalese.</span>
              </h2>
              <p>Ask, read the answer, then check the law yourself if it matters.</p>
            </div>
            <div className="tour">
              <div className="tour-visual rv" aria-hidden="true">
                <div className="mini">
                  <div className="part m-search" data-part="1">
                    <span>Wild camping · 🇳🇴 Norway</span>
                    <em>Check the law</em>
                  </div>
                  <div className="part" data-part="2">
                    <span className="verdict v-restricted">Legal with conditions</span>
                    <div className="m-title">Yes, on uncultivated land, for up to two nights.</div>
                    <div className="m-row">
                      <span>
                        Keep <b>150 m from homes</b>
                      </span>
                      <span>
                        Confidence <b>High</b>
                      </span>
                    </div>
                  </div>
                  <div className="part" data-part="3">
                    <ul className="tags" style={{ margin: 0 }}>
                      <li>Max 2 nights in one spot</li>
                      <li>Uncultivated land only</li>
                      <li>Leave no trace</li>
                    </ul>
                    <p className="m-src" style={{ margin: "10px 0 0" }}>
                      Law: <a href="#">Outdoor Recreation Act (Friluftsloven) 1957</a>
                    </p>
                  </div>
                </div>
              </div>
              <ol className="steps">
                <li className="step on" data-part="1">
                  <p className="n">01 / Ask</p>
                  <h3>Type what you want to do</h3>
                  <p>Describe the activity in your own words and pick the country you’re in, or the one you’re travelling to.</p>
                  <ul>
                    <li>Any activity</li>
                    <li>{COUNTRIES.length} countries</li>
                  </ul>
                </li>
                <li className="step" data-part="2">
                  <p className="n">02 / Read</p>
                  <h3>Get a straight answer</h3>
                  <p>Legal, illegal, or legal with conditions, with a one-line answer and a short summary in everyday words.</p>
                  <ul>
                    <li>Plain language</li>
                    <li>Regional differences</li>
                  </ul>
                </li>
                <li className="step" data-part="3">
                  <p className="n">03 / Verify</p>
                  <h3>See the law behind it</h3>
                  <p>The conditions and penalties, plus the exact acts and sections the answer is based on, linked to the source.</p>
                  <ul>
                    <li>Cited laws</li>
                    <li>Current amendments</li>
                  </ul>
                </li>
              </ol>
            </div>
            <div className="limits">
              <div className="rv">
                <h3>General information, not legal advice</h3>
                <p>
                  Answers are researched with AI. Database answers are reviewed by a person; instant answers are marked as not
                  reviewed. Either can be wrong or miss local rules, so if the stakes are high, read the cited law or ask a
                  lawyer.
                </p>
              </div>
              <div className="rv d1">
                <h3>Every answer shows where it came from</h3>
                <p>Official legislation portals and government sites first, so you can read the source yourself.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="wrap">
            <div className="sec-head rv">
              <h2>Straight answers.</h2>
            </div>
            <div className="faq rv d1">
              <details>
                <summary>Where do the answers come from?</summary>
                <p>
                  Each answer is researched with AI from current public legal sources, preferring official legislation databases
                  and government websites, and summarised in plain language. Answers in our database are reviewed by a person
                  before they’re published. If you ask something that isn’t in the database yet, we research it on the spot and
                  clearly mark it as an instant AI answer that hasn’t been reviewed. The laws each answer relies on are listed
                  under it.
                </p>
              </details>
              <details>
                <summary>How up to date is it?</summary>
                <p>
                  Every answer is researched from current legal sources and re-checked at least twice a year, so new acts
                  and amendments are picked up. The date it was last checked is shown under each answer.
                </p>
              </details>
              <details>
                <summary>What does “legal with conditions” mean?</summary>
                <p>
                  It’s allowed, but only if you meet certain rules, such as an age limit, a licence or permit, or limits on
                  where, when or how much. The conditions are listed with the answer.
                </p>
              </details>
              <details>
                <summary>What if the rules differ by state or city?</summary>
                <p>
                  You get the national answer, and a note on how states, provinces or cities differ when that matters. Local
                  bylaws can still be stricter, so check them if you’re unsure.
                </p>
              </details>
              <details>
                <summary>Can I rely on this in court or with the police?</summary>
                <p>
                  No. Legalcheck gives general information to help you understand the law, not legal advice for your
                  situation. For anything serious, talk to a qualified lawyer.
                </p>
              </details>
              <details>
                <summary>Do you see what I search?</summary>
                <p>
                  Searches for answers already in our database happen in your browser and aren’t sent anywhere. If you ask
                  something new, the activity and country (nothing else about you) are sent to our lookup service to research
                  it. See the <Link href="/privacy">privacy policy</Link>.
                </p>
              </details>
              <details>
                <summary>What’s the difference between reviewed and instant answers?</summary>
                <p>
                  Reviewed answers were researched in advance and checked by a person. Instant answers are researched by AI the
                  moment you ask and haven’t been checked yet, so treat them with more care. Popular questions are added to the
                  reviewed database over time, and you can <Link href="/contact">suggest one</Link>.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="closing">
          <div className="wrap rv">
            <h2>
              Check first. <span>Do it second.</span>
            </h2>
            <p>Look up the law before you pack the tent, fly the drone or light the fireworks.</p>
            <a
              className="btn"
              href="#top"
              onClick={() => setTimeout(() => inputRef.current?.focus(), 300)}
            >
              Check an activity
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Empty({ onFocus }: { onFocus: () => void }) {
  return (
    <div className="empty">
      <h3>Ask about anything you want to do.</h3>
      <p className="muted">Pick a popular check on the left, or type your own activity above. You’ll get one of these answers:</p>
      <ul className="legend-list">
        <li>
          <span className="verdict v-legal">Legal</span> Allowed for adults, no permission needed.
        </li>
        <li>
          <span className="verdict v-restricted">Legal with conditions</span> Allowed with a licence, age limit or other rules.
        </li>
        <li>
          <span className="verdict v-illegal">Illegal</span> Prohibited, with penalties.
        </li>
        <li>
          <span className="verdict v-depends">It depends</span> Turns on your situation or region.
        </li>
      </ul>
      <button type="button" className="btn ghost sm" onClick={onFocus}>
        Type your own
      </button>
    </div>
  );
}

function Missing({
  activity,
  country,
  others,
  onPick,
}: {
  activity: string;
  country: string;
  others: CheckResult[];
  onPick: (r: CheckResult) => void;
}) {
  const subject = encodeURIComponent(`Suggestion: ${activity} in ${countryName(country)}`);
  return (
    <div className="empty">
      <p className="result-label">
        {flagOf(country)} {countryName(country)}
      </p>
      <h3>{activity}</h3>
      <p className="muted">
        We haven’t researched this one for {inCountry(country)} yet. Try different words, or suggest it and it can be added
        to the next update.
      </p>
      {others.length > 0 && (
        <>
          <p className="muted" style={{ marginTop: 18 }}>
            We do have a similar answer for:
          </p>
          <ul className="others">
            {others.map((o) => (
              <li key={o.country}>
                <button type="button" className="btn ghost sm" onClick={() => onPick(o)}>
                  {flagOf(o.country)} {countryName(o.country)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <a className="btn sm" href={`mailto:${CONTACT_EMAIL}?subject=${subject}`} style={{ marginTop: 18 }}>
        Suggest this check
      </a>
    </div>
  );
}

function Loading({ activity, country }: { activity: string; country: string }) {
  return (
    <div className="loading">
      <p className="result-label">
        {flagOf(country)} {countryName(country)}
      </p>
      <h3>{activity}</h3>
      <p className="muted">
        This one isn’t in our reviewed database yet, so we’re researching it now. This usually takes 20 to 40 seconds.
      </p>
      <div className="bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function Result({ r, sources }: { r: CheckResult; sources?: CountrySources }) {
  return (
    <article className="result">
      <p className="result-label">
        {flagOf(r.country)} {countryName(r.country)}
      </p>
      <h3>{r.activity}</h3>
      <div className="entry">
        <div className="entry-top">
          <span className={`verdict lg v-${r.verdict}`}>{LABELS[r.verdict]}</span>
          <span className={`conf conf-${r.confidence}`}>Confidence: {r.confidence}</span>
        </div>
        <h4 className="headline">{r.headline}</h4>
        <p className="plain">{r.summary}</p>

        {r.conditions.length > 0 && (
          <dl className="facts">
            <div className="wide">
              <dt>Conditions</dt>
              <dd>
                <ul className="tags">
                  {r.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        )}

        {r.penalties && (
          <div className="caveat">
            <b>Penalties: </b>
            {r.penalties}
          </div>
        )}
        {r.regional_variation && (
          <div className="regional">
            <b>Regional differences: </b>
            {r.regional_variation}
          </div>
        )}

        {r.laws.length > 0 && (
          <div className="statement">
            <p className="st-label">The law</p>
            <ul>
              {r.laws.map((l) => (
                <li key={l.name + l.section}>
                  {l.url ? (
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.name}
                    </a>
                  ) : (
                    <b>{l.name}</b>
                  )}
                  {l.section && <span className="muted"> · {l.section}</span>}
                  {l.year && <span className="muted"> · {l.year}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.sources.length > 0 && (
          <details className="src">
            <summary>Sources searched ({r.sources.length})</summary>
            <ul>
              {r.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        {sources && sources.portals.length > 0 && (
          <p className="official">
            Read the law yourself:{" "}
            {sources.portals.slice(0, 2).map((p, i) => (
              <span key={p.url || p.name}>
                {i > 0 && " · "}
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.name}
                  </a>
                ) : (
                  p.name
                )}
              </span>
            ))}{" "}
            · <Link href={`/laws?c=${r.country}`}>Law library</Link>
          </p>
        )}
        {r.live && (
          <p className="live-note">
            <b>Instant AI answer, not yet reviewed by a person.</b> Researched just now from public legal sources. Check the
            cited law before relying on it.
          </p>
        )}
        {r.general ? (
          <p className="checked">
            General answer for a crime that’s illegal in every country. The specific law for {inCountry(r.country)} hasn’t
            been researched yet · Not legal advice
          </p>
        ) : (
          <p className="checked">Checked {new Date(r.checkedAt).toLocaleDateString()} · Not legal advice</p>
        )}
      </div>
    </article>
  );
}
