'use strict';
/* Test engine bằng node: node test_engine.js */
const E = require('./engine.js');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}
// rng cố định để chia bài theo đúng thứ tự pool (không xáo)
const noShuffle = () => 0.999999;

function mkGame(rolesInOrder) {
  const counts = {};
  rolesInOrder.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const names = rolesInOrder.map((r, i) => `P${i}_${r}`);
  const s = E.createGame(names, counts, noShuffle);
  // ép vai đúng thứ tự khai báo (bỏ qua xáo bài) để test xác định
  s.players.forEach((p, i) => p.roleId = rolesInOrder[i]);
  return s;
}
const idxOf = (s, roleId) => s.players.findIndex(p => p.roleId === roleId);

console.log('— 1. Chia bài —');
{
  const s = E.createGame(['A','B','C','D','E'], { wolf:1, seer:1, villager:3 });
  ok(s.players.length === 5, 'đúng số người');
  const c = {};
  s.players.forEach(p => c[p.roleId] = (c[p.roleId]||0)+1);
  ok(c.wolf===1 && c.seer===1 && c.villager===3, 'đúng số lượng từng vai');
  const deal = E.dealInfo(s);
  const wolfIdx = idxOf(s,'wolf');
  ok(deal[wolfIdx].role.id === 'wolf' && Array.isArray(deal[wolfIdx].mates), 'dealInfo có role + mates cho Sói');
}
try { E.createGame(['A','B'], { wolf:1 }); ok(false,'phải báo lỗi lệch số vai'); }
catch(e) { ok(true,'báo lỗi khi số vai ≠ số người'); }

console.log('— 2. Sói cắn & bảo vệ —');
{
  const s = mkGame(['wolf','seer','bodyguard','doctor','villager','villager']);
  const nd = E.newNightData();
  const vil = 4;
  // Bảo vệ chắn đúng người bị cắn
  ok(E.applyNightAction(s, nd, 'bodyguard', {targets:[vil]}).ok, 'bảo vệ hợp lệ');
  ok(E.applyNightAction(s, nd, 'wolf', {targets:[vil]}).ok, 'sói cắn hợp lệ');
  ok(!E.applyNightAction(s, nd, 'wolf', {targets:[0]}).ok, 'sói không được cắn sói');
  const r = E.resolveMorning(s, nd);
  ok(s.players[vil].alive, 'nạn nhân được Bảo Vệ cứu');
  ok(r.deaths.length === 0, 'không ai chết');
  ok(s.flags.bodyguardLastIdx === vil, 'lưu người vừa bảo vệ');
  const nd2 = E.newNightData();
  ok(!E.applyNightAction(s, nd2, 'bodyguard', {targets:[vil]}).ok, 'không bảo vệ 2 đêm liền 1 người');
}

console.log('— 3. Phù Thủy / Bác Sĩ / Tiên Tri —');
{
  const s = mkGame(['wolf','witch','doctor','seer','villager','fakewolf']);
  const nd = E.newNightData();
  E.applyNightAction(s, nd, 'wolf', {targets:[4]});
  E.applyNightAction(s, nd, 'witch', {heal:4, poison:null});
  const seer = E.applyNightAction(s, nd, 'seer', {targets:[5]});
  ok(seer.private.seen === 'village', 'Tiên Tri thấy Sói Giả Dân là DÂN');
  const nd_ = E.newNightData();
  const seer2 = E.applyNightAction(s, nd_, 'seer', {targets:[0]});
  ok(seer2.private.seen === 'wolf', 'Tiên Tri thấy Sói thật là SÓI');
  const r = E.resolveMorning(s, nd);
  ok(s.players[4].alive, 'Phù Thủy cứu thành công');
  ok(s.flags.witchHealUsed, 'bình cứu đã dùng');
  const nd3 = E.newNightData();
  ok(!E.applyNightAction(s, nd3, 'witch', {heal:2}).ok, 'không cứu lần 2');
  ok(E.applyNightAction(s, nd3, 'witch', {poison:0}).ok, 'độc lần đầu OK');
  const r3 = E.resolveMorning(s, nd3);
  ok(!s.players[0].alive, 'Sói chết vì thuốc độc');
}

