"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, countryName } from "@/lib/countries";
import type { CheckResult } from "@/lib/verdict";

const EXAMPLES = ["Flying a drone in a park", "Wild camping", "Collecting rainwater", "Jaywalking", "Owning a pet fox"];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region && COUNTRIES.some((c) => c.code === region)) setCountry(region);
  }, []);

  async function check(e?: React.FormEvent, text = activity) {
    e?.preventDefault();
    if (text.trim().length < 3) return;
    setActivity(text);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: text, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="masthead">
        <span className="wordmark">Legalcheck</span>
        <span className="tld">.app</span>
      </header>

      <h1>Is it legal here?</h1>
      <p className="lede">Name the activity, pick the country. We read the current law and give you a straight answer.</p>

      <form onSubmit={check} className="query">
        <label className="field grow">
          <span>Activity</span>
          <input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="e.g. drinking alcohol in public"
            maxLength={200}
            required
            minLength={3}
          />
        </label>
        <label className="field">
          <span>Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {!result && !loading && (
        <div className="examples">
          <span>Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => check(undefined, ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {loading && (
          <p className="status">
            Searching the law books of {countryName(country)}. This usually takes 20 to 40 seconds.
          </p>
        )}
        {error && <p className="status error">{error}</p>}
        {result && <Result r={result} />}
      </div>

      <footer>
        Legalcheck gives general information, not legal advice. Laws change and can depend on your situation; check the
        cited sources or ask a lawyer before acting on an answer.
      </footer>
    </main>
  );
}

function Result({ r }: { r: CheckResult }) {
  return (
    <article className={`result v-${r.verdict}`}>
      <p className="eyebrow">
        {r.activity} · {countryName(r.country)}
      </p>
      <p className="stamp">{LABELS[r.verdict]}</p>
      <h2>{r.headline}</h2>
      <p>{r.summary}</p>

      {r.conditions.length > 0 && (
        <section>
          <h3>Conditions</h3>
          <ul>
            {r.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}
      {r.penalties && (
        <section>
          <h3>Penalties</h3>
          <p>{r.penalties}</p>
        </section>
      )}
      {r.regional_variation && (
        <section>
          <h3>Regional differences</h3>
          <p>{r.regional_variation}</p>
        </section>
      )}
      {r.laws.length > 0 && (
        <section>
          <h3>The law</h3>
          <ul className="laws">
            {r.laws.map((l) => (
              <li key={l.name + l.section}>
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noreferrer">
                    {l.name}
                  </a>
                ) : (
                  l.name
                )}
                {l.section && <span className="muted"> · {l.section}</span>}
                {l.year && <span className="muted"> · {l.year}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.sources.length > 0 && (
        <details>
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
      <p className="meta">
        Confidence: {r.confidence} · Checked {new Date(r.checkedAt).toLocaleDateString()}
      </p>
    </article>
  );
}
