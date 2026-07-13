# CLAUDE.md — Dự án Ma Sói (Werewolf) online

Hướng dẫn cho các phiên làm việc sau. Repo có **hai nhánh sản phẩm song song** dùng chung logic game.

## Tổng quan

Ma Sói (Werewolf) chơi online. Mục tiêu dài hạn: thương mại hoá (xem `ROADMAP_MaSoi_Online_ThuongMai.md`, `PHASE1_STACK_MaSoi.md`, `CHECKLIST_Phase0_MaSoi.md`). Ngôn ngữ giao tiếp & UI: **tiếng Việt**. 22 vai (roles).

Hai nhánh:

1. **Bản WS (mới, chính) — `apps/server/`**: Node + WebSocket, **server-authoritative**, **MC tự động** (không cần người dẫn). Đây là nhánh đang phát triển tích cực. Deploy trên Render.
2. **Bản Firebase (cũ) — `masoi-online/`**: host-authoritative, một người làm **MC** (host.html) dẫn ván, người chơi vào player.html. Web tĩnh + Firebase Realtime DB. Vẫn deploy tại `masoi-online-9e660.web.app` (prod) và project `masoi-staging`. Dùng làm **tham chiếu UI/UX** ("bản offline rất tường minh") khi làm bản WS.

Ngoài ra: `MaSoi_QuanTro*.html` = app MC offline gốc (một file); `masoi-android/` = vỏ Capacitor.

## Cấu trúc monorepo (pnpm workspaces)

```
packages/engine/     @masoi/engine — logic thuần, KHÔNG DOM/Firebase (src/engine.js)
apps/server/         @masoi/server — Node + ws, server-authoritative, auto-MC
  src/index.js         HTTP tĩnh + WebSocket cùng cổng; create/join/resume/listRooms; persistence
  src/room.js          class Room — toàn bộ vòng chơi (đêm/ngày/vote/lịch sử)
  public/player-ws.html  client 3D (deliverable chính)
  public/play.html, role-art.js
apps/web/            (chỗ cho web app tương lai)
masoi-online/        bản Firebase cũ (engine.js, host.html, player.html, role-art.js)
```

- `pnpm-workspace.yaml`: `packages/*`, `apps/*`. Root `package.json` script `start` = `pnpm --filter @masoi/server start`.
- Engine export CommonJS (`module.exports = MaSoiEngine`), server import ESM `import E from '@masoi/engine'`. API chính: `ROLES, WOLF_IDS, roleOf, createGame, buildNightSteps, newNightData, applyNightAction, resolveMorning, resolveHang, applyRevenge, nextNight, checkWin, tallyVotes`.

## Kiến trúc bản WS (`apps/server`)

- **`Room`** (transport-agnostic) điều khiển `@masoi/engine`. Nhận `{ id, send }` — `send(pid,msg)` do index.js cung cấp (bơm qua WebSocket).
- **Danh tính & reconnect**: mỗi người có `token` (= playerId) ổn định; client lưu để `resume` vào lại đúng trạng thái.
- **Persistence**: snapshot phòng ra `apps/server/data/rooms.json` (`serialize()/restore()/rearm()`), nạp lại khi khởi động, lưu khi SIGINT/SIGTERM. Ổ đĩa tạm trên Render → **mất khi redeploy** (tránh redeploy giữa ván).
- **Vòng chơi**: `start()`→ đêm (`promptForActor`/wave song song, kể cả Phù Thủy mù)→ `morning()`→ `startDay()`→ vote→ `closeVote()`→ lặp; `gameOver()`.
- **Lobby/phòng**: `ownerId` (chủ phòng), `password`, `setReady()`, `leave()`, `broadcastLobby()`; owner reassignment khi chủ rời.
- **Chống lộ vai**: thông báo công khai ban đêm/ngày (`morning`/`closeVote`) **chỉ hiện tên**, KHÔNG lộ vai. Vai chỉ lộ khi **kết thúc ván** (reveal + lịch sử chi tiết).

### Lịch sử ván (quan trọng — giống bản offline)

- `Room.history` gom từng đêm/ngày. Server dựng **có cấu trúc + kèm vai**:
  - Đêm: `{ type:'night', no, actions:[...], deaths:[{name,role}] }`. `actions` dựng bằng `nightEvents()` **TRƯỚC `resolveMorning`** (vai đúng thời điểm hành động), mỗi dòng kèm vai mục tiêu, vd `🔮 Tiên Tri soi Ba (Ma Sói) → 🔴 MA SÓI`, `🛡️ Bảo Vệ bảo vệ: Dung (Bảo Vệ)`, Cupid/Sói/Bác Sĩ/Phù Thủy cứu·độc/Thợ Săn/Sát Nhân.
  - Ngày: `{ type:'day', no, target:{name,role}|null, votes:[...], blocked, joker, dragged }`. `votes` = bảng phiếu (`"Tên: N phiếu"`).
