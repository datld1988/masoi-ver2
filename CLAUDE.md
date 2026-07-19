# CLAUDE.md — Dự án Ma Sói (Werewolf) online

Hướng dẫn cho các phiên làm việc sau. Repo có **hai nhánh sản phẩm song song** dùng chung logic game.

## Tổng quan

Ma Sói (Werewolf) chơi online. Mục tiêu dài hạn: thương mại hoá (xem `ROADMAP_MaSoi_Online_ThuongMai.md`, `PHASE1_STACK_MaSoi.md`, `CHECKLIST_Phase0_MaSoi.md`). Ngôn ngữ giao tiếp & UI: **tiếng Việt**. **65 vai (roles)** — nguồn tham chiếu: `MaSoi_QuanTro.html` (bản offline MC).

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
- Engine export CommonJS (`module.exports = MaSoiEngine`), server import ESM `import E from '@masoi/engine'`. API chính: `ROLES, WOLF_IDS, BITING_WOLF_IDS, SEER_RED_IDS, HAS_NIGHT_ACTION, roleOf, createGame, buildNightSteps, newNightData, applyNightAction, resolveMorning, resolveHang, applyRevenge, applyAvengerCurse, nextNight, checkWin, tallyVotes`.

## Kiến trúc bản WS (`apps/server`)

