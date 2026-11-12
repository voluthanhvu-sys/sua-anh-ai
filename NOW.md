# NOW — current state (OVERWRITTEN at the end of every session, max 40 lines)

Rules live in AGENTS.md / docs/knowledge.md, never here. Old content is in LOG.md.

## In progress
- LIVE: https://voluthanhvu-sys.github.io/sua-anh-ai/ (repo voluthanhvu-sys/sua-anh-ai, Pages = web/ on gh-pages). v6 = chat app: claude-sonnet-5 + gpt-image-2.5 via CheapAI, conversations, attach photos, viewer/save.
- Private: no #k= key -> lock screen. Owner link in LINKS.local.txt (gitignored).
- Verified for real: image edit (27 s), chat stream + tool round trip. Not yet: a full real chat->edit run inside the app on the iPhone.

## 2026-11-12 — v8 LIVE (anh chốt "ok chốt phần này")
- Chat model thấy 300 tin cuối + tóm tắt phần cũ (conv.summary, làm lại mỗi 100 tin), 20 ảnh (10 mới 1024px + 10 cũ 512px, gồm ảnh bot làm ra).
- Chống nhòe: sửa lại ảnh kết quả = làm lại từ ẢNH GỐC + gộp mọi prompt (msg.meta {src,prompts}); from_result=true để sửa chồng.
- Chất lượng sửa ảnh = ô riêng trong Cài đặt (cfg.editQuality), mặc định medium từ v10.
- 12/11 đo thật high ~$0.078 vs medium ~$0.016, nhìn gần như nhau -> nhãn giá v9; v10 (anh chốt): editQuality mặc định medium, high chỉ khi chọn trong Cài đặt.
- Chưa thử thật bằng tiền: một chuỗi 2 lần sửa trên iPhone (xem có nét hơn không). Hội thoại cũ (trước v8) chưa có meta -> không gộp.

## OWED (promised, not done)
- (none) — Lợi link made 2026-11-08 (LINKS.local.txt).
- (none)

## Next step
- New person: create a CheapAI sub-key with a spending limit (dashboard, needs his login) -> `node scripts/invite.mjs "<name>" <subkey>` -> send the link.
- Change web/ -> bump web/sw.js VERSION -> `sh scripts/deploy.sh`.