- Gửi trong `gameOver`: `{ t:'gameOver', winner, desc, reveal, history }`.
- Client `renderFinalHistory()` (player-ws.html): **thẻ gập được** (`histCard()`, click header toggle, có ▼). Đảo `history` về thứ tự thời gian (server đẩy mới nhất lên đầu). Đêm → deaths ở header + actions ở body; Ngày → người bị treo(vai) ở header + bảng phiếu ở body.
- Trong trận vẫn dùng `renderHist()` (tóm tắt, không lộ vai).

## Chạy & test

```bash
pnpm install
pnpm start                    # server: http://localhost:8080  ·  ws://localhost:8080
# client: http://localhost:8080/player-ws.html
pnpm test:engine              # vitest cho @masoi/engine
pnpm --filter @masoi/server test          # vitest: auto-MC Room (22 vai + cơ chế)
node apps/server/test/run.mjs             # ^ chạy KHÔNG cần vitest (Node thuần)
```

### Test auto-MC (`apps/server/test/`)

- `harness.mjs` — drive trọn ván bằng **scheduler giả** (chủ động kích timer) + **bot** sinh hành động đêm hợp lệ cho mọi stepType + điều phối vote. Room nhận `{ send, scheduler }` giả nên chạy được dưới Node thuần, không cần WebSocket.
- `scenarios.mjs` — 37 kịch bản (định nghĩa 1 lần qua `defineTests(t)`): **[1]** chạy trọn ván cho **từng vai trong 22 vai** (assert kết thúc, winner hợp lệ, reveal/history đủ, KHÔNG lộ vai trong trận); **[2]** cơ chế nền (Sói bầu đa số, Bảo Vệ chặn, Phù Thủy độc qua prompt, waveTimeout, resume giữa đêm, lịch sử kèm vai + bảng phiếu); **[3]** kết quả đặc thù (Kẻ Điên/Prince/Kẻ Ngốc/Sói Thợ Săn/Trưởng Làng ×2/Kẻ Nguyền Rủa/Sói Con/Tập Sự/Sát Nhân).
- Hai adapter dùng chung `scenarios.mjs`: `room.roles.test.js` (vitest) và `run.mjs` (Node thuần).
- **Lưu ý sandbox**: vitest KHÔNG chạy được trong sandbox Linux (native binary của rollup là bản Windows) và mount hay cắt cụt `apps/server/package.json`. Cách xác minh trong sandbox: copy `engine.js`→`engine.cjs`, `room.js`→`room.mjs` (đổi import), rồi `node run.mjs`.

Chơi: mở `player-ws.html`, tạo/vào phòng (tên + mật khẩu), chủ phòng đặt số vai → Bắt đầu. Server tự dẫn ván.

## Phase 2 — Tài khoản, matchmaking, xếp hạng (đã hoàn thành)

Commit: `d44f9a6` — "Phase 2: Firebase Auth, Quick Match, Invite Link, ELO, Ban/Report"

### Đã làm

| Tính năng | Vị trí |
|---|---|
| Google Sign-in (Firebase compat SDK v10) + chơi khách | `player-ws.html` (scrAuth section) |
| Firebase Admin tùy chọn: graceful fallback khi chưa cấu hình | `index.js` — `resolveIdentity()` |
| Hồ sơ người dùng: elo (K=32), gamesPlayed, wins, winsByTeam | `index.js` — `upsertUser()`, `recordResult()` |
| Quick Match: tìm phòng public tốt nhất hoặc tạo mới | `index.js` — case `quickMatch` |
| Invite link: copy URL `?room=CODE`, auto-điền khi load | `player-ws.html` — `copyInviteLink()` |
| Bảng xếp hạng `/leaderboard` (public, top 20 theo ELO) | `index.js` — HTTP `/leaderboard` |
| Ban/Report: report trong trận, admin ban UID qua HTTP | `index.js` — `bannedUIDs`, `reportLog` |
| Admin endpoints: `/admin/reports|ban|unban|users` (cần `ADMIN_KEY`) | `index.js` |
| Rate limiting: 30 kết nối/phút/IP | `index.js` — `checkRate()` |
| Persistence: `data/users.json`, `data/bans.json`, `data/reports.json` | `index.js` — load/save* |
| Toast notifications thay alert | `player-ws.html` — `showToast()`, `#toast` CSS |
| Report ⚑ button trên tile người chơi (trong trận, không self) | `player-ws.html` — `reportPlayer()` |

