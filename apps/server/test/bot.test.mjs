// Test bot: 1 người thật + 5 bot chơi tới gameOver.
// Chạy: node apps/server/test/bot.test.mjs
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
      try { fn(); } catch (e) { /* swallow */ }
      return true;
    },
  };
}

function runTest() {
  const sched = makeScheduler();
  const inbox = new Map(); const allMsgs = [];
  const send = (pid, msg) => {
    if (!inbox.has(pid)) inbox.set(pid, []);
    inbox.get(pid).push(msg);
    allMsgs.push({ pid, msg });
  };
  const room = new Room({
    id: 'BOT', send, scheduler: sched,
    settings: { discussionSec: 1, voteSec: 1, actionSec: 1 },
  });

  // 1 người thật (chủ phòng)
  const humanId = 'human_1';
  room.join(humanId, 'Human');

  // Add 5 bot
  const personas = makeBotPersonas(5, ['Human']);
  for (const p of personas) {
    const res = room.addBot(p);
    assert.equal(res.ok, true, `addBot fail: ${res.error}`);
  }

  // Kiểm tra: 6 người trong phòng, chủ = human, 5 bot
  assert.equal(room.players.length, 6, '6 người');
  assert.equal(room.ownerId, humanId, 'chủ = human');
  assert.equal(room.hasBot(), true, 'phòng có bot');
  assert.equal(room.players.filter(p => p.isBot).length, 5, '5 bot');

  // Owner ready+start (nhân human)
  const counts = { wolf: 1, seer: 1, witch: 1, villager: 3 };
  // Tất cả bot đã ready=true; owner không cần ready (được exclude)
  const rs = room.start(counts, undefined, {}, humanId);
  assert.equal(rs.ok, true, `start fail: ${rs.error || ''}`);

  // Ván bắt đầu → drive tới gameOver
  let guard = 0;
  const MAX = 3000;   // sched fireNext + botAction có nhiều timer async
  while (room.phase !== 'ended' && guard++ < MAX) {
    // Bot có timer trong sched — fireNext để chúng chạy
    // Cũng: mọi vai không phải bot (human) không phản ứng — bot sẽ tự skip lần lượt
    if (room.phase === 'night' && room.cur && room.cur.pending && room.cur.pending.has(room.idx(humanId))) {
      // Human "skip" ngay để không kẹt
      room.handleAction(humanId, { skip: true });
    } else if (room.phase === 'day' && room.voteOpen && room.state.players[room.idx(humanId)].alive) {
      // Human vote random 1 người khác
      const others = room.aliveList().filter(x => x.i !== room.idx(humanId));
      if (others.length && !room.votes[room.idx(humanId)]) {
        room.handleVote(humanId, room.pid(others[0].i));
      }
    }
    if (sched.count()) sched.fireNext(); else break;
  }

  assert.equal(room.phase, 'ended', `Ván chưa kết thúc (guard=${guard})`);

  // Có gameOver message
  const gameOverMsg = allMsgs.find(x => x.msg.t === 'gameOver');
  assert.ok(gameOverMsg, 'Không có gameOver');
  assert.ok(['village', 'wolf', 'third', 'neutral'].includes(gameOverMsg.msg.winner), 'winner hợp lệ');
  assert.equal(gameOverMsg.msg.hasBot, true, 'gameOver có hasBot=true');

  // Reveal có isBot flag cho bot
  const rev = gameOverMsg.msg.reveal || [];
  assert.equal(rev.length, 6, 'reveal 6 người');
  const botReveal = rev.filter(r => r.isBot);
  assert.equal(botReveal.length, 5, '5 bot trong reveal');

  // Bot phải có hành động (action/vote hợp lệ) — kiểm tra qua state đã tiến triển
  // Chat là ngẫu nhiên nên không assert bắt buộc, chỉ warn nếu 0
  const chatMsgs = allMsgs.filter(x => x.msg.t === 'chatMsg');
  const botNames = personas.map(p => p.name);
  const botChats = chatMsgs.filter(x => botNames.includes(x.msg.from));
  // Bot phải xuất hiện trong events (có action đêm hoặc vote)
  const morningLines = allMsgs.filter(x => x.msg.t === 'morning').flatMap(x => x.msg.lines || []);
  const dayLines = allMsgs.filter(x => x.msg.t === 'day').flatMap(x => x.msg.lines || []);
  const anyProgress = morningLines.length > 0 || dayLines.length > 0;
  assert.ok(anyProgress, 'Ván không tiến triển — không có morning/day events');

  // KHÔNG lộ vai trong trận
  for (const x of allMsgs) if (x.msg.t === 'morning' || x.msg.t === 'day') {
    const text = (x.msg.lines || []).join(' | ');
    for (const rn of E.ROLES.map(r => r.name)) {
      assert.ok(!text.includes(rn), `Lộ vai "${rn}" trong ${x.msg.t}: ${text}`);
    }
  }

  console.log(`✅ Bot test: ván kết thúc (guard=${guard}), winner=${gameOverMsg.msg.winner}, bot chats=${botChats.length}`);
}

try {
  runTest();
  console.log('──────── ✅ BOT TEST PASS ────────');
  process.exit(0);
} catch (e) {
  console.error('──────── ❌ BOT TEST FAIL ────────');
  console.error(e.stack || e.message);
  process.exit(1);
}
