# @masoi/server — authoritative server (Phase 1, v0)

Server-authoritative + **MC tự động** cho Ma Sói, theo hướng B (xem `PHASE1_STACK_MaSoi.md`).
Dùng lại `@masoi/engine`. Đây là **bản v0 nền tảng** — chạy được, có test — chưa phải Phase 1 hoàn chỉnh.

## Kiến trúc

- `src/room.js` — **logic phòng thuần, không phụ thuộc transport**. Giữ toàn bộ state, tự chạy vòng
  đêm → sáng → vote → treo → kiểm thắng. Chỉ gửi cho mỗi client đúng "view" của họ.
- `src/index.js` — lớp vỏ **WebSocket** (`ws`) bơm message vào/ra `Room`.
- `test/room.test.js` — test headless: dựng phòng, chạy trọn 1 ván, kiểm "không lộ vai người khác".

Tách như vậy để test được toàn bộ luật/luồng **không cần mạng**; `ws` chỉ là adapter mỏng.

## Chạy

```bash
pnpm install
pnpm --filter @masoi/server start      # http + ws://localhost:8080
pnpm --filter @masoi/server test       # test headless
```

Hai client (server phục vụ tĩnh cùng cổng):
- `http://localhost:8080/player-ws.html` — **client 3D** (nền three.js, thẻ vai lật/nghiêng, avatar, chat, đếm ngược) — dùng chính.
- `http://localhost:8080/` (play.html) — client thử tối giản để debug.

## Giao thức (JSON qua WebSocket)

Client → server: `join {room,name}`, `start {counts}`, `action {action}`, `vote {target}`.
Server → client: `yourRole`, `state`, `scene`, `prompt`/`sleep`, `privateResult`, `morning`,
`voteOpen`/`voteTally`, `day`, `gameOver`, `error`. (Chi tiết trong `src/room.js`.)

## Đã có (v0)

- Chia bài + gửi `yourRole` riêng từng người (không lộ vai người khác).
- Vòng đêm tuần tự tự động gọi từng vai (dùng `buildNightSteps`), timeout tự bỏ qua.
- Bầy Sói bỏ phiếu → chốt theo đa số; Cô Bé Ti Hí auto theo xác suất cấu hình.
- Sáng phân giải, ngày thảo luận → vote → treo; tự xử Hoàng Tử/Kẻ Ngốc/Kẻ Điên/Sói Thợ Săn (qua engine).
- Kiểm thắng, kết thúc, lộ bài.

## Đã có thêm

- Chat 3 kênh do server kiểm soát tầm nhìn; reconnect bằng session token.
- Thông báo công khai KHÔNG lộ vai (chỉ tên); vai chỉ lộ khi kết thúc.
- **Bền bỉ mức nhẹ:** snapshot phòng ra `data/rooms.json` (autosave + lưu khi tắt), tự nạp lại khi
  khởi động → restart không mất ván đang chơi. Chạy `pnpm --filter @masoi/server dev` để tự nạp lại khi sửa code.

## Chưa có (Phase 2 — khi deploy)

- Bền bỉ đầy đủ: Redis (nhiều instance) + Postgres (tài khoản, lịch sử) — xem `PHASE1_STACK_MaSoi.md`.
- Tài khoản thật (Google/Apple) thay Anonymous.
- Đấu nối `player.html` sang WebSocket thay cho đọc Firebase trực tiếp.
- Luật auto-MC đầy đủ cho các bước từng-cần-MC (vd tinh chỉnh Cô Bé Ti Hí).
- (Khuyến nghị) chuyển sang TypeScript.
