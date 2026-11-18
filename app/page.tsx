"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES, countryName } from "@/lib/countries";
import type { CheckResult } from "@/lib/verdict";
import { SiteHeader, SiteFooter, CONTACT_EMAIL } from "@/components/SiteChrome";
import { findAnswer, type AnswerDb } from "@/lib/match";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

  // Searches run in the browser against the answers file. Nothing is sent anywhere.
  function check(text: string, code: string, key: string | null = null) {
    if (!db || text.trim().length < 2) return;
    setActivity(text);
    setCountry(code);
    setActive(key);
    const { answer, others } = findAnswer(db.answers, text, code);
    setResult(answer);
    setMissing(answer ? null : { activity: text, country: code, others });
    windowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
            <button className="btn" type="submit" disabled={!db}>
              Check the law
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
          <p className="sub-note">Your search stays in your browser. Every answer cites the laws it’s based on.</p>
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
                {result && <Result r={result} />}
                {missing && <Missing {...missing} onPick={(r) => check(r.activity, r.country, r.activity + r.country)} />}
                {!error && !result && !missing && <Empty onFocus={() => inputRef.current?.focus()} />}
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
                    <li>Stays in your browser</li>
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
                  Answers are researched by AI from public legal sources and can be wrong or miss local rules. If the stakes
                  are high, read the cited law or ask a lawyer.
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
                  Each answer is researched by AI from current public legal sources, preferring official legislation databases
                  and government websites, then summarised in plain language. The laws it relied on are listed under every answer.
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
                  No. All answers are downloaded to your browser and the search happens there. What you type is never sent to
                  us or anyone else.
                </p>
              </details>
              <details>
                <summary>Why isn’t my activity there?</summary>
                <p>
                  Answers are researched in advance and the database is still growing. If yours is missing,{" "}
                  <Link href="/contact">suggest it</Link> and it can be added to the next update.
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
        We haven’t researched this one for {countryName(country)} yet. Try different words, or suggest it and it can be added
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

function Result({ r }: { r: CheckResult }) {
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
        <p className="checked">Checked {new Date(r.checkedAt).toLocaleDateString()} · Not legal advice</p>
      </div>
    </article>
  );
}