- **`Room`** (transport-agnostic) điều khiển `@masoi/engine`. Nhận `{ id, send }` — `send(pid,msg)` do index.js cung cấp (bơm qua WebSocket).
- **Danh tính & reconnect**: mỗi người có `token` (= playerId) ổn định; client lưu để `resume` vào lại đúng trạng thái.
- **Persistence**: snapshot phòng ra `apps/server/data/rooms.json` (`serialize()/restore()/rearm()`), nạp lại khi khởi động, lưu khi SIGINT/SIGTERM. Ổ đĩa tạm trên Render → **mất khi redeploy** (tránh redeploy giữa ván).
- **Vòng chơi**: `start()`→ đêm (`promptForActor`/wave song song, kể cả Phù Thủy mù)→ `morning()`→ `startDay()`→ vote→ `closeVote()`→ lặp; `gameOver()`.
- **`resolveMorning` trả về** `{ deaths, publicLines, secretLines, events, privateResults, win }`. `privateResults` = mảng `{pid, msg}` — tin nhắn riêng per-player (kết quả soi của Sorcerer, Wolf Seer, v.v.), `room.morning()` xử lý và `send()` đến từng người.
- **`buildNightSteps` thứ tự** (40+ bước): wolf → littlegirl → gatekeeper → bigbadwolf → whitewolf → wolfseer → sorcerer → hypnowolf → hellhound → poisonwolf → direwolf(n1) → cursedwolf → minion(n1) → deserter(n1) → copycat(n1) → cupid(n1) → wildchild(n1) → doppelganger(n1) → bountyhunter(n1) → hoodlum(n1) → challenger(n1) → balancer(n1) → assassin → hunter → bodyguard → doctor → icewitch → switcher → tracker → seer → fox → detective → graverobber(n2+) → gravedigger → medium → diplomat → hinter → blackmailer → fluteplayer → serialkiller → nighthunter → witch → priest → gunsmith → magistrate → survivor → queencard.
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
pnpm --filter @masoi/server test          # vitest: auto-MC Room (65 vai + cơ chế)
node apps/server/test/run.mjs             # ^ chạy KHÔNG cần vitest (Node thuần)
```

### Test auto-MC (`apps/server/test/`)

- `harness.mjs` — drive trọn ván bằng **scheduler giả** (chủ động kích timer) + **bot** sinh hành động đêm hợp lệ cho mọi stepType + điều phối vote. Room nhận `{ send, scheduler }` giả nên chạy được dưới Node thuần, không cần WebSocket.
- `scenarios.mjs` — 81 kịch bản (định nghĩa 1 lần qua `defineTests(t)`): **[1]** chạy trọn ván cho **từng vai trong 65 vai** (assert kết thúc, winner hợp lệ, reveal/history đủ, KHÔNG lộ vai trong trận); **[2]** cơ chế nền (Sói bầu đa số, Bảo Vệ chặn, Phù Thủy độc qua prompt, waveTimeout, resume giữa đêm, lịch sử kèm vai + bảng phiếu); **[3]** kết quả đặc thù (Kẻ Điên/Prince/Kẻ Ngốc/Sói Thợ Săn/Trưởng Làng ×2/Kẻ Nguyền Rủa/Sói Con/Tập Sự/Sát Nhân).
- Hai adapter dùng chung `scenarios.mjs`: `room.roles.test.js` (vitest) và `run.mjs` (Node thuần).
- **Lưu ý sandbox**: vitest KHÔNG chạy được trong sandbox Linux (native binary của rollup là bản Windows) và mount hay cắt cụt `apps/server/package.json`. Cách xác minh trong sandbox: copy `engine.js`→`engine.cjs`, `room.js`→`room.mjs` (đổi import), rồi `node run.mjs`.

Chơi: mở `player-ws.html`, tạo/vào phòng (tên + mật khẩu), chủ phòng đặt số vai → Bắt đầu. Server tự dẫn ván.

## 65 vai — mở rộng (đã hoàn thành)

Commit: `6b3831d` — "feat(engine+server): mở rộng từ 22 lên 65 vai — thêm 43 vai mới"

### Nhóm vai (65 tổng)

| Phe | Vai |
|---|---|
| 🐺 Sói (16) | Sói, Alpha Wolf, Cursed Wolf, Wolf Seer, Hellhound, Direwolf, Sorcerer, Hypnowolf, Big Bad Wolf, Poison Wolf, White Wolf, Sói Con, Gatekeeper, Minion, Deserter, Tập Sự |
| 🏡 Dân (37) | Dân, Tiên Tri, Bảo Vệ, Bác Sĩ, Phù Thủy, Thợ Săn, Cupid, Wild Child, Doppelganger, Lycan, Trưởng Làng, Bounty Hunter, Hoodlum, Hinter, Blackmailer, Challenger, Balancer, Avenger, Graverobber, Copycat, Ice Witch, Switcher, Tracker, Fox, Detective, Gravedigger, Medium, Diplomat, Flute Player, Serial Killer, Night Hunter, Priest, Gunsmith, Magistrate, Survivor, Queen Card, Bloody Mary, Lamb |
| 🎭 Thứ Ba (8) | Kẻ Điên, Prince, Kẻ Ngốc, Sát Nhân, Kẻ Nguyền Rủa, King, Thám Tử Riêng, Kẻ Thách Thức |
| ⚖️ Trung Lập (3) | Trung Lập 1, Trung Lập 2, Trung Lập 3 |

### Cơ chế đặc biệt (design decisions)

- **Deserter**: KHÔNG có trong `BITING_WOLF_IDS`. `actorsFor('wolf')` trong room.js kiểm tra `flags.deserterActive` — chỉ tham gia cắn khi **tất cả sói khác đã chết**.
- **Hellhound / Poison Wolf**: chết vào **sáng hôm SAU** (pending). Server lưu `hellhoundPending[]`, `poisonwolfPending[]`, xử lý đầu `resolveMorning` đêm tiếp.
- **Cursed Wolf**: chuyển mục tiêu thành sói tại `resolveMorning` (không ngay lập tức đêm đó). `cursedWolfUsed=true` sau lần dùng đầu.
- **Flute Player**: thắng khi **tất cả người sống (trừ bản thân)** đã bị mê hoặc (`flutedPlayers[]`). Kiểm tra trong `checkWin`.
- **Balancer**: thắng khi số **Dân sống == Sói sống** (balancer đang sống + `balancerPair[]` liên kết). Kiểm tra trong `checkWin`.
- **Priest / Gunsmith**: thiết kế offline là hành động ban ngày → trong auto-MC đơn giản hoá thành **hành động ban đêm** (chọn mục tiêu đêm, hiệu lực sáng hôm sau).
- **Magistrate**: offline là veto sau bỏ phiếu → auto-MC đơn giản hoá thành **bảo vệ đêm**: chọn người không thể bị treo ngày hôm sau (`magistrateVetoTarget`).
- **Avenger**: khi chết (ban ngày hoặc ban đêm), tự động random chọn 1 người sống để nguyền rủa — `avengerRevenge:N` trong events, xử lý trong `morning()`/`closeVote()`.
- **Bloody Mary**: khi bị sói cắn, giết 1 sói ngẫu nhiên đang sống (không track sói nào cụ thể vote cô ta trong auto-MC).
- **Hinter / Bounty Hunter**: tự xử lý trong `startNight()` (không có trong wave) — server gửi private message đầu đêm rồi bỏ qua step.
- **Graverobber**: `promptOptions(true)` trả về **tất cả người chết** (không chỉ đêm trước). Simplification đã biết.
- **Tracker**: dùng `HAS_NIGHT_ACTION` set để phát hiện ai dùng kỹ năng (xấp xỉ — không track hành động thực tế submitted).
- **privateResults**: `resolveMorning` trả về `privateResults: [{pid, msg}]`. `room.morning()` loop qua và `send()` đến từng player (kết quả soi Sorcerer, Wolf Seer, v.v.).
- **Challenger / Hoodlum / Bounty Hunter win**: "side win" — thông báo riêng cho player, game **tiếp tục** bình thường.

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

## UX/UI Lobby (player-ws.html) — đã refactor lớn

Toàn bộ ở `apps/server/public/player-ws.html` (client-only, không cần redeploy). Cấu trúc scrLobby: header row → `#lobbyList` (roster) → `#lobbyStatus` → `#ownerSetup` (hero card + timers + tabs + search+reset + `#roleGrid`) → `#rcMiniBar` (fixed) → `#memberWait` / `#readyRow`.

