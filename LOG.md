# LOG — one entry per session/task, append only (read only the last entry)

Format:
## YYYY-MM-DD HH:MM — <task>
- Done: ...
- Files: ...
- Result / tests: ...
- Lesson -> docs/knowledge.md? yes/no

## 2026-11-08 — project created from ai-project-starter
- Done: base files (AGENTS, NOW, BACKLOG, LOG, CODEMAP, VALIDATION, knowledge, check + hooks).
- Result: `node scripts/check.mjs` passes.

## 2026-11-08 — v1 photo edit PWA
- Done: web app (pick/take photo, free prompt + 8 presets, edit/generate via OpenAI Images API, hold to compare, save via iOS share sheet, edit result again, history 40 in IndexedDB, settings: key/base/model/size/fidelity/quality), serve script, free e2e test.
- Files: web/*, scripts/serve.mjs, tests/e2e.mjs, docs.
- Result: check OK, node --check OK, e2e PASS (screenshot reviewed; fixed textarea font).
- Lesson -> docs/knowledge.md: yes (CORS unproven, SW needs HTTPS).

## 2026-11-08 — switch to CheapAI
- Done: defaults base api.cheapai.io/v1 + gpt-image-2.5, model list, fidelity retry on any status, sw v2, e2e expects default model.
- Result: free probe OK (CORS *, edits route), check + e2e below.

## 2026-11-08 — live + private
- Done: invite-link key (#k=), lock screen, real paid CheapAI edit OK, GitHub Pages deploy, scripts/invite.mjs + deploy.sh.
- Result: e2e PASS (lock + link key), live site 200.
- Lesson -> knowledge: yes.

## 2026-11-08 — default quality medium, price labels
- Done: quality default medium (~$0.01), price hints in the picker, e2e cleans stale profile; dropped the Cloudflare proxy idea (CheapAI has per-key limits).
- Result: check OK, e2e PASS, deployed.

## 2026-11-08 — v6 chat app
- Done: app rewritten as a chat (claude-sonnet-5 with edit_image/generate_image tools -> gpt-image-2.5), conversations in IndexedDB, attach photos, viewer + save, settings for both models; e2e rewritten (fake SSE + tool call).
- Result: check OK, e2e PASS (screenshot reviewed), real CheapAI stream + tool round trip OK.

## 2026-11-08 — v7 unlock fix
- Done: hashchange reload + paste-link unlock on the lock screen (operator could not open Lợi's link).
- Result: e2e PASS incl. both cases; deployed.

## 2026-11-12 — v8 context + anti-blur
- Done: 300-msg window + summary, 20 images (bot results too, 2 sizes), re-edit from original with combined prompts, edit quality high (own setting), sw v8; e2e steps 5-6.
- Files: web/app.js, web/index.html, web/sw.js, tests/e2e.mjs, docs/knowledge.md, NOW/BACKLOG.
- Result: check OK, node --check OK, e2e PASS (screenshot reviewed). Real paid chain not run.
- Lesson -> knowledge: yes.
