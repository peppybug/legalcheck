# Legalcheck.app

Type an activity, pick a country, and get a quick answer on whether it's legal there, with the laws it's based on.

## How it works

1. The visitor enters an activity (3–200 chars) and picks one of ~195 countries.
2. `POST /api/check` checks a 30-day cache, then rate-limits fresh lookups (20/hour per IP).
3. `lib/check.ts` asks Claude (`claude-opus-5-5`) to search the web for the current law, preferring official legislation portals. It then returns a structured verdict through a strict `submit_verdict` tool:
   - `legal` · `illegal` · `restricted` (legal with conditions) · `depends` · `unclear`
   - headline, plain-language summary, conditions, penalties, regional differences
   - cited acts/sections with year and official URL, plus a confidence level
4. Because every lookup searches the web, new acts and amendments are picked up automatically; the cache TTL controls how often an answer is refreshed.

If Claude declines a request, the server can retry it on a fallback model (the `fallbacks: "default"` setting).

## Run locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

## Before going to production

- Replace the in-memory cache and rate limiter in `lib/store.ts` with Redis/Postgres (they reset on restart and aren't shared across servers).
- Have a lawyer review the disclaimer and terms; this is general information, not legal advice.
- Consider pre-generating popular activity × country pairs and serving them as static, indexable pages (good for SEO and cost).
