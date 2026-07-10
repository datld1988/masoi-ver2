# Ma Sói — monorepo

Khung monorepo Phase 0 (xem `CHECKLIST_Phase0_MaSoi.md` và `ROADMAP_MaSoi_Online_ThuongMai.md` ở gốc repo).

## Cấu trúc

```
masoi/
├─ packages/
│  └─ engine/        @masoi/engine — logic luật thuần (không DOM, không Firebase)
│     ├─ src/engine.js
│     └─ test/engine.test.js   (Vitest)
├─ apps/
│  ├─ web/           host.html + player.html (xem apps/web/README.md để dời vào)
│  └─ server/        placeholder cho Phase 1 (server-authoritative)
├─ masoi-online/     BẢN GỐC đang chạy — giữ nguyên tới khi test xanh rồi mới dọn
├─ ROADMAP_MaSoi_Online_ThuongMai.md
└─ CHECKLIST_Phase0_MaSoi.md
```

> `masoi-online/` là bản đang chạy thật. Khung mới dựng **song song**, chưa xoá gì. Sau khi `pnpm test` xanh, dời file web theo `apps/web/README.md` rồi mới xoá bản cũ.

## Chạy

```bash
pnpm install      # cài dependencies (cần Node LTS + pnpm)
pnpm test         # chạy toàn bộ test (hiện tại: @masoi/engine)
```

Chỉ chạy test engine: `pnpm test:engine`

## Trạng thái Phase 0

- [x] Monorepo skeleton + workspace
- [x] `@masoi/engine` (bản sao engine, giữ CommonJS + globalThis cho browser)
- [x] Test Vitest cho engine
- [x] CI GitHub Actions (`.github/workflows/ci.yml`)
- [ ] Dời file web vào `apps/web/` (bạn làm — xem README trong đó)
- [ ] Tạo repo GitHub + push
- [ ] Firebase staging + deploy thử
- [ ] Tên game + nháp pháp lý
- [ ] Chốt stack Phase 1
