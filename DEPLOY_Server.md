# Deploy server Ma Sói (Node + WebSocket) để chơi từ xa

> Áp dụng cho **bản mới** `apps/server` (server-authoritative + MC tự động + `player-ws.html`).
> KHÔNG dùng Firebase cho bản này — Firebase chỉ chạy web tĩnh, không chạy được server Node/WebSocket.
> Bản Firebase cũ (MC làm host) vẫn deploy riêng bằng `firebase deploy` như trước.

Server đã sẵn sàng deploy: dùng `process.env.PORT`, bind mọi interface, phục vụ luôn client tĩnh
(`player-ws.html`) cùng cổng, có `render.yaml` + script `pnpm start` ở gốc repo.

---

## Chuẩn bị (làm 1 lần)

1. `git push` toàn bộ code mới nhất lên GitHub.
2. (Khuyên) tạo lockfile cho build ổn định: chạy `pnpm install` một lần ở máy rồi commit `pnpm-lock.yaml`.

---

## Cách 1 — Render (khuyên dùng)

### A. Dùng Blueprint (nhanh nhất, đọc `render.yaml`)
1. Vào https://render.com → đăng ký bằng GitHub.
2. Dashboard → **New → Blueprint** → chọn repo `masoi` → Render đọc `render.yaml` → **Apply**.
3. Đợi build + deploy (~2–4 phút). Xong sẽ có URL dạng `https://masoi-server.onrender.com`.

### B. Tạo thủ công (nếu không dùng Blueprint)
1. **New → Web Service** → connect repo `masoi`.
2. **Root Directory:** để trống (gốc repo).
3. **Runtime:** Node · **Plan:** Free.
4. **Build Command:** `corepack enable && pnpm install`
5. **Start Command:** `pnpm start`
6. (Advanced) thêm biến môi trường **NODE_VERSION = 20**.
7. **Create Web Service** → đợi deploy → lấy URL.

### Chơi
Gửi bạn bè link: **`https://<tên-của-bạn>.onrender.com/player-ws.html`**
- Một người: nhập mã phòng bất kỳ (vd `TEST`) + tên → Vào phòng → đặt số vai → **Bắt đầu**.
- Người khác: mở cùng link, nhập **cùng mã phòng** → vào chơi. Server tự dẫn ván (MC tự động).

Client tự dùng `wss://` cùng tên miền (HTTPS của Render) — bạn bè không phải chỉnh gì.

---

## Cách 2 — Railway (thay thế)

1. https://railway.app → **New Project → Deploy from GitHub repo** → chọn `masoi`.
2. Settings → **Build Command:** `corepack enable && pnpm install` · **Start Command:** `pnpm start`.
3. (Nếu cần) Variables → `NODE_VERSION=20`.
4. **Generate Domain** → được URL công khai → share `<URL>/player-ws.html`.

Railway có credit dùng thử; hết credit phải trả phí.

---

## Lưu ý gói miễn phí

- **Cold start (Render Free):** không ai truy cập ~15 phút thì service "ngủ"; request đầu tiên mất
  ~50s để dậy. Đang chơi thì không ảnh hưởng. Muốn luôn sẵn sàng: dùng dịch vụ ping giữ thức
  (UptimeRobot…) hoặc lên gói trả phí.
- **Ổ đĩa tạm:** file snapshot `data/rooms.json` **mất khi redeploy** (đẩy code mới). Tránh redeploy
  giữa ván. Muốn bền thật (khôi phục sau mọi lần restart, nhiều máy chủ) cần **Redis** — Phase 2.
- WebSocket + HTTPS/wss được hỗ trợ sẵn trên cả hai nền tảng.

## Giữ server luôn thức (chống cold-start)

Cách miễn phí, đơn giản: dùng **UptimeRobot** ping trang chủ mỗi 5 phút.
1. https://uptimerobot.com → tạo tài khoản.
2. **Add New Monitor** → Type: **HTTP(s)** → URL: `https://<tên>.onrender.com/` → Interval: **5 phút** → Create.

Vậy là có request đều đặn, service không "ngủ". (Lưu ý: giữ thức liên tục sẽ tiêu giờ chạy của gói
free nhanh hơn; nếu chơi theo hẹn giờ thì chỉ cần bật monitor quanh giờ chơi.)

## Xử lý sự cố build

- Nếu báo lỗi `corepack: command not found` → đổi **Build Command** thành:
  `npm i -g pnpm@9 && pnpm install`
- Nếu lỗi `@masoi/engine không tìm thấy` → chắc chắn **Root Directory để trống** (gốc repo), không
  đặt là `apps/server` (đặt vậy sẽ mất workspace symlink tới engine).
- Nếu build kêu thiếu lockfile với `--frozen-lockfile` → dùng `pnpm install` (không `--frozen`), hoặc
  commit `pnpm-lock.yaml`.

## Cập nhật sau này
Chỉ cần `git push` — Render/Railway tự build lại (autoDeploy). Nhớ báo bạn bè tải lại trang.
