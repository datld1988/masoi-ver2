# Chốt stack Phase 1 — Ma Sói Online

> Văn bản quyết định kiến trúc cho Phase 1 (server-authoritative + MC tự động).
> Tham chiếu: `ROADMAP_MaSoi_Online_ThuongMai.md`, `CHECKLIST_Phase0_MaSoi.md`.

---

## 1. Mục tiêu Phase 1 (nhắc lại)

1. **Server là trọng tài** — toàn bộ state ván nằm ở server; client không bao giờ nhận vai của người khác.
2. **MC tự động** — server tự dẫn ván (gọi vai, đếm giờ, phân giải), không cần một người làm quản trò.
3. **Reconnect mượt** — rớt mạng vào lại đúng trạng thái.

Điểm cốt lõi khiến kiến trúc phải đổi: hiện tại máy MC là nguồn sự thật (host-authoritative) → MC
thấy/sửa được hết. Phase 1 chuyển "nguồn sự thật" đó vào server.

---

## 2. Hai hướng cân nhắc

### Hướng A — Firebase + Cloud Functions
Giữ Firebase (Auth, Realtime DB, Hosting). Logic engine chạy trong Cloud Functions; client gọi
"callable function" để hành động, function validate rồi chỉ ghi phần dữ liệu được phép; client vẫn
nghe Realtime DB.

### Hướng B — Server riêng Node + WebSocket
Một tiến trình Node chạy liên tục, giữ state ván trong bộ nhớ (và/hoặc Redis), tự chạy vòng đêm bằng
timer, đẩy "view riêng" cho từng client qua WebSocket. Dùng lại thẳng `@masoi/engine`.

### So sánh

| Tiêu chí | A. Firebase + Functions | B. Node + WebSocket |
|---|---|---|
| Dùng lại hạ tầng sẵn có | Cao (đang dùng Firebase) | Trung bình (giữ được Hosting/Auth) |
| Chạy engine dùng lại | Được (trong Function) | Được (require thẳng) |
| Vòng đêm có hẹn giờ (auto-MC) | **Khó** — Functions không giữ trạng thái, phải nhờ Cloud Tasks/Scheduler để hẹn giờ | **Tự nhiên** — timer sống trong tiến trình |
| Độ trễ | Có cold-start | Thấp, ổn định |
| Chi phí | Trả theo lượt gọi + đọc/ghi | Trả theo thời gian VM (nhỏ) |
| Gánh nặng vận hành | Ít (serverless) | Có (host + theo dõi tiến trình) |
| Hợp với game "có nhịp đêm/ngày" | Trung bình | **Cao** |

---

## 3. Khuyến nghị: Hướng B (bản gọn) — *lai với Firebase*

**Vì sao B:** Ma Sói là game **theo lượt, có nhịp đêm/ngày và hẹn giờ**, không phải realtime tần số cao.
Trái tim của "MC tự động" là một **máy trạng thái có timer** — thứ này sống tự nhiên trong một tiến
trình Node chạy liên tục, còn Cloud Functions (không trạng thái) phải chắp vá thêm scheduler nên rối.
B cũng dùng lại `@masoi/engine` trực tiếp, đúng lý do ta đã tách engine ở Phase 0.

**Bản gọn để không nặng vận hành:**

- **Giữ Firebase Hosting** phục vụ client tĩnh (host.html/player.html) — không đổi.
- **Giữ Firebase Anonymous Auth** làm danh tính tạm (nâng cấp tài khoản thật ở Phase 2).
- **Thêm 1 server Node + WebSocket** là nơi authoritative: giữ state, chạy auto-MC, đẩy view riêng.
- **State trong bộ nhớ trước** (một `Map<roomCode, GameState>`); chỉ thêm **Redis** khi cần nhiều
  instance hoặc khôi phục sau sập.
- **Postgres** cho tài khoản, lịch sử ván, thống kê — thêm khi sang Phase 2 (chưa cần ngay).
- **Host server ở nền tảng managed** (Render / Railway / Fly.io) để khỏi quản VM thô.

> Tóm lại: **Firebase Hosting + Auth (giữ) + Node WebSocket server (mới, authoritative) + bộ nhớ →
> Redis/Postgres khi cần.** Bắt đầu nhỏ, mở rộng dần.

Thư viện gợi ý: `ws` (nhẹ) hoặc `socket.io` (tiện reconnect/room). TypeScript để bắt lỗi sớm.

---

## 4. Sơ đồ "view riêng cho từng client"

```
                 ┌───────────────────────────────┐
                 │   Node WebSocket Server        │
                 │   (authoritative, auto-MC)     │
                 │                                │
                 │   GameState đầy đủ:            │
                 │   - vai TẤT CẢ người chơi      │
                 │   - hành động đêm, phiếu       │
                 └───────────────────────────────┘
                    │ chỉ đẩy phần được phép:
      ┌─────────────┼───────────────┬───────────────┐
      ▼             ▼               ▼               ▼
 ┌─────────┐   ┌─────────┐    ┌─────────┐     ┌─────────┐
 │ Sói A   │   │ Tiên Tri│    │ Dân B   │     │ (đã chết)│
 │ thấy:   │   │ thấy:   │    │ thấy:   │     │ khán giả │
 │ vai mình│   │ vai mình│    │ vai mình│     │ + kênh   │
 │ + đồng  │   │ + kết   │    │ (không  │     │ âm phủ   │
 │ bọn Sói │   │ quả soi │    │ biết ai)│     │          │
 └─────────┘   └─────────┘    └─────────┘     └─────────┘
```

