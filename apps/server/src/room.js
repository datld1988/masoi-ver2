'use strict';
/* Room — logic phòng chơi AUTHORITATIVE, không phụ thuộc transport.
   Dùng @masoi/engine. "MC tự động": tự chạy vòng đêm → sáng → vote → treo → kiểm thắng.
   ĐÊM: MỌI vai (kể cả Phù Thủy) hành động SONG SONG trong một đợt; nộp thứ tự nào cũng được.
   Phù Thủy "mù" (không cần biết nạn nhân) — chỉ chọn cứu/không, độc/không; engine chặn mỗi bình 1 lần/ván.
   Server tự kiểm soát chat (ai thấy kênh nào) và hỗ trợ reconnect (resume theo id ổn định).
   v0. Persistence (Redis/Postgres): TODO. */

import E from '@masoi/engine';

const defaultScheduler = { set: (ms, fn) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) };
const now = () => Date.now();
const CHATS = ['main', 'wolf', 'dead'];

export class Room {
  constructor({ id, send, engine = E, scheduler = defaultScheduler, settings = {} }) {
    this.id = id;
    this.send = send;                 // (playerId, msgObj) => void
    this.E = engine;
    this.sched = scheduler;
    this.settings = { actionSec: 60, discussionSec: 45, voteSec: 30, lgCaughtChance: 0, ...settings };
    this.players = [];                // [{ id, name, connected }]  (thứ tự = chỉ số engine)
    this.phase = 'lobby';             // lobby | night | day | ended
    this.state = null;
    this.nd = null;
    this.cur = null;                  // trạng thái đợt đêm hiện tại
    this.timer = null;
    this.votes = {};
    this.voteOpen = false;
    this.chatLog = { main: [], wolf: [], dead: [] };
  }

  /* ── tiện ích ── */
  broadcast(msg) { for (const p of this.players) this.send(p.id, msg); }
  idx(id) { return this.players.findIndex(p => p.id === id); }
  pid(i) { return this.players[i] && this.players[i].id; }
  hasPlayer(id) { return this.idx(id) >= 0; }
  aliveList() { return this.state.players.map((p, i) => ({ p, i })).filter(x => x.p.alive); }
  isWolf(i) { return !!this.state && this.E.BITING_WOLF_IDS.includes(this.state.players[i].roleId); }
  publicPlayers() {
    return this.state
      ? this.state.players.map((p, i) => ({ id: this.pid(i), name: p.name, seat: i, alive: p.alive, connected: this.players[i].connected }))
      : this.players.map((p, i) => ({ id: p.id, name: p.name, seat: i, alive: true, connected: p.connected, ready: !!p.ready }));
  }
  setReady(id, val) {
    const i = this.idx(id); if (i < 0 || this.phase !== 'lobby') return;
    this.players[i].ready = !!val;
    this.broadcast({ t: 'lobby', players: this.publicPlayers() });
  }
  clearTimer() { if (this.timer) { this.sched.clear(this.timer); this.timer = null; } }

