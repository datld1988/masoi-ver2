# Đánh giá UX/UI Game Ma Sói (Mobile Web & App)

## Tổng quan

  Tiêu chí                       Điểm
  -------------------------- --------
  UI Visual                    8.8/10
  UX Gameplay                  7.8/10
  Mobile Web                   8.0/10
  Khả năng chuyển sang App     9.2/10
  Accessibility                6.8/10

**Kết luận:** Giao diện đẹp, đồng bộ nhưng vẫn mang cảm giác "desktop
responsive" hơn là một ứng dụng mobile native.

## Ưu điểm

-   Theme tím -- vàng -- đen đồng nhất, phù hợp chủ đề Ma Sói.
-   Dark Mode dễ nhìn.
-   Thông tin đầy đủ trên một màn hình.
-   Phân cấp nội dung hợp lý: Trạng thái → Vai trò → Diễn biến → Lịch sử
    → Chat → Người chơi → Kết quả.

## Vấn đề UX

### 1. Scroll quá dài

-   Người chơi phải cuộn qua rất nhiều card.
-   Đề xuất: Bottom Navigation gồm **Game / Chat / Players / History /
    More**.

### 2. Thông tin quan trọng chưa nổi bật

Ưu tiên hiển thị: - Đêm/Ngày - Thời gian còn lại - Đến lượt ai

### 3. Vai trò người chơi chưa đủ nổi bật

Đưa card vai trò lên đầu, chiếm khoảng 40% màn hình đầu.

### 4. Chat quá nhỏ

Đổi sang màn hình riêng hoặc Bottom Sheet.

### 5. Danh sách người chơi

-   Avatar lớn hơn.
-   Touch target ≥ 44×44 px.
-   Hiển thị trạng thái sống/chết và voice rõ ràng.

## Vấn đề UI

-   Quá nhiều card gây nặng mắt.
-   Tăng khoảng trắng (16--20 px giữa các section).
-   Chuẩn hóa màu sắc:
    -   Primary: Purple
    -   Accent: Gold
    -   Danger: Red
    -   Success: Green
    -   Info: Blue
    -   Text: White

## Đánh giá Mobile Web

Hiện đạt khoảng **80%**.

Chưa tối ưu: - Scroll dài. - Header chiếm diện tích. - Chat nhỏ. - Nút
bấm hơi nhỏ. - Card dày.

## Định hướng thiết kế Application

Không nên bê nguyên giao diện web.

### Trang Game

-   Hero section:
    -   Đêm/Ngày
    -   Timer
    -   Số người sống/chết
    -   Vai trò
    -   Nút hành động

### Bottom Navigation

-   Game
-   Chat
-   Players
-   History
-   More

### Chat

-   Full screen.

### History

-   Timeline có thể thu gọn.

### Players

-   Grid 2 cột.
-   Avatar lớn.
-   Trạng thái rõ ràng.

## Tính năng App nên bổ sung

-   Push Notification.
-   Animation chuyển ngày/đêm.
-   Haptic khi vote hoặc tới lượt.
-   Voice indicator.
-   Gesture vuốt chuyển tab/lịch sử.

## Thứ tự ưu tiên redesign

1.  Bottom Navigation.
2.  Hero Section.
3.  Card vai trò.
4.  Timeline lịch sử.
5.  Chat riêng.
6.  Avatar và vùng chạm lớn hơn.
7.  Giảm số lượng card.

## Kết luận

-   Mobile Web: **8.2/10**
-   Nếu thiết kế lại theo hướng mobile-first cho Android/iOS: **9.5/10**
    là khả thi.
-   Mục tiêu là giảm thao tác cuộn, tăng khả năng đọc nhanh và tạo cảm
    giác ứng dụng game native.
