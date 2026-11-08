# CODEMAP — where things live (grep, don't read whole)

## Docs / process
- AGENTS.md — rules for every AI (canonical) · NOW.md — current state · BACKLOG.md — requests · LOG.md — session log
- docs/knowledge.md — lessons, decisions, dropped · VALIDATION.md — how to test

## App (web/, static, no build)
- web/index.html — layout: source photo, presets + prompt, result, history, settings dialog
- web/app.js — all logic: cfg (localStorage), PRESETS, IndexedDB history (histAdd/histAll), prep() resize+JPEG, callApi() (/images/edits or /images/generations), run(), save() (iOS share sheet)
- web/style.css — dark mobile UI · web/sw.js — offline shell (bump VERSION) · web/manifest.webmanifest + web/icons/ — home-screen app

## Scripts / tests
- scripts/serve.mjs — static server, prints LAN address for the iPhone
- scripts/check.mjs — process checks · scripts/session-brief.mjs / stop-reminder.mjs — Claude Code hooks
- tests/e2e.mjs — free end-to-end test with fake API + headless Edge/Chrome over CDP
