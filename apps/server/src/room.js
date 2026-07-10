'use strict';
/* Room — logic phòng chơi AUTHORITATIVE, không phụ thuộc transport.
   Dùng @masoi/engine. "MC tự động": tự chạy vòng đêm → sáng → vote → treo → kiểm thắng.
   Lớp WebSocket (index.js) chỉ bơm message vào/ra qua callback `send`.
   v0: đêm chạy TUẦN TỰ (từng vai một). Chat/DM/reconnect/persistence: TODO Phase 1 tiếp theo. */

import E from '@masoi/engine';

const defaultScheduler = {
  set: (ms, fn) => setTimeout(fn, ms),
  clear: (t) => clearTimeout(t),
};
const now = () => Date.now();

export class Room {
  constructor({ id, send, engine = E, scheduler = defaultScheduler, settings = {} }) {
    this.id = id;
    this.send = send;                 // (playerId, msgObj) => void
    this.E = engine;
    this.sched = scheduler;
    this.settings = { actionSec: 60, discussionSec: 45, voteSec: 30, lgCaughtChance: 0, ...settings };
    this.players = [];                // [{ id, name }]  (thứ tự = chỉ số engine)
    this.phase = 'lobby';             // lobby | night | day | ended
    this.state = null;
    this.nd = null;
    this.queue = [];
    this.cur = null;                  // bước đêm hiện tại
    this.timer = null;
    this.votes = {};
  }

  /* ── tiện ích ── */
  broadcast(msg) { for (const p of this.players) this.send(p.id, msg); }
  idx(id) { return this.players.findIndex(p => p.id === id); }
  pid(i) { return this.players[i] && this.players[i].id; }
  aliveList() { return this.state.players.map((p, i) => ({ p, i })).filter(x => x.p.alive); }
  publicPlayers() {
    return this.state
      ? this.state.players.map((p, i) => ({ id: this.pid(i), name: p.name, seat: i, alive: p.alive }))
      : this.players.map((p, i) => ({ id: p.id, name: p.name, seat: i, alive: true }));
  }
  clearTimer() { if (this.timer) { this.sched.clear(this.timer); this.timer = null; } }

