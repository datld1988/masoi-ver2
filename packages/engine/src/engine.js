'use strict';
/* ══════════════════════════════════════════════════════════════════
   MA SÓI ONLINE – GAME ENGINE v2 (65 roles)
   ══════════════════════════════════════════════════════════════════ */

const ROLES = [
  // VILLAGE
  { id:'villager',       name:'Dân Làng',              icon:'🧑',  team:'village', desc:'Quan sát, suy luận và bỏ phiếu.' },
  { id:'seer',           name:'Tiên Tri',              icon:'🔮',  team:'village', desc:'Mỗi đêm soi 1 người biết phe.' },
  { id:'witch',          name:'Phù Thủy',              icon:'🧙',  team:'village', desc:'1 thuốc cứu + 1 thuốc độc, mỗi loại dùng 1 lần.' },
  { id:'bodyguard',      name:'Bảo Vệ',               icon:'🛡️', team:'village', desc:'Mỗi đêm bảo vệ 1 người khỏi bị cắn.' },
  { id:'doctor',         name:'Bác Sĩ',               icon:'💉',  team:'village', desc:'Mỗi đêm cứu 1 người – chống cả Sói cắn lẫn thuốc độc Phù Thủy.' },
  { id:'hunter',         name:'Thợ Săn',              icon:'🏹',  team:'village', desc:'Một lần trong ván, ban đêm bắn chết 1 người bất kỳ, trừ chính mình.' },
  { id:'cupid',          name:'Cupid',                icon:'💘',  team:'village', desc:'Đêm 1: ghép đôi 2 người; một chết người kia chết theo.' },
  { id:'elder',          name:'Già Làng',             icon:'👴',  team:'village', desc:'Phải bị cắn 2 lần mới chết.' },
  { id:'mayor',          name:'Trưởng Làng',           icon:'👑',  team:'village', desc:'Phiếu bầu tính gấp đôi (thụ động).' },
  { id:'littlegirl',     name:'Cô Bé Ti Hí',          icon:'👧',  team:'village', desc:'Ban đêm hé mắt nhìn trộm Sói. Nếu Sói phát hiện, chết thay nạn nhân.' },
  { id:'idiot',          name:'Kẻ Ngốc',              icon:'🃏',  team:'village', desc:'Bị dân treo cổ → không chết nhưng mất quyền bỏ phiếu mãi.' },
  { id:'prince',         name:'Hoàng Tử',             icon:'🤴',  team:'village', desc:'Lần đầu bị treo cổ: lật bài, hủy bản án, ngày đó không ai chết.' },
  { id:'apprenticeseer', name:'Tiên Tri Tập Sự',      icon:'🌟',  team:'village', desc:'Kế thừa thành Tiên Tri khi Tiên Tri chính chết.' },
  { id:'cursedone',      name:'Kẻ Nguyền Rủa',        icon:'🩸',  team:'village', desc:'Dân lành; bị Sói cắn → không chết mà trở thành Sói từ đêm đó.' },
  { id:'fox',            name:'Cáo',                  icon:'🦊',  team:'village', desc:'Chọn 3 người – biết có Sói trong nhóm đó không.' },
  { id:'gravedigger',    name:'Người Gác Mộ',          icon:'⚰️', team:'village', desc:'Mỗi đêm kiểm tra role của 1 người đã chết.' },
  { id:'detective',      name:'Thám Tử',              icon:'🕵️', team:'village', desc:'So sánh 2 người – biết họ cùng phe hay khác phe.' },
  { id:'mature',         name:'Dân Trưởng Thành',      icon:'🧓',  team:'village', desc:'Bị cắn không chết ngay – chết vào sáng hôm sau.' },
  { id:'lycan',          name:'Kẻ Săn Đuổi',          icon:'🌕',  team:'village', desc:'Dân lành nhưng Tiên Tri soi ra là Sói.' },
  { id:'priest',         name:'Linh Mục',             icon:'✝️',  team:'village', desc:'Ban ngày ném nước thánh 1 lần – trúng Sói → Sói chết; trúng Dân → mình chết.' },
  { id:'avenger',        name:'Kẻ Báo Thù',           icon:'⚔️',  team:'village', desc:'Khi chết nguyền 1 người – nếu là Sói thì Sói đó chết theo.' },
  { id:'tracker',        name:'Kẻ Theo Dõi',          icon:'🔭',  team:'village', desc:'Mỗi đêm theo dõi 1 người – biết họ có rời nhà (dùng kỹ năng) đêm đó không.' },
  { id:'gunsmith',       name:'Xạ Thủ',               icon:'🔫',  team:'village', desc:'1 phát đạn – bắn ban ngày, trúng ai người đó chết ngay.' },
  { id:'magistrate',     name:'Quan Tòa',             icon:'🔨',  team:'village', desc:'Một lần phủ quyết bản án treo cổ của cả làng.' },
  { id:'gatekeeper',     name:'Kẻ Gác Cổng',          icon:'🚪',  team:'village', desc:'Mỗi đêm chặn 1 người – họ không thể dùng kỹ năng đêm đó.' },
  { id:'lamb',           name:'Cừu Non',              icon:'🐑',  team:'village', desc:'Khi bị Sói cắn chết, tiết lộ 1 Sói ngẫu nhiên cho cả bàn biết.' },
  { id:'medium',         name:'Nhà Linh Hồn',          icon:'🕯️', team:'village', desc:'Mỗi đêm liên lạc với 1 người đã chết để biết họ có phải Sói không.' },
  { id:'wildchild',      name:'Dã Nhân',              icon:'🐾',  team:'village', desc:'Đêm 1 chọn thần tượng. Thần tượng sống = phe Dân; thần tượng chết = thành Sói.' },
  { id:'diplomat',       name:'Nhà Ngoại Giao',        icon:'🕊️', team:'village', desc:'Mỗi đêm bảo hộ 1 người – họ không thể bị treo cổ ngày hôm sau.' },
  { id:'bountyhunter',   name:'Thợ Săn Tiền Thưởng',  icon:'🎖️', team:'village', desc:'Đêm 1 được giao mục tiêu bí mật. Thắng riêng khi mục tiêu đó chết.' },
  { id:'bloodymary',     name:'Bloody Mary',          icon:'🩷',  team:'village', desc:'Bị Sói cắn chết đêm → ngày hôm sau giết chính xác Sói đã cắn mình.' },
  { id:'icewitch',       name:'Nữ Phù Thủy Băng Giá', icon:'❄️',  team:'village', desc:'Mỗi đêm đóng băng 1 người – họ mất kỹ năng và miễn nhiễm cắn đêm đó.' },
  { id:'switcher',       name:'Kẻ Đánh Tráo',         icon:'🔄',  team:'village', desc:'Mỗi đêm hoán đổi 2 người – Sói cắn A nhưng thực ra B chết.' },
  { id:'king',           name:'Vua',                  icon:'👑',  team:'village', desc:'Bị cắn chết đêm → hôm sau cả làng không được treo cổ ai (quốc tang).' },
  { id:'queencard',      name:'Hoàng Hậu',            icon:'👸',  team:'village', desc:'Khi Vua chết → chọn ngay 1 người chết theo.' },
  { id:'hinter',         name:'Kẻ Gợi Ý',             icon:'💡',  team:'village', desc:'Mỗi đêm nhận chữ cái đầu tên 1 Sói còn sống ngẫu nhiên.' },
  // WOLF
  { id:'wolf',           name:'Ma Sói',               icon:'🐺',  team:'wolf',    desc:'Ban đêm cùng đồng đội chọn người cắn.' },
  { id:'whitewolf',      name:'Sói Trắng',            icon:'🤍',  team:'wolf',    desc:'Đêm chẵn có thể cắn chết 1 Sói khác. Thắng khi là người sống sót cuối cùng.' },
  { id:'wolfcub',        name:'Sói Con',              icon:'🐶',  team:'wolf',    desc:'Khi chết, đêm sau Sói được giết thêm 1 người.' },
  { id:'fakewolf',       name:'Sói Giả Dân',          icon:'🐺',  team:'wolf',    desc:'Tiên Tri soi sẽ thấy là Dân.' },
  { id:'hunterwolf',     name:'Sói Thợ Săn',          icon:'🐺',  team:'wolf',    desc:'Bị treo cổ ban ngày → kéo 1 người dân chết theo.' },
  { id:'minion',         name:'Sói Phản Bội',         icon:'🐺',  team:'wolf',    desc:'Biết mặt toàn bộ Sói từ đêm 1, bảo vệ Sói từ làng. Tiên Tri thấy là Dân.' },
  { id:'alpha',          name:'Sói Đầu Đàn',          icon:'🐺',  team:'wolf',    desc:'Miễn nhiễm lần soi đầu tiên của Tiên Tri.' },
  { id:'cursedwolf',     name:'Sói Nguyền',           icon:'🐺',  team:'wolf',    desc:'Một lần trong trận biến 1 người thành Sói.' },
  { id:'wolfseer',       name:'Sói Tiên Tri',         icon:'🐺',  team:'wolf',    desc:'Sau khi Sói cắn xong, soi chính xác role của nạn nhân.' },
  { id:'hellhound',      name:'Sói Lửa',              icon:'🐺',  team:'wolf',    desc:'Phun lửa 1 người – họ không chết ngay mà chết vào sáng hôm sau.' },
  { id:'direwolf',       name:'Sói Cuồng Nộ',         icon:'🐺',  team:'wolf',    desc:'Đêm 1 chọn tri kỷ. Khi tri kỷ chết, đêm đó cắn thêm 1 người.' },
  { id:'sorcerer',       name:'Sói Ma Thuật',         icon:'🐺',  team:'wolf',    desc:'Mỗi đêm kiểm tra 1 người – biết có phải Tiên Tri hoặc Phù Thủy không.' },
  { id:'hypnowolf',      name:'Sói Thao Túng',        icon:'🐺',  team:'wolf',    desc:'Mỗi đêm thôi miên 1 người – ngày hôm sau họ buộc bỏ phiếu theo ý Sói.' },
  { id:'bigbadwolf',     name:'Sói Khổng Lồ',         icon:'🐺',  team:'wolf',    desc:'Nếu chưa có Sói nào chết, đêm đó cắn thêm 1 người nữa.' },
  { id:'poisonwolf',     name:'Sói Độc',              icon:'🐺',  team:'wolf',    desc:'Cắn 1 người – nạn nhân không chết ngay mà chết vào sáng hôm sau.' },
  { id:'deserter',       name:'Kẻ Đào Ngũ',           icon:'🐺',  team:'wolf',    desc:'Biết mặt Sói đêm 1 nhưng không cắn. Chỉ tỉnh dậy cắn khi mọi Sói khác đã chết.' },
  // THIRD PARTY
  { id:'serialkiller',   name:'Sát Nhân Hàng Loạt',  icon:'🔪',  team:'third',   desc:'Mỗi đêm giết 1 người. Thắng khi là người sống sót cuối cùng.' },
  { id:'joker',          name:'Kẻ Điên',              icon:'🤡',  team:'third',   desc:'Thắng nếu bị dân làng treo cổ.' },
  { id:'traitor',        name:'Kẻ Phản Bội',          icon:'🎭',  team:'third',   desc:'Thành Sói nếu toàn bộ Sói chết.' },
  { id:'fluteplayer',    name:'Chàng Thổi Sáo',       icon:'🪈',  team:'third',   desc:'Mỗi đêm thôi miên 2 người. Thắng khi TẤT CẢ người sống bị thôi miên.' },
  { id:'hoodlum',        name:'Kẻ Thu Thập Linh Hồn', icon:'💀',  team:'third',   desc:'Đêm 1 chọn 3 mục tiêu. Thắng khi cả 3 đều đã chết.' },
  { id:'graverobber',    name:'Kẻ Trộm Mộ',           icon:'⛏️', team:'third',   desc:'Từ đêm 2: khai quật mộ người chết hôm trước, kế thừa role và phe của họ.' },
  { id:'challenger',     name:'Kẻ Thách Thức',        icon:'🎯',  team:'third',   desc:'Đêm 1 chọn kẻ thù. Thắng khi kẻ thù đó chết (bất kể cách nào).' },
  { id:'blackmailer',    name:'Kẻ Tống Tiền',         icon:'📬',  team:'third',   desc:'Mỗi đêm tống tiền 1 người – ngày sau họ phải bỏ phiếu theo ý Tống Tiền.' },
  { id:'doppelganger',   name:'Người Nhân Bản',        icon:'👥',  team:'third',   desc:'Đêm 1 chọn mục tiêu. Khi mục tiêu chết, nhân bản toàn bộ role và phe của họ.' },
  { id:'nighthunter',    name:'Kẻ Săn Đêm',           icon:'🌙',  team:'third',   desc:'Ban đêm nổ súng: trúng Sói → Sói chết; trúng Dân → mình chết.' },
  { id:'assassin',       name:'Kẻ Ám Sát',            icon:'🗡️', team:'third',   desc:'Đêm 1 chọn mục tiêu bí mật. Đêm 3 ám sát họ. Thắng độc lập.' },
  // NEUTRAL
  { id:'copycat',        name:'Người Sao Chép',        icon:'🪞',  team:'neutral', desc:'Đêm 1: chọn 1 người – sao chép toàn bộ role của họ.' },
  { id:'balancer',       name:'Kẻ Cân Bằng',          icon:'⚖️', team:'neutral', desc:'Đêm 1: liên kết 2 người – một chết người kia chết theo. Thắng khi số Dân = số Sói.' },
  { id:'survivor',       name:'Kẻ Sống Sót',           icon:'🛡️', team:'neutral', desc:'Có 1 khiên kháng cắn. Thắng nếu còn sống đến cuối bất kể phe nào thắng.' },
];

