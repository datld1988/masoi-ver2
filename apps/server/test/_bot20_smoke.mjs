/* Smoke test 20 người (1 real + 19 bot) với suggestRoleCounts(20).
   Verify: ván start được, kết thúc, có winner hợp lệ, không lộ vai trong trận. */
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import { makeBotPersonas } from '../src/bot-personas.js';
import E from '@masoi/engine';

function makeScheduler() {
  let seq = 0; const timers = new Map();
  return {
    set(ms, fn) { const id = ++seq; timers.set(id, { ms, fn }); return id; },
    clear(id) { timers.delete(id); },
    count() { return timers.size; },
    fireNext() {
      const k = [...timers.keys()][0];
      if (k == null) return false;
      const { fn } = timers.get(k); timers.delete(k);
      try { fn(); } catch (e) {}
      return true;
    },
  };
}

/* Cùng suggestRoleCounts như trong index.js (copy để không cần import) */
function suggestRoleCounts(n) {
  const counts = {};
  if (n < 3) return { wolf: 1, villager: Math.max(0, n - 1) };
  const wolfTotal = Math.max(1, Math.round(n / 4));
  if (wolfTotal >= 4) { counts.wolf = wolfTotal - 3; counts.alpha = 1; counts.wolfseer = 1; counts.wolfcub = 1; }
  else if (wolfTotal === 3) { counts.wolf = 1; counts.alpha = 1; counts.wolfseer = 1; }
  else if (wolfTotal === 2) { counts.wolf = 1; counts.wolfseer = 1; }
  else counts.wolf = 1;
  counts.seer = 1;
  if (n >= 6) counts.witch = 1;
  if (n >= 7) counts.bodyguard = 1;
  if (n >= 9) counts.hunter = 1;
  if (n >= 10) counts.cupid = 1;
  if (n >= 11) counts.mayor = 1;
  if (n >= 13) counts.medium = 1;
  if (n >= 14) counts.detective = 1;
  if (n >= 16) counts.fox = 1;
  if (n >= 17) counts.priest = 1;
  if (n >= 18) counts.graverobber = 1;
  if (n >= 15) counts.prince = 1;
  if (n >= 18) counts.joker = 1;
  const used = Object.values(counts).reduce((a, b) => a + b, 0);
  const vil = n - used;
  if (vil > 0) counts.villager = vil;
  return counts;
}

function runOne() {
  const sched = makeScheduler();
  const inbox = new Map(); const allMsgs = [];
  const send = (pid, msg) => { if (!inbox.has(pid)) inbox.set(pid, []); inbox.get(pid).push(msg); allMsgs.push({ pid, msg }); };
  const room = new Room({ id: 'BOT20', send, scheduler: sched, settings: { discussionSec: 1, voteSec: 1, actionSec: 1 } });

  const humanId = 'human_1';
  room.join(humanId, 'Human');
  const personas = makeBotPersonas(19, ['Human']);
  for (const p of personas) {
    const res = room.addBot(p);
    assert.equal(res.ok, true, `addBot fail: ${res.error}`);
  }
  assert.equal(room.players.length, 20, '20 người');

  const counts = suggestRoleCounts(20);
  const rs = room.start(counts, undefined, {}, humanId);
  assert.equal(rs.ok, true, `start fail: ${rs.error || ''}`);

  let guard = 0;
  const MAX = 5000;
  while (room.phase !== 'ended' && guard++ < MAX) {
    if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.has(room.idx(humanId))) {
      room.handleAction(humanId, { skip: true });
    } else if (room.phase === 'day' && room.voteOpen && room.state.players[room.idx(humanId)].alive) {
      const others = room.aliveList().filter(x => x.i !== room.idx(humanId));
      if (others.length && !room.votes[room.idx(humanId)]) {
        room.handleVote(humanId, room.pid(others[0].i));
      }
    }
    if (sched.count()) sched.fireNext(); else break;
  }
  assert.equal(room.phase, 'ended', `Ván chưa kết thúc (guard=${guard})`);

  const gameOverMsg = allMsgs.find(x => x.msg.t === 'gameOver');
  assert.ok(gameOverMsg, 'Không có gameOver');
  assert.ok(['village', 'wolf', 'third', 'neutral'].includes(gameOverMsg.msg.winner), 'winner hợp lệ');
  assert.equal(gameOverMsg.msg.reveal.length, 20, 'reveal 20 người');
  assert.equal(gameOverMsg.msg.hasBot, true, 'hasBot=true');

  // KHÔNG lộ vai trong trận
  for (const x of allMsgs) if (x.msg.t === 'morning' || x.msg.t === 'day') {
    const text = (x.msg.lines || []).join(' | ');
    for (const rn of E.ROLES.map(r => r.name)) {
      assert.ok(!text.includes(rn), `Lộ vai "${rn}" trong ${x.msg.t}: ${text}`);
    }
  }

  const chatMsgs = allMsgs.filter(x => x.msg.t === 'chatMsg');
  console.log(`  guard=${guard} winner=${gameOverMsg.msg.winner} chats=${chatMsgs.length}`);
  return { winner: gameOverMsg.msg.winner, chats: chatMsgs.length };
}

const runs = 5;
const results = [];
for (let i = 0; i < runs; i++) { console.log(`Run ${i + 1}:`); results.push(runOne()); }
console.log(`\n✅ ${runs}/${runs} run PASS`);
console.log('winners:', results.map(r => r.winner).join(', '));
console.log('chats:', results.map(r => r.chats).join(', '));
process.exit(0);