console.log('— 3b. Phù Thủy: giao dịch nguyên tử (không mất bình khi lỗi) —');
{
  const s = mkGame(['wolf','witch','villager','villager']);
  const nd = E.newNightData();
  s.players[3].alive = false;                    // idx3 đã chết → độc không hợp lệ
  const res = E.applyNightAction(s, nd, 'witch', {heal:2, poison:3});
  ok(!res.ok, 'cứu+độc lỗi khi độc nhắm người đã chết');
  ok(!s.flags.witchHealUsed, 'bình CỨU KHÔNG bị tiêu khi thao tác lỗi');
  ok(nd.witchHealTarget == null, 'không ghi nhầm mục tiêu cứu khi lỗi');
  // sau khi sửa mục tiêu, vẫn cứu được bình thường
  const ok2 = E.applyNightAction(s, nd, 'witch', {heal:2, poison:0});
  ok(ok2.ok && s.flags.witchHealUsed && s.flags.witchPoisonUsed, 'cứu+độc hợp lệ chạy đúng sau khi sửa');
  ok(!E.applyNightAction(s, E.newNightData(), 'witch', {heal:2,poison:2}).ok, 'không cứu và độc cùng 1 người');
}

console.log('— 4. Passive: Già Làng, Kẻ Nguyền Rủa, Sói Con, Cupid —');
{
  const s = mkGame(['wolf','wolfcub','elder','cursedone','cupid','villager','villager']);
  // Cupid ghép 5 & 6
  const nd1 = E.newNightData();
  E.applyNightAction(s, nd1, 'cupid', {targets:[5,6]});
  E.applyNightAction(s, nd1, 'wolf', {targets:[2]}); // cắn Già Làng lần 1
  E.resolveMorning(s, nd1);
  ok(s.players[2].alive && s.players[2].elderHit === 1, 'Già Làng sống sau lần cắn 1');
  E.nextNight(s);
  const nd2 = E.newNightData();
  E.applyNightAction(s, nd2, 'wolf', {targets:[3]}); // cắn Kẻ Nguyền Rủa
  E.resolveMorning(s, nd2);
  ok(s.players[3].alive && s.players[3].roleId === 'wolf', 'Kẻ Nguyền Rủa thành Sói, không chết');
  E.nextNight(s);
  // Sói Con chết (giả lập bị treo)
  const hang = E.resolveHang(s, 1);
  ok(!s.players[1].alive && s.flags.wolfCubBonusKill, 'Sói Con chết → bonus cắn 2');
  const nd3 = E.newNightData();
  ok(E.applyNightAction(s, nd3, 'wolf', {targets:[5,6]}).ok, 'đêm sau Sói cắn được 2 người');
  const r3 = E.resolveMorning(s, nd3);
  ok(!s.players[5].alive && !s.players[6].alive, 'cả 2 chết (5 chết kéo 6 hoặc bị cắn)');
  ok(r3.publicLines.some(l => l.includes('Cupid')) || r3.deaths.length === 2, 'cupid chain hoạt động khi 1 trong đôi chết');
}

