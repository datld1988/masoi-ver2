# Kiến trúc "Companion Mode" – Ma Sói Online (cùng phòng)

> Mục tiêu: người chơi vẫn ngồi cùng nhau, thảo luận bằng miệng. Điện thoại của mỗi người thay **lá bài + việc gọi từng vai dậy ban đêm**. App hiện tại của MC vẫn là trung tâm điều khiển.

---

## 1. Nguyên tắc thiết kế

1. **Host-authoritative**: máy MC là nguồn sự thật. MC vốn được tin tưởng tuyệt đối trong Ma Sói (luôn biết hết vai), nên không cần server tự viết — Firebase chỉ là kênh đồng bộ. Đây là điểm giúp giảm 70% khối lượng so với làm server riêng.
2. **Người chơi không cần cài app**: tham gia bằng trình duyệt qua QR/mã phòng. Chỉ MC cần APK.
3. **Tái dùng tối đa**: toàn bộ ROLES, thứ tự đêm, logic phân giải sáng, điều kiện thắng, âm thanh giữ nguyên — chỉ tách khỏi DOM.
4. **Luôn chơi được offline**: nếu không có mạng, app hoạt động y như hiện tại (companion là tính năng cộng thêm, không phải yêu cầu).

## 2. Thành phần

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **Host app (MC)** | App hiện tại (HTML/Capacitor) + Firebase SDK | Chạy engine, ghi state lên phòng, màn hình god-view |
| **Player client** | 1 file HTML mobile-first (Firebase Hosting) | Nhận vai bí mật, hành động đêm, vote ngày |
| **Firebase** | Anonymous Auth + Realtime Database + Hosting | Đồng bộ realtime, presence, phân quyền đọc/ghi |
| **engine.js** | Module JS thuần (tách từ code hiện tại) | Logic game không dính DOM — dùng chung cho host, và sau này cho server nếu lên full-online |

## 3. Mô hình dữ liệu (Realtime Database)

```
rooms/{ROOMCODE}/            # mã 6 ký tự, ví dụ WOLF42
  meta:    { hostUid, createdAt, phase: "lobby"|"night"|"day"|"ended",
             nightNo, dayNo, stepType }        # stepType: vai đang được gọi
  public:                                       # ai cũng đọc được
    players: { {uid}: {name, seat, alive, connected} }
    announce: "🌅 Sáng đêm 2: A và B đã chết"   # thông báo đọc to
    timer:   { endsAt, kind: "discuss"|"night" }
    vote:    { open: true, tally: {uid: count} }# tùy chọn vote trên máy
  private/{uid}:                                # CHỈ uid đó đọc được
    role:    { id, name, icon, team, desc }
    mates:   [ {name,seat}... ]                 # Sói thấy đồng đội; Minion thấy Sói
    prompt:  { type:"pick", title:"🐺 Chọn nạn nhân",
               targets:[{uid,name,seat}...], max:1, deadline }
    result:  "🔮 Người bạn soi LÀ Sói"          # kết quả riêng (Tiên Tri...)
  actions/{nightNo}/{uid}: { stepType, targets:[uid...], ts }
  votes/{dayNo}/{uid}:     targetUid
  joinReq/{uid}:           { name, ts }         # hàng chờ vào phòng
```

**Security Rules (tinh thần):**
- `public`: đọc = mọi người trong phòng; ghi = chỉ `hostUid`.
- `private/{uid}`: đọc = đúng `uid` đó hoặc host; ghi = chỉ host.
- `actions`, `votes`, `joinReq`: ghi = đúng `uid` của mình; đọc = chỉ host.
- Vai của người chơi **không bao giờ** nằm ở node mà người khác đọc được → mở DevTools cũng không soi được bài người khác.

## 4. Luồng nghiệp vụ

### 4.1 Tạo phòng & tham gia
1. MC bấm "Tạo phòng online" → host sinh ROOMCODE, ghi `meta` + hiện QR (URL: `https://<app>.web.app/?room=WOLF42`).
2. Người chơi quét QR → anonymous sign-in → nhập tên → ghi `joinReq/{uid}`.
3. Host thấy danh sách chờ, duyệt (hoặc auto-duyệt) → gán ghế, ghi vào `public.players`. `uid` lưu trong localStorage của người chơi để reconnect.

### 4.2 Chia bài
1. MC bấm "Phát bài" → engine xáo vai như hiện tại.
2. Host ghi `private/{uid}.role` cho từng người (+ `mates` cho phe Sói).
3. Màn hình người chơi: thẻ úp, **giữ ngón tay để lật** (nhả ra là úp lại) — chống người ngồi cạnh liếc.

### 4.3 Ban đêm (thay thế "gọi dậy – nhắm mắt")
Vòng lặp cho từng bước trong `buildNightSteps()`:
1. Host set `meta.stepType` + ghi `prompt` vào `private` của (những) người có vai đó. Kèm `deadline` (vd 45s).
2. Máy của **mọi người khác** hiển thị màn hình đêm 🌙 (giống hệt nhau — không lộ ai đang hành động). Máy người có lượt hiện danh sách mục tiêu để chọn.
3. Người chơi chọn → client ghi `actions/{nightNo}/{uid}`.
4. Host nhận action → `engine.applyNightAction()` → xóa prompt, sang bước kế.
5. Hết `deadline` mà chưa có action → host auto-skip (log cho MC biết).
6. Kết quả riêng (Tiên Tri soi, Cáo, Thám Tử...) ghi vào `private/{uid}.result` — chỉ người đó thấy.

