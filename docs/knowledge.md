# Knowledge — lessons, decisions, dropped (canonical; grep by keyword)

Every entry starts with a date: `- YYYY-MM-DD: <lesson> — why: <cause> — apply: <how>`.
Never summarise or delete; dropped items move to "Dropped" with the date.
Group under topic headings as the file grows; keep a short table of contents at the top.

## Contents
- Lessons
- Decisions
- Dropped

## Lessons
- 2026-11-08: Operator saw the lock screen with a valid link: pasting a link into a tab already on the app only changes the #hash (no page load), so the key was never read. Fix: hashchange -> reload, plus a "Dán link mời" box on the lock screen (chat apps may also cut #k=). e2e covers both.
- 2026-11-08: CheapAI streams claude-sonnet-5 as text/event-stream in OpenAI delta format (tool_calls deltas OK) but buffers it: everything arrives at once after ~7-10 s. Keep the typing indicator.
- 2026-11-08: CheapAI DOES have per-key limits: Keys -> gear (/en/keys?edit=<id>): Spending limit $, Expires, Allowed models, Allowed IPs, enabled. Not in the page HTML until opened — open the settings before saying a feature is missing. Operator creates keys himself (faster than driving his Edge).
- 2026-11-08: Git Bash rewrites args starting with / into Windows paths — prefix MSYS_NO_PATHCONV=1 when passing API paths like /user.
- 2026-11-08: Changing only the #hash does not reload the page — tests must Page.reload after navigating to a #k= link.
- 2026-11-08: Browser calls the API directly; CheapAI CORS proven by free probe, a real paid edit not yet run — first real edit confirms params (quality/size/input_fidelity).
- 2026-11-08: Service worker only registers on HTTPS/localhost; over LAN http the app still works and can be added to the Home Screen, just no offline cache.

- 2026-11-08: Python text mode on Windows writes CRLF and broke check.mjs line rules — fix: check.mjs strips  (also in ai-project-starter).

## Decisions
- 2026-11-08: Chat app (operator: "như 1 trình chat gpt thật, có chat hỗ trợ và chỉnh ảnh"). Chat model claude-sonnet-5 chosen by real probe: 3.7 s, calls edit_image with a good English prompt, ~526 in/149 out tokens = ~$0.0003/turn ($0.26/$1.33 per M). gemini-3-flash: cheaper but did NOT call the tool; haiku 4.5 slower (5.9 s); gpt-5.6-terra 4519 input tokens for the same image. Cost guard: only the 2 newest user images go to the chat model, shrunk to 768 px.
- 2026-11-08: Default quality = medium. CheapAI price list 2026-11-08: gpt-image-2.5 $1.50/M in + $9/M out tokens (real low edit 429 in/229 out = ~$0.003; medium ~$0.01; high ~$0.04), gpt-image-2 $0.022/req 61 s, gemini-3.1-flash-image(-preview) $0.024/req 14-20 s (not wired to /images/edits, untested), grok-imagine-image $0.018 no data. flare/sunburst = same price, no data, no documented difference.
- 2026-11-08: Access control = one CheapAI sub-key per person inside their link (#k=, never sent to servers); no key -> lock screen. Revoke = delete that sub-key. Owner link uses the main key — do not forward it. Why: static Pages has no server to hold secrets; CheapAI is new-api (has per-key limits).
- 2026-11-08: Hosting = GitHub Pages, account voluthanhvu-sys (stored git credential), branch gh-pages = subtree of web/.
- 2026-11-08: PWA instead of native iOS app — why: no Mac/App Store needed, installs from Safari "Add to Home Screen".
- 2026-11-08: No backend; key in localStorage on the phone — why: personal app, simplest; never commit a key.
- 2026-11-08: Provider = CheapAI (operator 2026-11-08): base https://api.cheapai.io/v1, model gpt-image-2.5 (~$0.013/picture measured in GhostForge 07/11); input_fidelity high, auto-retry without it if rejected. Free probe: CORS * and /images/edits exists ("image is required"). Image models there: gpt-image-2, gpt-image-2.5(-flare/-sunburst), gemini-3.1-flash-image, grok-imagine-image.
- 2026-11-08: Rules live only in AGENTS.md; other agent files are pointers — why: copies drift apart.
- 2026-11-12: Chat context (operator chose after price table): last 300 messages + summary of older ones (redone every 100, window starts at the summary end so nothing falls in a gap), 20 newest images incl. bot results (10 at 1024 px, 10 at 512 px; bot results ride in the next user message). Why: cost per message is tiny (~1,400 tokens/1024px image x $0.26/M; 20 images ~130đ, 300 msgs ~200đ); the real limit is upload size/speed on 4G. Old setting (30 msgs, 2 user images 768px, bot never saw its own results) made it forget and blind.
- 2026-11-12: Blur on repeated edits = gpt-image redraws the whole picture each edit (copy of a copy) + medium quality. Fix: re-editing a result redoes from the ORIGINAL with all prompts combined (later wins on conflict); from_result=true keeps chaining; edits default quality high (~$0.04). Not yet measured with a real paid chain.

## Dropped
