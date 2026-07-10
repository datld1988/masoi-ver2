# Roadmap Thương mại hóa – Ma Sói Online

> Lộ trình đưa bản Ma Sói Online (companion mode, host-authoritative) từ prototype cho nhóm bạn bè lên sản phẩm thương mại.
> Tài liệu tham khảo nội bộ · cập nhật 2026-07-06.

---

## 1. Hiện trạng (điểm xuất phát)

| Hạng mục | Bản hiện tại |
|---|---|
| Kiến trúc | **Host-authoritative** – máy MC là nguồn sự thật, không có server riêng |
| Engine luật | `engine.js` chạy trên **trình duyệt MC** (22 role v1) |
| Backend | Firebase (Realtime DB + Anonymous Auth + Hosting), gói Spark miễn phí |
| Đăng nhập | Ẩn danh (Anonymous Auth) |
| Vào phòng | Mã phòng + QR |
| Voice | Qua app ngoài (Zalo/Discord) |
| Art / âm thanh | SVG tự vẽ + Web Audio tổng hợp |

**Kết luận:** tuyệt vời cho nhóm bạn tin nhau, nhưng ba điểm chặn thương mại: (a) MC thấy/sửa được toàn bộ ván → gian lận; (b) phụ thuộc một người làm MC; (c) MC rớt mạng là sập ván (single point of failure).

---

## 2. Nguyên tắc mục tiêu

1. **Server là trọng tài** – không tin client, không gửi thông tin bí mật xuống máy không được phép thấy.
2. **Không cần người làm MC** – server tự dẫn ván (narrator tự động).
3. **An toàn & tuân thủ trước khi mở rộng** – kiểm duyệt chat, bảo vệ trẻ em, pháp lý là điều kiện lên store.
4. **Ra mắt theo giai đoạn** – mỗi phase là một cột mốc chơi được, đo được, có thể dừng/gọi vốn.

---

## 3. Kiến trúc mục tiêu

```
[ Client (Web/PWA + Mobile) ]
        │  WebSocket (state realtime) + REST/HTTPS (auth, profile, mua bán)
        ▼
[ Game Server (Node/TypeScript) ]  ← engine.js chuyển thành module server-side, uy quyền tuyệt đối
        │
        ├─ Redis        : state phòng đang chơi, matchmaking, presence
        ├─ Postgres     : tài khoản, hồ sơ, lịch sử, giao dịch, ranking
        ├─ Voice service: WebRTC qua Agora/LiveKit (tích hợp sau)
        └─ Moderation   : lọc chat, report/ban
```

Nguyên tắc vàng: **client chỉ nhận đúng phần "view" của mình**. Vai người khác không bao giờ rời server.

---

## 4. Các giai đoạn

### Phase 0 — Nền tảng kỹ thuật & pháp lý sơ bộ *(2–4 tuần)*
- Chuyển repo sang cấu trúc monorepo (client / server / shared engine).
- Đưa `engine.js` thành module dùng chung, viết test đầy đủ (đã có `test_engine.js` làm nền).
- Đặt **tên game riêng** + xác nhận không đụng bản quyền tên vai/art (tránh Ultimate Werewolf, Les Loups-garous…).
- Soạn khung Điều khoản sử dụng + Chính sách quyền riêng tư (bản nháp).
- Chọn stack, dựng CI/CD + môi trường staging.

**Cột mốc:** engine chạy được cả trên Node server lẫn test tự động; có tên & định danh pháp lý.

### Phase 1 — Server-authoritative + MC tự động *(6–10 tuần) — quan trọng nhất*
- Dựng game server (Node/TypeScript + WebSocket) giữ toàn bộ state ván.
- **Narrator tự động**: server chạy vòng đêm/ngày, gọi từng vai, không cần người làm MC.
- Client viết lại để chỉ nhận view riêng; bỏ mọi logic bí mật khỏi client.
- Reconnect mượt (rớt mạng vào lại đúng trạng thái), xử lý người bỏ trận.
- Redis giữ state; nhiều phòng song song.

**Cột mốc:** chơi trọn ván không cần MC, không thể gian lận bằng DevTools, MC/người chơi rớt không sập ván.

### Phase 2 — Tài khoản, chống gian lận, matchmaking *(4–6 tuần)*
- Đăng nhập thật: Google / Apple / email / phone.
- Hồ sơ người chơi, chống multi-account, hệ thống **ban/report**.
- Matchmaking tự động (quick match) + phòng public/private + mời bạn.
- Xếp hạng/ELO cơ bản, lịch sử trận.
- Anti-bot, rate limit, chống spam.

