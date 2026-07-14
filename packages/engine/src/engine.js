'use strict';
/* ══════════════════════════════════════════════════════════════════
   MA SÓI ONLINE – GAME ENGINE (thuần logic, KHÔNG DOM, KHÔNG Firebase)
   Dùng chung cho: host (MC), player client, server (sau này), test.
   Phiên bản 1: 22 role lõi. Logic port từ MaSoi_QuanTro.html.
   ══════════════════════════════════════════════════════════════════ */

const ROLES = [
  { id:'villager',       name:'Dân Làng',            icon:'🧑', team:'village' },
  { id:'wolf',           name:'Ma Sói',              icon:'🐺', team:'wolf' },
  { id:'seer',           name:'Tiên Tri',            icon:'🔮', team:'village' },
  { id:'witch',          name:'Phù Thủy',            icon:'🧙', team:'village' },
  { id:'bodyguard',      name:'Bảo Vệ',              icon:'🛡️', team:'village' },
  { id:'doctor',         name:'Bác Sĩ',              icon:'💉', team:'village' },
  { id:'hunter',         name:'Thợ Săn',             icon:'🏹', team:'village' },
  { id:'cupid',          name:'Cupid',               icon:'💘', team:'village' },
  { id:'elder',          name:'Già Làng',            icon:'👴', team:'village' },
  { id:'mayor',          name:'Trưởng Làng',         icon:'👑', team:'village' },
  { id:'littlegirl',     name:'Cô Bé Ti Hí',         icon:'👧', team:'village' },
  { id:'idiot',          name:'Kẻ Ngốc',             icon:'🃏', team:'village' },
  { id:'prince',         name:'Hoàng Tử',            icon:'🤴', team:'village' },
  { id:'apprenticeseer', name:'Tiên Tri Tập Sự',     icon:'🌟', team:'village' },
  { id:'cursedone',      name:'Kẻ Nguyền Rủa',       icon:'🩸', team:'village' },
  { id:'whitewolf',      name:'Sói Trắng',           icon:'🤍', team:'wolf' },
  { id:'wolfcub',        name:'Sói Con',             icon:'🐶', team:'wolf' },
  { id:'fakewolf',       name:'Sói Giả Dân',         icon:'🐺', team:'wolf' },
  { id:'hunterwolf',     name:'Sói Thợ Săn',         icon:'🐺', team:'wolf' },
  { id:'minion',         name:'Sói Phản Bội',        icon:'🐺', team:'wolf' },
  { id:'serialkiller',   name:'Sát Nhân Hàng Loạt',  icon:'🔪', team:'third' },
  { id:'joker',          name:'Kẻ Điên',             icon:'🤡', team:'third' },
];
const WOLF_IDS = ['wolf','whitewolf','wolfcub','fakewolf','hunterwolf','minion'];
// Sói "cắn" = mọi Sói trừ minion (minion không dậy cắn)
const BITING_WOLF_IDS = ['wolf','whitewolf','wolfcub','fakewolf','hunterwolf'];
// Tiên Tri soi thấy ĐỎ: sói thật, trừ fakewolf & minion (ngụy trang Dân)
const SEER_RED_IDS = ['wolf','whitewolf','wolfcub','hunterwolf'];

const roleOf = id => ROLES.find(r => r.id === id);

/* ─── KHỞI TẠO VÁN ─────────────────────────────────────────────── */
function createGame(names, counts, rng = Math.random) {
  const pool = [];
  for (const r of ROLES) for (let i = 0; i < (counts[r.id] || 0); i++) pool.push(r.id);
  if (pool.length !== names.length)
    throw new Error(`Số vai (${pool.length}) khác số người chơi (${names.length})`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    players: names.map((name, i) => ({
      id: i, name, roleId: pool[i], alive: true,
      elderHit: 0, idiotRevealed: false,
    })),
    night: 1, day: 1, phase: 'night',       // night | day | ended
    cupidPair: [],
    flags: {
      witchHealUsed: false, witchPoisonUsed: false,
      bodyguardLastIdx: null, wolfCubBonusKill: false,
      princeSaved: false, apprenticeActivated: false,
      hunterShotUsed: false,
    },
    winner: null,                            // 'village' | 'wolf' | 'third'
    log: [],
  };
}

