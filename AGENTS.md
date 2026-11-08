# AGENTS.md — every AI reads this first, every session

Canonical rules for any AI agent (Claude, Codex, Gemini, Cursor, Copilot...).
Other agent files (CLAUDE.md, GEMINI.md, ...) only point here. One copy, no drift.

## 0. Project (fill in once)
- Name: Photo Edit AI
- Goal: personal iPhone web app (PWA) to edit any photo with free-text prompts via an OpenAI-compatible Images API (default CheapAI api.cheapai.io, model gpt-image-2.5), no ChatGPT app needed.
- Stack: static HTML/CSS/vanilla JS in web/ (no build, no backend); key stored in the browser (localStorage); history in IndexedDB.
- Operator language: Vietnamese — reply in it, short and to the point. UI text in Vietnamese.
- Run: node scripts/serve.mjs (http://localhost:8080 + LAN address for the phone)   Test: see VALIDATION.md

## 1. Read order — stop as soon as you know enough
1. `NOW.md` — what is in progress and what is OWED. Always, before the first answer.
2. Tail of `LOG.md` (last entry only).
3. Lookup files — GREP them, never read whole: `CODEMAP.md`, `docs/knowledge.md`, `BACKLOG.md`, `VALIDATION.md`.
4. Only then source files, and only the lines you need.

## 2. Quota rules — cut waste, never quality
- Search (grep/glob) before reading; read line ranges, not whole files.
- Never re-read a file you just edited or already have in context.
- Batch independent tool calls in one turn.
- No subagents / parallel agents unless the operator asks.
- Long command output -> redirect to a file, read the tail or a grep.
- Do not re-derive what the docs already state; do not re-argue decisions in `docs/knowledge.md`.
- Settle "which is faster/better" with a small real test, not long reasoning.
- Before a task: give a time estimate. Past 1.5x of it -> stop, say why, fix the plan.
- Replies: short, no recap of what the operator already sees.
- The cheapest defect is the prevented one: a mistake a machine can catch becomes a check in `scripts/check.mjs` (or the test suite) in the same turn.

## 3. Memory rules — write it down the moment it happens
- Every operator request / idea / change of mind -> `BACKLOG.md` immediately, before working on it.
- Every lesson (mistake + fix, operator correction, measured result) -> `docs/knowledge.md`, dated, same turn.
- Never summarise lessons away. Remove only what the operator drops (move it to "Dropped" with the date).
- Decisions -> `docs/knowledge.md` "Decisions", with the reason.
- New / moved module -> one line in `CODEMAP.md`.
- One fact, one place. Other files link to it, never copy it.
- Dates absolute (YYYY-MM-DD HH:MM), never "today"/"yesterday".

## 4. Change rules
- Smallest change that solves the task; no unasked refactors or features.
- Follow existing style and structure.
- Fix the root cause, not the symptom.
- Look before deleting or overwriting. Ask before irreversible or outward-facing actions (push, publish, deploy, pay, delete data).
- Secrets never in git (`.env`, keys) — see `.gitignore`.

## 5. Finish every task — handoff (mandatory)
1. Run `node scripts/check.mjs` + the tests in `VALIDATION.md`. Report failures honestly, with output.
2. Overwrite `NOW.md` (max 40 lines): in progress, OWED, next step.
3. Append one entry to `LOG.md`: date, what was done, files touched, result.
4. Update `BACKLOG.md` status of the items you worked on.
5. Files first, reply last.
