'use strict';
/* Pool persona cho bot — tên VN thường gặp + seed dicebear.
   Bot dùng ID prefix "bot_" để phân biệt với người thật. */

export const BOT_ID_PREFIX = 'bot_';
export const isBotId = (id) => typeof id === 'string' && id.startsWith(BOT_ID_PREFIX);

/* 60 tên VN đơn giản, tránh trùng với tên thật quá phổ biến.
   Ưu tiên tên 1-2 tiếng để trông tự nhiên trong roster. */
const NAMES = [
  'Minh', 'Lan', 'Hùng', 'Trang', 'Nam', 'Linh', 'Tuấn', 'Hà', 'Phong', 'Ngọc',
  'Khôi', 'Thảo', 'Đạt', 'Vy', 'Bảo', 'My', 'Long', 'Chi', 'Sơn', 'Anh',
  'Duy', 'Hương', 'Kiên', 'Nhi', 'Quân', 'Trâm', 'Việt', 'Yến', 'Toàn', 'Nga',
  'Hải', 'Thu', 'Đông', 'Diễm', 'Phúc', 'Hoa', 'Trung', 'Xuân', 'Bình', 'Hiền',
  'Kha', 'Tú', 'Vinh', 'Loan', 'Cường', 'Mai', 'Đức', 'Hồng', 'Tài', 'Uyên',
  'Nguyên', 'Thanh', 'Khánh', 'Nhung', 'Sáng', 'Dung', 'Thắng', 'Quỳnh', 'Lâm', 'Kim',
];

let personaCounter = 0;

/** Sinh N persona bot (id + name), tránh trùng name với người đã có sẵn trong `existingNames`. */
export function makeBotPersonas(n, existingNames = []) {
  const taken = new Set(existingNames.map(x => String(x || '').toLowerCase()));
  const pool = NAMES.filter(n => !taken.has(n.toLowerCase()));
  // Xáo trộn để không luôn Minh/Lan trước
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let name = pool[i];
    if (!name) name = `Người ${1 + Math.floor(Math.random() * 900)}`;
    // Tránh trùng nếu người dùng đang dùng tên trong pool: thêm đuôi ngẫu nhiên nhẹ
    if (taken.has(name.toLowerCase())) name = name + Math.floor(10 + Math.random() * 89);
    taken.add(name.toLowerCase());
    personaCounter++;
    const id = BOT_ID_PREFIX + Date.now().toString(36) + '_' + personaCounter;
    out.push({ id, name });
  }
  return out;
}