  /* ── LOBBY ── */
  join(id, name) {
    if (this.phase !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu' };
    if (!this.players.some(p => p.id === id)) this.players.push({ id, name: name || '?' });
    this.broadcast({ t: 'lobby', players: this.publicPlayers() });
    return { ok: true };
  }

  /* ── BẮT ĐẦU VÁN ── */
  start(counts, rng = Math.random) {
    if (this.phase !== 'lobby') return { ok: false, error: 'Đã bắt đầu' };
    const names = this.players.map(p => p.name);
    try { this.state = this.E.createGame(names, counts, rng); }
    catch (e) { return { ok: false, error: e.message }; }
    const deal = this.E.dealInfo(this.state);
    this.players.forEach((p, i) => {
      this.send(p.id, { t: 'yourRole', role: deal[i].role, mates: (deal[i].mates || []).map(m => ({ name: m.name })) });
    });
    this.phase = 'night';
    this.broadcastState();
    this.startNight();
    return { ok: true };
  }
  broadcastState() {
    this.broadcast({
      t: 'state', phase: this.phase,
      nightNo: this.state ? this.state.night : 0,
      dayNo: this.state ? this.state.day : 0,
      players: this.publicPlayers(),
      aliveCount: this.state ? this.aliveList().length : this.players.length,
    });
  }

  /* ── ĐÊM (tuần tự từng vai) ── */
  startNight() {
    this.nd = this.E.newNightData();
    this.queue = this.E.buildNightSteps(this.state).map(s => s.type);
    this.broadcast({ t: 'scene', phase: 'night', nightNo: this.state.night });
    this.nextStep();
  }
  actorsFor(type) {
    const B = this.E.BITING_WOLF_IDS;
    return this.aliveList()
      .filter(({ p }) => (type === 'wolf' ? B.includes(p.roleId) : p.roleId === type))
      .map(x => x.i);
  }
  nextStep() {
    this.clearTimer();
    if (!this.queue.length) return this.morning();
    const type = this.queue.shift();

    // Cô Bé Ti Hí: auto-MC quyết định theo xác suất cấu hình (mặc định: an toàn)
    if (type === 'littlegirl') {
      const caught = Math.random() < (this.settings.lgCaughtChance || 0);
      this.E.applyNightAction(this.state, this.nd, 'littlegirl', { caught });
      return this.nextStep();
    }

    const actors = this.actorsFor(type);
    if (!actors.length) return this.nextStep();

    this.cur = { type, actors: new Set(actors), acted: new Set(), wolfVotes: {} };
    const deadline = now() + this.settings.actionSec * 1000;
    const options = this.aliveList().map(x => ({ id: this.pid(x.i), name: x.p.name }));
    for (const p of this.players) {
      const i = this.idx(p.id);
      if (this.state.players[i].alive && actors.includes(i))
        this.send(p.id, { t: 'prompt', stepType: type, mode: type === 'witch' ? 'witch' : 'pick', options, deadline });
      else
        this.send(p.id, { t: 'sleep' });
    }
    this.timer = this.sched.set(this.settings.actionSec * 1000, () => this.stepTimeout());
  }
  handleAction(pid, action) {
    if (this.phase !== 'night' || !this.cur) return;
    const i = this.idx(pid);
    if (!this.cur.actors.has(i)) return;
    const type = this.cur.type;

    // Bỏ lượt: đánh dấu đã hành động, không tác động engine
    if (action && action.skip) {
      if (type === 'wolf') this.cur.wolfVotes[i] = [];
      this.cur.acted.add(i);
      if (this.cur.acted.size >= this.cur.actors.size)
        return type === 'wolf' ? this.finishWolf() : this.nextStep();
      return;
    }

    if (type === 'wolf') {
      this.cur.wolfVotes[i] = (action.targets || []).map(t => this.idx(t)).filter(x => x >= 0);
      this.cur.acted.add(i);
      if (this.cur.acted.size >= this.cur.actors.size) this.finishWolf();
      return;
    }

    let payload;
    if (type === 'witch')
      payload = {
        heal: action.heal != null ? this.idx(action.heal) : null,
        poison: action.poison != null ? this.idx(action.poison) : null,
      };
    else payload = { targets: (action.targets || []).map(t => this.idx(t)) };

    const res = this.E.applyNightAction(this.state, this.nd, type, payload);
    if (!res.ok) { this.send(pid, { t: 'error', message: res.error }); return; }
    if (type === 'seer' && res.private)
      this.send(pid, { t: 'privateResult', text: `Soi ${res.private.name}: ${res.private.seen === 'wolf' ? 'LÀ MA SÓI' : 'KHÔNG phải Sói'}` });
    this.cur.acted.add(i);
    if (this.cur.acted.size >= this.cur.actors.size) this.nextStep();
  }
  finishWolf() {
    const tally = {};
    Object.values(this.cur.wolfVotes).forEach(ts => ts.forEach(t => { tally[t] = (tally[t] || 0) + 1; }));
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const maxK = 1 + (this.state.flags.wolfCubBonusKill ? 1 : 0);
    const targets = ranked.slice(0, maxK).map(r => +r[0]);
    if (targets.length) this.E.applyNightAction(this.state, this.nd, 'wolf', { targets });
    this.nextStep();
  }
  stepTimeout() {
    if (!this.cur) return;
    if (this.cur.type === 'wolf') this.finishWolf();
    else this.nextStep();               // hết giờ: bỏ qua vai chưa hành động
  }

  /* ── SÁNG ── */
  morning() {
    this.clearTimer();
    const r = this.E.resolveMorning(this.state, this.nd);
    this.broadcast({ t: 'morning', nightNo: this.state.night, lines: r.publicLines });
    this.broadcastState();
    if (r.win) return this.gameOver(r.win);
    this.phase = 'day';
    this.broadcastState();
    this.startDay();
  }

  /* ── NGÀY: thảo luận → vote → treo ── */
  startDay() {
    this.votes = {};
    this.broadcast({ t: 'scene', phase: 'day', dayNo: this.state.day });
    this.timer = this.sched.set(this.settings.discussionSec * 1000, () => {
      this.broadcast({
        t: 'voteOpen', deadline: now() + this.settings.voteSec * 1000,
        options: this.aliveList().map(x => ({ id: this.pid(x.i), name: x.p.name })),
      });
      this.timer = this.sched.set(this.settings.voteSec * 1000, () => this.closeVote());
    });
  }
  handleVote(pid, targetPid) {
    if (this.phase !== 'day') return;
    const vi = this.idx(pid), ti = this.idx(targetPid);
    if (vi < 0 || ti < 0 || !this.state.players[vi].alive) return;
    this.votes[vi] = ti;
    const c = {}; Object.values(this.votes).forEach(t => { c[t] = (c[t] || 0) + 1; });
    this.broadcast({ t: 'voteTally', tally: c });
  }
  closeVote() {
    this.clearTimer();
    const { top } = this.E.tallyVotes(this.state, this.votes);
    let lines;
    if (top != null) {
      const r = this.E.resolveHang(this.state, top);
      lines = r.lines;
      if (r.events && r.events.includes('hunterwolfRevenge')) {
        const cand = this.aliveList().filter(x => x.i !== top);
        if (cand.length) {
          const pick = cand[Math.floor(Math.random() * cand.length)].i;
          const rv = this.E.applyRevenge(this.state, pick);
          lines = lines.concat(rv.lines);
          if (rv.win) { this.broadcast({ t: 'day', lines }); return this.gameOver(rv.win); }
        }
      }
      if (r.win) { this.broadcast({ t: 'day', lines }); return this.gameOver(r.win); }
    } else {
      lines = ['Không treo ai (hòa hoặc không đủ phiếu).'];
    }
    this.broadcast({ t: 'day', lines });
    this.broadcastState();
    this.E.nextNight(this.state);
    this.phase = 'night';
    this.broadcastState();
    this.startNight();
  }

  /* ── KẾT THÚC ── */
  gameOver(win) {
    this.phase = 'ended';
    this.clearTimer();
    const reveal = this.state.players.map((p) => {
      const r = this.E.roleOf(p.roleId);
      return { name: p.name, role: r.name, alive: p.alive };
    });
    this.broadcast({ t: 'gameOver', winner: win.winner, desc: win.desc, reveal });
  }
}
