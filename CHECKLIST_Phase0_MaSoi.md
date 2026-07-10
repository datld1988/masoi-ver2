# Checklist Phase 0 — Nền tảng kỹ thuật & pháp lý sơ bộ

> Mục tiêu: dọn nền để bước rewrite server-authoritative (Phase 1) không bị rối.
> Thời gian dự kiến: 2–4 tuần (1 dev, làm bán thời gian).
> Xong Phase 0 = engine chạy được trên cả Node lẫn browser, có test tự động + CI, có staging, có tên & định hướng stack.
>
> Tham chiếu: `ROADMAP_MaSoi_Online_ThuongMai.md`.

---

## 0. Chuẩn bị máy & tài khoản (nửa ngày)

**Phần mềm cài trên máy dev:**

- [ ] Node.js bản LTS mới nhất (kèm npm) — kiểm tra: `node -v && npm -v`
- [ ] Git — `git --version`
- [ ] VS Code (hoặc IDE quen dùng)
- [ ] `pnpm` (khuyên dùng cho monorepo): `npm i -g pnpm`
- [ ] `firebase-tools`: `npm i -g firebase-tools` → `firebase login`
- [ ] (Tùy chọn, chuẩn bị Phase 1) Docker Desktop + bật WSL2 trên Windows

**Tài khoản (đa phần miễn phí):**

- [ ] GitHub (repo + CI)
- [ ] Google/Firebase (đã có project `masoi-online-9e660`)
- [ ] Nhà đăng ký domain (mua ở mục 5)

**Phần cứng:** máy hiện tại là đủ (CPU 4 nhân đời gần đây, RAM 8GB tối thiểu / 16GB lý tưởng, SSD 256GB+). Không cần server vật lý, không cần GPU rời. Thêm 1 Android + 1 iPhone để test mobile nếu có sẵn.

---

## 1. Dựng lại repo theo monorepo (1–2 ngày)

**Cấu trúc mục tiêu:**

```
masoi/
├─ package.json            (workspace root)
├─ pnpm-workspace.yaml
├─ packages/
│  └─ engine/              (logic luật thuần, KHÔNG dính DOM/Firebase)
│     ├─ package.json
│     ├─ src/engine.js     (từ masoi-online/engine.js)
│     └─ test/engine.test.js
├─ apps/
│  ├─ web/                 (host.html, player.html, config.js, role-art.js…)
│  └─ server/              (thư mục trống — placeholder cho Phase 1)
└─ docs/                   (roadmap, checklist, ghi chú pháp lý)
```

- [ ] Sao lưu bản hiện tại (commit hoặc zip toàn bộ `masoi/` trước khi tái cấu trúc)
- [ ] `git init` (nếu chưa) + tạo `.gitignore` (bỏ `node_modules/`, `.firebase/`, `dist/`)
- [ ] Tạo `pnpm-workspace.yaml`:

  ```yaml
  packages:
    - "packages/*"
    - "apps/*"
  ```

- [ ] Tạo `package.json` gốc:

  ```json
  {
    "name": "masoi",
    "private": true,
    "scripts": {
      "test": "pnpm -r test"
    }
  }
  ```

- [ ] Chuyển `masoi-online/engine.js` → `packages/engine/src/engine.js`
- [ ] Chuyển `host.html`, `player.html`, `config.js`, `role-art.js`, `database.rules.json`, `firebase.json`… → `apps/web/`
- [ ] Chuyển các file `.md` (roadmap, checklist, hướng dẫn) → `docs/`
- [ ] Cập nhật đường dẫn `<script src="engine.js">` trong `host.html` (hiện host nhúng engine trực tiếp) cho khớp cấu trúc mới
- [ ] Chạy thử `player.html` + `host.html` để chắc chưa hỏng gì sau khi dời file

> Ghi chú: bản offline `MaSoi_QuanTro.html` và `masoi-android/` có thể để nguyên ngoài monorepo, hoặc cho vào `apps/legacy/`. Đừng gộp vội để tránh rối.

---

## 2. Tách engine thành package + test (2–3 ngày)

- [ ] Tạo `packages/engine/package.json`:

  ```json
  {
    "name": "@masoi/engine",
    "version": "0.1.0",
    "type": "module",
    "main": "src/engine.js",
    "scripts": { "test": "vitest run" },
    "devDependencies": { "vitest": "latest" }
  }
  ```

- [ ] Chuyển `engine.js` sang ES module: đổi `module.exports = {...}` → `export { ... }` (giữ luôn `globalThis.MaSoiEngine` cho browser nếu cần)
- [ ] `pnpm add -D vitest -w` (hoặc trong package engine)
- [ ] Chuyển `test_engine.js` → `packages/engine/test/engine.test.js`, viết lại theo cú pháp Vitest (`import { describe, it, expect } from 'vitest'`)
- [ ] Mở rộng test: mỗi role trong 22 role có ít nhất 1 ca; thêm ca biên (Phù Thủy cứu+độc, Cupid chết dây chuyền, Sói Trắng, Cô Bé bị bắt, vote hòa…)
- [ ] `pnpm test` xanh 100%
- [ ] (Khuyến nghị) Bật TypeScript dần: thêm `tsconfig.json`, đổi `engine.js` → `engine.ts`, khai kiểu cho `State`, `Role`, `NightData`. Không bắt buộc xong trong Phase 0 nhưng nên bắt đầu.

