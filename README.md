# Business Launchpad 🚀

A step-by-step guide that walks a new business owner through legally forming their business — one clear action at a time. Think TurboTax's guided flow, but for starting a business.

**Live app:** https://cloudshieldsystems.github.io/business-launchpad/ *(GitHub Pages, from `docs/`)*

## v1 scope

- **Virginia only** for now — but all state-specific data lives in a `STATES` table, so new states are data entries (see [Adding a state](#adding-a-state))
- **Intake:** business idea, entity-type quiz (recommends LLC / S-corp election / C-corp in plain English), solo vs. partners
- **7-step roadmap**, one step at a time, with progress bar:
  1. Choose your business name (Virginia SCC name search)
  2. Appoint a registered agent
  3. File Articles of Organization ($100, cis.scc.virginia.gov)
  4. Get your EIN from the IRS (free — with a warning about paid third-party sites)
  5. Open a business bank account (document checklist)
  6. Register with Virginia Tax
  7. Check local business license requirements
- **Formation record (v2):** captures the business name (Step 1), registered agent choice (Step 2), and EIN (Step 4); shown on the roadmap banner and the final summary with a one-tap copy button
- **Annual fee reminder (v3):** capture the Articles approval date (Step 3); the summary shows the next Virginia annual registration fee due date ($50 LLC, last day of the formation month) with Google Calendar and .ics links (yearly repeat, 2-week alert)
- **PDF export (v4):** "Download PDF" renders a one-page Formation Record (details, steps and costs, annual fee obligation) via the browser's print-to-PDF — no dependencies, works offline
- **Share (v5):** native share sheet (Web Share API) sends the formation record as text to Messages, Mail, or Notes; falls back to a prefilled email on browsers without it
- **Final screen:** summary, formation record, total spent (plus the ~$125/yr agent line if you chose a service), "what's next" teasers (bookkeeping, insurance, taxes)
- Progress saved in localStorage; installable as a PWA (offline-capable, add to home screen)

## Project layout

| Path | What it is |
|---|---|
| `docs/` | The deployable site (GitHub Pages serves this) — self-contained `index.html` (React inlined, JSX pre-compiled), PWA manifest, service worker, icons |
| `index.html` | Dev version — same app as readable JSX, compiled in-browser via Babel standalone (CDN). Edit this one. |
| `serve.ps1` | Zero-dependency local static server: `powershell -File serve.ps1` then open http://localhost:5173 |
| `build.mjs` | Rebuilds `docs/index.html` from `index.html` (inlines React, pre-compiles the JSX with Babel) |
| `tests/` | Browser acceptance suites (Playwright + headless Chromium), one file per feature; `tests/run.mjs` runs them all |
| `package.json` | Dev tooling only: `npm run build`, `npm test`, `npm run test:live` |
| `save-server.ps1` | Dev helper used to capture compiled JSX and generated icons from the browser |

## Editing workflow

1. Edit `index.html` (the JSX dev version) and test locally via `serve.ps1`
2. Rebuild `docs/index.html` from it: `npm install` (once), then `npm run build`. Never hand-edit `docs/index.html`.
3. Run `npm test` — 56 browser checks against the rebuilt `docs/` (first time: `npx playwright install chromium`)
4. Bump the `CACHE` version in `docs/sw.js` so returning visitors get the update
5. Commit, open a PR, merge — GitHub Pages redeploys automatically
6. After the deploy finishes, `npm run test:live` runs the same 56 checks against the live site

## Testing

| Command | What it does |
|---|---|
| `npm test` | Serves `docs/` locally and runs every `tests/*.test.mjs` in headless Chromium |
| `npm run test:live` | Same suites against https://cloudshieldsystems.github.io/business-launchpad/ |

Suites cover the whole flow: intake and textarea growth, the business-name gate, agent choice, EIN, Articles date, persistence across reloads, roadmap banner, summary headline, formation record and copy button, agent cost row and footer, annual fee due-date math, Google Calendar and .ics links, the print-to-PDF sheet (hidden on screen, one page in print), Share with its fallbacks, and legacy localStorage states.

Options: `CHROMIUM_PATH=/path/to/chrome` to use a specific browser; `LIVE_URL=` to test a different deployment; `LIVE_VIA_CURL=1` for sandboxes where the browser can't open HTTPS tunnels but curl can.

## Adding a state

All state-specific content lives in one place in `index.html`: the `STATES` object. Virginia (`VA`) is the only entry today and doubles as the template. A new state is a data entry, not a code change.

1. Copy the `VA` entry and rename the key and `code`/`name`.
2. Fill in `agency` (name + short form used in prompts), `taxAgency`, `filingFee`, `costBadge`, and `ideaPlaceholder`.
3. Rewrite the five state-specific steps (`name`, `agent`, `articles`, `tax`, `license`): titles, plain-English explanations, real links, costs (`costNumber`, `costIsEstimate`), tips, and the `capture` fields. Keep `STEP_EIN` and `STEP_BANK` in the same positions — they're federal and shared.
4. Set `annual`: `fee(recoType)` returns `{ amount, label }`; `ruleText` completes the sentence "due by …"; `dueDate` is `dueAnniversaryMonthEnd` (Virginia-style, last day of the formation month) or `dueFixedDate(month, day)` (e.g. `dueFixedDate(4, 15)` for an April 15 annual report); plus `payUrl`, `payHost`, `latePenalty`, `icsFilename`.
5. The intake dropdown, roadmap, summary, calendar links, print sheet, and entity recommendation text all read from the selected state automatically. Changing state on the intake screen resets roadmap progress because steps differ.
6. Add a test file under `tests/` that walks the new state's roadmap, then `npm run build`, bump `CACHE` in `docs/sw.js`, and open a PR.

## Roadmap

- **Phase 2:** port to Expo → App Store (local notification reminders for unfinished steps, offline, progress widget)
- More states
- Bookkeeping / insurance / tax modules

---
*Business Launchpad is a guide, not legal advice.*
