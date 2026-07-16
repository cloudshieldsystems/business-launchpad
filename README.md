# Business Launchpad 🚀

A step-by-step guide that walks a new business owner through legally forming their business — one clear action at a time. Think TurboTax's guided flow, but for starting a business.

**Live app:** https://helloworld171.github.io/business-launchpad/ *(GitHub Pages, from `docs/`)*

## v1 scope

- **Virginia only** (state dropdown shows "more states coming soon")
- **Intake:** business idea, entity-type quiz (recommends LLC / S-corp election / C-corp in plain English), solo vs. partners
- **7-step roadmap**, one step at a time, with progress bar:
  1. Choose your business name (Virginia SCC name search)
  2. Appoint a registered agent
  3. File Articles of Organization ($100, cis.scc.virginia.gov)
  4. Get your EIN from the IRS (free — with a warning about paid third-party sites)
  5. Open a business bank account (document checklist)
  6. Register with Virginia Tax
  7. Check local business license requirements
- **Final screen:** summary, total spent, "what's next" teasers (bookkeeping, insurance, taxes)
- Progress saved in localStorage; installable as a PWA (offline-capable, add to home screen)

## Project layout

| Path | What it is |
|---|---|
| `docs/` | The deployable site (GitHub Pages serves this) — self-contained `index.html` (React inlined, JSX pre-compiled), PWA manifest, service worker, icons |
| `index.html` | Dev version — same app as readable JSX, compiled in-browser via Babel standalone (CDN). Edit this one. |
| `serve.ps1` | Zero-dependency local static server: `powershell -File serve.ps1` then open http://localhost:5173 |
| `save-server.ps1` | Dev helper used to capture compiled JSX and generated icons from the browser |

## Editing workflow

1. Edit `index.html` (the JSX dev version) and test locally via `serve.ps1`
2. Rebuild `docs/index.html` from it (inline React + newly compiled JSX — see git history for the assembly script, or ask Claude to do it)
3. Bump the `CACHE` version in `docs/sw.js` so returning visitors get the update
4. Commit and push — GitHub Pages redeploys automatically

## Roadmap

- **Phase 2:** port to Expo → App Store (local notification reminders for unfinished steps, offline, progress widget)
- More states
- Bookkeeping / insurance / tax modules

---
*Business Launchpad is a guide, not legal advice.*