### Đã làm
- **Solo hero** khi `isOwner && players.length===1`: `renderRoster` render riêng — owner tile 150px float animation + 👑 crown wiggle + 3 slot placeholder pulse + hint "💫 Gửi 🔗 link mời cho bạn bè" (click chữ "link mời" gọi `copyInviteLink()`). Bỏ text "Chưa có thành viên khác vào."
- **Hero card cấu hình**: gradient tím, 3 stat cột (👥/🐺/🏡), status warning màu vàng, nút Bắt đầu gradient đỏ→tím. Nút "✨ Gợi ý bộ vai" set cả `roleCounts.villager` = phần dư.
- **Timer bar**: label 🌙 Đêm / 💬 Thảo luận / 🗳 Vote (input `width:32px !important` để không chiếm full-width).
- **Tab filter theo phe** (`#rcTabs`): ✨ Tất cả / 🏡 Làng / 🐺 Sói / 🎭 Thứ Ba / ⚖️ Trung Lập, mỗi tab kèm số vai đã chọn. `flex-wrap:wrap; justify-content:center` để 3+2 hàng cân đối.
- **Search + Reset**: input tìm dùng `noDiacritics()` (`NFD` + strip combining marks + đ↔d) — gõ không dấu ra kết quả có dấu. Nút `↺ Reset` xóa toàn bộ `roleCounts`.
- **Grid vai** `#roleGrid`: `auto-fill minmax(130px,1fr)` — tự adapt 2-6 cột theo width. Mỗi card: badge count góc, icon 40px, tên, desc 3 dòng ellipsis + "Bấm để xem thêm ▾"/"Thu gọn ▴", footer `−/n/+`. Animation `cardIn` fade-in, `pulseHi` khi +, `badgePop` badge.
- **Section header** kèm counter `chosen/total đã chọn` bên phải.
- **Skeleton loading** 6 card shimmer khi chưa nhận `roles` từ server.
- **Empty state** khi search không match: icon 🔎 + text + nút "Xóa tìm kiếm".
- **Sticky mini-bar** `#rcMiniBar` (position:fixed top:0): stats + nút Bắt đầu (disabled sync với `#startBtn`). Toggle qua scroll listener trong `window.addEventListener('load')` — hiện khi `hero.getBoundingClientRect().bottom < 8 && setup.bottom > 100`.
- **Vai "Dân Làng"** hiển thị trong grid Phe Làng (như bản offline). `doStart()` cộng dồn `counts.villager = (counts.villager||0) + vil` (không override).
- **Mobile ≤500px**: grid `minmax(115px,1fr)`, nút `.rcStep` 34×34, icon card 44px, desc `-webkit-line-clamp:2`.
- **Desktop ≥1024px (P0)**: `main{max-width:1100px}`, `#scrLobby.two-col` grid 2 cột `340px | 1fr` — trái: roster+status, phải: ownerSetup (`grid-row:2/span 30`). Grid vai adapt lên `minmax(140px,1fr)` (5-6 cột). ≥1400px: 1280px. Toggle `.two-col` trong `renderLobby` khi `isOwner`. Auth/Join/Game màn giữ max-width nhỏ (`520/520/820px`).
- **iOS safe-area (P0)**: `env(safe-area-inset-*)` padding cho `header` (top+L+R), `main` (L+R+bottom), `#rcMiniBar` (top+L+R), `.statusbar` (`top:env(...)`).

