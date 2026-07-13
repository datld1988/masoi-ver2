// Harness test AUTO-MC cho Room — drive trọn ván bằng scheduler giả + bot sinh hành động hợp lệ.
// Không phụ thuộc WebSocket: Room nhận { send, scheduler } giả lập nên chạy được dưới Node thuần.
import assert from 'node:assert/strict';
import E from '@masoi/engine';
import { Room } from '../src/room.js';

export { E };
export const WOLF = E.WOLF_IDS;
export const ROLE_NAMES = E.ROLES.map(r => r.name);
export const isWolf = rid => WOLF.includes(rid);

// Scheduler thủ công: giữ callback timer, test chủ động "kích" thay cho đồng hồ thật.
export function makeScheduler() {
  let seq = 0; const timers = new Map();
  return {
    set(ms, fn) { const id = ++seq; timers.set(id, fn); return id; },
    clear(id) { timers.delete(id); },
    count() { return timers.size; },
    fireNext() { const k = [...timers.keys()][0]; if (k == null) return false; const fn = timers.get(k); timers.delete(k); fn(); return true; },
  };
}

// Dựng phòng N người (chủ phòng = p0), mọi người khác "sẵn sàng", rồi start với counts cho trước.
export function buildRoom(counts, { settings = {}, rng } = {}) {
  const sched = makeScheduler();
  const inbox = new Map(); const all = [];
  const send = (pid, msg) => { if (!inbox.has(pid)) inbox.set(pid, []); inbox.get(pid).push(msg); all.push({ pid, msg }); };
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  const room = new Room({ id: 'T', send, scheduler: sched, settings: { discussionSec: 1, voteSec: 1, actionSec: 1, ...settings } });
  const ids = [];
  for (let i = 0; i < n; i++) { const id = 'p' + i; ids.push(id); room.join(id, 'N' + i); }
  ids.slice(1).forEach(id => room.setReady(id, true));
  const startRes = room.start(counts, rng || Math.random, {}, ids[0]);
  return { room, sched, inbox, all, ids, startRes };
}

// Bot: sinh hành động đêm HỢP LỆ cho mọi stepType, dựa trên sự thật (room.state).
export function defaultNightAction(room, i, type) {
  const S = room.state, al = room.aliveList(), others = al.filter(x => x.i !== i), pid = j => room.pid(j);
  switch (type) {
    case 'wolf': { const v = al.find(x => !isWolf(x.p.roleId)); return v ? { targets: [pid(v.i)] } : { skip: true }; }
    case 'whitewolf': { const w = al.find(x => isWolf(x.p.roleId) && x.p.roleId !== 'whitewolf'); return w ? { targets: [pid(w.i)] } : { skip: true }; }
    case 'seer': { const t = others[0]; return t ? { targets: [pid(t.i)] } : { skip: true }; }
    case 'bodyguard': { const c = al.find(x => x.i !== S.flags.bodyguardLastIdx); return c ? { targets: [pid(c.i)] } : { skip: true }; }
    case 'doctor': return { targets: [pid(al[0].i)] };
    case 'cupid': return al.length < 2 ? { skip: true } : { targets: [pid(al[0].i), pid(al[1].i)] };
    case 'hunter': { const w = al.find(x => isWolf(x.p.roleId)); const t = w || others[0]; return t ? { targets: [pid(t.i)] } : { skip: true }; }
    case 'serialkiller': { const t = others[0]; return t ? { targets: [pid(t.i)] } : { skip: true }; }
    case 'witch': { if (!S.flags.witchPoisonUsed) { const w = al.find(x => isWolf(x.p.roleId) && x.i !== i); if (w) return { heal: null, poison: pid(w.i) }; } return { heal: null, poison: null }; }
    default: return { skip: true };
  }
}
export const skipNight = () => ({ skip: true });

// Vote mặc định: dồn phiếu cho 1 Sói còn sống (nếu có) → ván tiến triển & chắc chắn kết thúc.
export function defaultVote(room, i) {
  const al = room.aliveList(), w = al.find(x => isWolf(x.p.roleId));
  if (w && w.i !== i) return w.i;
  if (w && w.i === i) { const o = al.find(x => x.i !== i); return o ? o.i : null; }
  const f = al[0]; if (f.i !== i) return f.i; return al[1] ? al[1].i : null;
}

// Đưa ván tới đúng lúc voteOpen của ngày kế tiếp (đêm dùng nightAction, mặc định bỏ lượt).
export function toDayVote(ctx, nightAction = skipNight, cap = 200) {
  const { room, sched } = ctx; let g = 0;
  while (room.phase !== 'ended' && !(room.phase === 'day' && room.voteOpen) && g++ < cap) {
    if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.size) {
      const i = [...room.cur.pending][0], pid = room.pid(i);
      room.handleAction(pid, nightAction(room, i, room.cur.stepByActor[i]));
      if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.has(i)) room.handleAction(pid, { skip: true });
    } else if (sched.count()) sched.fireNext(); else break;
  }
}

// Chạy hết đúng 1 đêm (tới khi rời phase 'night').
export function runNight(ctx, nightAction = defaultNightAction, cap = 100) {
  const { room, sched } = ctx; let g = 0;
  while (room.phase === 'night' && g++ < cap) {
    if (room.cur && room.cur.pending && room.cur.pending.size) {
      const i = [...room.cur.pending][0], pid = room.pid(i);
      room.handleAction(pid, nightAction(room, i, room.cur.stepByActor[i]));
      if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.has(i)) room.handleAction(pid, { skip: true });
    } else if (sched.count()) sched.fireNext(); else break;
  }
}

// Mọi người còn sống dồn phiếu treo 1 người (idx), rồi chốt phiếu.
export function castHang(ctx, targetIdx) {
  const { room, sched } = ctx;
  room.votes = {};
  for (const { i } of room.aliveList()) room.handleVote(room.pid(i), room.pid(targetIdx));
  sched.fireNext();  // → closeVote
}

// Điều khiển TRỌN ván tới gameOver (đêm hành động thật, ngày dồn phiếu).
export function driveGame(ctx, policy = {}, cap = 600) {
  const { room, sched } = ctx;
  const nightAct = policy.nightAction || defaultNightAction, voteFor = policy.vote || defaultVote;
  let guard = 0;
  while (room.phase !== 'ended' && guard++ < cap) {
    if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.size) {
      const i = [...room.cur.pending][0], pid = room.pid(i);
      room.handleAction(pid, nightAct(room, i, room.cur.stepByActor[i]));
      if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.has(i)) room.handleAction(pid, { skip: true });
    } else if (room.phase === 'day' && room.voteOpen) {
      for (const { i } of room.aliveList()) { const t = voteFor(room, i); if (t != null) room.handleVote(room.pid(i), room.pid(t)); }
      sched.fireNext();
    } else if (sched.count()) sched.fireNext(); else break;
  }
  return { ended: room.phase === 'ended', guard };
}

export const gameOverOf = all => all.map(x => x.msg).find(m => m.t === 'gameOver');

// Trong trận (morning/day) TUYỆT ĐỐI không được lộ tên vai — chỉ lộ khi kết thúc.
export function assertNoRoleLeak(all) {
  for (const { msg } of all) if (msg.t === 'morning' || msg.t === 'day') {
    const text = (msg.lines || []).join(' | ');
    for (const rn of ROLE_NAMES) assert.ok(!text.includes(rn), `Lộ vai "${rn}" trong ${msg.t}: ${text}`);
  }
}
export const findRole = (room, roleId) => room.aliveList().find(x => x.p.roleId === roleId);
