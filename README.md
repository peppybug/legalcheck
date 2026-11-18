# Legalcheck.app

Type an activity, pick a country, and get a quick answer on whether it's legal there, with the laws it's based on.

Hosted on **GitHub Pages**. Like Has it been Breached?, it's a static site: every answer lives in
`public/data/answers.json` and searches run in the visitor's browser.

## How it works

| Part | What it does |
|---|---|
| `data/checks.json` | The activities and countries to research. Every activity is checked in every listed country, plus the `extra` pairs. |
| `scripts/generate.ts` (`npm run generate`) | Asks Claude (`claude-opus-5-5`, with web search) to research each pair that's missing or older than 180 days, and saves the answers to `public/data/answers.json`. |
| `.github/workflows/refresh-answers.yml` | Runs the generator every Monday (and on demand) with up to 40 answers per run, then commits the answers. |
| `.github/workflows/deploy.yml` | Builds the site with `next build` (static export to `out/`) and deploys it to GitHub Pages on every push and after each refresh. |

Each answer has a verdict (`legal` · `illegal` · `restricted` · `depends` · `unclear`), a headline, a plain-language summary,
conditions, penalties, regional differences, the cited laws with year and official URL, the sources searched, and a confidence level.

## Setup on GitHub

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret:** `ANTHROPIC_API_KEY` (get a key at platform.claude.com).
3. **Actions → Refresh answers → Run workflow** to research the first batch. Run it again (or wait for Monday) until all pairs are done.

The site is served at `https://peppybug.github.io/legalcheck/`. To use `legalcheck.app`, add it under **Settings → Pages → Custom
domain** and point the domain's DNS at GitHub Pages; the deploy workflow then builds without the `/legalcheck` path automatically.

**Cost control:** every answer uses Claude plus a few web searches. `MAX` (answers per run) and `REFRESH_DAYS` cap how much each
run does; both can be changed when you start the workflow by hand.

## Run locally

```bash
npm install
npm run dev                                  # site at http://localhost:3000
ANTHROPIC_API_KEY=... MAX=5 npm run generate # research 5 answers
```
