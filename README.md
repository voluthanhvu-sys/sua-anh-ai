# AI Project Starter

Khung dự án để AI nào nhận việc cũng: tiết kiệm quota, nhớ việc đang làm, ghi chép quy trình.

## Dùng thế nào
1. Copy cả thư mục này thành dự án mới (đổi tên thư mục).
2. Điền mục 0 trong `AGENTS.md` (tên, mục tiêu, công nghệ, ngôn ngữ trả lời).
3. `git init` rồi commit lần đầu.
4. Bảo AI: "đọc AGENTS.md rồi làm ...".

## Các file
| File | Vai trò |
|---|---|
| `AGENTS.md` | Luật duy nhất cho mọi AI: thứ tự đọc, tiết kiệm quota, ghi nhớ, bàn giao |
| `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md` | Chỉ trỏ về AGENTS.md (Claude, Gemini, Cursor, Copilot; Codex đọc AGENTS.md sẵn) |
| `NOW.md` | Đang làm gì, còn nợ gì — viết đè cuối mỗi phiên, tối đa 40 dòng |
| `BACKLOG.md` | Mọi yêu cầu của anh, ghi ngay lúc anh nói |
| `LOG.md` | Nhật ký từng phiên, chỉ thêm, AI chỉ đọc mục cuối |
| `docs/knowledge.md` | Bài học, quyết định, việc bỏ — có ngày, không bao giờ tóm gọn mất |
| `CODEMAP.md` | Code nằm ở đâu (AI tìm, không đọc hết) |
| `VALIDATION.md` | Cách kiểm thử |
| `scripts/check.mjs` | Máy kiểm quy trình (thiếu file, NOW quá dài, mục không ngày...) |
| `.claude/settings.json` | Hook Claude Code: đầu phiên tự in NOW + log cuối; cuối lượt nhắc cập nhật NOW/LOG nếu có sửa file |

## Vì sao tiết kiệm quota
- AI đọc NOW.md (ngắn) thay vì đọc lại cả dự án.
- File tra cứu thì tìm theo từ khoá, không đọc hết.
- Mỗi điều chỉ ghi một chỗ, không chép trùng.
- Lỗi lặp lại thì biến thành máy kiểm, AI không phải nhớ.
