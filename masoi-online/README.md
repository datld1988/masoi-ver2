# Ma Sói Online – Companion Mode

Hướng đi: **cùng phòng + từ xa**, thảo luận qua gọi nhóm ngoài app (Zalo/Discord), **MC làm host** với god-view. Kiến trúc chi tiết: xem `../KienTruc_MaSoi_Online.md`.

## Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| `engine.js` – logic thuần 22 role lõi, không DOM | ✅ Xong, 44/44 test pass |
| `test_engine.js` – test mô phỏng (chạy `node test_engine.js`) | ✅ Xong |
| `database.rules.json` – phân quyền Firebase (kèm presence) | ✅ Xong |
| `config.js` – cấu hình Firebase của bạn | ✅ ⚠️ cần kiểm tra `databaseURL` |
| `host.html` – màn hình MC: phòng + QR, duyệt người, chọn vai, vòng đêm tự động, vote, god-view | ✅ Xong |
| `player.html` – người chơi: vào bằng QR, thẻ vai giữ-để-lật, hành động đêm, vote | ✅ Xong |
| `firebase.json` – deploy Hosting + Rules bằng 1 lệnh | ✅ Xong |

## Cách chạy lần đầu

1. **Firebase Console** (console.firebase.google.com → project `masoi-online-9e660`):
   - Build → **Authentication** → Sign-in method → bật **Anonymous**.
   - Build → **Realtime Database** → Create database (chọn region gần: `asia-southeast1`).
   - Copy URL database (dạng `https://masoi-online-9e660-default-rtdb.asia-southeast1.firebasedatabase.app`)
     → dán vào `databaseURL` trong `config.js` (tôi đã đoán sẵn URL này – nếu đúng thì thôi).
2. **Deploy** (cần Node.js trên máy):
   ```bash
   npm install -g firebase-tools
   firebase login
   cd masoi-online
   firebase use masoi-online-9e660
   firebase deploy          # đẩy cả Hosting lẫn Database Rules
   ```
3. **Chơi**: MC mở `https://masoi-online-9e660.web.app/host.html` → Tạo phòng →
   người chơi quét QR → duyệt → chọn vai (nút ✨ Gợi ý) → 🚀 Phát bài.
   MC không cần deploy vẫn test được host.html bằng cách mở file trực tiếp (chỉ cần Rules + Auth + DB đã bật).

## Cách vận hành trong ván

- **Đêm**: engine tự gọi từng vai; điện thoại người có lượt hiện danh sách chọn, máy khác hiện màn hình ngủ (không lộ ai đang hành động). Hết 60s tự bỏ qua; MC có nút Bỏ qua. Bước Cô Bé Ti Hí do MC bấm quyết định.
- **Sói**: cả bầy thấy cùng prompt, MỘT Sói bấm chọn (thống nhất miệng/nhắn riêng); kết quả báo lại cho mọi Sói.
- **Sáng**: MC bấm Công bố → mọi máy thấy thông báo; phần 🔒 bí mật chỉ MC thấy.
- **Ngày**: thảo luận miệng (hoặc gọi nhóm nếu chơi xa) → MC mở vote → chốt treo. Trưởng Làng tự ×2, Kẻ Ngốc đã lộ tự mất phiếu, Hoàng Tử/Kẻ Điên/Sói Thợ Săn tự xử lý đúng luật.
- **God-view**: MC thấy toàn bộ vai, ai rớt mạng (🔴), nút Giết/Hồi sinh thủ công cho tình huống ngoài luật v1.
- **Rớt mạng**: người chơi mở lại link là vào đúng trạng thái; MC bấm "Tiếp tục phòng" để khôi phục ván.

## engine.js – API

```js
const E = require('./engine.js');            // node
// browser: <script src="engine.js"></script> → window.MaSoiEngine

let state = E.createGame(names, counts);      // chia bài
E.dealInfo(state);                            // dữ liệu ghi vào private/{uid} từng người
E.buildNightSteps(state);                     // các bước đêm nay
let nd = E.newNightData();
E.applyNightAction(state, nd, 'wolf', {targets:[3]});   // -> {ok} hoặc {ok:false,error}
E.applyNightAction(state, nd, 'witch', {heal:3, poison:null});
E.resolveMorning(state, nd);                  // -> {deaths, publicLines, secretLines, win}
E.tallyVotes(state, {voterIdx: targetIdx});   // tự nhân đôi Trưởng Làng, bỏ phiếu Kẻ Ngốc
E.resolveHang(state, idx);                    // Hoàng Tử/Kẻ Ngốc/Joker/Sói Thợ Săn tự xử lý
E.nextNight(state);
```

22 role v1: Dân, Sói, Tiên Tri, Phù Thủy, Bảo Vệ, Bác Sĩ, Thợ Săn, Cupid, Già Làng,
Trưởng Làng, Cô Bé Ti Hí, Kẻ Ngốc, Hoàng Tử, Tiên Tri Tập Sự, Kẻ Nguyền Rủa,
Sói Trắng, Sói Con, Sói Giả Dân, Sói Thợ Săn, Sói Phản Bội, Sát Nhân, Kẻ Điên.

## Các bước tiếp theo (theo thứ tự)

1. **Tạo Firebase project** (console.firebase.google.com, gói Spark miễn phí):
   bật Anonymous Authentication + Realtime Database + Hosting;
   dán `database.rules.json` vào tab Rules của Realtime Database;
   lấy `firebaseConfig` (Project settings → Web app).
2. **player.html**: trang mobile-first cho người chơi — nhập mã phòng/quét QR,
   thẻ vai giữ-để-lật, màn hình đêm, chọn mục tiêu, vote. Deploy lên Firebase Hosting.
3. **host.html**: màn hình MC — tạo phòng + QR, duyệt người vào, chạy vòng đêm
   (gọi engine, ghi prompt/private, nhận actions, timeout 45s), công bố sáng, mở vote.
4. **Ghép vào app Android hiện tại**: thêm tab "🌐 Phòng Online" nhúng host.

## Chạy test

```bash
node test_engine.js   # 44 test, exit 0 khi pass hết
```
