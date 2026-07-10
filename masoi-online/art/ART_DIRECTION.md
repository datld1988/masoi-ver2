# Art Direction – Bộ tranh role Ma Sói (gothic u tối)

## Cách dùng

1. Chọn công cụ: **Midjourney** (đẹp + đồng nhất nhất, có phí) / **Leonardo.ai** (miễn phí ~150 ảnh/ngày) / **Ideogram** / **DALL·E 3** (qua ChatGPT/Copilot, miễn phí qua Bing Image Creator).
2. Tạo **lá Ma Sói trước tiên**. Chọn ảnh ưng nhất làm "ảnh gốc phong cách".
   - Midjourney: các lá sau thêm `--sref <link ảnh gốc>` để khóa phong cách.
   - Công cụ khác: giữ nguyên KHỐI PHONG CÁCH CHUNG ở mọi prompt (đã làm sẵn bên dưới).
3. Mỗi role tạo 4 ảnh, chọn 1. Xuất **1024×1536 (dọc 2:3)**, đặt tên theo `id` (vd `wolf.png`), bỏ vào thư mục `masoi-online/art/`.
4. Xong gửi tôi — tôi nén sang webp, ghép vào thẻ vai player.html + app offline.

## Khối phong cách chung (dán vào ĐẦU mọi prompt)

```
Dark gothic tarot card illustration, dramatic chiaroscuro lighting, deep indigo-violet
night palette, single glowing light source, faceless silhouette figure, ornate antique
gold engraved frame border, mist and bare trees, painterly dark fantasy card game art,
muted desaturated colors with one strong accent color, vertical 2:3 portrait,
no text, no letters, no watermark, no human face details
```

Negative prompt (công cụ nào hỗ trợ thì thêm): `text, watermark, logo, bright daylight, cartoon, cute, anime, photorealistic face, extra limbs`

Quy ước màu nhấn theo phe: **Phe Sói = đỏ máu** · **Phe Dân = ánh trăng tím nhạt/lam** · **Phe thứ ba = hổ phách/xanh độc**.

## Prompt từng role (nối sau khối phong cách chung)

| id | Role | Prompt riêng |
|---|---|---|
| wolf | Ma Sói | a monstrous wolf silhouette howling on a rocky ridge under a huge full moon, glowing blood-red eyes, accent color blood red |
| whitewolf | Sói Trắng | a lone pale white wolf standing apart from a distant wolf pack, snow drifting, cold moonlight, accent color icy white with blood red eyes |
| wolfcub | Sói Con | a small wolf cub silhouette sitting alone at the mouth of a dark den, oversized glowing red eyes, mother wolf shadow looming behind, accent color blood red |
| fakewolf | Sói Giả Dân | a wolf silhouette wrapped in a villager's hooded cloak, wolf tail visible beneath the hem, holding a lantern, accent color blood red glow inside the hood |
| hunterwolf | Sói Thợ Săn | a wolf silhouette standing upright holding a broken hunting bow, arrows scattered, gallows shadow in background, accent color blood red |
| minion | Sói Phản Bội | a hunched human silhouette kneeling before glowing wolf eyes in the darkness, offering a dagger, accent color blood red |
| villager | Dân Làng | a humble villager silhouette holding a dim lantern on a foggy village path, wooden houses and church spire behind, accent color warm lantern amber against violet night |
| seer | Tiên Tri | a hooded faceless figure cradling a glowing crystal orb, constellation symbols floating, third eye emblem above the hood, accent color pale cyan glow |
| apprenticeseer | Tiên Tri Tập Sự | a young small hooded figure reaching toward a faintly glowing cracked crystal orb, larger abandoned cloak beside, accent color faint cyan |
| witch | Phù Thủy | a witch silhouette with pointed hat stirring a bubbling cauldron, two potion vials on her belt one red one green, crescent moon, accent color poison green |
| bodyguard | Bảo Vệ | an armored knight silhouette holding a tall battered shield planted in the ground, protecting a small cottage behind, accent color pale silver moonlight |
| doctor | Bác Sĩ | a plague doctor silhouette with beaked mask and wide-brim hat holding a glowing medicine flask, accent color pale teal glow |
| hunter | Thợ Săn | a hunter silhouette drawing a longbow aimed at the moon, wolf pelts on his shoulder, accent color ember orange arrowhead |
| cupid | Cupid | a dark cherub silhouette with tattered wings holding a bow, two glowing hearts bound by a red thread of fate, accent color deep rose red |
| elder | Già Làng | an old hunched villager silhouette with a gnarled walking staff, long beard, two faint spirit flames circling him, accent color pale gold |
| mayor | Trưởng Làng | a portly dignified silhouette wearing a chain of office and holding a gavel, standing on village hall steps, accent color regal gold |
| littlegirl | Cô Bé Ti Hí | a small girl silhouette peeking through fingers covering her eyes, giant wolf shadows on the wall behind her, accent color pale violet |
| idiot | Kẻ Ngốc | a jester silhouette with bell cap laughing on the gallows steps, broken noose hanging above, accent color faded motley amber |
| prince | Hoàng Tử | a proud royal silhouette with crown revealing a glowing royal seal card, torn execution notice at his feet, accent color royal gold |
| cursedone | Kẻ Nguyền Rủa | a villager silhouette clutching a glowing bite wound on the forearm, half of his shadow forming a wolf shape, accent color cursed crimson |
| serialkiller | Sát Nhân Hàng Loạt | a lean silhouette in a long coat holding a curved knife behind his back, tally marks scratched on the wall, accent color cold steel with amber street light |
| joker | Kẻ Điên | a grinning jester silhouette embracing a noose like a dance partner, confetti falling like ash, accent color sickly amber |

## Bộ nhận diện cho Store (tùy chọn, làm sau khi ưng 22 lá)

- **App icon**: `dark gothic app icon, snarling wolf head silhouette inside a gold ornate circular frame, full moon behind, deep indigo background, flat vector style, centered, no text` (xuất 1024×1024).
- **Splash screen**: khối phong cách chung + `a misty village at night under a giant full moon, wolf silhouette on a distant hill, empty foreground for logo placement` (1080×2340 dọc).
- **Feature graphic Google Play** (1024×500 ngang): `panoramic dark gothic village at night, villagers with lanterns on the left facing glowing wolf eyes in the forest on the right, full moon center`.

## Ghi chú kỹ thuật khi ghép vào game

- Định dạng cuối: webp chất lượng 80, ~150–250KB/ảnh, giữ tên theo `id` ở bảng trên.
- Thẻ vai sẽ crop theo tỉ lệ 2:3 — để chủ thể ở 2/3 giữa khung, tránh chi tiết quan trọng sát mép.
- Nếu công cụ vẽ kèm khung vàng không đều giữa các lá: chấp nhận được, tôi sẽ crop bỏ khung AI và dùng khung vàng CSS/SVG thống nhất của app (như mockup) — chủ thể + nền mới là phần cần lấy.