### Env vars cần thiết

| Var | Môi trường | Giá trị |
|---|---|---|
| `FIREBASE_KEY_FILE` | local dev (`.env.local`) | đường dẫn tới file JSON service account |
| `FIREBASE_SERVICE_ACCOUNT` | Render/prod | toàn bộ nội dung JSON service account (paste vào dashboard) |
| `ADMIN_KEY` | cả hai | chuỗi bí mật để gọi `/admin/*` |

Local dev: `pnpm run start:local` (dùng `--env-file=.env.local`). File `.env.local` gitignored.

### Chưa làm trong Phase 2

- Đăng nhập Apple / email / phone (chỉ có Google)
- Lịch sử trận per-user (xem lại ván cũ của mình)
- Chống multi-account nâng cao (hiện chỉ lưu UID Firebase)

### Gotchas Firebase

- `resolveIdentity()` trong `index.js`: khi `adminAuth = null` (chưa cấu hình FIREBASE_SERVICE_ACCOUNT), server **bỏ qua** idToken và cấp guest ID — KHÔNG được reject → vẫn chơi được mà không có stats.
- `onGameOver` callback trong `Room` constructor: gọi `recordResult` rồi `scheduleSaveUsers()`. Room truyền `reveal[i].team` để tính ELO theo phe.
- Firebase compat SDK (v10.14.1, CDN) — KHÔNG dùng modular SDK để tránh bundle phức tạp.

---

## Deploy

- **Bản WS → Render** (KHÔNG dùng Firebase — Firebase chỉ chạy web tĩnh). Có `render.yaml` (Blueprint), build `corepack enable && pnpm install`, start `pnpm start`, dùng `process.env.PORT`. Cập nhật = `git push` → Render autoDeploy. Chi tiết + xử lý sự cố + chống cold-start: `DEPLOY_Server.md`.
- Thay đổi **server (room.js/index.js/engine)** → **phải redeploy/restart**. Thay đổi **chỉ client** (`player-ws.html`) → chỉ cần Ctrl+F5. Lịch sử cuối trận dựng ở server nên đổi nó = phải redeploy.
- **Bản Firebase → `firebase deploy`** (chạy trong thư mục `masoi-online/`), aliases `masoi` (prod `masoi-online-9e660`) và `masoi-staging`.

## Phase 3 — Việc tiếp theo (bắt buộc để lên store)

1. **Kiểm duyệt chat**: lọc từ ngữ tục/thô (badword list hoặc AI moderation), block user
2. **Age-gate**: xác nhận tuổi ≥13/≥18 tùy thị trường trước khi chat
3. **ToS + Privacy Policy** chính thức (App Store / Play Store bắt buộc)
4. Cơ chế xóa dữ liệu theo yêu cầu (GDPR / Nghị định 13/2023 VN)

---

## Quy ước & lưu ý (gotchas)

- **Mount staleness trong sandbox**: bash đôi khi đọc file bị **cắt cụt / cũ** (vd `package.json` truncated, `node --check` lỗi giả). File Windows thật (qua Read/Edit) mới đúng. Cách xác minh logic: **tách hàm ra `/tmp` chạy Node với mock** thay vì tin bản mount.
- **Git push từ sandbox thường thất bại** (không có credential GitHub, `.git` unlink "Operation not permitted"). Commit local vẫn được; **push từ máy Windows của người dùng**. Đặt `git config user.email/name` nếu commit báo thiếu identity.
- Cô Bé Ti Hí (`littlegirl`) **đã bỏ khỏi picker** ở bản auto-MC (không có cơ chế hé mắt).
- Bug đã sửa (đừng lặp lại): Phù Thủy phải **transactional** (validate cả cứu+độc trước khi mutate); màn Bảo Vệ/nạn nhân không được để lộ ai là Sói; Cupid chọn đúng **2** người (`max` trong prompt); `leave()` lúc `ended` phải set `state=null` trước khi splice; lịch sử KHÔNG lộ vai trong trận.
- Người dùng thích **ngắn gọn, trực tiếp**, tiếng Việt; UI tường minh kiểu bản offline (tên vai đầy đủ, nhóm theo phe 🏡 Dân / 🐺 Sói / 🎭 Thứ Ba, cảnh báo dư vai).

## Tài liệu liên quan

`KienTruc_MaSoi_Online.md`, `ROADMAP_MaSoi_Online_ThuongMai.md`, `PHASE1_STACK_MaSoi.md`, `CHECKLIST_Phase0_MaSoi.md`, `DEPLOY_Server.md`, `Ma_Soi_20_Role_Nang_Cao.md`, `danh_sach_150_role_ma_soi.md`.