### Còn lại (P1/P2) — chưa làm
- **P1 UX**: collapse phe headers (click header thu gọn), toggle "chỉ hiện đã chọn", preset templates ngoài "Gợi ý" (Cơ bản 8/Cân bằng 12/Full 20+), back-to-top FAB.
- **P2 App native**: Capacitor Haptics (rung khi bấm), Share API (thay `navigator.clipboard`), intercept hardware back Android (mở modal xác nhận), PWA manifest.json + adaptive icon, WS reconnect khi app resume từ background.

### Gotchas UI
- **Smart quotes trong HTML attributes** (`"` U+201C/D) làm parser vỡ — luôn dùng ASCII `"`. Có 1 dòng dùng smart quote trong nội dung tiếng Việt hiển thị (`listRooms` empty state) → OK vì trong text content, không phải attribute.
- **`.rc-tabs` phải `justify-content:center`** — không thì hàng 2 (Trung Lập lẻ loi bên trái) lệch.
- **`.roster.solo` cũ đã bỏ** — dùng `renderRoster` render solo hero HTML riêng, không dùng flex trên grid gốc (bị tile teo về 0).
- **`text-wrap:balance`** trong `.solo-hint` hỗ trợ Chrome/Safari mới; text đã rút ngắn để 1 dòng cho browser cũ.
- **Server đã bỏ filter `r.id!=='villager'`** khỏi `renderRoleTabs`/`renderRoleConfig` — vẫn giữ trong `updVillager` vì tính riêng `chosenVil` + `vilAuto`.

## UX/UI Mobile refactor + Bottom Nav + bug fixes (2026-07-18)

Bối cảnh: đối chiếu `improve/Danh_gia_UX_UI_Game_Ma_Soi_Mobile_Web_App.md` với code hiện tại. Đã làm gói **Phase A (quick wins)** + **B1 (Bottom Nav)** trong `player-ws.html` + fix vài bug server. B2/B3/C/D còn để hôm khác.

### Đã làm — client (`player-ws.html`)

- **Design tokens** (`:root`): `--gap-xs/sm/md/lg` (4/8/12/20), `--primary/--danger/--success/--info` (alias giữ `--accent/--red/--green` để không phá code cũ), `--touch:44px` (Apple HIG).
- **Touch targets ≥44px** trên `@media (max-width:640px)`: chat send/emoji/input, prompt confirm/skip, `.tava-skip-link`, `.ptile-report`, chat tab, `.hdr-btn` (34→40px), `.rcStep` (34→38px). `#chatIn` thêm `font-size:16px` chống iOS auto-zoom.
- **Roster in-game rõ hơn**: grid min 100→108px, `.ptile-dead-ov` 1.8→2.4rem + gạch chéo đỏ chéo tile chết, badge "BẠN" gradient trên `.ptile.me::before`.
- **Density mobile**: `.card` padding 14→12px, `main` gap 12→8px, `.sleep` padding gọn, title trong card gọn.
- **Solo hero mở rộng** cho N người (không chỉ solo): `if(!inGame && isOwner)` — big tile chủ phòng ở trên, others làm small tile 84px với status pill (`.solo-slot-status.ready/waiting/offline`), fill tối thiểu 3 slot bằng placeholder dashed. Hint link mời chỉ hiện khi `others<2`.
- **Owner tag ở grid thường** (view của non-owner in-lobby): 👑 `.ptile-crown` wiggle + viền vàng `.ptile.owner` + badge "👑 Chủ phòng" `.ptile-badge.owner`. Không hiện in-game để tránh nhiễu.

