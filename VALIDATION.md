# VALIDATION — how to prove a change works (grep, don't read whole)

## Always
- `node scripts/check.mjs` — process files present, NOW.md <= 40 lines, lessons dated.
- `node --check web/app.js` — syntax.
- `node tests/e2e.mjs` — FREE (fake API): real app in headless Edge; pick photo, preset, edit request fields, result, history, generate. Screenshot tmp/e2e.png — look at it.

## Manual / paid (only when the operator asks — each real edit costs money)
- One real edit with his key on the iPhone: result shown, Lưu/Chia sẻ opens the iOS share sheet, "Lưu hình ảnh" lands in Photos.
- After changing web/: bump VERSION in web/sw.js.

Rule: a manual check that keeps catching the same mistake becomes an automated check.