**Cột mốc:** người lạ ghép trận tự động, có định danh ổn định, phạt được người xấu.

### Phase 3 — An toàn nội dung & tuân thủ *(3–5 tuần) — bắt buộc để lên store*
- **Kiểm duyệt chat**: lọc từ ngữ, report/block, log để xử lý.
- **Age-gate** + bảo vệ trẻ em (COPPA); tuân thủ **Nghị định 13/2023** (VN), GDPR/CCPA nếu có user nước ngoài.
- Hoàn thiện ToS + Privacy Policy chính thức.
- Cơ chế xử lý khiếu nại, xóa dữ liệu theo yêu cầu.

**Cột mốc:** đủ điều kiện nộp App Store / Google Play.

### Phase 4 — Trải nghiệm & bản sắc *(4–8 tuần)*
- Art/nhạc chuyên nghiệp (thuê hoặc mua license), branding, hiệu ứng.
- Đa ngôn ngữ (i18n), accessibility.
- Mở rộng bộ role (tận dụng danh sách 80/150 role đã có), cân bằng.
- Analytics, crash reporting, A/B testing.

**Cột mốc:** sản phẩm có bản sắc riêng, giữ chân người chơi.

### Phase 5 — Kiếm tiền *(3–5 tuần)*
- Cosmetics/skin, battle pass, vai/phòng premium, hoặc quảng cáo.
- Thanh toán: IAP của store (mobile) hoặc Stripe (web); tuân thủ thuế/hoàn tiền.
- Vòng lặp giữ chân: nhiệm vụ hằng ngày, mùa giải.

**Cột mốc:** có dòng doanh thu đầu tiên.

### Phase 6 — Voice in-app & mở rộng *(tùy nguồn lực)*
- Voice trong app qua WebRTC (Agora/LiveKit/Twilio) — trải nghiệm tốt hơn hẳn app ngoài, nhưng là chi phí vận hành đáng kể.
- Multi-region, tối ưu độ trễ, mở rộng quy mô.

---

## 5. Bảng ưu tiên nhanh

| Ưu tiên | Việc | Vì sao |
|---|---|---|
| 🔴 P0 | Server-authoritative + MC tự động | Không có → game gian lận được, mọi thứ khác vô nghĩa |
| 🔴 P0 | Tài khoản thật + ban/report | Chống multi-account, xử lý người xấu |
| 🟠 P1 | Kiểm duyệt chat + bảo vệ trẻ em + pháp lý | Điều kiện bắt buộc lên store |
| 🟠 P1 | Hạ tầng chịu tải (Blaze/backend riêng, Redis, monitoring) | Spark free không chịu nổi tải thương mại |
| 🟡 P2 | Matchmaking, ranking, art/nhạc pro, i18n | Giữ chân & bản sắc |
| 🟢 P3 | Kiếm tiền, voice in-app | Doanh thu & nâng trải nghiệm |

---

## 6. Rủi ro cần lưu ý

- **Bản quyền:** luật chơi Mafia/Werewolf là public domain, nhưng tên game, tên nhiều vai và art có thể vướng bản quyền → dùng tên & art gốc.
- **Chi phí hạ tầng leo thang:** realtime + voice tốn băng thông; cần mô hình chi phí theo số người chơi đồng thời (CCU).
- **Moderation là gánh nặng vận hành:** chat giữa người lạ → cần cả công cụ tự động lẫn quy trình xử lý người thật.
- **Phụ thuộc một MC (kiến trúc cũ):** phải bỏ hẳn ở Phase 1, đừng mang sang bản thương mại.
- **Bảo vệ trẻ em:** game xã hội có chat → App Store/Google Play xét rất kỹ.

---

## 7. Gợi ý thứ tự triển khai

Phase 0 → **Phase 1 (nền móng, làm kỹ)** → Phase 2 → Phase 3 (đủ điều kiện store) → ra mắt bản beta → Phase 4/5/6 theo phản hồi & nguồn lực.

Đừng nhảy tới kiếm tiền/voice trước khi Phase 1–3 xong: một game gian lận được hoặc bị store từ chối thì không thể thương mại.

---

*Ghi chú: ước lượng thời gian tính cho một nhóm nhỏ (1–3 dev); có thể co giãn theo nguồn lực và mức độ hoàn thiện mong muốn.*