const WOLF_IDS = [
  'wolf','whitewolf','wolfcub','fakewolf','hunterwolf','minion',
  'alpha','cursedwolf','wolfseer','hellhound','direwolf','sorcerer',
  'hypnowolf','bigbadwolf','poisonwolf','deserter',
];
// Sói "cắn" trong bước wolf (không gồm: minion, cursedwolf dùng phép riêng, deserter chỉ khi active)
const BITING_WOLF_IDS = [
  'wolf','whitewolf','wolfcub','fakewolf','hunterwolf',
  'alpha','wolfseer','hellhound','direwolf','sorcerer',
  'hypnowolf','bigbadwolf','poisonwolf',
];
// Tiên Tri soi thấy ĐỎ (fakewolf, minion xuất hiện là Dân)
const SEER_RED_IDS = [
  'wolf','whitewolf','wolfcub','hunterwolf','alpha','wolfseer','hellhound',
  'direwolf','sorcerer','hypnowolf','bigbadwolf','poisonwolf','cursedwolf','deserter',
  'lycan', // dân nhưng sói theo seer
];
// Vai có hành động đêm (dùng cho Tracker)
const HAS_NIGHT_ACTION = new Set([
  'wolf','whitewolf','wolfcub','fakewolf','hunterwolf','alpha','wolfseer','hellhound',
  'direwolf','sorcerer','hypnowolf','bigbadwolf','poisonwolf','cursedwolf','deserter',
  'seer','witch','bodyguard','doctor','hunter','cupid','serialkiller',
  'gatekeeper','icewitch','switcher','diplomat','nighthunter','fluteplayer','blackmailer',
  'fox','detective','gravedigger','medium','copycat','wildchild','doppelganger',
  'hoodlum','challenger','balancer','assassin','bountyhunter','graverobber',
  'tracker','hinter','gunsmith','priest','magistrate','avenger','queencard',
]);

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
      elderHit: 0, idiotRevealed: false, alphaShielded: pool[i] === 'alpha',
    })),
    night: 1, day: 1, phase: 'night',
    cupidPair: [],
    flags: {
      witchHealUsed: false, witchPoisonUsed: false,
      bodyguardLastIdx: null, wolfCubBonusKill: false,
      princeSaved: false, apprenticeActivated: false,
      hunterShotUsed: false,
      // new flags
      cursedWolfUsed: false,
      direwolfAlly: null, direwolfBonus: false,
      maturePending: [], hellhoundPending: [], poisonwolfPending: [],
      wildChildIdol: null, wildChildBecameWolf: false,
      doppelgangerTarget: null,
      challengerTarget: null,
      bountyTarget: null,
      assassinTarget: null, assassinKillNight: null,
      hoodlumTargets: [],
      balancerPair: [],
      noVoteDay: 0,
      kingDiedThisNight: false,
      survivorShieldUsed: false,
      hypnoTarget: null,
      blackmailTarget: null,
      diplomatProtected: null,
      magistrateVetoUsed: false, magistrateVetoTarget: null,
      priestWaterUsed: false,
      gunsmithUsed: false,
      flutedPlayers: [],
      deserterActive: false,
      wolfDeathCount: 0,
    },
    winner: null,
    log: [],
  };
}

/* ─── HELPERS ──────────────────────────────────────────────────── */
const alive      = s => s.players.filter(p => p.alive);
const aliveIdx   = s => s.players.map((p, i) => i).filter(i => s.players[i].alive);
const hasAlive   = (s, id) => s.players.some(p => p.alive && p.roleId === id);
const wolvesAlive= s => alive(s).filter(p => WOLF_IDS.includes(p.roleId));
const maxKill    = s => 1 + (s.flags.wolfCubBonusKill ? 1 : 0) + (s.flags.direwolfBonus ? 1 : 0);
const pLabel     = p => `${p.name} (${roleOf(p.roleId).name})`;

/* ─── THÔNG TIN RIÊNG KHI CHIA BÀI ─────────────────────────────── */
function dealInfo(state) {
  const bitingWolves = state.players
    .map((p, i) => ({ i, p }))
    .filter(({ p }) => BITING_WOLF_IDS.includes(p.roleId))
    .map(({ i, p }) => ({ id: i, name: p.name }));
  return state.players.map((p, idx) => {
    const r = roleOf(p.roleId);
    const info = { role: { id: r.id, name: r.name, icon: r.icon, team: r.team } };
    if (BITING_WOLF_IDS.includes(p.roleId))
      info.mates = bitingWolves.filter(w => w.id !== idx);
    else if (p.roleId === 'minion' || p.roleId === 'deserter')
      info.mates = bitingWolves;
    return info;
  });
}