/* ─── HELPERS ──────────────────────────────────────────────────── */
const alive      = s => s.players.filter(p => p.alive);
const aliveIdx   = s => s.players.map((p, i) => i).filter(i => s.players[i].alive);
const hasAlive   = (s, id) => s.players.some(p => p.alive && p.roleId === id);
const wolvesAlive= s => alive(s).filter(p => WOLF_IDS.includes(p.roleId));
const maxKill    = s => 1 + (s.flags.wolfCubBonusKill ? 1 : 0);
const pLabel     = p => `${p.name} (${roleOf(p.roleId).name})`;

/* ─── THÔNG TIN RIÊNG KHI CHIA BÀI ─────────────────────────────── */
// Trả về dữ liệu để ghi vào private/{uid} của từng người
function dealInfo(state) {
  // Chỉ danh sách Sói "thật" (cắn được) – minion KHÔNG nằm trong đây
  const bitingWolves = state.players
    .map((p, i) => ({ i, p }))
    .filter(({ p }) => BITING_WOLF_IDS.includes(p.roleId))
    .map(({ i, p }) => ({ id: i, name: p.name }));
  return state.players.map((p, idx) => {
    const r = roleOf(p.roleId);
    const info = { role: { id: r.id, name: r.name, icon: r.icon, team: r.team } };
    // Sói thật biết nhau (không biết minion); minion biết toàn bộ Sói thật (một chiều)
    if (BITING_WOLF_IDS.includes(p.roleId))
      info.mates = bitingWolves.filter(w => w.id !== idx);
    else if (p.roleId === 'minion')
      info.mates = bitingWolves;
    return info;
  });
}

/* ─── THỨ TỰ GỌI ĐÊM ───────────────────────────────────────────── */
function buildNightSteps(state) {
  const steps = [];
  const s = state;
  // Ma Sói LUÔN dậy đầu tiên
  if (wolvesAlive(s).some(p => BITING_WOLF_IDS.includes(p.roleId)))
    steps.push({ type: 'wolf', icon: '🐺', label: 'Ma Sói' });
  if (hasAlive(s, 'littlegirl') && steps.some(x => x.type === 'wolf'))
    steps.push({ type: 'littlegirl', icon: '👧', label: 'Cô Bé Ti Hí' });
  if (s.night === 1 && hasAlive(s, 'cupid'))
    steps.push({ type: 'cupid', icon: '💘', label: 'Cupid' });
  // Sói Trắng: đêm chẵn được cắn 1 Sói
  if (hasAlive(s, 'whitewolf') && s.night % 2 === 0)
    steps.push({ type: 'whitewolf', icon: '🤍', label: 'Sói Trắng' });
  if (hasAlive(s, 'seer'))
    steps.push({ type: 'seer', icon: '🔮', label: 'Tiên Tri' });
  if (hasAlive(s, 'bodyguard'))
    steps.push({ type: 'bodyguard', icon: '🛡️', label: 'Bảo Vệ' });
  if (hasAlive(s, 'doctor'))
    steps.push({ type: 'doctor', icon: '💉', label: 'Bác Sĩ' });
  if (hasAlive(s, 'witch') && (!s.flags.witchHealUsed || !s.flags.witchPoisonUsed))
    steps.push({ type: 'witch', icon: '🧙', label: 'Phù Thủy' });
  if (hasAlive(s, 'hunter') && !s.flags.hunterShotUsed)
    steps.push({ type: 'hunter', icon: '🏹', label: 'Thợ Săn' });
  if (hasAlive(s, 'serialkiller'))
    steps.push({ type: 'serialkiller', icon: '🔪', label: 'Sát Nhân' });
  return steps;
}

function newNightData() {
  return {
    wolfTargets: [], littleGirlCaught: false,
    whitewolfTarget: null, seerTarget: null, seerResult: null,
    bodyguardTarget: null, doctorTarget: null,
    witchHealTarget: null, witchPoison: null,
    hunterTarget: null, skTarget: null,
    stepLog: [],
  };
}

/* ─── HÀNH ĐỘNG ĐÊM ────────────────────────────────────────────────
   applyNightAction(state, nd, stepType, payload)
   payload: { targets:[idx...] } hoặc dạng riêng từng step (xem dưới).
   Trả về { ok, error?, private? } – private là kết quả chỉ người đó thấy.
   Không hành động (bỏ lượt) = không gọi, hoặc payload null.            */