Nguyên tắc vàng: **vai người khác không bao giờ rời server.** Mỗi client chỉ nhận đúng "view" của mình.

---

## 5. Danh sách sự kiện (WebSocket messages)

### Client → Server
- `createRoom { settings }` — người mở phòng chọn số vai/thời gian (không phải MC god-view).
- `joinRoom { code, name }`
- `startGame` — người mở phòng bấm bắt đầu; từ đây **server** dẫn ván.
- `nightAction { stepType, targets | heal/poison }`
- `vote { targetId }`
- `chat { channel, text }` — channel: main | wolf | dead
- `dm { text }` — nhắn riêng (nếu vẫn giữ vai điều phối) hoặc gỡ bỏ khi full auto-MC
- `reconnect { sessionToken }`

### Server → Client (đẩy view riêng)
- `roomState { players[public], phase, nightNo/dayNo, aliveCount }`
- `yourRole { role, mates?, lover? }` — **riêng từng người**
- `prompt { stepType, options, deadline }` — chỉ gửi cho người tới lượt
- `sleep` — gửi cho người không có lượt (không lộ ai đang hành động)
- `morning { publicLines }` + `privateResult { text }` (vd kết quả Tiên Tri)
- `voteOpen`, `voteTally { ... }`
- `chatMsg { channel, from, text }`
- `gameOver { winner, reveal }`
- `error { message }`

---

## 6. Luồng một đêm chạy tự động (máy trạng thái auto-MC)

```
startGame
  → E.createGame + E.dealInfo   → gửi yourRole cho từng người
  → LẶP mỗi đêm:
      buildNightSteps
      với mỗi bước (hoặc theo "đợt" song song):
        gửi prompt cho người có lượt, gửi sleep cho người khác
        đặt timer (vd 60s)
        nhận nightAction → validate bằng engine → ghi vào nightData
        hết giờ hoặc đủ hành động → sang bước kế
      E.resolveMorning → broadcast morning + privateResult
      nếu checkWin → gameOver, dừng
      BAN NGÀY:
        mở thảo luận (timer) → voteOpen
        nhận vote → E.tallyVotes → E.resolveHang
        tự xử Hoàng Tử/Kẻ Ngốc/Kẻ Điên/Sói Thợ Săn theo engine
        nếu checkWin → gameOver
      E.nextNight
```

**Quyết định cần chốt cho auto-MC:** vài bước trước đây do MC phán (vd Cô Bé Ti Hí có bị bắt gặp không).
Khi không có MC, server phải có **luật rõ ràng** thay cho phán đoán — ví dụ: xác suất cố định, hoặc
theo hành vi (Cô Bé "bị bắt" nếu nhìn trộm khi ít Sói...). Cần định nghĩa và đưa vào engine trước khi
bỏ hẳn vai MC.

---

## 7. Kế hoạch di trú (từ host-authoritative hiện tại)

1. **1a — Dựng server, giữ client gần như cũ.** Chuyển phần "điều phối" trong `host.html` thành logic
   server (dùng cùng `@masoi/engine`). `player.html` đổi từ đọc thẳng Firebase sang nhận message
   WebSocket. God-view của MC thành công cụ admin tùy chọn.
2. **1b — Bỏ vai MC.** Thay các bước cần MC phán bằng luật tự động (mục 6). Server tự dẫn trọn ván.
3. **1c — Reconnect + bền bỉ.** Cấp session token; rớt mạng vào lại nhận đúng view. Thêm Redis nếu cần
   khôi phục sau sập server.

Giữ nguyên Firebase Hosting/Auth suốt Phase 1; chỉ chuyển "nguồn sự thật" sang server.

---

## 8. Rủi ro & lưu ý

- **Auto-MC cần luật thay phán đoán con người** — phần dễ bị bỏ sót (xem mục 6).
- **Chi phí server chạy liên tục** — dùng VM nhỏ/managed, bật auto-sleep khi không có phòng nếu nền
  tảng hỗ trợ.
- **Đồng bộ engine** — engine giờ là `@masoi/engine` dùng chung server + client; mọi đổi luật chạy
  `pnpm test` trước.
- **Bảo mật** — validate MỌI hành động ở server, không tin client; chỉ đẩy view được phép.

---

## 9. Quyết định

- [ ] **Chốt hướng:** ___ (khuyến nghị: B bản gọn — Firebase Hosting/Auth + Node WebSocket server)
- [ ] Chọn thư viện: `ws` hay `socket.io`
- [ ] Chọn nền tảng host server: Render / Railway / Fly.io
- [ ] Định nghĩa luật auto-MC cho các bước từng-cần-MC
- [ ] Người quyết định: ___  · Ngày: ___