---

## 3. CI tự động trên GitHub (nửa ngày)

- [ ] Tạo repo private trên GitHub, `git remote add origin …`, push
- [ ] Tạo `.github/workflows/ci.yml`:

  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with: { node-version: lts/*, cache: pnpm }
        - run: pnpm install
        - run: pnpm test
  ```

- [ ] Push và xác nhận Actions chạy test xanh
- [ ] (Tùy chọn) Bật branch protection: main chỉ merge khi CI xanh

---

## 4. Môi trường staging (nửa ngày)

- [ ] Tạo Firebase project thứ hai, ví dụ `masoi-staging`
- [ ] Bật Anonymous Auth + Realtime Database cho project staging
- [ ] Thêm alias trong `.firebaserc`:

  ```json
  { "projects": { "prod": "masoi-online-9e660", "staging": "masoi-staging" } }
  ```

- [ ] Deploy thử lên staging: `firebase use staging && firebase deploy`
- [ ] Quy ước: mọi thứ test trên `staging` trước, chỉ đẩy `prod` khi ổn
- [ ] (Tùy chọn) Tách `config.js` theo môi trường để không lẫn key prod/staging

---

## 5. Tên game & pháp lý sơ bộ (1–2 ngày, làm song song)

- [ ] Brainstorm 5–10 tên riêng (tránh trùng "Werewolf", "Mafia", tên/art của Ultimate Werewolf, Les Loups-garous…)
- [ ] Kiểm tra domain còn trống (.com/.vn) cho các tên ứng viên
- [ ] Tra nhanh nhãn hiệu (Cục Sở hữu trí tuệ VN / tìm Google) xem tên có bị đăng ký chưa
- [ ] Chốt tên + mua domain + giữ handle mạng xã hội nếu cần
- [ ] Soạn bản nháp **Điều khoản sử dụng** (dùng template, chỉnh cho game xã hội có chat)
- [ ] Soạn bản nháp **Chính sách quyền riêng tư**: liệt kê dữ liệu thu thập (tên hiển thị, uid ẩn danh, tin nhắn chat) + mục đích. Lưu ý Nghị định 13/2023 (VN)
- [ ] Ghi lại quyết định về độ tuổi tối thiểu + hướng kiểm duyệt chat (chi tiết làm ở Phase 3)

---

## 6. Chốt stack cho Phase 1 (0.5–1 ngày — quyết định, chưa code)

- [ ] So sánh 2 hướng và chọn 1, ghi vào `docs/`:
  - **A. Giữ Firebase**, chuyển engine sang Cloud Functions (server-authoritative bằng Functions). Nhanh, ít hạ tầng, nhưng độ trễ realtime và chi phí Functions cần cân nhắc.
  - **B. Server riêng** Node + WebSocket, state ở Redis, dữ liệu ở Postgres. Chủ động, hợp game realtime, nhưng phải tự lo hạ tầng.
- [ ] Phác thảo sơ đồ "view riêng cho từng client" (client không bao giờ nhận vai người khác)
- [ ] Liệt kê API/sự kiện server cần có (join, action đêm, vote, chat, reconnect)

---

## ✅ Định nghĩa "Xong Phase 0"

- [ ] Repo monorepo gọn, `pnpm install` chạy sạch từ đầu
- [ ] `pnpm test` xanh, phủ 22 role + ca biên
- [ ] CI GitHub tự chạy test mỗi push
- [ ] Deploy được lên **staging** tách khỏi prod
- [ ] Có tên game + domain + bản nháp ToS/Privacy
- [ ] Có văn bản chốt stack Phase 1 + sơ đồ view-riêng

---

## Tóm tắt phần cứng / chi phí Phase 0

| Hạng mục | Cần gì | Chi phí |
|---|---|---|
| Máy dev | CPU 4 nhân đời gần đây, RAM 8GB (16GB lý tưởng), SSD 256GB+ | Máy hiện có |
| GPU | Không cần | — |
| Server | Không cần ở Phase 0 (dùng Firebase free) | 0đ |
| GitHub + CI | Repo private + Actions | Miễn phí |
| Firebase dev/staging | Gói Spark | Miễn phí |
| Domain | 1 tên .com/.vn | ~vài trăm nghìn/năm |
| Điện thoại test | 1 Android + 1 iPhone (nếu có) | Máy sẵn có |

*Không cần mua sắm gì đáng kể cho Phase 0. VPS (~5–10 USD/tháng) chỉ cần khi sang Phase 1 muốn có server staging thật.*
