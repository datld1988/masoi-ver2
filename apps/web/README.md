# apps/web — front-end (host + player)

Đây là nơi front-end sẽ ở. Hiện các file web vẫn nằm trong `masoi-online/` (bản đang chạy).
Khi `pnpm test` đã xanh và bạn muốn hợp nhất, dời chúng vào đây.

## Dời file (chạy ở gốc repo, Windows)

```bat
move masoi-online\host.html            apps\web\
move masoi-online\player.html          apps\web\
move masoi-online\config.js            apps\web\
move masoi-online\role-art.js          apps\web\
move masoi-online\database.rules.json  apps\web\
move masoi-online\firebase.json        apps\web\
move masoi-online\manifest.json        apps\web\
move masoi-online\icons                apps\web\icons
move masoi-online\art                  apps\web\art
```

Sau khi dời, `host.html`/`player.html` vẫn nhúng `engine.js` qua `<script src="...">`.
Hai lựa chọn cho engine ở front-end:
- **Đơn giản (khuyên khi mới hợp nhất):** copy `packages/engine/src/engine.js` sang `apps/web/engine.js` (giữ như hiện tại). Chấp nhận có 2 bản, nhớ đồng bộ.
- **Gọn về sau:** dùng bước build (Vite) để front-end import thẳng từ `@masoi/engine`.

## Firebase: tách staging khỏi prod

Tạo file `.firebaserc` trong thư mục chứa `firebase.json`:

```json
{
  "projects": {
    "prod": "masoi-online-9e660",
    "staging": "masoi-staging"
  }
}
```

Deploy:

```bash
firebase use staging   # test trước ở staging
firebase deploy

firebase use prod      # chỉ khi đã ổn
firebase deploy --only hosting,database
```