function applyNightAction(state, nd, stepType, payload) {
  const s = state, t = payload && payload.targets;
  const bad = msg => ({ ok: false, error: msg });
  const checkAlive = idx => idx != null && s.players[idx] && s.players[idx].alive;

  switch (stepType) {
    case 'cupid': {
      if (!t || t.length !== 2 || t[0] === t[1] || !t.every(checkAlive)) return bad('Cupid phải chọn đúng 2 người khác nhau còn sống');
      s.cupidPair = [...t];
      nd.stepLog.push(`💘 Cupid ghép đôi: ${t.map(i => s.players[i].name).join(' & ')}`);
      return { ok: true };
    }
    case 'wolf': {
      if (!t || t.length < 1 || t.length > maxKill(s)) return bad(`Sói chọn 1–${maxKill(s)} nạn nhân`);
      if (!t.every(checkAlive)) return bad('Mục tiêu phải còn sống');
      if (t.some(i => WOLF_IDS.includes(s.players[i].roleId))) return bad('Sói không cắn Sói');
      nd.wolfTargets = [...t];
      nd.stepLog.push(`🐺 Sói cắn: ${t.map(i => s.players[i].name).join(', ')}`);
      return { ok: true };
    }
    case 'littlegirl': { // MC quyết định: cô bé có bị bắt gặp không
      nd.littleGirlCaught = !!(payload && payload.caught);
      nd.stepLog.push(nd.littleGirlCaught ? '👧 Cô Bé BỊ PHÁT HIỆN!' : '👧 Cô Bé nhìn trộm an toàn');
      return { ok: true };
    }
    case 'whitewolf': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (!WOLF_IDS.includes(s.players[i].roleId) || s.players[i].roleId === 'whitewolf')
        return bad('Sói Trắng chỉ cắn Sói khác');
      nd.whitewolfTarget = i;
      nd.stepLog.push(`🤍 Sói Trắng cắn: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'seer': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const p = s.players[i];
      const isRed = SEER_RED_IDS.includes(p.roleId);
      nd.seerTarget = i; nd.seerResult = isRed ? 'wolf' : 'village';
      nd.stepLog.push(`🔮 Tiên Tri soi ${pLabel(p)} → ${isRed ? 'SÓI' : 'không phải Sói'}`);
      return { ok: true, private: { seen: isRed ? 'wolf' : 'village', name: p.name } };
    }
    case 'bodyguard': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (i === s.flags.bodyguardLastIdx) return bad('Không bảo vệ 1 người 2 đêm liền');
      nd.bodyguardTarget = i;
      nd.stepLog.push(`🛡️ Bảo Vệ chắn: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'doctor': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.doctorTarget = i;
      nd.stepLog.push(`💉 Bác Sĩ cứu: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'witch': { // payload: { heal: idx|null, poison: idx|null }
      const { heal = null, poison = null } = payload || {};
      // Kiểm tra TẤT CẢ trước, chỉ ghi flags/nd khi hợp lệ hết (giao dịch nguyên tử)
      if (heal != null) {
        if (s.flags.witchHealUsed) return bad('Bình cứu đã dùng');
        if (!checkAlive(heal)) return bad('Mục tiêu cứu không hợp lệ');
      }
      if (poison != null) {
        if (s.flags.witchPoisonUsed) return bad('Bình độc đã dùng');
        if (!checkAlive(poison)) return bad('Mục tiêu độc không hợp lệ');
      }
      if (heal != null && poison != null && heal === poison)
        return bad('Không cứu và độc cùng một người');
      // Đã hợp lệ → mới ghi
      if (heal != null) {
        nd.witchHealTarget = heal; s.flags.witchHealUsed = true;
        nd.stepLog.push(`💊 Phù Thủy cứu: ${s.players[heal].name}`);
      }
      if (poison != null) {
        nd.witchPoison = poison; s.flags.witchPoisonUsed = true;
        nd.stepLog.push(`☠️ Phù Thủy độc: ${s.players[poison].name}`);
      }
      return { ok: true };
    }
    case 'hunter': {
      const i = t && t[0];
      if (s.flags.hunterShotUsed) return bad('Thợ Săn đã dùng phát đạn duy nhất');
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.hunterTarget = i;
      s.flags.hunterShotUsed = true; // CHỈ 1 PHÁT TRONG CẢ VÁN
      nd.stepLog.push(`🏹 Thợ Săn nhắm (phát duy nhất): ${s.players[i].name}`);
      return { ok: true };
    }
    case 'serialkiller': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'serialkiller') return bad('Không tự giết mình');
      nd.skTarget = i;
      nd.stepLog.push(`🔪 Sát Nhân giết: ${s.players[i].name}`);
      return { ok: true };
    }
    default: return bad(`Step không hỗ trợ: ${stepType}`);
  }
}

/* ─── GIẾT NGƯỜI CHƠI (chain passive) ──────────────────────────── */
// Trả về danh sách các dòng log sinh ra từ hiệu ứng dây chuyền
function killPlayer(state, i, source, deaths) {
  const s = state, p = s.players[i];
  const lines = [];
  if (!p || !p.alive || deaths.has(i)) return lines;
  deaths.add(i);
  p.alive = false;
  lines.push(`💀 ${pLabel(p)} chết – ${source}`);

  // Sói Con chết → đêm sau bầy Sói cắn thêm 1
  if (p.roleId === 'wolfcub') {
    s.flags.wolfCubBonusKill = true;
    lines.push('🐶 Sói Con chết → đêm sau Sói được cắn thêm 1 người!');
  }
  // Tiên Tri chết → Tập Sự kế thừa
  if (p.roleId === 'seer') {
    const ap = s.players.findIndex(x => x.alive && x.roleId === 'apprenticeseer');
    if (ap >= 0) {
      s.players[ap].roleId = 'seer'; s.flags.apprenticeActivated = true;
      lines.push(`🌟 Tiên Tri Tập Sự ${s.players[ap].name} kế thừa thành Tiên Tri!`);
    }
  }
  // Cupid chain
  if (s.cupidPair.includes(i)) {
    const partner = s.cupidPair.find(x => x !== i);
    if (partner != null && s.players[partner].alive)
      lines.push(...killPlayer(s, partner, `chết theo người yêu ${p.name} (Cupid)`, deaths));
  }
  return lines;
}

/* ─── PHÂN GIẢI BUỔI SÁNG ──────────────────────────────────────── */
// Trả về { deaths:[idx], publicLines:[], secretLines:[], events:[] }
// events: ['hunterwolfRevenge'] nếu cần MC/host xử lý thêm
function resolveMorning(state, nd) {
  const s = state;
  const publicLines = [], secretLines = [], deaths = new Set();
  const saved = i =>
    nd.bodyguardTarget === i || nd.doctorTarget === i || nd.witchHealTarget === i;
  const savedWhy = i =>
    nd.bodyguardTarget === i ? '🛡️ Bảo Vệ chắn' :
    nd.doctorTarget   === i ? '💉 Bác Sĩ cứu' : '💊 Phù Thủy cứu';

  // Cô Bé bị bắt gặp → chết thay toàn bộ nạn nhân của Sói
  let wolfTargets = [...nd.wolfTargets];
  if (nd.littleGirlCaught) {
    const lg = s.players.findIndex(p => p.alive && p.roleId === 'littlegirl');
    if (lg >= 0) {
      publicLines.push(`👧 ${s.players[lg].name} (Cô Bé Ti Hí) bị Sói phát hiện → chết thay nạn nhân!`);
      publicLines.push(...killPlayer(s, lg, 'bị Sói xé xác khi nhìn trộm', deaths));
      wolfTargets = [];
    }
  }

  // Sói cắn
  if (wolfTargets.length === 0 && !nd.littleGirlCaught)
    publicLines.push('🌙 Sói không cắn ai đêm nay.');
  for (const i of wolfTargets) {
    const p = s.players[i];
    if (!p.alive) continue;
    if (saved(i)) { publicLines.push(`${savedWhy(i)} – ${p.name} sống sót!`); continue; }
    if (p.roleId === 'cursedone') {
      p.roleId = 'wolf';
      publicLines.push(`🩸 ${p.name} bị cắn nhưng không chết...`); // công khai mập mờ
      secretLines.push(`🩸 Kẻ Nguyền Rủa ${p.name} → TRỞ THÀNH SÓI!`);
      continue;
    }
    if (p.roleId === 'elder') {
      p.elderHit++;
      if (p.elderHit < 2) { publicLines.push(`👴 ${p.name} (Già Làng) bị cắn lần 1 → vẫn sống!`); continue; }
    }
    publicLines.push(...killPlayer(s, i, 'bị Sói cắn', deaths));
  }

  // Sói Trắng cắn Sói
  if (nd.whitewolfTarget != null && s.players[nd.whitewolfTarget].alive) {
    const i = nd.whitewolfTarget;
    if (saved(i)) publicLines.push(`${savedWhy(i)} – ${s.players[i].name} sống sót!`);
    else publicLines.push(...killPlayer(s, i, 'bị Sói Trắng phản bội cắn', deaths));
  }
  // Sát Nhân
  if (nd.skTarget != null && s.players[nd.skTarget].alive) {
    const i = nd.skTarget;
    if (saved(i)) publicLines.push(`${savedWhy(i)} – ${s.players[i].name} sống sót!`);
    else publicLines.push(...killPlayer(s, i, 'bị Sát Nhân Hàng Loạt giết', deaths));
  }
  // Thợ Săn bắn
  if (nd.hunterTarget != null && s.players[nd.hunterTarget].alive) {
    const i = nd.hunterTarget;
    if (saved(i)) publicLines.push(`${savedWhy(i)} – ${s.players[i].name} sống sót!`);
    else publicLines.push(...killPlayer(s, i, 'bị Thợ Săn bắn', deaths));
  }
  // Phù Thủy độc (không thể cứu)
  if (nd.witchPoison != null && s.players[nd.witchPoison].alive)
    publicLines.push(...killPlayer(s, nd.witchPoison, 'bị Phù Thủy đầu độc', deaths));

  // Thông tin bí mật cho MC
  if (nd.seerTarget != null)
    secretLines.push(`🔮 Tiên Tri soi ${pLabel(s.players[nd.seerTarget])} → ${nd.seerResult === 'wolf' ? '🔴 SÓI' : '🔵 Dân'}`);
  if (nd.bodyguardTarget != null) secretLines.push(`🛡️ Bảo Vệ chắn: ${s.players[nd.bodyguardTarget].name}`);
  if (nd.doctorTarget != null)    secretLines.push(`💉 Bác Sĩ cứu: ${s.players[nd.doctorTarget].name}`);
  if (s.cupidPair.length === 2 && s.night === 1)
    secretLines.push(`💘 Cupid ghép: ${s.cupidPair.map(i => s.players[i].name).join(' & ')}`);

  // Cập nhật flags cuối đêm
  s.flags.bodyguardLastIdx = nd.bodyguardTarget;
  if (nd.wolfTargets.length > 0) s.flags.wolfCubBonusKill = false; // bonus đã dùng
  s.phase = 'day';

  const events = [];
  // Sói Thợ Săn chết trong đêm → không có quyền kéo (chỉ khi bị treo) – không event.
  const win = checkWin(s);
  if (win) { s.phase = 'ended'; s.winner = win.winner; }
  return { deaths: [...deaths], publicLines, secretLines, events, win };
}

/* ─── TREO CỔ BAN NGÀY ─────────────────────────────────────────── */
// Trả về { blocked, lines, events, win }
// events: ['hunterwolfRevenge'] → host phải gọi applyRevenge sau đó
function resolveHang(state, idx) {
  const s = state, p = s.players[idx];
  const lines = [], events = [];
  if (!p || !p.alive) return { blocked: true, lines: ['Người này đã chết.'], events, win: null };

  // Hoàng Tử: lần đầu bị treo → hủy án
  if (p.roleId === 'prince' && !s.flags.princeSaved) {
    s.flags.princeSaved = true;
    lines.push(`🤴 ${p.name} lật bài Hoàng Tử – bản án bị HỦY!`);
    return { blocked: true, lines, events, win: null };
  }
  // Kẻ Ngốc: không chết, mất quyền vote
  if (p.roleId === 'idiot' && !p.idiotRevealed) {
    p.idiotRevealed = true;
    lines.push(`🃏 ${p.name} là Kẻ Ngốc – không chết nhưng mất quyền bỏ phiếu!`);
    return { blocked: true, lines, events, win: null };
  }
  // Kẻ Điên: bị treo là THẮNG
  if (p.roleId === 'joker') {
    const deaths = new Set();
    lines.push(...killPlayer(s, idx, 'bị dân làng treo cổ', deaths));
    lines.push(`🤡 ${p.name} là KẺ ĐIÊN – bị treo đúng ý muốn → Kẻ Điên THẮNG!`);
    s.phase = 'ended'; s.winner = 'third';
    return { blocked: false, lines, events, win: { winner: 'third', reason: 'joker' } };
  }

  const deaths = new Set();
  lines.push(...killPlayer(s, idx, 'bị dân làng treo cổ', deaths));
  if (p.roleId === 'hunterwolf') events.push('hunterwolfRevenge'); // kéo 1 người chết theo

  const win = checkWin(s);
  if (win) { s.phase = 'ended'; s.winner = win.winner; }
  return { blocked: false, lines, events, win };
}

// Sói Thợ Săn bị treo → kéo 1 người chết theo
function applyRevenge(state, targetIdx) {
  const deaths = new Set();
  const lines = killPlayer(state, targetIdx, 'bị Sói Thợ Săn kéo chết theo', deaths);
  const win = checkWin(state);
  if (win) { state.phase = 'ended'; state.winner = win.winner; }
  return { lines, win };
}

/* ─── SANG ĐÊM MỚI ─────────────────────────────────────────────── */
function nextNight(state) {
  state.night++; state.day++; state.phase = 'night';
}

/* ─── ĐIỀU KIỆN THẮNG ──────────────────────────────────────────── */
function checkWin(state) {
  const a = alive(state);
  const wolves = a.filter(p => WOLF_IDS.includes(p.roleId));
  const skAlive = a.some(p => p.roleId === 'serialkiller');
  const villagers = a.filter(p => !WOLF_IDS.includes(p.roleId) && p.roleId !== 'serialkiller');

  if (a.length === 1 && a[0].roleId === 'serialkiller')
    return { winner: 'third', reason: 'serialkiller', desc: `${a[0].name} là người sống sót cuối cùng!` };
  if (a.length === 1 && a[0].roleId === 'whitewolf')
    return { winner: 'wolf', reason: 'whitewolf', desc: `Sói Trắng ${a[0].name} phản bội tất cả!` };
  if (wolves.length === 0 && !skAlive)
    return { winner: 'village', reason: 'allWolvesDead', desc: 'Toàn bộ Ma Sói đã bị tiêu diệt!' };
  if (wolves.length > 0 && !skAlive && wolves.length >= villagers.length)
    return { winner: 'wolf', reason: 'wolfMajority', desc: `Sói (${wolves.length}) ≥ Dân (${villagers.length})!` };
  return null;
}

/* ─── VOTE (đếm phiếu, nhân đôi Trưởng Làng, chặn Kẻ Ngốc) ─────── */
// votes: { voterIdx: targetIdx }
function tallyVotes(state, votes) {
  const tally = {};
  for (const [voter, target] of Object.entries(votes)) {
    const v = state.players[+voter];
    if (!v || !v.alive || v.idiotRevealed) continue;      // Kẻ Ngốc đã lộ: mất quyền
    const weight = v.roleId === 'mayor' ? 2 : 1;           // Trưởng Làng ×2
    tally[target] = (tally[target] || 0) + weight;
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const top = entries.length && (entries.length === 1 || entries[0][1] > entries[1][1])
    ? +entries[0][0] : null;                               // null = hòa/không phiếu
  return { tally, top, tie: top === null && entries.length > 1 };
}

/* ─── EXPORT (node + browser) ──────────────────────────────────── */
const MaSoiEngine = {
  ROLES, WOLF_IDS, BITING_WOLF_IDS, SEER_RED_IDS, roleOf,
  createGame, dealInfo, buildNightSteps, newNightData,
  applyNightAction, resolveMorning, resolveHang, applyRevenge,
  nextNight, checkWin, tallyVotes,
};
if (typeof module !== 'undefined' && module.exports) module.exports = MaSoiEngine;
if (typeof globalThis !== 'undefined') globalThis.MaSoiEngine = MaSoiEngine;