  /* ── LOBBY / KẾT NỐI ── */
  join(id, name) {
    if (this.phase !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu' };
    if (!this.players.some(p => p.id === id)) this.players.push({ id, name: name || '?', connected: true });
    this.broadcast({ t: 'lobby', players: this.publicPlayers() });
    return { ok: true };
  }
  setConnected(id, val) { const i = this.idx(id); if (i < 0) return; this.players[i].connected = val; this.broadcastState(); }

  /* ── BẮT ĐẦU VÁN ── */
  start(counts, rng = Math.random, opts = {}) {
    if (this.phase !== 'lobby') return { ok: false, error: 'Đã bắt đầu' };
    const clamp = (v, lo, hi, dflt) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt; };
    if (opts.actionSec != null) this.settings.actionSec = clamp(opts.actionSec, 15, 300, this.settings.actionSec);
    if (opts.discussionSec != null) this.settings.discussionSec = clamp(opts.discussionSec, 0, 300, this.settings.discussionSec);
    if (opts.voteSec != null) this.settings.voteSec = clamp(opts.voteSec, 10, 180, this.settings.voteSec);
    const names = this.players.map(p => p.name);
    try { this.state = this.E.createGame(names, counts, rng); }
    catch (e) { return { ok: false, error: e.message }; }
    const deal = this.E.dealInfo(this.state);
    this.players.forEach((p, i) => this.send(p.id, { t: 'yourRole', role: deal[i].role, mates: (deal[i].mates || []).map(m => ({ name: m.name })) }));
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

  /* ── ĐÊM: mọi vai hành động SONG SONG (gồm Phù Thủy) ── */
  actorsFor(type) {
    const B = this.E.BITING_WOLF_IDS;
    return this.aliveList()
      .filter(({ p }) => (type === 'wolf' ? B.includes(p.roleId) : p.roleId === type))
      .map(x => x.i);
  }
  promptOptions() { return this.aliveList().map(x => ({ id: this.pid(x.i), name: x.p.name })); }
  promptForActor(type, options, deadline) {
    if (type === 'witch')
      return { t: 'prompt', stepType: 'witch', mode: 'witch', options, deadline, healUsed: this.state.flags.witchHealUsed, poisonUsed: this.state.flags.witchPoisonUsed };
    return { t: 'prompt', stepType: type, mode: 'pick', options, deadline };
  }
  startNight() {
    this.nd = this.E.newNightData();
    this.cur = null;
    this.broadcast({ t: 'scene', phase: 'night', nightNo: this.state.night });
    const steps = this.E.buildNightSteps(this.state).map(s => s.type);
    for (const t of steps)   // Cô Bé Ti Hí: auto-MC quyết định ngay
      if (t === 'littlegirl') { const caught = Math.random() < (this.settings.lgCaughtChance || 0); this.E.applyNightAction(this.state, this.nd, 'littlegirl', { caught }); }
    this.startWave(steps.filter(t => t !== 'littlegirl'));
  }
  startWave(types) {
    const cur = { pending: new Set(), stepByActor: {}, wolfActors: new Set(), wolfVotes: {}, wolfResolved: false };
    for (const type of types)
      for (const i of this.actorsFor(type)) { cur.stepByActor[i] = type; cur.pending.add(i); if (type === 'wolf') cur.wolfActors.add(i); }
    this.cur = cur;
    if (cur.pending.size === 0) return this.morning();
    const options = this.promptOptions();
    const deadline = now() + this.settings.actionSec * 1000;
    for (const p of this.players) {
      const i = this.idx(p.id);
      if (this.state.players[i].alive && cur.pending.has(i)) this.send(p.id, this.promptForActor(cur.stepByActor[i], options, deadline));
      else this.send(p.id, { t: 'sleep' });
    }
    this.timer = this.sched.set(this.settings.actionSec * 1000, () => this.waveTimeout());
  }
  handleAction(pid, action) {
    if (this.phase !== 'night' || !this.cur) return;
    const i = this.idx(pid);
    if (!this.cur.pending.has(i)) return;
    const type = this.cur.stepByActor[i];

    if (action && action.skip) { if (type === 'wolf') this.cur.wolfVotes[i] = []; return this.done(i); }
    if (type === 'wolf') { this.cur.wolfVotes[i] = (action.targets || []).map(t => this.idx(t)).filter(x => x >= 0); return this.done(i); }

    let payload;
    if (type === 'witch')
      payload = { heal: action.heal != null ? this.idx(action.heal) : null, poison: action.poison != null ? this.idx(action.poison) : null };
    else payload = { targets: (action.targets || []).map(t => this.idx(t)) };

    const res = this.E.applyNightAction(this.state, this.nd, type, payload);
    if (!res.ok) { this.send(pid, { t: 'error', message: res.error }); return; }   // giữ pending → cho làm lại
    if (type === 'seer' && res.private)
      this.send(pid, { t: 'privateResult', text: `Soi ${res.private.name}: ${res.private.seen === 'wolf' ? 'LÀ MA SÓI' : 'KHÔNG phải Sói'}` });
    this.done(i);
  }
  done(i) {
    this.cur.pending.delete(i);
    this.send(this.pid(i), { t: 'sleep' });
    if (this.cur.wolfActors.has(i) && !this.cur.wolfResolved) {
      const anyPending = [...this.cur.wolfActors].some(w => this.cur.pending.has(w));
      if (!anyPending) { this.cur.wolfResolved = true; this.finishWolf(); }
    }
    if (this.cur.pending.size === 0) this.morning();
  }
  finishWolf() {
    const tally = {};
    Object.values(this.cur.wolfVotes).forEach(ts => ts.forEach(t => { tally[t] = (tally[t] || 0) + 1; }));
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const maxK = 1 + (this.state.flags.wolfCubBonusKill ? 1 : 0);
    const targets = ranked.slice(0, maxK).map(r => +r[0]);
    if (targets.length) this.E.applyNightAction(this.state, this.nd, 'wolf', { targets });
  }
  waveTimeout() {
    if (!this.cur || this.phase !== 'night') return;
    if (!this.cur.wolfResolved && this.cur.wolfActors.size) { this.cur.wolfResolved = true; this.finishWolf(); }
    this.cur.pending.clear();
    this.morning();
  }

  /* ── SÁNG ── */
  morning() {
    this.clearTimer();
    this.cur = null;
    const r = this.E.resolveMorning(this.state, this.nd);
    // Thông báo CÔNG KHAI: chỉ tên người chết, KHÔNG lộ vai (vai chỉ lộ khi kết thúc).
    const deadNames = r.deaths.map(i => this.state.players[i].name);
    const lines = deadNames.length
      ? [`💀 ${deadNames.join(', ')} đã chết đêm qua.`]
      : ['🌙 Đêm qua bình yên – không ai chết. 🕊️'];
    this.broadcast({ t: 'morning', nightNo: this.state.night, lines });
    this.broadcastState();
    if (r.win) return this.gameOver(r.win);
    this.phase = 'day';
    this.broadcastState();
    this.startDay();
  }

  /* ── NGÀY: thảo luận → vote → treo ── */
  startDay() {
    this.votes = {};
    this.voteOpen = false;
    this.broadcast({ t: 'scene', phase: 'day', dayNo: this.state.day, deadline: now() + this.settings.discussionSec * 1000 });
    this.timer = this.sched.set(this.settings.discussionSec * 1000, () => {
      this.voteOpen = true;
      this.broadcast({ t: 'voteOpen', deadline: now() + this.settings.voteSec * 1000, options: this.promptOptions() });
      this.timer = this.sched.set(this.settings.voteSec * 1000, () => this.closeVote());
    });
  }
  handleVote(pid, targetPid) {
    if (this.phase !== 'day' || !this.voteOpen) return;
    const vi = this.idx(pid), ti = this.idx(targetPid);
    if (vi < 0 || ti < 0 || !this.state.players[vi].alive) return;
    this.votes[vi] = ti;
    const c = {}; Object.values(this.votes).forEach(t => { c[t] = (c[t] || 0) + 1; });
    this.broadcast({ t: 'voteTally', tally: c });
  }
  closeVote() {
    this.clearTimer();
    this.voteOpen = false;
    const { top } = this.E.tallyVotes(this.state, this.votes);
    let lines;
    if (top != null) {
      const name = this.state.players[top].name;
      const r = this.E.resolveHang(this.state, top);   // vẫn chạy để engine xử lý tác dụng
      // Thông báo CÔNG KHAI: chỉ tên, KHÔNG lộ vai.
      if (r.win && r.win.reason === 'joker') lines = [`🪢 ${name} bị treo cổ… và đó đúng là điều hắn mong muốn!`];
      else if (r.blocked) lines = [`🪢 ${name} bị đưa lên giá treo nhưng thoát chết!`];
      else lines = [`🪢 ${name} đã bị treo cổ.`];
      if (r.events && r.events.includes('hunterwolfRevenge')) {
        const cand = this.aliveList().filter(x => x.i !== top);
        if (cand.length) {
          const pick = cand[Math.floor(Math.random() * cand.length)].i;
          const rv = this.E.applyRevenge(this.state, pick);
          lines.push(`💥 ${this.state.players[pick].name} bị kéo chết theo!`);
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

  /* ── CHAT (server kiểm soát tầm nhìn) ── */
  canChat(i, channel) {
    if (channel === 'main') { if (this.phase === 'lobby' || this.phase === 'ended') return true; if (this.phase === 'night') return false; return this.state.players[i].alive; }
    if (channel === 'wolf') return !!this.state && this.phase === 'night' && this.state.players[i].alive && this.isWolf(i);
    if (channel === 'dead') return !!this.state && !this.state.players[i].alive;
    return false;
  }
  chatRecipients(channel) {
    if (channel === 'main') return this.players.map(p => p.id);
    if (!this.state) return [];
    if (channel === 'wolf') return this.state.players.map((p, i) => ({ p, i })).filter(x => x.p.alive && this.isWolf(x.i)).map(x => this.pid(x.i));
    if (channel === 'dead') return this.state.players.map((p, i) => ({ p, i })).filter(x => !x.p.alive).map(x => this.pid(x.i));
    return [];
  }
  handleChat(pid, channel, text) {
    if (!CHATS.includes(channel)) return;
    text = String(text || '').slice(0, 300).trim();
    if (!text) return;
    const i = this.idx(pid); if (i < 0) return;
    if (!this.canChat(i, channel)) { this.send(pid, { t: 'error', message: 'Không gửi được ở kênh này lúc này' }); return; }
    const from = this.players[i].name;
    this.chatLog[channel].push({ from, text });
    if (this.chatLog[channel].length > 50) this.chatLog[channel].shift();
    for (const rid of this.chatRecipients(channel)) this.send(rid, { t: 'chatMsg', channel, from, text });
  }

  /* ── RECONNECT ── */
  resume(id) {
    const i = this.idx(id); if (i < 0) return;
    this.players[i].connected = true;
    this.broadcastState();
    if (!this.state) { this.send(id, { t: 'lobby', players: this.publicPlayers() }); return; }
    const deal = this.E.dealInfo(this.state);
    this.send(id, { t: 'yourRole', role: deal[i].role, mates: (deal[i].mates || []).map(m => ({ name: m.name })) });
    if (this.phase === 'night' && this.cur && this.cur.pending) {
      if (this.cur.pending.has(i)) this.send(id, this.promptForActor(this.cur.stepByActor[i], this.promptOptions(), now() + this.settings.actionSec * 1000));
      else this.send(id, { t: 'sleep' });
    } else if (this.phase === 'day' && this.voteOpen && this.state.players[i].alive) {
      this.send(id, { t: 'voteOpen', deadline: now() + this.settings.voteSec * 1000, options: this.promptOptions() });
    }
    for (const ch of CHATS)
      if (this.chatRecipients(ch).includes(id))
        for (const m of this.chatLog[ch]) this.send(id, { t: 'chatMsg', channel: ch, from: m.from, text: m.text });
  }

  /* ── KẾT THÚC ── */
  gameOver(win) {
    this.phase = 'ended';
    this.voteOpen = false;
    this.clearTimer();
    const reveal = this.state.players.map((p) => { const r = this.E.roleOf(p.roleId); return { name: p.name, role: r.name, alive: p.alive }; });
    this.broadcast({ t: 'gameOver', winner: win.winner, desc: win.desc, reveal });
  }

  /* ── VÁN MỚI CÙNG NHÓM: giữ người chơi, xoá ván cũ, về phòng chờ ── */
  newMatch() {
    if (this.phase !== 'ended') return;
    this.clearTimer();
    this.state = null; this.nd = null; this.cur = null;
    this.votes = {}; this.voteOpen = false;
    this.chatLog = { main: [], wolf: [], dead: [] };
    this.players.forEach(p => { p.ready = false; });
    this.phase = 'lobby';
    this.broadcast({ t: 'newMatch' });
    this.broadcast({ t: 'lobby', players: this.publicPlayers() });
    this.broadcastState();
  }

  /* ── BỀN BỈ: snapshot / khôi phục (restart không mất ván) ── */
  serialize() {
    const c = this.cur;
    return {
      id: this.id, phase: this.phase, settings: this.settings,
      players: this.players.map(p => ({ id: p.id, name: p.name, connected: false })),
      state: this.state, nd: this.nd, votes: this.votes, voteOpen: this.voteOpen, chatLog: this.chatLog,
      cur: c && c.pending ? { pending: [...c.pending], stepByActor: c.stepByActor || {}, wolfActors: [...(c.wolfActors || [])], wolfVotes: c.wolfVotes || {}, wolfResolved: !!c.wolfResolved } : null,
    };
  }
  static restore(snap, send, scheduler) {
    const r = new Room({ id: snap.id, send, scheduler, settings: snap.settings });
    r.phase = snap.phase; r.players = snap.players || []; r.state = snap.state || null; r.nd = snap.nd || null;
    r.votes = snap.votes || {}; r.voteOpen = !!snap.voteOpen; r.chatLog = snap.chatLog || { main: [], wolf: [], dead: [] };
    if (snap.cur) r.cur = { pending: new Set(snap.cur.pending), stepByActor: snap.cur.stepByActor || {}, wolfActors: new Set(snap.cur.wolfActors), wolfVotes: snap.cur.wolfVotes || {}, wolfResolved: !!snap.cur.wolfResolved };
    r.rearm();
    return r;
  }
  rearm() {   // dựng lại timer cho giai đoạn hiện tại sau khi khôi phục
    this.clearTimer();
    if (this.phase === 'night' && this.cur && this.cur.pending) this.timer = this.sched.set(this.settings.actionSec * 1000, () => this.waveTimeout());
    else if (this.phase === 'day') { if (this.voteOpen) this.timer = this.sched.set(this.settings.voteSec * 1000, () => this.closeVote()); else this.startDay(); }
  }
}