/* ─── THỨ TỰ GỌI ĐÊM ───────────────────────────────────────────── */
function buildNightSteps(state) {
  const steps = [];
  const s = state;
  const has = id => s.players.some(p => p.roleId === id);
  const hasA = id => hasAlive(s, id);
  const biting = wolvesAlive(s).some(p => BITING_WOLF_IDS.includes(p.roleId))
    || (s.flags.deserterActive && hasA('deserter'));

  if (biting)
    steps.push({ type: 'wolf', icon: '🐺', label: 'Ma Sói' });
  if (biting && hasA('littlegirl'))
    steps.push({ type: 'littlegirl', icon: '👧', label: 'Cô Bé Ti Hí' });
  if (hasA('gatekeeper'))
    steps.push({ type: 'gatekeeper', icon: '🚪', label: 'Kẻ Gác Cổng' });
  if (hasA('bigbadwolf') && s.flags.wolfDeathCount === 0)
    steps.push({ type: 'bigbadwolf', icon: '🐺', label: 'Sói Khổng Lồ' });
  if (hasA('whitewolf') && s.night % 2 === 0)
    steps.push({ type: 'whitewolf', icon: '🤍', label: 'Sói Trắng' });
  if (hasA('wolfseer'))
    steps.push({ type: 'wolfseer', icon: '🐺', label: 'Sói Tiên Tri' });
  if (hasA('sorcerer'))
    steps.push({ type: 'sorcerer', icon: '🐺', label: 'Sói Ma Thuật' });
  if (hasA('hypnowolf'))
    steps.push({ type: 'hypnowolf', icon: '🐺', label: 'Sói Thao Túng' });
  if (hasA('hellhound'))
    steps.push({ type: 'hellhound', icon: '🐺', label: 'Sói Lửa' });
  if (hasA('poisonwolf'))
    steps.push({ type: 'poisonwolf', icon: '🐺', label: 'Sói Độc' });
  if (s.night === 1 && has('direwolf'))
    steps.push({ type: 'direwolf', icon: '🐺', label: 'Sói Cuồng Nộ' });
  if (hasA('cursedwolf') && !s.flags.cursedWolfUsed)
    steps.push({ type: 'cursedwolf', icon: '🐺', label: 'Sói Nguyền' });
  if (s.night === 1 && has('minion'))
    steps.push({ type: 'minion', icon: '🐺', label: 'Sói Phản Bội' });
  if (s.night === 1 && has('deserter'))
    steps.push({ type: 'deserter', icon: '🐺', label: 'Kẻ Đào Ngũ' });
  if (s.night === 1 && has('copycat'))
    steps.push({ type: 'copycat', icon: '🪞', label: 'Người Sao Chép' });
  if (s.night === 1 && has('cupid'))
    steps.push({ type: 'cupid', icon: '💘', label: 'Cupid' });
  if (s.night === 1 && has('wildchild'))
    steps.push({ type: 'wildchild', icon: '🐾', label: 'Dã Nhân' });
  if (s.night === 1 && has('doppelganger'))
    steps.push({ type: 'doppelganger', icon: '👥', label: 'Người Nhân Bản' });
  if (s.night === 1 && has('bountyhunter'))
    steps.push({ type: 'bountyhunter', icon: '🎖️', label: 'Thợ Săn Tiền Thưởng' });
  if (s.night === 1 && has('hoodlum'))
    steps.push({ type: 'hoodlum', icon: '💀', label: 'Kẻ Thu Thập Linh Hồn' });
  if (s.night === 1 && has('challenger'))
    steps.push({ type: 'challenger', icon: '🎯', label: 'Kẻ Thách Thức' });
  if (s.night === 1 && has('balancer'))
    steps.push({ type: 'balancer', icon: '⚖️', label: 'Kẻ Cân Bằng' });
  const assN = s.flags.assassinKillNight;
  if ((s.night === 1 || s.night === assN) && has('assassin') && hasA('assassin'))
    steps.push({ type: 'assassin', icon: '🗡️', label: 'Kẻ Ám Sát' });
  if (has('hunter') && !s.flags.hunterShotUsed)
    steps.push({ type: 'hunter', icon: '🏹', label: 'Thợ Săn' });
  if (hasA('bodyguard'))
    steps.push({ type: 'bodyguard', icon: '🛡️', label: 'Bảo Vệ' });
  if (hasA('doctor'))
    steps.push({ type: 'doctor', icon: '💉', label: 'Bác Sĩ' });
  if (hasA('icewitch'))
    steps.push({ type: 'icewitch', icon: '❄️', label: 'Nữ Phù Thủy Băng Giá' });
  if (hasA('switcher'))
    steps.push({ type: 'switcher', icon: '🔄', label: 'Kẻ Đánh Tráo' });
  if (hasA('tracker'))
    steps.push({ type: 'tracker', icon: '🔭', label: 'Kẻ Theo Dõi' });
  if (hasA('seer'))
    steps.push({ type: 'seer', icon: '🔮', label: 'Tiên Tri' });
  if (hasA('fox'))
    steps.push({ type: 'fox', icon: '🦊', label: 'Cáo' });
  if (hasA('detective'))
    steps.push({ type: 'detective', icon: '🕵️', label: 'Thám Tử' });
  if (s.night >= 2 && has('graverobber') && hasA('graverobber'))
    steps.push({ type: 'graverobber', icon: '⛏️', label: 'Kẻ Trộm Mộ' });
  if (hasA('gravedigger'))
    steps.push({ type: 'gravedigger', icon: '⚰️', label: 'Người Gác Mộ' });
  if (hasA('medium'))
    steps.push({ type: 'medium', icon: '🕯️', label: 'Nhà Linh Hồn' });
  if (hasA('diplomat'))
    steps.push({ type: 'diplomat', icon: '🕊️', label: 'Nhà Ngoại Giao' });
  if (hasA('hinter'))
    steps.push({ type: 'hinter', icon: '💡', label: 'Kẻ Gợi Ý' });
  if (hasA('blackmailer'))
    steps.push({ type: 'blackmailer', icon: '📬', label: 'Kẻ Tống Tiền' });
  if (hasA('fluteplayer'))
    steps.push({ type: 'fluteplayer', icon: '🪈', label: 'Chàng Thổi Sáo' });
  if (hasA('serialkiller'))
    steps.push({ type: 'serialkiller', icon: '🔪', label: 'Sát Nhân' });
  if (hasA('nighthunter'))
    steps.push({ type: 'nighthunter', icon: '🌙', label: 'Kẻ Săn Đêm' });
  if (hasA('witch') && (!s.flags.witchHealUsed || !s.flags.witchPoisonUsed))
    steps.push({ type: 'witch', icon: '🧙', label: 'Phù Thủy' });
  if (hasA('priest') && !s.flags.priestWaterUsed)
    steps.push({ type: 'priest', icon: '✝️', label: 'Linh Mục' });
  if (hasA('gunsmith') && !s.flags.gunsmithUsed)
    steps.push({ type: 'gunsmith', icon: '🔫', label: 'Xạ Thủ' });
  if (hasA('magistrate') && !s.flags.magistrateVetoUsed)
    steps.push({ type: 'magistrate', icon: '🔨', label: 'Quan Tòa' });
  if (has('survivor') && !s.flags.survivorShieldUsed)
    steps.push({ type: 'survivor', icon: '🛡️', label: 'Kẻ Sống Sót' });
  if (s.flags.kingDiedThisNight && hasA('queencard'))
    steps.push({ type: 'queencard', icon: '👸', label: 'Hoàng Hậu' });
  return steps;
}

function newNightData() {
  return {
    wolfTargets: [], littleGirlCaught: false,
    whitewolfTarget: null, seerTarget: null, seerResult: null,
    bodyguardTarget: null, doctorTarget: null,
    witchHealTarget: null, witchPoison: null,
    hunterTarget: null, skTarget: null,
    // new
    gatekeeperTarget: null, icewitchTarget: null,
    switcherTargets: [],
    diplomatTarget: null,
    foxTargets: [], foxResult: null,
    detectiveTargets: [], detectiveResult: null,
    gravediggerTarget: null, gravediggerResult: null,
    mediumTarget: null, mediumResult: null,
    trackerTarget: null, trackerResult: null,
    sorcererTarget: null, sorcererResult: null,
    wolfSeerTarget: null, wolfSeerResult: null,
    hypnoTarget: null,
    bigbadwolfTarget: null,
    poisonwolfTarget: null,
    hellhoundTarget: null,
    cursedwolfTarget: null,
    direwolfTarget: null,
    copycatTarget: null,
    wildchildTarget: null,
    doppelgangerTarget: null,
    hoodlumTargets: [],
    challengerTarget: null,
    balancerPair: [],
    assassinPickTarget: null,
    assassinKillTarget: null,
    blackmailTarget: null,
    fluteTargets: [],
    nighthunterTarget: null,
    queencardTarget: null,
    priestTarget: null,
    gunsmithTarget: null,
    magistrateTarget: null,
    avengerCurseTarget: null,
    stepLog: [],
  };
}