### Bottom Nav — B1

- `<nav id="bottomNav">` fixed bottom, safe-area, ẩn desktop `@media (min-width:1024px)`.
- **3 tab contextual** đổi theo phase + trạng thái sống/chết:

| Trạng thái | Tab 1 | Tab 2 | Tab 3 |
|---|---|---|---|
| 🌙 Đêm — sống | 🎭 Vai | 💬 Chat | 👥 Người chơi |
| 🌙 Đêm — chết (spec) | 👻 Khán giả | 💬 Chat âm phủ | 👥 Người chơi |
| ☀️ Ngày — sống | 🗳 Bỏ phiếu | 💬 Chat | 👥 Người chơi |
| ☀️ Ngày — chết (spec) | 👻 Khán giả | 💬 Chat âm phủ | 👥 Người chơi |
| 🏁 Ended | 🏆 Kết quả & Reveal | 📜 Lịch sử | — (bỏ, endBox đã có reveal theo phe) |

- CSS filter: `body.bn-active.bn-{main|chat|players} + bn-{night|day|ended} + bn-spec` — mỗi section trong `#scrGame` hiện theo class. Tôn trọng `.hidden` cũ (per-element toggle vẫn work).
- Spec HUD chỉ hiện ở tab Main khi `bn-spec` (`body.bn-active.bn-main #scrGame > .spec-hud`). Vai role card ẩn khi spec (đã lộ sẵn).
- Badge dot đỏ trên tab Chat khi có tin mới + không ở tab chat (`bnChatUnread`).
- `updateBottomNav()` gọi trong `renderStatusBar()` (mỗi state update) + trong `case 'chatMsg'`. Cleanup class khi về lobby.

### Bug fixes trong đợt này

- **Owner F5 mất ownership** (`room.js:69-96`): `setConnected` không transfer ngay khi owner disconnect — grace timer 60s (`OWNER_GRACE_MS`, `_ownerGraceTimer`, `_ownerGraceForId`). Reconnect trong 60s → hủy transfer. `resume()` cũng hủy timer.
- **`newMatch()` không loại người mất kết nối** → chặn start vì họ ready=false mãi (`room.js:540-570`): prune `connected===false`, reassign owner nếu bị prune, broadcast toast tên đã loại.
- **Resume ván ended không có reveal + lịch sử chi tiết** (`room.js:530-540, 519+`): `gameOver()` lưu `_lastGameOver = {winner,desc,reveal,history}`, `resume()` re-send khi `phase==='ended'`. `newMatch()` reset `_lastGameOver=null`.
- **Statusbar hiện "⏱ 2s" + phase cũ khi ended** (`room.js:gameOver` + `player-ws.html:renderEnd`): server thêm `broadcastState()` **TRƯỚC** broadcast gameOver để client sync phase. Client `renderEnd` clear `promptTimerInt`/`clearCd('vote'/'day')` + set `phase='ended'; renderStatusBar()` fallback.
- **Đã chết vẫn vote treo cổ được từ UI** (server đã chặn từ trước): `!myAlive` → vote grid class `.tava.dead-view` (cursor not-allowed + saturate .6), không gắn onclick. `castVote` early-return + toast "👻 Đã chết không thể bỏ phiếu".

### Chưa làm — phase tiếp

- **B2/B3/haptics**: đã làm trong đợt 2026-07-19 (xem section dưới).
- **Phase C còn lại**: animation chuyển ngày/đêm mượt hơn, push notification (Web Notif + service worker), gesture vuốt chuyển tab bottom nav.
- **Phase D**: PWA `manifest.json` + adaptive icon, ARIA labels đầy đủ, contrast audit (tím trên nền tối ≥4.5:1), WS reconnect khi app resume từ background, Capacitor wire-up trong `masoi-android/`.

### Gotchas mới

