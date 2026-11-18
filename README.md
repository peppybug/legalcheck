# Legalcheck.app

Type an activity, pick a country, and get a quick answer on whether it's legal there, with the laws it's based on.

The site is hosted on **GitHub Pages**. A search is answered from, in order:

1. **The reviewed database** (`public/data/answers.json`), searched in the visitor's browser.
2. **Built-in serious crimes** (`lib/crimes.ts`): murder, theft, assault and so on are illegal everywhere, answered instantly.
3. **The lookup service** (`worker/`, a Cloudflare Worker): anything else is researched on the spot by Claude with web search
   and shown as an *instant AI answer, not yet reviewed by a person*. It holds the API key, caches answers for 30 days and
   allows 5 new questions per visitor per minute.

## The database

Everything lives in `public/data/` as JSON, versioned in git and loaded by the browser:

| File | Contents | Built by |
|---|---|---|
| `countries.json` | Official law sources for each of the 200 countries: legislation portals, official gazette, constitution, legal system, languages, regional-law note | Claude + web search |
| `answers.json` | Legality answers per activity and country: verdict, headline, summary, conditions, penalties, regional differences, cited laws, sources, confidence | Claude + web search |
| `laws.json` | Every act cited in the answers, de-duplicated per country, with official URL, year, sections cited and which answers use it | Built from `answers.json`, no API calls |
| `categories.json` | Activity categories, copied from `data/checks.json` | Copied |

The database **links to** the official law texts rather than copying them: full national law collections run to millions of
pages in 100+ languages, aren't all published as open data, and wouldn't fit on GitHub Pages (1 GB limit).

`data/checks.json` lists the ~30 activities (in 8 categories) to research in **every country**, priority countries first.
That's about 6,200 answers in total, built up run by run.

## How it works

| Part | What it does |
|---|---|
| `scripts/generate.ts` (`npm run generate`) | Researches missing or outdated (180+ days) country sources and answers, then rebuilds `laws.json`. |
| `.github/workflows/refresh-answers.yml` | Runs the generator every Monday and on demand (default: 20 countries + 40 answers per run) and opens a **pull request for review** with a readable summary. Nothing goes live until you merge it. |
| `.github/workflows/deploy.yml` | Builds the static site (`out/`) and deploys it to GitHub Pages on every push and after each refresh. |
| `/laws` (Law library) | Browse a country's official sources, the laws behind its answers, and all its answers by category. |

## Setup: the lookup service (so any question works)

1. Create a free account at cloudflare.com and put your **Account ID** in `worker/wrangler.toml` (`account_id`). Create an
   **API token** with the *Edit Cloudflare Workers* template (My Profile → API Tokens).
2. In GitHub, **Settings → Secrets and variables → Actions → Secrets**, add `CLOUDFLARE_API_TOKEN` and `ANTHROPIC_API_KEY`.
3. **Actions → Deploy lookup service → Run workflow.** The log ends with the service URL, like
   `https://legalcheck-lookup.<your-subdomain>.workers.dev`.
4. **Settings → Secrets and variables → Actions → Variables**, add `LOOKUP_URL` with that URL (no trailing slash).
5. **Actions → Deploy site to Pages → Run workflow.** Searches for anything now work.

**Set a monthly spend limit** in the Anthropic Console (Settings → Limits). The service is public, and every new question
costs a Claude request with web searches; the per-visitor limit slows abuse but doesn't cap your bill.

If you use a custom domain, add it to `ALLOWED_ORIGINS` in `worker/wrangler.toml`.

## Setup: the reviewed database

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret:** `ANTHROPIC_API_KEY` (get a key at platform.claude.com).
3. **Settings → Actions → General → Workflow permissions:** switch on *Allow GitHub Actions to create and approve pull requests*.
4. **Actions → Refresh answers → Run workflow** to research the first batch.
5. **Review the pull request** it opens: each answer and country is listed with its verdict, summary and links to the official
   sources. Fix or delete anything wrong on the PR branch, then merge. Merging deploys the site.

The site is served at `https://peppybug.github.io/legalcheck/`. To use `legalcheck.app`, add it under **Settings → Pages → Custom
domain** and point the domain's DNS at GitHub Pages; the deploy workflow then builds without the `/legalcheck` path automatically.

**Cost control:** every country entry and answer uses Claude plus a few web searches. `MAX` (answers per run),
`MAX_COUNTRIES` and `REFRESH_DAYS` cap how much each run does; all three can be changed when you start the workflow by hand.
At the defaults, the weekly run researches 60 items, so covering every country takes a long time; raise `MAX` to go faster.

## Run locally

```bash
npm install
npm run dev                                  # site at http://localhost:3000
ANTHROPIC_API_KEY=... MAX=5 npm run generate # research 5 answers
```