/* ─── HÀNH ĐỘNG ĐÊM ─────────────────────────────────────────────── */
function applyNightAction(state, nd, stepType, payload) {
  const s = state, t = payload && payload.targets;
  const bad = msg => ({ ok: false, error: msg });
  const checkAlive = idx => idx != null && s.players[idx] && s.players[idx].alive;
  const isBlocked = i => nd.gatekeeperTarget === i || nd.icewitchTarget === i;

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
    case 'littlegirl': {
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
      // Alpha: miễn nhiễm lần soi đầu tiên
      if (p.roleId === 'alpha' && p.alphaShielded) {
        p.alphaShielded = false;
        nd.seerTarget = i; nd.seerResult = 'village';
        nd.stepLog.push(`🔮 Tiên Tri soi ${p.name} → (bị Alpha đánh lạc hướng) 🔵 Dân`);
        return { ok: true, private: { seen: 'village', name: p.name } };
      }
      const isRed = SEER_RED_IDS.includes(p.roleId);
      nd.seerTarget = i; nd.seerResult = isRed ? 'wolf' : 'village';
      nd.stepLog.push(`🔮 Tiên Tri soi ${pLabel(p)} → ${isRed ? '🔴 SÓI' : '🔵 Dân'}`);
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
    case 'witch': {
      const { heal = null, poison = null } = payload || {};
      if (heal != null) {
        if (s.flags.witchHealUsed) return bad('Bình cứu đã dùng');
        if (!checkAlive(heal)) return bad('Mục tiêu cứu không hợp lệ');
      }
      if (poison != null) {
        if (s.flags.witchPoisonUsed) return bad('Bình độc đã dùng');
        if (!checkAlive(poison)) return bad('Mục tiêu độc không hợp lệ');
      }
      if (heal != null && poison != null && heal === poison) return bad('Không cứu và độc cùng một người');
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
      s.flags.hunterShotUsed = true;
      nd.stepLog.push(`🏹 Thợ Săn bắn: ${s.players[i].name}`);
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
    case 'gatekeeper': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'gatekeeper') return bad('Không tự chặn mình');
      nd.gatekeeperTarget = i;
      nd.stepLog.push(`🚪 Kẻ Gác Cổng chặn kỹ năng: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'icewitch': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'icewitch') return bad('Không tự đóng băng mình');
      nd.icewitchTarget = i;
      nd.stepLog.push(`❄️ Nữ Phù Thủy Băng Giá đóng băng: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'switcher': {
      if (!t || t.length !== 2 || t[0] === t[1] || !t.every(checkAlive)) return bad('Kẻ Đánh Tráo phải chọn đúng 2 người khác nhau');
      nd.switcherTargets = [...t];
      nd.stepLog.push(`🔄 Kẻ Đánh Tráo hoán đổi: ${t.map(i => s.players[i].name).join(' ↔ ')}`);
      return { ok: true };
    }
    case 'diplomat': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.diplomatTarget = i;
      s.flags.diplomatProtected = i;
      nd.stepLog.push(`🕊️ Nhà Ngoại Giao bảo hộ: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'fox': {
      if (!t || t.length !== 3 || new Set(t).size !== 3 || !t.every(checkAlive)) return bad('Cáo phải chọn đúng 3 người còn sống khác nhau');
      const hasWolf = t.some(i => SEER_RED_IDS.includes(s.players[i].roleId));
      nd.foxTargets = [...t]; nd.foxResult = hasWolf ? 'wolf' : 'clear';
      nd.stepLog.push(`🦊 Cáo kiểm tra: ${t.map(i => s.players[i].name).join(', ')} → ${hasWolf ? 'CÓ SÓI' : 'Không có Sói'}`);
      return { ok: true, private: { hasWolf, names: t.map(i => s.players[i].name) } };
    }
    case 'detective': {
      if (!t || t.length !== 2 || t[0] === t[1] || !t.every(checkAlive)) return bad('Thám Tử phải chọn đúng 2 người khác nhau');
      const p0 = s.players[t[0]], p1 = s.players[t[1]];
      const same = roleOf(p0.roleId).team === roleOf(p1.roleId).team;
      nd.detectiveTargets = [...t]; nd.detectiveResult = same ? 'same' : 'diff';
      nd.stepLog.push(`🕵️ Thám Tử so sánh: ${p0.name} & ${p1.name} → ${same ? 'CÙNG phe' : 'KHÁC phe'}`);
      return { ok: true, private: { same, names: [p0.name, p1.name] } };
    }
    case 'gravedigger': {
      const i = t && t[0];
      if (i == null || !s.players[i] || s.players[i].alive) return bad('Chọn người đã chết');
      const r = roleOf(s.players[i].roleId);
      nd.gravediggerTarget = i; nd.gravediggerResult = s.players[i].roleId;
      nd.stepLog.push(`⚰️ Người Gác Mộ kiểm tra ${s.players[i].name} → ${r.icon} ${r.name}`);
      return { ok: true, private: { name: s.players[i].name, role: r.name, icon: r.icon, team: r.team } };
    }
    case 'medium': {
      const i = t && t[0];
      if (i == null || !s.players[i] || s.players[i].alive) return bad('Chọn người đã chết');
      const p = s.players[i];
      const isWolf = WOLF_IDS.includes(p.roleId);
      nd.mediumTarget = i; nd.mediumResult = isWolf ? 'wolf' : 'village';
      nd.stepLog.push(`🕯️ Nhà Linh Hồn liên lạc ${p.name} → ${isWolf ? 'SÓI' : 'Dân'}`);
      return { ok: true, private: { name: p.name, isWolf } };
    }
    case 'tracker': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const active = HAS_NIGHT_ACTION.has(s.players[i].roleId);
      nd.trackerTarget = i; nd.trackerResult = active ? 'active' : 'idle';
      nd.stepLog.push(`🔭 Kẻ Theo Dõi theo dõi ${s.players[i].name} → ${active ? 'RỜI NHÀ' : 'ở nhà'}`);
      return { ok: true, private: { name: s.players[i].name, active } };
    }
    case 'sorcerer': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const isMystic = ['seer','witch','apprenticeseer'].includes(s.players[i].roleId);
      nd.sorcererTarget = i; nd.sorcererResult = isMystic ? 'mystic' : 'not';
      nd.stepLog.push(`🧿 Sói Ma Thuật kiểm tra ${s.players[i].name} → ${isMystic ? 'TIÊN TRI/PHÙ THỦY' : 'Không'}`);
      return { ok: true, private: { name: s.players[i].name, isMystic } };
    }
    case 'wolfseer': {
      const i = t && t[0];
      if (i == null || !s.players[i]) return bad('Mục tiêu không hợp lệ');
      const r = roleOf(s.players[i].roleId);
      nd.wolfSeerTarget = i; nd.wolfSeerResult = r.id;
      nd.stepLog.push(`🔮 Sói Tiên Tri soi nạn nhân ${s.players[i].name} → ${r.icon} ${r.name}`);
      return { ok: true, private: { name: s.players[i].name, role: r.name, icon: r.icon, team: r.team } };
    }
    case 'hypnowolf': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (WOLF_IDS.includes(s.players[i].roleId)) return bad('Không thôi miên Sói');
      nd.hypnoTarget = i; s.flags.hypnoTarget = i;
      nd.stepLog.push(`🌀 Sói Thao Túng thôi miên: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'bigbadwolf': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (WOLF_IDS.includes(s.players[i].roleId)) return bad('Không cắn Sói');
      nd.bigbadwolfTarget = i;
      nd.stepLog.push(`💪 Sói Khổng Lồ cắn thêm: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'poisonwolf': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (WOLF_IDS.includes(s.players[i].roleId)) return bad('Không cắn Sói');
      nd.poisonwolfTarget = i;
      nd.stepLog.push(`🧪 Sói Độc phun độc: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'hellhound': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (WOLF_IDS.includes(s.players[i].roleId)) return bad('Không cắn Sói');
      nd.hellhoundTarget = i;
      nd.stepLog.push(`🔥 Sói Lửa phun lửa: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'cursedwolf': {
      if (s.flags.cursedWolfUsed) return bad('Đã dùng phép biến rồi');
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (WOLF_IDS.includes(s.players[i].roleId)) return bad('Đã là Sói rồi');
      nd.cursedwolfTarget = i; s.flags.cursedWolfUsed = true;
      nd.stepLog.push(`🌀 Sói Nguyền nguyền rủa: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'direwolf': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'direwolf') return bad('Không chọn chính mình');
      nd.direwolfTarget = i; s.flags.direwolfAlly = i;
      nd.stepLog.push(`😡 Sói Cuồng Nộ chọn tri kỷ: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'minion': {
      nd.stepLog.push('🕵️ Sói Phản Bội đã biết mặt đồng bọn.');
      return { ok: true };
    }
    case 'deserter': {
      nd.stepLog.push('🏳️ Kẻ Đào Ngũ đã biết mặt các Sói.');
      return { ok: true };
    }
    case 'copycat': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'copycat') return bad('Không sao chép chính mình');
      const ccIdx = s.players.findIndex(p => p.alive && p.roleId === 'copycat');
      const targetRole = roleOf(s.players[i].roleId);
      nd.copycatTarget = i;
      if (ccIdx >= 0) {
        s.players[ccIdx].roleId = s.players[i].roleId;
        nd.stepLog.push(`🪞 Người Sao Chép → trở thành ${targetRole.icon} ${targetRole.name}`);
      }
      return { ok: true, private: { copied: targetRole.name, icon: targetRole.icon } };
    }
    case 'wildchild': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'wildchild') return bad('Không chọn chính mình');
      nd.wildchildTarget = i; s.flags.wildChildIdol = i;
      nd.stepLog.push(`🐾 Dã Nhân chọn thần tượng: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'doppelganger': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      if (s.players[i].roleId === 'doppelganger') return bad('Không chọn chính mình');
      nd.doppelgangerTarget = i; s.flags.doppelgangerTarget = i;
      nd.stepLog.push(`👥 Người Nhân Bản nhắm: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'bountyhunter': {
      // Auto-assigned by room.js — this case handles if player submits manually
      const i = t && t[0];
      if (i != null) {
        s.flags.bountyTarget = i;
        nd.stepLog.push(`🎖️ Thợ Săn Tiền Thưởng nhận mục tiêu: ${s.players[i].name}`);
      }
      return { ok: true };
    }
    case 'hoodlum': {
      if (!t || t.length !== 3 || new Set(t).size !== 3 || !t.every(checkAlive)) return bad('Kẻ Thu Thập Linh Hồn phải chọn đúng 3 người');
      const hlIdx = s.players.findIndex(p => p.alive && p.roleId === 'hoodlum');
      if (hlIdx >= 0 && t.includes(hlIdx)) return bad('Không chọn chính mình');
      nd.hoodlumTargets = [...t]; s.flags.hoodlumTargets = [...t];
      nd.stepLog.push(`💀 Kẻ Thu Thập Linh Hồn nhắm: ${t.map(i => s.players[i].name).join(', ')}`);
      return { ok: true };
    }
    case 'challenger': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const chalIdx = s.players.findIndex(p => p.alive && p.roleId === 'challenger');
      if (chalIdx >= 0 && i === chalIdx) return bad('Không chọn chính mình');
      nd.challengerTarget = i; s.flags.challengerTarget = i;
      nd.stepLog.push(`🎯 Kẻ Thách Thức nhắm kẻ thù: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'balancer': {
      if (!t || t.length !== 2 || t[0] === t[1] || !t.every(checkAlive)) return bad('Kẻ Cân Bằng phải chọn đúng 2 người khác nhau');
      nd.balancerPair = [...t]; s.flags.balancerPair = [...t];
      nd.stepLog.push(`⚖️ Kẻ Cân Bằng liên kết: ${t.map(i => s.players[i].name).join(' & ')}`);
      return { ok: true };
    }
    case 'assassin': {
      if (s.flags.assassinTarget != null && s.night === s.flags.assassinKillNight) {
        // Night 3: tự động thực hiện ở resolveMorning
        nd.stepLog.push(`🗡️ Kẻ Ám Sát sẵn sàng ra tay.`);
        return { ok: true };
      }
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const asIdx = s.players.findIndex(p => p.alive && p.roleId === 'assassin');
      if (asIdx >= 0 && i === asIdx) return bad('Không chọn chính mình');
      nd.assassinPickTarget = i; s.flags.assassinTarget = i;
      s.flags.assassinKillNight = s.night + 2;
      nd.stepLog.push(`🗡️ Kẻ Ám Sát chọn mục tiêu: ${s.players[i].name} (đêm ${s.flags.assassinKillNight})`);
      return { ok: true };
    }
    case 'blackmailer': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.blackmailTarget = i; s.flags.blackmailTarget = i;
      nd.stepLog.push(`📬 Kẻ Tống Tiền tống tiền: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'fluteplayer': {
      if (!t || t.length !== 2 || t[0] === t[1] || !t.every(checkAlive)) return bad('Chàng Thổi Sáo phải chọn đúng 2 người khác nhau');
      const fpIdx = s.players.findIndex(p => p.alive && p.roleId === 'fluteplayer');
      if (fpIdx >= 0 && t.includes(fpIdx)) return bad('Không thôi miên chính mình');
      nd.fluteTargets = [...t];
      if (!s.flags.flutedPlayers) s.flags.flutedPlayers = [];
      for (const i of t) if (!s.flags.flutedPlayers.includes(i)) s.flags.flutedPlayers.push(i);
      nd.stepLog.push(`🪈 Chàng Thổi Sáo thôi miên: ${t.map(i => s.players[i].name).join(' & ')}`);
      return { ok: true };
    }
    case 'nighthunter': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const nhIdx = s.players.findIndex(p => p.alive && p.roleId === 'nighthunter');
      if (nhIdx >= 0 && i === nhIdx) return bad('Không bắn chính mình');
      nd.nighthunterTarget = i;
      nd.stepLog.push(`🌙 Kẻ Săn Đêm nhắm: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'hinter': {
      // Auto by room.js
      nd.stepLog.push('💡 Kẻ Gợi Ý nhận gợi ý.');
      return { ok: true };
    }
    case 'survivor': {
      nd.stepLog.push('🛡️ Kẻ Sống Sót sẵn sàng.');
      return { ok: true };
    }
    case 'graverobber': {
      const i = t && t[0];
      if (i == null || !s.players[i] || s.players[i].alive) return bad('Chọn người đã chết hôm qua');
      const r = roleOf(s.players[i].roleId);
      const grIdx = s.players.findIndex(p => p.alive && p.roleId === 'graverobber');
      if (grIdx >= 0) {
        s.players[grIdx].roleId = s.players[i].roleId;
        nd.stepLog.push(`⛏️ Kẻ Trộm Mộ khai quật ${s.players[i].name} → trở thành ${r.icon} ${r.name}`);
      }
      return { ok: true, private: { name: s.players[i].name, role: r.name, team: r.team } };
    }
    case 'queencard': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.queencardTarget = i;
      nd.stepLog.push(`👸 Hoàng Hậu chọn chết theo: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'priest': {
      if (s.flags.priestWaterUsed) return bad('Bình nước thánh đã dùng rồi');
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const prIdx = s.players.findIndex(p => p.alive && p.roleId === 'priest');
      if (prIdx >= 0 && i === prIdx) return bad('Không ném vào chính mình');
      nd.priestTarget = i; s.flags.priestWaterUsed = true;
      nd.stepLog.push(`✝️ Linh Mục ném nước thánh vào: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'gunsmith': {
      if (s.flags.gunsmithUsed) return bad('Phát đạn đã dùng rồi');
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      const gsIdx = s.players.findIndex(p => p.alive && p.roleId === 'gunsmith');
      if (gsIdx >= 0 && i === gsIdx) return bad('Không bắn chính mình');
      nd.gunsmithTarget = i; s.flags.gunsmithUsed = true;
      nd.stepLog.push(`🔫 Xạ Thủ bắn: ${s.players[i].name}`);
      return { ok: true };
    }
    case 'magistrate': {
      if (s.flags.magistrateVetoUsed) return bad('Quyền phủ quyết đã dùng rồi');
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.magistrateTarget = i;
      s.flags.magistrateVetoTarget = i; s.flags.magistrateVetoUsed = true;
      nd.stepLog.push(`🔨 Quan Tòa phủ quyết bảo vệ: ${s.players[i].name} (ngày hôm nay)`);
      return { ok: true };
    }
    case 'avenger': {
      const i = t && t[0];
      if (!checkAlive(i)) return bad('Mục tiêu không hợp lệ');
      nd.avengerCurseTarget = i;
      nd.stepLog.push(`⚔️ Kẻ Báo Thù nguyền: ${s.players[i].name}`);
      return { ok: true };
    }
    default: return bad(`Step không hỗ trợ: ${stepType}`);
  }
}

/* ─── GIẾT NGƯỜI CHƠI (chain passive) ──────────────────────────── */
function killPlayer(state, i, source, deaths) {
  const s = state, p = s.players[i];
  const lines = [];
  if (!p || !p.alive || deaths.has(i)) return lines;
  deaths.add(i);
  p.alive = false;
  lines.push(`💀 ${pLabel(p)} chết – ${source}`);

  // Track wolf deaths
  if (WOLF_IDS.includes(p.roleId)) s.flags.wolfDeathCount = (s.flags.wolfDeathCount || 0) + 1;

  // Sói Con chết → đêm sau cắn thêm 1
  if (p.roleId === 'wolfcub') {
    s.flags.wolfCubBonusKill = true;
    lines.push('🐶 Sói Con chết → đêm sau Sói cắn thêm 1 người!');
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
      lines.push(...killPlayer(s, partner, `chết theo người yêu (Cupid)`, deaths));
  }
  // Balancer chain
  if (s.flags.balancerPair && s.flags.balancerPair.includes(i)) {
    const partner = s.flags.balancerPair.find(x => x !== i);
    if (partner != null && s.players[partner] && s.players[partner].alive)
      lines.push(...killPlayer(s, partner, `chết theo liên kết Kẻ Cân Bằng`, deaths));
  }
  // Wild Child: thần tượng chết → trở thành Sói
  if (s.flags.wildChildIdol === i) {
    const wc = s.players.findIndex(pp => pp.alive && pp.roleId === 'wildchild');
    if (wc >= 0 && !s.flags.wildChildBecameWolf) {
      s.flags.wildChildBecameWolf = true;
      s.players[wc].roleId = 'wolf';
      lines.push(`🐾 Thần tượng của Dã Nhân chết – Dã Nhân ${s.players[wc].name} TRỞ THÀNH SÓI!`);
    }
    s.flags.wildChildIdol = null;
  }
  // Doppelganger: mục tiêu chết → kế thừa role
  if (s.flags.doppelgangerTarget === i) {
    const dg = s.players.findIndex(pp => pp.alive && pp.roleId === 'doppelganger');
    if (dg >= 0) {
      const r = roleOf(p.roleId);
      s.players[dg].roleId = p.roleId;
      lines.push(`👥 Người Nhân Bản ${s.players[dg].name} kế thừa: ${r.icon} ${r.name}`);
    }
    s.flags.doppelgangerTarget = null;
  }
  // Direwolf: tri kỷ chết → bonus đêm sau
  if (s.flags.direwolfAlly === i) {
    const dw = s.players.findIndex(pp => pp.alive && pp.roleId === 'direwolf');
    if (dw >= 0 && !s.flags.direwolfBonus) {
      s.flags.direwolfBonus = true;
      lines.push(`😡 Tri kỷ của Sói Cuồng Nộ chết – đêm sau bầy Sói cắn thêm 1!`);
    }
    s.flags.direwolfAlly = null;
  }
  // Traitor: toàn bộ Sói thật chết → Kẻ Phản Bội lộ nguyên hình
  const trIdx = s.players.findIndex(pp => pp.alive && pp.roleId === 'traitor');
  if (trIdx >= 0 && !s.players.some(pp => pp.alive && WOLF_IDS.includes(pp.roleId) && pp.roleId !== 'traitor')) {
    s.players[trIdx].roleId = 'wolf';
    lines.push(`🎭 Toàn bộ Sói chết – Kẻ Phản Bội ${s.players[trIdx].name} lộ nguyên hình thành SÓI!`);
  }
  // Deserter: kiểm tra nếu tất cả Sói gốc đã chết
  const origWolfRoles = BITING_WOLF_IDS.concat(['minion','cursedwolf']);
  const desIdx = s.players.findIndex(pp => pp.alive && pp.roleId === 'deserter');
  if (desIdx >= 0 && !s.flags.deserterActive) {
    const allGone = !s.players.some(pp => pp.alive && origWolfRoles.includes(pp.roleId));
    if (allGone) {
      s.flags.deserterActive = true;
      lines.push(`🏳️ Toàn bộ Sói gốc diệt – Kẻ Đào Ngũ ${s.players[desIdx].name} bắt đầu ra tay!`);
    }
  }
  // Hoodlum: kiểm tra 3 mục tiêu đã chết hết chưa
  if (s.flags.hoodlumTargets && s.flags.hoodlumTargets.includes(i)) {
    const remaining = s.flags.hoodlumTargets.filter(idx => s.players[idx].alive);
    if (remaining.length === 0) {
      const hl = s.players.findIndex(pp => pp.alive && pp.roleId === 'hoodlum');
      if (hl >= 0) lines.push(`💀 KẺ THU THẬP LINH HỒN ${s.players[hl].name}: cả 3 mục tiêu đã chết – THẮNG!`);
    }
  }
  // King chết đêm → quốc tang ngày hôm sau
  if (p.roleId === 'king') {
    s.flags.kingDiedThisNight = true;
    s.flags.noVoteDay = s.day + 1;
    lines.push(`👑 Vua băng hà – QUỐC TANG ngày ${s.flags.noVoteDay}: không được treo cổ!`);
  }
  return lines;
}

/* ─── PHÂN GIẢI BUỔI SÁNG ──────────────────────────────────────── */
function resolveMorning(state, nd) {
  const s = state;
  const publicLines = [], secretLines = [], deaths = new Set();
  const privateResults = []; // [{idx, text}] — tin nhắn riêng
  const events = [];

  const saved = i =>
    nd.bodyguardTarget === i || nd.doctorTarget === i || nd.witchHealTarget === i
    || nd.icewitchTarget === i; // icewitch: miễn nhiễm cắn
  const savedWhy = i =>
    nd.bodyguardTarget === i ? '🛡️ Bảo Vệ' :
    nd.icewitchTarget  === i ? '❄️ Đóng băng (bất tử đêm nay)' :
    nd.doctorTarget    === i ? '💉 Bác Sĩ' : '💊 Phù Thủy';

  // Xử lý Pending deaths từ đêm trước (mature, hellhound, poisonwolf)
  for (const pi of (s.flags.maturePending || [])) {
    if (s.players[pi] && s.players[pi].alive)
      publicLines.push(...killPlayer(s, pi, 'chết trễ (Dân Trưởng Thành)', deaths));
  }
  s.flags.maturePending = [];
  for (const pi of (s.flags.hellhoundPending || [])) {
    if (s.players[pi] && s.players[pi].alive && !saved(pi))
      publicLines.push(...killPlayer(s, pi, 'chết trễ (bị Sói Lửa đốt)', deaths));
  }
  s.flags.hellhoundPending = [];
  for (const pi of (s.flags.poisonwolfPending || [])) {
    if (s.players[pi] && s.players[pi].alive && !saved(pi))
      publicLines.push(...killPlayer(s, pi, 'chết trễ (Sói Độc)', deaths));
  }
  s.flags.poisonwolfPending = [];

  // Switcher hoán đổi wolf targets
  let wolfTargets = [...nd.wolfTargets];
  if (nd.switcherTargets && nd.switcherTargets.length === 2) {
    const [swA, swB] = nd.switcherTargets;
    wolfTargets = wolfTargets.map(i => i === swA ? swB : i === swB ? swA : i);
    if (JSON.stringify(wolfTargets) !== JSON.stringify(nd.wolfTargets))
      publicLines.push(`🔄 Có người đã hoán đổi vị trí đêm qua!`);
  }

  // Cô Bé Ti Hí
  if (nd.littleGirlCaught) {
    const lg = s.players.findIndex(p => p.alive && p.roleId === 'littlegirl');
    if (lg >= 0) {
      publicLines.push(`👧 ${s.players[lg].name} bị Sói phát hiện → chết thay nạn nhân!`);
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
    if (nd.icewitchTarget === i) {
      publicLines.push(`❄️ ${p.name} bị đóng băng – miễn nhiễm đêm nay!`);
      continue;
    }
    if (saved(i)) { publicLines.push(`${savedWhy(i)} – ${p.name} sống sót!`); continue; }
    // Survivor shield
    if (p.roleId === 'survivor' && !s.flags.survivorShieldUsed) {
      s.flags.survivorShieldUsed = true;
      publicLines.push(`🛡️ ${p.name} (Kẻ Sống Sót) kháng được đòn cắn – khiên vỡ!`);
      continue;
    }
    if (p.roleId === 'cursedone') {
      p.roleId = 'wolf';
      publicLines.push(`🩸 ${p.name} bị cắn nhưng không chết...`);
      secretLines.push(`🩸 Kẻ Nguyền Rủa ${p.name} → TRỞ THÀNH SÓI!`);
      continue;
    }
    if (p.roleId === 'elder') {
      p.elderHit++;
      if (p.elderHit < 2) { publicLines.push(`👴 ${p.name} (Già Làng) bị cắn lần 1 – vẫn sống!`); continue; }
    }
    if (p.roleId === 'mature') {
      s.flags.maturePending = s.flags.maturePending || [];
      if (!s.flags.maturePending.includes(i)) {
        s.flags.maturePending.push(i);
        publicLines.push(`🧓 ${p.name} (Dân Trưởng Thành) bị cắn – sẽ chết vào sáng hôm sau!`);
      }
      continue;
    }
    // Bloody Mary: khi bị sói cắn chết, một sói ngẫu nhiên chết theo
    if (p.roleId === 'bloodymary') {
      publicLines.push(...killPlayer(s, i, 'bị Sói cắn', deaths));
      const aliveWolves = s.players.map((pp, wi) => wi).filter(wi => s.players[wi].alive && BITING_WOLF_IDS.includes(s.players[wi].roleId));
      if (aliveWolves.length) {
        const wIdx = aliveWolves[Math.floor(Math.random() * aliveWolves.length)];
        publicLines.push(`🩷 Bloody Mary trả thù: ${s.players[wIdx].name} chết theo!`);
        publicLines.push(...killPlayer(s, wIdx, 'bị Bloody Mary trả thù', deaths));
      }
      continue;
    }
    // Lamb: khi bị Sói cắn chết, lộ 1 Sói ngẫu nhiên
    if (p.roleId === 'lamb') {
      publicLines.push(...killPlayer(s, i, 'bị Sói cắn', deaths));
      const aliveWolves2 = s.players.filter(pp => pp.alive && WOLF_IDS.includes(pp.roleId));
      if (aliveWolves2.length) {
        const rWolf = aliveWolves2[Math.floor(Math.random() * aliveWolves2.length)];
        publicLines.push(`🐑 Cừu Non tiết lộ: ${rWolf.name} là Sói!`);
      }
      continue;
    }
    publicLines.push(...killPlayer(s, i, 'bị Sói cắn', deaths));
    // Avenger
    if (p.roleId === 'avenger') events.push(`avengerRevenge:${i}`);
  }

  // Sói Nguyền chuyển đổi
  if (nd.cursedwolfTarget != null && s.players[nd.cursedwolfTarget].alive) {
    const cp = s.players[nd.cursedwolfTarget];
    cp.roleId = 'wolf';
    publicLines.push(`🌀 ${cp.name} bị nguyền rủa và TRỞ THÀNH SÓI!`);
  }

  // Hellhound: mục tiêu chết sáng hôm SAU
  if (nd.hellhoundTarget != null && s.players[nd.hellhoundTarget].alive) {
    const hhi = nd.hellhoundTarget;
    if (!saved(hhi)) {
      s.flags.hellhoundPending = s.flags.hellhoundPending || [];
      s.flags.hellhoundPending.push(hhi);
      publicLines.push(`🔥 ${s.players[hhi].name} bị Sói Lửa đốt – sẽ chết sáng hôm sau!`);
    } else publicLines.push(`${savedWhy(hhi)} – ${s.players[hhi].name} thoát lửa!`);
  }

  // Poisonwolf: chết sáng hôm SAU
  if (nd.poisonwolfTarget != null && s.players[nd.poisonwolfTarget].alive) {
    const pwi = nd.poisonwolfTarget;
    if (!saved(pwi)) {
      s.flags.poisonwolfPending = s.flags.poisonwolfPending || [];
      s.flags.poisonwolfPending.push(pwi);
      publicLines.push(`🧪 ${s.players[pwi].name} bị Sói Độc – sẽ chết sáng hôm sau!`);
    } else publicLines.push(`${savedWhy(pwi)} – ${s.players[pwi].name} thoát độc!`);
  }

  // Bigbadwolf extra bite
  if (nd.bigbadwolfTarget != null && s.players[nd.bigbadwolfTarget].alive) {
    const bi = nd.bigbadwolfTarget;
    if (saved(bi)) publicLines.push(`${savedWhy(bi)} – ${s.players[bi].name} sống sót!`);
    else publicLines.push(...killPlayer(s, bi, 'bị Sói Khổng Lồ cắn thêm', deaths));
  }

  // Sói Trắng cắn Sói
  if (nd.whitewolfTarget != null && s.players[nd.whitewolfTarget].alive) {
    const wwi = nd.whitewolfTarget;
    if (saved(wwi)) publicLines.push(`${savedWhy(wwi)} – ${s.players[wwi].name} sống sót!`);
    else publicLines.push(...killPlayer(s, wwi, 'bị Sói Trắng phản bội', deaths));
  }

  // Nighthunter bắn
  if (nd.nighthunterTarget != null && s.players[nd.nighthunterTarget].alive) {
    const nhi = nd.nighthunterTarget;
    const nhSelf = s.players.findIndex(pp => pp.alive && pp.roleId === 'nighthunter');
    const targetIsWolf = WOLF_IDS.includes(s.players[nhi].roleId);
    if (targetIsWolf) {
      publicLines.push(...killPlayer(s, nhi, 'bị Kẻ Săn Đêm bắn trúng', deaths));
      publicLines.push(`🌙 Kẻ Săn Đêm bắn trúng Sói!`);
    } else {
      if (nhSelf >= 0 && nhSelf !== nhi)
        publicLines.push(...killPlayer(s, nhSelf, 'tự chết vì bắn nhầm Dân (Kẻ Săn Đêm)', deaths));
      publicLines.push(`🌙 Kẻ Săn Đêm bắn trượt...`);
    }
  }

  // Priest holy water
  if (nd.priestTarget != null && s.players[nd.priestTarget].alive) {
    const pri = nd.priestTarget;
    const targetIsWolf = WOLF_IDS.includes(s.players[pri].roleId);
    if (targetIsWolf) {
      publicLines.push(...killPlayer(s, pri, 'bị Linh Mục ném nước thánh', deaths));
      publicLines.push(`✝️ Nước thánh trúng Sói – Sói chết!`);
    } else {
      const prIdx = s.players.findIndex(pp => pp.alive && pp.roleId === 'priest');
      if (prIdx >= 0)
        publicLines.push(...killPlayer(s, prIdx, 'ném nhầm nước thánh vào Dân – Linh Mục tự chết', deaths));
      publicLines.push(`✝️ Linh Mục ném nhầm Dân – tự chịu hậu quả!`);
    }
  }

  // Gunsmith
  if (nd.gunsmithTarget != null && s.players[nd.gunsmithTarget].alive) {
    const gsi = nd.gunsmithTarget;
    if (saved(gsi)) publicLines.push(`${savedWhy(gsi)} – ${s.players[gsi].name} sống sót!`);
    else publicLines.push(...killPlayer(s, gsi, 'bị Xạ Thủ bắn', deaths));
  }

  // Assassin kill on designated night
  if (s.night === s.flags.assassinKillNight && s.flags.assassinTarget != null) {
    const asi = s.flags.assassinTarget;
    if (s.players[asi] && s.players[asi].alive) {
      publicLines.push(...killPlayer(s, asi, 'bị Kẻ Ám Sát ám sát', deaths));
      // Assassin wins (side win)
      const asIdx = s.players.findIndex(pp => pp.alive && pp.roleId === 'assassin');
      if (asIdx >= 0) publicLines.push(`🗡️ Kẻ Ám Sát ${s.players[asIdx].name} hoàn thành vụ ám sát!`);
    }
    s.flags.assassinTarget = null;
  }

  // Sát Nhân
  if (nd.skTarget != null && s.players[nd.skTarget].alive) {
    const ski = nd.skTarget;
    if (saved(ski)) publicLines.push(`${savedWhy(ski)} – ${s.players[ski].name} sống sót!`);
    else publicLines.push(...killPlayer(s, ski, 'bị Sát Nhân Hàng Loạt giết', deaths));
  }

  // Thợ Săn bắn
  if (nd.hunterTarget != null && s.players[nd.hunterTarget].alive) {
    const hti = nd.hunterTarget;
    if (saved(hti)) publicLines.push(`${savedWhy(hti)} – ${s.players[hti].name} sống sót!`);
    else publicLines.push(...killPlayer(s, hti, 'bị Thợ Săn bắn', deaths));
  }

  // Phù Thủy độc
  if (nd.witchPoison != null && s.players[nd.witchPoison].alive)
    publicLines.push(...killPlayer(s, nd.witchPoison, 'bị Phù Thủy đầu độc', deaths));

  // Queencard: sau khi Vua chết (xử lý avenger lẫn king trong cùng đêm)
  if (nd.queencardTarget != null && s.players[nd.queencardTarget] && s.players[nd.queencardTarget].alive) {
    publicLines.push(...killPlayer(s, nd.queencardTarget, 'bị Hoàng Hậu chỉ định chết theo Vua', deaths));
  }

  // Avenger tự động pick random nếu có trong queue
  // (events 'avengerRevenge:N' được room.js xử lý, hoặc dùng auto mode)

  // Cập nhật flags cuối đêm
  s.flags.bodyguardLastIdx = nd.bodyguardTarget;
  if (nd.wolfTargets.length > 0) s.flags.wolfCubBonusKill = false;
  s.flags.direwolfBonus = false;
  s.flags.kingDiedThisNight = false;
  // diplomat/hypno/blackmail persist to next day (cleared in startNight of next round)

  // Private results
  if (nd.sorcererTarget != null) {
    const srcIdx = s.players.findIndex(pp => pp.alive && pp.roleId === 'sorcerer');
    if (srcIdx >= 0) privateResults.push({ idx: srcIdx, text: `🧿 Sói Ma Thuật kiểm tra ${s.players[nd.sorcererTarget].name}: ${nd.sorcererResult === 'mystic' ? 'TIÊN TRI/PHÙ THỦY' : 'Không phải'}` });
  }
  if (nd.wolfSeerTarget != null) {
    const wsIdx = s.players.findIndex(pp => pp.alive && pp.roleId === 'wolfseer');
    if (wsIdx >= 0) {
      const r = roleOf(nd.wolfSeerResult);
      privateResults.push({ idx: wsIdx, text: `🔮 Sói Tiên Tri: ${s.players[nd.wolfSeerTarget].name} là ${r ? r.icon + ' ' + r.name : '?'}` });
    }
  }
  if (nd.seerTarget != null)
    secretLines.push(`🔮 Tiên Tri soi ${pLabel(s.players[nd.seerTarget])} → ${nd.seerResult === 'wolf' ? '🔴 SÓI' : '🔵 Dân'}`);
  if (nd.bodyguardTarget != null) secretLines.push(`🛡️ Bảo Vệ chắn: ${s.players[nd.bodyguardTarget].name}`);
  if (nd.doctorTarget != null) secretLines.push(`💉 Bác Sĩ cứu: ${s.players[nd.doctorTarget].name}`);
  if (s.cupidPair.length === 2 && s.night === 1) secretLines.push(`💘 Cupid ghép: ${s.cupidPair.map(i => s.players[i].name).join(' & ')}`);

  s.phase = 'day';
  const win = checkWin(s);
  if (win) { s.phase = 'ended'; s.winner = win.winner; }
  return { deaths: [...deaths], publicLines, secretLines, events, privateResults, win };
}

/* ─── TREO CỔ BAN NGÀY ─────────────────────────────────────────── */
function resolveHang(state, idx) {
  const s = state, p = s.players[idx];
  const lines = [], events = [];
  if (!p || !p.alive) return { blocked: true, lines: ['Người này đã chết.'], events, win: null };

  // Quốc tang (King chết đêm trước)
  if (s.flags.noVoteDay >= s.day) {
    lines.push(`👑 Quốc tang – ngày ${s.day} không thể treo cổ ai!`);
    return { blocked: true, lines, events, win: null };
  }
  // Nhà Ngoại Giao bảo hộ
  if (s.flags.diplomatProtected === idx) {
    lines.push(`🕊️ ${p.name} được Nhà Ngoại Giao bảo hộ – thoát án treo cổ!`);
    s.flags.diplomatProtected = null;
    return { blocked: true, lines, events, win: null };
  }
  // Quan Tòa phủ quyết
  if (s.flags.magistrateVetoTarget === idx) {
    lines.push(`🔨 Quan Tòa phủ quyết – ${p.name} thoát án!`);
    s.flags.magistrateVetoTarget = null;
    return { blocked: true, lines, events, win: null };
  }
  // Hoàng Tử
  if (p.roleId === 'prince' && !s.flags.princeSaved) {
    s.flags.princeSaved = true;
    lines.push(`🤴 ${p.name} lật bài Hoàng Tử – bản án bị HỦY!`);
    return { blocked: true, lines, events, win: null };
  }
  // Kẻ Ngốc
  if (p.roleId === 'idiot' && !p.idiotRevealed) {
    p.idiotRevealed = true;
    lines.push(`🃏 ${p.name} là Kẻ Ngốc – không chết nhưng mất quyền bỏ phiếu!`);
    return { blocked: true, lines, events, win: null };
  }
  // Kẻ Điên
  if (p.roleId === 'joker') {
    const deaths = new Set();
    lines.push(...killPlayer(s, idx, 'bị dân làng treo cổ', deaths));
    lines.push(`🤡 ${p.name} là KẺ ĐIÊN – bị treo đúng ý muốn → Kẻ Điên THẮNG!`);
    s.phase = 'ended'; s.winner = 'third';
    return { blocked: false, lines, events, win: { winner: 'third', reason: 'joker', desc: `Kẻ Điên ${p.name} bị treo cổ đúng ý!` } };
  }

  const deaths = new Set();
  lines.push(...killPlayer(s, idx, 'bị dân làng treo cổ', deaths));
  if (p.roleId === 'hunterwolf') events.push('hunterwolfRevenge');
  if (p.roleId === 'avenger') events.push(`avengerRevenge:${idx}`);

  s.flags.diplomatProtected = null;
  s.flags.magistrateVetoTarget = null;

  const win = checkWin(s);
  if (win) { s.phase = 'ended'; s.winner = win.winner; }
  return { blocked: false, lines, events, win };
}

/* ─── Sói Thợ Săn bị treo → kéo 1 người chết theo ─────────────── */
function applyRevenge(state, targetIdx) {
  const deaths = new Set();
  const lines = killPlayer(state, targetIdx, 'bị Sói Thợ Săn kéo chết theo', deaths);
  const win = checkWin(state);
  if (win) { state.phase = 'ended'; state.winner = win.winner; }
  return { lines, win };
}

/* ─── Kẻ Báo Thù nguyền 1 người – nếu là Sói thì Sói chết ─────── */
function applyAvengerCurse(state, targetIdx) {
  const deaths = new Set();
  const lines = [];
  const p = state.players[targetIdx];
  if (p && p.alive) {
    if (WOLF_IDS.includes(p.roleId)) {
      lines.push(...killPlayer(state, targetIdx, 'bị Kẻ Báo Thù nguyền (là Sói)', deaths));
      lines.push(`⚔️ Kẻ Báo Thù nguyền đúng Sói!`);
    } else {
      lines.push(`⚔️ Kẻ Báo Thù nguyền ${p.name} nhưng họ không phải Sói – vô hiệu.`);
    }
  }
  const win = checkWin(state);
  if (win) { state.phase = 'ended'; state.winner = win.winner; }
  return { lines, win };
}

/* ─── SANG ĐÊM MỚI ─────────────────────────────────────────────── */
function nextNight(state) {
  state.night++; state.day++; state.phase = 'night';
  // Reset per-night flags
  state.flags.hypnoTarget = null;
  state.flags.blackmailTarget = null;
  state.flags.diplomatProtected = null;
  state.flags.kingDiedThisNight = false;
}

/* ─── ĐIỀU KIỆN THẮNG ──────────────────────────────────────────── */
function checkWin(state) {
  const a = alive(state);
  const wolves = a.filter(p => WOLF_IDS.includes(p.roleId));
  const skAlive = a.some(p => p.roleId === 'serialkiller');
  const fluteAlive = a.some(p => p.roleId === 'fluteplayer');
  const villagers = a.filter(p => !WOLF_IDS.includes(p.roleId) && p.roleId !== 'serialkiller' && p.roleId !== 'fluteplayer' && p.roleId !== 'survivor' && p.roleId !== 'balancer' && p.roleId !== 'copycat');

  // Fluteplayer: tất cả người sống (trừ fluteplayer) đều bị thôi miên
  if (fluteAlive && a.length > 1) {
    const fpIdx = state.players.findIndex(p => p.alive && p.roleId === 'fluteplayer');
    const allEnchanted = a.every((p, _) => {
      const si = state.players.indexOf(p);
      return si === fpIdx || (state.flags.flutedPlayers || []).includes(si);
    });
    if (allEnchanted)
      return { winner: 'third', reason: 'fluteplayer', desc: 'Chàng Thổi Sáo thôi miên toàn bộ người sống!' };
  }

  // Balancer: số Dân = số Sói (balancer phải còn sống)
  if (a.some(p => p.roleId === 'balancer') && (state.flags.balancerPair || []).length === 2) {
    const bp = state.flags.balancerPair;
    if (bp.every(i => state.players[i].alive)) {
      const vilCount = a.filter(p => !WOLF_IDS.includes(p.roleId) && p.roleId !== 'balancer').length;
      const wlCount = wolves.length;
      if (wlCount > 0 && vilCount === wlCount)
        return { winner: 'neutral', reason: 'balancer', desc: `Kẻ Cân Bằng: Dân (${vilCount}) = Sói (${wlCount})!` };
    }
  }

  if (a.length === 1 && a[0].roleId === 'serialkiller')
    return { winner: 'third', reason: 'serialkiller', desc: `${a[0].name} là người sống sót cuối cùng!` };
  if (a.length === 1 && a[0].roleId === 'whitewolf')
    return { winner: 'wolf', reason: 'whitewolf', desc: `Sói Trắng ${a[0].name} phản bội tất cả!` };
  if (wolves.length === 0 && !skAlive && !fluteAlive)
    return { winner: 'village', reason: 'allWolvesDead', desc: 'Toàn bộ Ma Sói đã bị tiêu diệt!' };
  if (wolves.length > 0 && !skAlive && !fluteAlive && wolves.length >= villagers.length)
    return { winner: 'wolf', reason: 'wolfMajority', desc: `Sói (${wolves.length}) ≥ Dân (${villagers.length})!` };
  return null;
}

/* ─── VOTE ──────────────────────────────────────────────────────── */
function tallyVotes(state, votes) {
  const tally = {};
  for (const [voter, target] of Object.entries(votes)) {
    const v = state.players[+voter];
    if (!v || !v.alive || v.idiotRevealed) continue;
    // Hypno/Blackmail: forced vote (room.js đã override nếu cần)
    const weight = v.roleId === 'mayor' ? 2 : 1;
    tally[target] = (tally[target] || 0) + weight;
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const top = entries.length && (entries.length === 1 || entries[0][1] > entries[1][1])
    ? +entries[0][0] : null;
  return { tally, top, tie: top === null && entries.length > 1 };
}

/* ─── EXPORT ────────────────────────────────────────────────────── */
const MaSoiEngine = {
  ROLES, WOLF_IDS, BITING_WOLF_IDS, SEER_RED_IDS, HAS_NIGHT_ACTION, roleOf,
  createGame, dealInfo, buildNightSteps, newNightData,
  applyNightAction, resolveMorning, resolveHang, applyRevenge, applyAvengerCurse,
  nextNight, checkWin, tallyVotes,
};
if (typeof module !== 'undefined' && module.exports) module.exports = MaSoiEngine;
if (typeof globalThis !== 'undefined') globalThis.MaSoiEngine = MaSoiEngine;