console.log('— 5. Treo cổ: Hoàng Tử, Kẻ Ngốc, Kẻ Điên, Sói Thợ Săn, vote —');
{
  const s = mkGame(['wolf','hunterwolf','prince','idiot','joker','mayor','villager','villager']);
  let h = E.resolveHang(s, 2);
  ok(h.blocked && s.players[2].alive && s.flags.princeSaved, 'Hoàng Tử thoát án lần 1');
  h = E.resolveHang(s, 2);
  ok(!h.blocked && !s.players[2].alive, 'Hoàng Tử lần 2 thì chết');
  h = E.resolveHang(s, 3);
  ok(h.blocked && s.players[3].alive && s.players[3].idiotRevealed, 'Kẻ Ngốc sống, mất quyền vote');
  // vote: mayor ×2, idiot bị bỏ qua
  const votes = { 3: 0, 5: 7, 6: 0 }; // idiot(3)→wolf(0) bị bỏ, mayor(5)→7 = 2 phiếu, villager(6)→wolf(0) = 1
  const t = E.tallyVotes(s, votes);
  ok(t.tally[7] === 2 && (t.tally[0]||0) === 1 && t.top === 7, 'Trưởng Làng ×2, Kẻ Ngốc mất phiếu');
  // Sói Thợ Săn bị treo → event revenge
  h = E.resolveHang(s, 1);
  ok(h.events.includes('hunterwolfRevenge'), 'Sói Thợ Săn bị treo → được kéo người');
  const rev = E.applyRevenge(s, 6);
  ok(!s.players[6].alive, 'nạn nhân bị kéo chết theo');
  // Kẻ Điên bị treo → thắng third
  h = E.resolveHang(s, 4);
  ok(h.win && h.win.winner === 'third' && s.phase === 'ended', 'Kẻ Điên thắng khi bị treo');
}

console.log('— 6. Điều kiện thắng —');
{
  let s = mkGame(['wolf','villager','villager']);
  s.players[0].alive = false;
  let w = E.checkWin(s);
  ok(w && w.winner === 'village', 'hết Sói → Dân thắng');

  s = mkGame(['wolf','wolf','villager','villager','seer']);
  ok(E.checkWin(s) === null, '2 Sói vs 3 Dân → chưa ai thắng');
  s.players[2].alive = false; // còn 2 sói vs 2 dân → sói thắng (≥)
  w = E.checkWin(s);
  ok(w && w.winner === 'wolf', 'Sói ≥ Dân → Sói thắng');

  s = mkGame(['serialkiller','villager']);
  s.players[1].alive = false;
  w = E.checkWin(s);
  ok(w && w.winner === 'third', 'Sát Nhân sống cuối cùng → thắng');

  // Sói còn sống nhưng SK còn sống → chưa ai thắng
  s = mkGame(['wolf','serialkiller','villager']);
  ok(E.checkWin(s) === null, 'SK còn sống → Sói chưa được tuyên thắng');
}

console.log('— 7. Tiên Tri Tập Sự & Sói Trắng & buildNightSteps —');
{
  const s = mkGame(['wolf','whitewolf','seer','apprenticeseer','villager','villager']);
  let steps = E.buildNightSteps(s).map(x => x.type);
  ok(!steps.includes('whitewolf'), 'đêm 1 (lẻ): Sói Trắng chưa dậy');
  ok(steps[0] !== 'cupid', 'không có cupid trong steps');
  // Seer chết → apprentice kế thừa
  const hang = E.resolveHang(s, 2);
  ok(s.players[3].roleId === 'seer', 'Tập Sự kế thừa Tiên Tri');
  E.nextNight(s); // đêm 2
  steps = E.buildNightSteps(s).map(x => x.type);
  ok(steps.includes('whitewolf'), 'đêm 2 (chẵn): Sói Trắng dậy');
  ok(steps.includes('seer'), 'vẫn có bước Tiên Tri (người kế thừa)');
  const nd = E.newNightData();
  ok(!E.applyNightAction(s, nd, 'whitewolf', {targets:[4]}).ok, 'Sói Trắng không cắn Dân');
  ok(E.applyNightAction(s, nd, 'whitewolf', {targets:[0]}).ok, 'Sói Trắng cắn Sói OK');
  E.resolveMorning(s, nd);
  ok(!s.players[0].alive, 'Sói bị Sói Trắng cắn chết');
}

console.log(`\n══ KẾT QUẢ: ${passed} pass, ${failed} fail ══`);
process.exit(failed ? 1 : 0);