- **`.hidden{display:none!important}` là "master switch"**: mọi rule display khác đều thua. Dùng nó làm layer 1 (per-element toggle), Bottom Nav CSS làm layer 2 (per-tab category) — không xung đột.
- **`renderStatusBar` là hook chính**: mọi bottom nav/tab update phải gọi ở đây (fire mỗi state update). Nếu tạo màn mới trong game, nhớ hook `updateBottomNav()`.
- **`gameOver` KHÔNG tự broadcastState** trước đây — đã fix. Nếu thêm terminal states khác (vd `paused`) → nhớ broadcastState trước gửi terminal message, không client sẽ có phase stale.
- **Grace timer & unread state**: `_ownerGraceTimer` (server) + `bnChatUnread` (client) đều cần cleanup đúng lúc (lobby transition / newMatch / disconnect final). Đừng quên.
- **Tab count có thể ≠ 3**: Ended chỉ 2 tab. Nếu thêm phase mới, chỉnh `updateBottomNav` **và** auto-switch nếu user đang ở tab bị bỏ (đã có pattern: `if(body.classList.contains('bn-players')){ ... bnTab='main' }`).
- **CSS bottom nav filter**: rules đều gate trong `@media (max-width:1023px)` — desktop 2-cột không bị ảnh hưởng dù JS vẫn add `bn-active` class.

## Bot AI + Quick Match + Vote 2/3 + Mobile UX B2/B3/C (2026-07-19)

Commit: `0005dfe` server · `9a7a790` UI · `751fde0` docs. Test: 83/83 auto-MC + bot smoke PASS.

### Bot AI (`bot.js` + `bot-personas.js` + `bot-chat.js`)

- **Kiến trúc**: `Room` wrap `send(pid,msg)` — id có prefix `bot_` → route sang `BotPlayer.send()` local, không đi qua transport. `addBot(persona)` / `hasBot()` cho quick-match auto-fill. Ưu tiên người thật làm owner; bot **không thể** làm chủ phòng.
- **BotPlayer**: dùng scheduler của Room (test tick được). Delay giả người: 2-8s action, 4-15s vote, 3-25s chat. `botNightAction()` sinh action HỢP LỆ theo `stepType`; bot Sói ưu tiên vote Dân, bot Dân vote random. Chat template có `${target}`, reply keyword khi bị nhắc tên.
- **Persona pool**: 60 tên VN, id `bot_<time36>_<seq>`. `makeBotPersonas(n, existingNames)` tránh trùng tên người thật.
- **Cleanup**: `_destroyBots()` gọi trong `gameOver()` (chỉ dọn timers, entry giữ trong `players[]` để state index khớp resume/reveal) + `newMatch()` (dọn hẳn — bot không sang ván mới). Ván mới cần quickMatch mới tạo bot mới.

### Quick Match auto-fill (`index.js`)

- Chỉ gộp phòng đã đánh dấu `_quickMatch` (không gộp phòng do người tự tạo). Cấu hình: `QUICK_MATCH_WAIT_MS=10s`, `QUICK_MATCH_TARGET=5`.
- Người vào → broadcast `quickMatchWaiting {deadline,target}` cho tất cả người thật (kể cả người mới vào giữa chừng). Timer hết → fill bot lên target, `suggestRoleCounts(n)`, auto-start (bỏ qua ready check bằng cách set `ready=true` cho tất cả).
- **ELO**: `onGameOver` bỏ qua ELO nếu `roomPlayers.some(p=>p.isBot)` — chống farm; toast "🤖 Ván luyện tập có bot — không tính ELO".
- Client `#qmBanner` countdown 10s + progress + sub message ("👥 N người thật · thêm bot nếu chưa đủ khi hết giờ" / "✅ Đủ N — chuẩn bị bắt đầu" / "🤖 Đang thêm bot & bắt đầu ván"). Ẩn config/ready khi trong quickMatch.

### Vote treo cổ ≥ 2/3 người sống

- `closeVote()` tính `threshold = ceil(aliveCnt*2/3)`. `topCount < threshold` → không ai bị treo, `history` ghi `{insufficient:true, needed, topName, topCount}`. Line hiển thị "⚖️ Không đủ 2/3 phiếu để treo cổ (cần ≥N, X chỉ có Y). Không ai bị treo."
- Client `renderVote()` hiển thị dòng rule "⚖️ Cần ≥ N phiếu (2/3 của M sống)".
- 2 test case đặc thù trong `scenarios.mjs` (đủ + không đủ).

