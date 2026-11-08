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
