// Định nghĩa TẤT CẢ kịch bản test 1 lần; nhận hàm t(name, fn).
// Dùng chung cho vitest (room.test.js) và runner Node thuần (run.mjs).
import assert from 'node:assert/strict';
import {
  E, isWolf, buildRoom, driveGame, defaultNightAction, skipNight,
  toDayVote, runNight, castHang, gameOverOf, assertNoRoleLeak, findRole,
} from './harness.mjs';

export function defineTests(t) {
  /* ── [1] Trọn ván cho từng vai trong 22 vai ── */
  for (const role of E.ROLES) t(`[trọn ván] ${role.id} (${role.name})`, () => {
    const counts = { wolf: 2, villager: 5 }; counts[role.id] = (counts[role.id] || 0) + 1;   // đảm bảo vai có mặt → tổng 8
    const ctx = buildRoom(counts, { settings: role.id === 'littlegirl' ? { lgCaughtChance: 1 } : {} });
    assert.ok(ctx.startRes.ok, 'start: ' + (ctx.startRes.error || ''));
    const r = driveGame(ctx);
    assert.ok(r.ended, `không kết thúc (guard=${r.guard})`);
    const go = gameOverOf(ctx.all);
    assert.ok(go && ['village', 'wolf', 'third'].includes(go.winner), 'winner: ' + (go && go.winner));
    assert.equal(go.reveal.length, 8);
    assert.ok(go.reveal.every(x => x.name && x.role) && Array.isArray(go.history));
    assertNoRoleLeak(ctx.all);
  });

  /* ── [2] Cơ chế nền qua vòng auto-MC ── */
  t('[cơ chế] Sói bầu theo ĐA SỐ (2 vs 1)', () => {
    const ctx = buildRoom({ wolf: 3, villager: 4 }); const { room } = ctx;
    const wolves = room.aliveList().filter(x => isWolf(x.p.roleId)).map(x => x.i).sort((a, b) => a - b);
    const vills = room.aliveList().filter(x => !isWolf(x.p.roleId)).map(x => x.i);
    const Y = vills[0], X = vills[1];
    runNight(ctx, (rm, i, type) => type === 'wolf' ? { targets: [rm.pid(i === wolves[0] ? Y : X)] } : defaultNightAction(rm, i, type));
    assert.ok(!room.state.players[X].alive && room.state.players[Y].alive);
  });
  t('[cơ chế] Bảo Vệ chặn cắn', () => {
    const ctx = buildRoom({ wolf: 1, bodyguard: 1, villager: 3 }); const { room } = ctx;
    const V = findRole(room, 'villager').i;
    runNight(ctx, (rm, i, type) => (type === 'wolf' || type === 'bodyguard') ? { targets: [rm.pid(V)] } : defaultNightAction(rm, i, type));
    assert.ok(room.state.players[V].alive);
  });
  t('[cơ chế] Phù Thủy độc giết Sói (qua prompt)', () => {
    const ctx = buildRoom({ wolf: 1, witch: 1, villager: 4 }); const { room } = ctx;
    const w = findRole(room, 'wolf').i; runNight(ctx);
    assert.ok(!room.state.players[w].alive);
  });
  t('[cơ chế] waveTimeout: không ai hành động vẫn sang ngày', () => {
    const ctx = buildRoom({ wolf: 1, seer: 1, villager: 3 }); const { room, sched } = ctx;
    const before = room.aliveList().length; sched.fireNext();
    assert.notEqual(room.phase, 'night'); assert.equal(room.aliveList().length, before);
  });
  t('[cơ chế] resume giữa đêm trả lại prompt Tiên Tri', () => {
    const ctx = buildRoom({ wolf: 1, seer: 1, villager: 3 }); const { room, inbox } = ctx;
    const pid = room.pid(findRole(room, 'seer').i); inbox.set(pid, []); room.resume(pid);
    assert.ok((inbox.get(pid) || []).some(m => m.t === 'prompt' && m.stepType === 'seer'));
  });
  t('[cơ chế] Lịch sử kèm vai + bảng phiếu, KHÔNG lộ vai trong trận', () => {
    const ctx = buildRoom({ wolf: 2, seer: 1, bodyguard: 1, witch: 1, villager: 3 }); driveGame(ctx);
    const go = gameOverOf(ctx.all); const nights = go.history.filter(h => h.type === 'night'), days = go.history.filter(h => h.type === 'day');
    assert.ok(nights.length >= 1 && nights.some(h => (h.actions || []).some(a => /\(.+\)/.test(a))), 'đêm có hành động kèm vai');
    assert.ok(days.some(h => Array.isArray(h.votes)), 'ngày có bảng phiếu');
    assertNoRoleLeak(ctx.all);
  });

  /* ── [3] Kết quả đặc thù từng vai (outcome, không chỉ no-crash) ── */
  t('[đặc thù] Kẻ Điên bị treo → phe Thứ Ba thắng', () => {
    const ctx = buildRoom({ joker: 1, wolf: 1, villager: 4 }); const { room } = ctx;
    toDayVote(ctx, skipNight); castHang(ctx, findRole(room, 'joker').i);
    assert.equal(gameOverOf(ctx.all).winner, 'third');
  });
  t('[đặc thù] Hoàng Tử thoát án treo lần đầu', () => {
    const ctx = buildRoom({ prince: 1, wolf: 1, villager: 4 }); const { room } = ctx;
    const p = findRole(room, 'prince').i; toDayVote(ctx, skipNight); castHang(ctx, p);
    assert.ok(room.state.players[p].alive && room.state.flags.princeSaved);
  });
  t('[đặc thù] Kẻ Ngốc bị treo → sống, mất quyền vote', () => {
    const ctx = buildRoom({ idiot: 1, wolf: 1, villager: 4 }); const { room } = ctx;
    const id = findRole(room, 'idiot').i; toDayVote(ctx, skipNight); castHang(ctx, id);
    assert.ok(room.state.players[id].alive && room.state.players[id].idiotRevealed);
  });
  t('[đặc thù] Sói Thợ Săn bị treo → kéo 1 người chết theo', () => {
    const ctx = buildRoom({ hunterwolf: 1, wolf: 1, villager: 4 }); const { room } = ctx;
    const hw = findRole(room, 'hunterwolf').i; toDayVote(ctx, skipNight);
    const before = room.aliveList().length; castHang(ctx, hw);
    assert.ok(!room.state.players[hw].alive); assert.equal(room.aliveList().length, before - 2);
  });
  t('[đặc thù] Trưởng Làng: phiếu ×2 được tính trong tally', () => {
    const ctx = buildRoom({ mayor: 1, wolf: 1, villager: 4 }); const { room } = ctx;
    toDayVote(ctx, skipNight);
    const mayor = findRole(room, 'mayor').i, vills = room.aliveList().filter(x => x.p.roleId === 'villager').map(x => x.i);
    const X = vills[0], Y = vills[1];
    room.votes = {}; room.handleVote(room.pid(mayor), room.pid(X)); room.handleVote(room.pid(vills[2]), room.pid(Y));
    const { top, tally } = E.tallyVotes(room.state, room.votes);
    assert.equal(top, X, 'Trưởng Làng ×2 giúp X thắng tally');
    assert.equal(tally[X], 2, 'X có 2 phiếu weighted (mayor ×2)');
    assert.equal(tally[Y], 1, 'Y có 1 phiếu');
  });
  t('[đặc thù] Vote treo cổ cần ≥ 2/3 người sống', () => {
    const ctx = buildRoom({ villager: 6, wolf: 3 }); const { room, sched } = ctx;
    toDayVote(ctx, skipNight);
    /* 9 sống → threshold = ceil(9*2/3) = 6. Chỉ 5 người vote 1 mục tiêu → không đủ, không ai treo. */
    const aliveIdx = room.aliveList().map(x => x.i);
    const target = aliveIdx[0];
    room.votes = {};
    for (let k = 1; k <= 5; k++) room.handleVote(room.pid(aliveIdx[k]), room.pid(target));
    sched.fireNext();
    assert.ok(room.state.players[target].alive, 'Không đủ 2/3 phiếu → không treo được');
  });
  t('[đặc thù] Vote treo cổ: đủ 2/3 thì treo', () => {
    const ctx = buildRoom({ villager: 6, wolf: 3 }); const { room, sched } = ctx;
    toDayVote(ctx, skipNight);
    const aliveIdx = room.aliveList().map(x => x.i);
    const target = aliveIdx[0];
    room.votes = {};
    /* 6 người vote 1 mục tiêu = đủ 6/9 ≥ 2/3 */
    for (let k = 1; k <= 6; k++) room.handleVote(room.pid(aliveIdx[k]), room.pid(target));
    sched.fireNext();
    assert.ok(!room.state.players[target].alive, 'Đủ 2/3 phiếu → treo thành công');
  });
  t('[đặc thù] Kẻ Nguyền Rủa bị cắn → hoá Sói, không chết', () => {
    const ctx = buildRoom({ cursedone: 1, wolf: 1, villager: 4 }); const { room } = ctx;
    const c = findRole(room, 'cursedone').i;
    runNight(ctx, (rm, i, type) => type === 'wolf' ? { targets: [rm.pid(c)] } : defaultNightAction(rm, i, type));
    assert.ok(room.state.players[c].alive && room.state.players[c].roleId === 'wolf');
  });
  t('[đặc thù] Sói Con chết → đêm sau Sói cắn được 2', () => {
    const ctx = buildRoom({ wolfcub: 1, wolf: 1, villager: 5 }); const { room } = ctx;
    const wc = findRole(room, 'wolfcub').i; toDayVote(ctx, skipNight); castHang(ctx, wc);
    assert.ok(!room.state.players[wc].alive && room.state.flags.wolfCubBonusKill);
    assert.equal(room.maxTargets('wolf'), 2);
  });
  t('[đặc thù] Tiên Tri Tập Sự kế thừa khi Tiên Tri chết', () => {
    const ctx = buildRoom({ seer: 1, apprenticeseer: 1, wolf: 1, villager: 3 }); const { room } = ctx;
    const seer = findRole(room, 'seer').i, app = findRole(room, 'apprenticeseer').i;
    runNight(ctx, (rm, i, type) => type === 'wolf' ? { targets: [rm.pid(seer)] } : defaultNightAction(rm, i, type));
    assert.ok(!room.state.players[seer].alive && room.state.players[app].roleId === 'seer' && room.state.flags.apprenticeActivated);
  });
  t('[đặc thù] Sát Nhân sống cuối cùng → thắng phe Thứ Ba', () => {
    const ctx = buildRoom({ serialkiller: 1, villager: 1 }); driveGame(ctx);
    assert.equal(gameOverOf(ctx.all).winner, 'third');
  });
}
