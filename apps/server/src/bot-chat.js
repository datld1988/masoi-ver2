'use strict';
/* Pool câu chat VN cho bot. Chia theo phase + tình huống.
   Bot chọn random 1 câu, có thể chèn tên player (${target}). Reply keyword đơn giản
   khi có người nhắc tên bot / hỏi vai / kêu vote. */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ── Câu mở đầu ngày (thảo luận vừa mở) ── */
const DAY_OPEN = [
  'Sáng rồi, ai chết vậy mọi người?',
  'Nghi ngờ ai chưa các bác?',
  'Đêm qua ai làm gì kể xem 👀',
  'Ai có info gì hay không?',
  'Tôi cảm giác có Sói ẩn nhẹ đấy',
  'Ai là Tiên Tri lên tiếng đi 🔮',
  'Bình tĩnh phân tích nào',
  'Ván này căng đấy',
  'Nhìn nhau đi mọi người',
  'Bảo Vệ có ở đây không?',
];

/* ── Nghi ngờ / cáo buộc một người ── */
const ACCUSE = [
  'Nghi ${target} đấy nha',
  '${target} có vẻ đáng ngờ',
  '${target} im lặng quá, nghi lắm',
  '${target} khai vai ra xem',
  'Tôi vote ${target}',
  '${target} là Sói chắc luôn',
  '${target} nói gì đi',
  'Cảm giác ${target} có gì đó...',
  '${target} phân tích như Sói giả Dân',
  '${target} tối qua làm gì?',
];

/* ── Bênh vực / phản bác ── */
const DEFEND = [
  'Không phải tôi đâu nha',
  'Tôi là Dân đấy 😤',
  'Vote tôi là thua ván này luôn',
  'Bình tĩnh nghe đã',
  'Tôi thề tôi là Dân',
  'Đừng vội, xem lại đêm qua',
  'Không có bằng chứng đừng vote bừa',
  'Tôi có role, đừng vote tôi',
  'Nghe tôi phân tích đã',
  'Vote tôi thì phe Dân thua',
];

/* ── Thảo luận trung tính ── */
const NEUTRAL = [
  'Hmm...',
  'Suy nghĩ đã',
  'Chưa chắc chắn được',
  '50-50 luôn',
  'Cần thêm info',
  'Ai có gì thì show ra đi',
  'Ai lead vote?',
  'Đọc lại đêm qua nào',
  'Ván này khó đọc',
  'Chờ Tiên Tri lên tiếng',
  '👀',
  '🤔',
  'Ok để tôi nghĩ',
  'Có Bảo Vệ chưa nhỉ?',
  'Phù Thủy đâu rồi?',
];

/* ── Khi vote đang mở ── */
const VOTE_OPEN = [
  'Vote ${target} đi',
  'Ai cũng vote ${target} không?',
  'Tôi chọn ${target}',
  'Chốt ${target}',
  'Đồng ý vote ${target}',
  'Không vote thì thua đấy',
  'Nhanh nào, sắp hết giờ',
  'Cuối cùng vote ai?',
];

/* ── Đêm — kênh Sói (bàn cắn) ── */
const NIGHT_WOLF = [
  'Cắn ${target} nhé?',
  '${target} nguy hiểm đấy, cắn',
  'Ăn ${target} đi',
  'Chọn ${target} nào',
  'Ai còn ý kiến khác không?',
  'OK cắn ${target}',
  'Chốt ${target}',
  '${target} có vẻ là Tiên Tri, cắn gấp',
];

/* ── Đêm — kênh Dead (âm phủ) ── */
const DEAD_CHAT = [
  'Ai giết tôi vậy 😭',
  'Chết oan quá',
  'Chúc mọi người còn sống thắng ván này',
  'Sói khôn ghê',
  'Tôi biết ai là Sói mà không nói được 😔',
  'Xem tiếp ván nào',
  'Ai chết chung nào?',
  'RIP',
];

/* ── Reply khi có người nhắc tên bot ── */
const REPLY_MENTION = [
  'Gọi tôi à?',
  'Sao?',
  'Có gì vậy?',
  'Tôi đây',
  'Nói đi',
  '?',
  'Tôi là Dân đấy',
];

/* ── Reply khi có người hỏi vai ── */
const REPLY_ROLE = [
  'Tôi là Dân thôi',
  'Bí mật 😏',
  'Có role đấy, chưa nói được',
  'Đợi tí',
  'Không có role đặc biệt',
  'Dân bình thường',
];

const REPLIES_TO_ACCUSE = [
  'Không phải tôi mà!',
  'Vote tôi là sai lầm đấy',
  'Tôi Dân mà',
  'Đừng vu oan',
  'Vote ai khác đi',
  'Có bằng chứng gì không?',
];

/** Chèn ${target} vào template. */
function fill(tpl, ctx = {}) {
  return String(tpl).replace(/\$\{(\w+)\}/g, (_, k) => ctx[k] || '');
}

/** Phát câu chat theo phase + kênh. Trả về text hoặc null nếu skip. */
export function genChat({ phase, channel, isWolf, isDead, targets = [], isVoteOpen = false }) {
  if (isDead && channel === 'dead') return pick(DEAD_CHAT);
  if (channel === 'wolf' && isWolf) {
    const t = targets.length ? pick(targets) : null;
    return t ? fill(pick(NIGHT_WOLF), { target: t }) : null;
  }
  if (channel !== 'main') return null;
  if (phase !== 'day') return null;
  if (isDead) return null;

  const r = Math.random();
  if (isVoteOpen) {
    if (r < 0.55 && targets.length) return fill(pick(VOTE_OPEN), { target: pick(targets) });
    return pick(NEUTRAL);
  }
  // Discussion
  if (r < 0.15) return pick(DAY_OPEN);
  if (r < 0.5 && targets.length) return fill(pick(ACCUSE), { target: pick(targets) });
  if (r < 0.65) return pick(DEFEND);
  return pick(NEUTRAL);
}

/** Reply keyword — trả text nếu match, null nếu không phản ứng. */
export function tryReply({ myName, incomingText, incomingFrom }) {
  const t = String(incomingText || '').toLowerCase();
  const n = String(myName || '').toLowerCase();
  if (!t || !n) return null;
  // Tên bot bị nhắc
  if (n && t.includes(n)) {
    if (/(vai|role|là ai|là gì)/.test(t)) return pick(REPLY_ROLE);
    if (/(sói|nghi|vote|treo|cắn)/.test(t)) return pick(REPLIES_TO_ACCUSE);
    return pick(REPLY_MENTION);
  }
  return null;
}