> Vai chết vẫn nhận prompt giả ngẫu nhiên? **Không cần** — vì mọi máy không có lượt đều hiển thị màn hình đêm giống nhau, không ai biết ai đang bấm.

### 4.4 Sáng & thảo luận
1. Host chạy `engine.resolveMorning()` (logic `showMorningSummary` hiện tại) → ghi `public.announce` + cập nhật `alive`.
2. Máy người chết chuyển sang chế độ "👻 Khán giả" (thấy thông báo công khai, không thấy bài ai).
3. Thảo luận bằng miệng như thường. Đồng hồ thảo luận đồng bộ qua `public.timer` — mọi máy cùng đếm.

### 4.5 Vote treo cổ (tùy chọn, có thể vote miệng như cũ)
1. Host mở `public.vote.open=true` → máy người sống hiện danh sách vote.
2. Client ghi `votes/{dayNo}/{uid}`. Host thấy tally realtime (tự nhân đôi phiếu Trưởng Làng, chặn Kẻ Ngốc đã lộ).
3. MC chốt → engine xử lý treo cổ (Hoàng Tử/Kẻ Ngốc/Joker... như hiện tại) → announce.

### 4.6 Kết thúc
`engine.checkWin()` sau mỗi biến cố → ghi `meta.phase="ended"` + announce phe thắng; máy người chơi lật toàn bộ vai.

## 5. Tách engine.js (bước bắt buộc, làm trước tiên)

API đề xuất — hàm thuần, không đụng DOM/localStorage:

```js
// state = { players:[{id,name,roleId,alive,flags...}], night, day,
//           pendings:{hellhound,poison,mature}, pairs:{cupid,balancer}, ... }
createGame(names, counts)            -> state
buildNightSteps(state)               -> [{type,label,icon}]
applyNightAction(state, step, sel)   -> {state', privateResult?}
resolveMorning(state)                -> {state', deaths, publicLines, secretLines}
resolveHang(state, targetIdx)        -> {state', blocked?, publicLines}
checkWin(state)                      -> null | {winner, reason}
```

Cách làm an toàn: chuyển ~40 biến global hiện tại vào object `state`; các hàm `confirmXxx` hiện tại chỉ còn: đọc lựa chọn từ UI → gọi engine → render kết quả. Bản offline chạy qua engine mới **trước**, chơi thử vài ván xác nhận không đổi hành vi, rồi mới nối Firebase.

## 6. Xử lý sự cố

| Tình huống | Cách xử lý |
|---|---|
| Người chơi rớt mạng giữa đêm | `onDisconnect` đánh dấu `connected=false` (MC thấy ⚠️); hết deadline → auto-skip; vào lại bằng uid trong localStorage → đọc lại `private` là khôi phục đúng màn hình |
| Host rớt mạng | State game vẫn trong RTDB + autosave local như hiện tại; host mở lại phòng → ghi tiếp. Người chơi chỉ thấy "chờ MC..." |
| 2 người mở cùng 1 uid | Cho phép (cùng người đổi máy); phiên sau đá phiên trước qua `presence` |
| Firebase sập / không mạng | MC chuyển về chế độ offline hiện tại, chơi bằng miệng như cũ |
| Người chơi vào nhầm phòng cũ | Phòng có TTL: host xóa khi kết thúc; Cloud Function dọn phòng > 24h (tùy chọn) |

## 7. Lộ trình & ước lượng

| Giai đoạn | Nội dung | Ước lượng |
|---|---|---|
| **1. Tách engine** | engine.js thuần + bản offline chạy qua engine, không đổi hành vi | 1–2 tuần |
| **2. Phòng & chia bài** | Firebase setup, QR/join/lobby, phát vai về máy người chơi | 1 tuần |
| **3. Đêm trên máy người chơi** | prompt/action/timeout/presence, kết quả riêng | 1–2 tuần |
| **4. Vote + polish** | vote ngày, khán giả, timer đồng bộ, âm thanh phía người chơi | 1 tuần |
| *(sau này)* MC tự động, full-remote + voice | chỉ làm nếu giai đoạn 1–4 được dùng thật | dự án riêng |

Khuyến nghị giai đoạn 3 chỉ bật cho **~20 role lõi** (đủ dùng bàn 15 người); role hiếm còn lại MC xử lý miệng như cũ — tránh vũng lầy kiểm thử 80 role × online.

## 8. Chi phí

- Firebase free tier (Spark): 100 kết nối đồng thời, 1GB lưu trữ, 10GB/tháng băng thông → **0đ** cho quy mô bạn bè/cộng đồng nhỏ (một bàn 20 người ≈ 21 kết nối).
- Firebase Hosting free: đủ cho 1 trang player client.
- Không cần server riêng, không cần domain (dùng `*.web.app`).