### Mobile UX Phase B2/B3/C

**B2 — Statusbar hero (3 hàng dọc)**: chip row (phase/timer/alive/room/dead) + `sb-turn` (turn indicator: 🎯 my-turn pulse vàng · 😴 night-wait · 💬 day-talk · 🗳 day-vote · 👻 spec) + `sb-progress` (green → yellow warn≤50% → red crit≤25% pulse). `syncHeroBar()` 500ms, đọc `currentCountdown()` cho cả night (curPrompt) lẫn day (vote/discussion). Server gửi kèm `total` để late-connect/resume dựng bar chuẩn.

**B3 — Role card compact/modal**: mặc định `.g-role.compact` → chip 1 dòng (icon + tên + mates + team + ›). Tap chip mở `#roleModal` full-screen (art + icon + team + desc + mates). Nút `⬍` toggle, lưu `localStorage.masoi_role_compact`. Esc đóng.

**Phase C (haptics)**: `vib(pattern)` helper wrap `navigator.vibrate` + `localStorage.masoi_haptic`. Rung: tap target (12-18ms), submit (35/25/35), skip (25), vote (30/25/30), open modal (20), setBnTab (15), chat send (12), death (250/80/250/80/500), toast lỗi (25/40/25).

**Timeline dayBox**: thay text `.announce` phẳng bằng `renderTimeline()` — card đêm/ngày (mới nhất trên) trong `tl-scroll` (max-h 58vh), badge "Mới nhất". `pushHist` chỉ push vào `histItems`; `histBox` final chỉ hiện lúc ended.

**Chat badges per-kênh**: `bnChatUnread` từ số → `{main,wolf,dead}`. Bottom nav tab Chat hiện `bn-chan-badge` cho từng kênh có tin mới (không hiện kênh đang xem), kèm sub-label liệt kê tên kênh. `chatTabs` hiện `ch-badge` nhỏ. `setChatCh` chỉ reset đúng kênh xem. Bottom nav ended thêm tab `bn-hist` tách riêng khỏi `bn-chat`.

**Hero action bar mobile**: `#heroAction` sticky bottom (76px trên bottom nav khi active): [✔️ Xác nhận] + [⏭️ Bỏ lượt], mirror `pConfirm` state qua `syncHeroAction()`. Ẩn desktop ≥1024px.

**Bot notice + isBot reveal**: `rv-item` hiển thị 🤖 badge cho bot. Banner `bot-notice` "🤖 Ván này có bot lấp phòng — không tính ELO" trên endReveal.

**Bug 15/16 fixes**: `renderRoleTabs` cộng villager auto-fill vào Làng + Tất cả (hiển thị "Tất cả X/Y" khớp hero card). Statusbar phase indicator đã rõ ràng nhờ `sb-turn` + `sb-progress`.

### Gotchas mới (2026-07-19)

- **Bot id prefix**: `bot_` bắt buộc — `isBotId()` là source of truth để `Room.send()` route local. Đừng đặt id người thật bắt đầu bằng `bot_`.
- **Bot vẫn nằm trong `players[]` sau gameOver**: chỉ destroy timers. Cần thiết để `state.players[i].name` + `reveal[i]` khớp index. `newMatch` mới thật sự loại bỏ.
- **`_quickMatch` là flag "sticky"**: một khi phòng được đánh dấu, các lần gộp sau vẫn ưu tiên nó. Người tự tạo phòng KHÔNG có flag này → không bị nhét bot.
- **Vote 2/3 dựa trên `aliveCnt` TẠI THỜI ĐIỂM closeVote**: nếu ai chết trong day (rare), threshold có thể lệch. Auto-MC test đủ 6/9 case biên.
- **`sb-turn` + `sb-progress` DOM chỉ có khi phase=night|day**: đừng `getElementById` blindly ngoài `syncHeroBar` — nó sẽ null ở lobby/ended.
- **`heroAction` mirror `pConfirm`**: không có state riêng. Sửa `renderPrompt`/`submitAction`/`submitSkip` phải gọi `syncHeroAction()` nếu không nút mobile stuck disabled.
- **`bnChatUnread` là object per-kênh**: cẩn thận `bnChatUnread=0` (số) sẽ phá — luôn dùng object shape hoặc reset qua `{main:0,wolf:0,dead:0}`.
- **Villager auto-fill** cộng vào tab tabs "Tất cả" và "Làng" — `chosenRoles.all` không còn chỉ là tổng roleCounts nữa; nếu thêm code đếm mới, đọc kỹ `renderRoleTabs`.

