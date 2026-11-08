# CODEMAP — where things live (grep, don't read whole)

## Docs / process
- AGENTS.md — rules for every AI (canonical) · NOW.md — current state · BACKLOG.md — requests · LOG.md — session log
- docs/knowledge.md — lessons, decisions, dropped · VALIDATION.md — how to test

## App (web/, static, no build)
- web/index.html — chat layout: header (☰ conversations, ＋ new, ⚙ settings), chat, composer (📎 attach), drawer, image viewer, settings dialog
- web/app.js — all logic: cfg (localStorage, #k= link key), SYSTEM prompt + TOOLS (edit_image, generate_image), IndexedDB conversations (convAll/convSave), apiMessages() (only 2 newest user images sent as pictures), chatTurn() (SSE stream + tool-call deltas), runTool() -> imageCall() (/images/edits with image[], /images/generations), send() loop (max 3 tool rounds), render/drawer/viewer/save
- web/style.css — dark mobile UI · web/sw.js — offline shell (bump VERSION) · web/manifest.webmanifest + web/icons/ — home-screen app

## Scripts / tests
- scripts/invite.mjs — make a private invite link (records in LINKS.local.txt) · scripts/deploy.sh — publish web/ to GitHub Pages
- scripts/serve.mjs — static server, prints LAN address for the iPhone
- scripts/check.mjs — process checks · scripts/session-brief.mjs / stop-reminder.mjs — Claude Code hooks
- tests/e2e.mjs — free end-to-end test with fake API + headless Edge/Chrome over CDP
