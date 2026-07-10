# apps/server — (Phase 1)

Placeholder. Đây sẽ là **game server server-authoritative** ở Phase 1:

- Giữ toàn bộ state ván (không tin client).
- Chạy engine `@masoi/engine` phía server; **narrator tự động** (không cần người làm MC).
- Chỉ gửi cho mỗi client đúng "view" của họ — vai người khác không bao giờ rời server.
- Sự kiện dự kiến: `join`, `nightAction`, `vote`, `chat`, `reconnect`.

Stack sẽ chốt ở cuối Phase 0 (xem `CHECKLIST_Phase0_MaSoi.md`, mục 6):
- A. Firebase + Cloud Functions, hoặc
- B. Node + WebSocket + Redis + Postgres.

Chưa có code — dựng ở Phase 1.