## Phase 3 — Việc tiếp theo (bắt buộc để lên store)

1. **Kiểm duyệt chat**: lọc từ ngữ tục/thô (badword list hoặc AI moderation), block user
2. **Age-gate**: xác nhận tuổi ≥13/≥18 tùy thị trường trước khi chat
3. **ToS + Privacy Policy** chính thức (App Store / Play Store bắt buộc)
4. Cơ chế xóa dữ liệu theo yêu cầu (GDPR / Nghị định 13/2023 VN)

### Polish còn nợ (không chặn Phase 3, làm sau)
- **Phase C**: animation chuyển ngày/đêm mượt, gesture vuốt tab, push notification background.
- **Phase D**: PWA `manifest.json` + adaptive icon, ARIA labels, contrast audit, WS reconnect on resume, Capacitor wire-up `masoi-android/`.

---

## Quy ước & lưu ý (gotchas)

- **Mount staleness trong sandbox**: bash đôi khi đọc file bị **cắt cụt / cũ** (vd `package.json` truncated, `node --check` lỗi giả). File Windows thật (qua Read/Edit) mới đúng. Cách xác minh logic: **tách hàm ra `/tmp` chạy Node với mock** thay vì tin bản mount.
- **Git push từ sandbox thường thất bại** (không có credential GitHub, `.git` unlink "Operation not permitted"). Commit local vẫn được; **push từ máy Windows của người dùng**. Đặt `git config user.email/name` nếu commit báo thiếu identity.
- Cô Bé Ti Hí (`littlegirl`) **đã bỏ khỏi picker** ở bản auto-MC (không có cơ chế hé mắt).
- Bug đã sửa (đừng lặp lại): Phù Thủy phải **transactional** (validate cả cứu+độc trước khi mutate); màn Bảo Vệ/nạn nhân không được để lộ ai là Sói; Cupid chọn đúng **2** người (`max` trong prompt); `leave()` lúc `ended` phải set `state=null` trước khi splice; lịch sử KHÔNG lộ vai trong trận.
- **`maxKill` sói** = `1 + wolfCubBonusKill + direwolfBonus` — phải cộng cả hai flag khi tính `maxK` trong `finishWolf()`.
- **`nextNight()`** phải reset transient flags mỗi đêm: `hypnoTarget`, `blackmailTarget`, `diplomatProtected`, `kingDiedThisNight` — nếu quên, hiệu lực cộng dồn qua nhiều đêm.
- **`flutedPlayers`** lưu `pid` (string). Khi kiểm tra win, phải lọc qua người **đang sống** (`p.alive`) vì người chết không còn "cần bị mê hoặc" nữa.
- **Sandbox Linux**: `node --check` và vitest KHÔNG đáng tin (mount staleness, rollup binary Windows). Luôn dùng `node apps/server/test/run.mjs` để xác minh.
- Người dùng thích **ngắn gọn, trực tiếp**, tiếng Việt; UI tường minh kiểu bản offline (tên vai đầy đủ, nhóm theo phe 🏡 Dân / 🐺 Sói / 🎭 Thứ Ba, cảnh báo dư vai).

## Tài liệu liên quan

`KienTruc_MaSoi_Online.md`, `ROADMAP_MaSoi_Online_ThuongMai.md`, `PHASE1_STACK_MaSoi.md`, `CHECKLIST_Phase0_MaSoi.md`, `DEPLOY_Server.md`, `Ma_Soi_20_Role_Nang_Cao.md`, `danh_sach_150_role_ma_soi.md`.
