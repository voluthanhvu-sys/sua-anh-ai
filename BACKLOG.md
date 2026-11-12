# BACKLOG — every operator request, noted the moment it is given

Format: `- [ ] YYYY-MM-DD HH:MM — request — status/notes`  (tick `[x]` when done, `[-]` when dropped).
Newest at the bottom. Grep, don't read whole.

## Open
- [x] 2026-11-08 — iOS app (web app OK), simple: edit any photo however he likes via the OpenAI API instead of the ChatGPT app — v1 PWA done, waiting real-key test
- [x] 2026-11-08 — dùng API CheapAI — default provider; real paid edit waits for his OK
- [x] 2026-11-08 — cài sẵn, chỉ cần vào link là dùng — live on GitHub Pages, key in link
- [x] 2026-11-08 — app riêng tư, chỉ người anh cấp mới dùng — lock screen + per-person sub-key links
- [x] 2026-11-08 — cấp link cho Lợi, hạn mức $3 — DONE (key Loi works for chat + image), was waiting: he creates CheapAI sub-key "Loi" ($3) at cheapai.io/en/keys (no dashboard login here), then node scripts/invite.mjs "Lợi" <key>
- [x] 2026-11-08 — tích hợp model chat + model ảnh như ChatGPT thật (chat hỗ trợ + chỉnh ảnh) — v6 chat app live
- [x] 2026-11-12 — hỏi cửa sổ ngữ cảnh; app chỉ thấy 2 ảnh gần nhất; sửa nhiều lần trên 1 ảnh thì ảnh sau càng nhòe — đã chẩn đoán (30 tin, 2 ảnh người dùng 768px, bot không thấy ảnh nó sửa; nhòe = vẽ lại chồng lớp + medium + 1024-1536px). 12/11 anh ĐỒNG Ý sửa (2) sửa từ ảnh gốc + gộp yêu cầu, (3) high mặc định khi sửa; (1) số ảnh/số tin đang hỏi giá, chưa sửa code ("trả lời tôi trước chưa cần sửa code"). Em đề xuất 300 tin + tóm tắt phần cũ, 20 ảnh (10 mới 1024px + 10 cũ 512px); 12/11 anh CHỐT LÀM cả gói (300 tin + tóm tắt, 20 ảnh 2 mức, sửa từ gốc, high khi sửa) — XONG v8, e2e PASS, deployed
- [ ] 2026-11-12 — thử so sánh high vs medium (tiền thật, anh OK) trên ảnh bé sinh nhật 1 tuổi; prompt gốc: gọn nền, bỏ chi tiết thừa, màu tươi sáng, giữ nguyên nhân vật/đường nét em bé — XONG: high ~$0.078 vs medium ~$0.016, nhìn gần như nhau (medium tươi hơn); nhãn giá sửa (v9); anh chốt "đổi về mức vừa" -> v10 XONG
- [x] 2026-11-12 — thêm chú thích phiên bản vào app để biết đã cập nhật chưa — v11: "Phiên bản v11 · 12/11/2026" ở màn chào, menu, Cài đặt
- [ ] 2026-11-12 — app ghim màn hình iPhone không tự cập nhật, phải xoá + dán link lại — v12 tự kiểm bản mới mỗi lần mở + tự tải lại; chờ thử ở bản kế tiếp (v13) trên iPhone

## Done / Dropped
