'use strict';
/* Room — logic phòng chơi AUTHORITATIVE, không phụ thuộc transport.
   Dùng @masoi/engine. "MC tự động": tự chạy vòng đêm → sáng → vote → treo → kiểm thắng.
   ĐÊM: MỌI vai (kể cả Phù Thủy) hành động SONG SONG trong một đợt; nộp thứ tự nào cũng được.
   Phù Thủy "mù" (không cần biết nạn nhân) — chỉ chọn cứu/không, độc/không; engine chặn mỗi bình 1 lần/ván.
   Server tự kiểm soát chat (ai thấy kênh nào) và hỗ trợ reconnect (resume theo id ổn định).
   v0. Persistence (Redis/Postgres): TODO. */

import E from '@masoi/engine';
import { BotPlayer } from './bot.js';
import { isBotId } from './bot-personas.js';

const defaultScheduler = { set: (ms, fn) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) };
const now = () => Date.now();
const CHATS = ['main', 'wolf', 'dead'];

export class Room {
  constructor({ id, send, engine = E, scheduler = defaultScheduler, settings = {}, onGameOver = null }) {
    this.id = id;
    this.E = engine;
    this.sched = scheduler;
    this.onGameOver = onGameOver;     // (winner, reveal, players) => void — hook cho stats
    this.settings = { actionSec: 60, discussionSec: 45, voteSec: 30, lgCaughtChance: 0, ...settings };
    this.bots = new Map();            // id → BotPlayer (routing send + cleanup)
    this._rawSend = send;
    // Wrap send: route sang bot local nếu id thuộc bot, else gửi qua transport
    this.send = (pid, msg) => {
      const bot = this.bots.get(pid);
      if (bot) return bot.send(msg);
      return this._rawSend(pid, msg);
    };
    this.players = [];                // [{ id, name, connected, isBot }]  (thứ tự = chỉ số engine)
    this.phase = 'lobby';             // lobby | night | day | ended
    this.state = null;
    this.nd = null;
    this.cur = null;                  // trạng thái đợt đêm hiện tại
    this.timer = null;
    this._promptDeadline = null;   // deadline đợt đêm hiện tại (dùng khi resume)
    this._voteDeadline = null;     // deadline vote hiện tại
    this.votes = {};
    this.voteOpen = false;
    this.chatLog = { main: [], wolf: [], dead: [] };
    this.ownerId = null;              // chủ phòng = người tạo phòng
    this.password = '';               // mật khẩu phòng (server giữ, không gửi client)
    this.history = [];                // lịch sử CHI TIẾT (có vai) — chỉ gửi khi kết thúc
    this._lastActivity = Date.now();  // dùng để sweep phòng không hoạt động
    this._ownerGraceTimer = null;     // timer chuyển quyền chủ phòng (grace 60s)
    this._ownerGraceForId = null;     // id chủ phòng đang trong grace (để hủy khi họ reconnect)
    this.OWNER_GRACE_MS = 60_000;     // 60s: đủ cho F5 / rớt mạng ngắn
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
      ? this.state.players.map((p, i) => ({ id: this.pid(i), name: p.name, seat: i, alive: p.alive, connected: (this.players[i] || {}).connected, isBot: !!(this.players[i] && this.players[i].isBot) }))
      : this.players.map((p, i) => ({ id: p.id, name: p.name, seat: i, alive: true, connected: p.connected, ready: !!p.ready, isBot: !!p.isBot }));
  }
  hasBot() { return this.players.some(p => p.isBot); }
  touch() { this._lastActivity = Date.now(); }
  broadcastLobby() { this.touch(); this.broadcast({ t: 'lobby', players: this.publicPlayers(), ownerId: this.ownerId }); }
  setReady(id, val) {
    const i = this.idx(id); if (i < 0 || this.phase !== 'lobby') return;
    this.players[i].ready = !!val;
    this.broadcastLobby();
  }
  clearTimer() { if (this.timer) { this.sched.clear(this.timer); this.timer = null; } }

  /* ── LOBBY / KẾT NỐI ── */
  join(id, name) {
    if (this.phase !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu' };
    if (!this.players.some(p => p.id === id)) {
      const isBot = isBotId(id);
      this.players.push({ id, name: name || '?', connected: true, isBot, ready: isBot ? true : false });
    }
    if (!this.ownerId) {
      // Ưu tiên người thật làm chủ phòng — bot không thể bấm start
      const firstHuman = this.players.find(p => !p.isBot);
      this.ownerId = (firstHuman || this.players[0]).id;
    }
    this.broadcastLobby();
    return { ok: true };
  }

  /** Thêm 1 bot vào phòng (dùng cho quick-match auto-fill).
   *  persona: { id, name } — id phải bắt đầu bằng "bot_" để hệ thống phân biệt. */
  addBot(persona) {
    if (this.phase !== 'lobby') return { ok: false, error: 'Ván đã bắt đầu' };
    if (!isBotId(persona.id)) return { ok: false, error: 'Bot id phải có prefix bot_' };
    if (this.players.some(p => p.id === persona.id)) return { ok: false, error: 'Bot đã tồn tại' };
    const bot = new BotPlayer({ id: persona.id, name: persona.name, room: this, sched: this.sched });
    this.bots.set(persona.id, bot);
    return this.join(persona.id, persona.name);
  }

  /** Dọn dẹp bot khi ván kết thúc / newMatch / room bị xóa. */
  _destroyBots() {
    for (const bot of this.bots.values()) { try { bot.destroy(); } catch (e) {} }
    this.bots.clear();
  }
  setConnected(id, val) {
    const i = this.idx(id); if (i < 0) return;
    this.players[i].connected = val;
    // Chủ phòng rớt mạng → grace 60s trước khi chuyển quyền (chịu F5/rớt mạng ngắn)
    if (!val && id === this.ownerId) {
      if (this._ownerGraceTimer) this.sched.clear(this._ownerGraceTimer);
      this._ownerGraceForId = id;
      this._ownerGraceTimer = this.sched.set(this.OWNER_GRACE_MS, () => {
        this._ownerGraceTimer = null; this._ownerGraceForId = null;
        // Chỉ chuyển nếu chủ cũ VẪN chưa quay lại
        const cur = this.players.find(p => p.id === this.ownerId);
        if (cur && !cur.connected) {
          // Ưu tiên người thật; nếu không còn ai thật thì bỏ ownerId (không giao bot)
          const next = this.players.find(p => p.connected && !p.isBot && p.id !== this.ownerId);
          if (next) {
            this.ownerId = next.id;
            this.broadcast({ t: 'toast', message: `👑 ${next.name} trở thành chủ phòng mới (chủ cũ mất kết nối).` });
            this.broadcastState();
            if (this.phase === 'lobby') this.broadcastLobby();
          }
        }
      });
    } else if (val && this._ownerGraceTimer && id === this._ownerGraceForId) {
      // Chủ cũ quay lại kịp — hủy grace timer
      this.sched.clear(this._ownerGraceTimer);
      this._ownerGraceTimer = null; this._ownerGraceForId = null;
    }
    this.broadcastState();
    if (this.phase === 'lobby') this.broadcastLobby();
  }
  // Rời hẳn phòng (khác rớt mạng): phòng chờ → xoá khỏi danh sách; đang chơi → coi như đã chết.
  leave(id) {
    const i = this.idx(id); if (i < 0) return;
    const name = this.players[i].name;
    if (this.phase === 'lobby' || this.phase === 'ended') {
      if (this.phase === 'ended') this.state = null;   // bỏ state ván cũ để players[] căn khớp
      this.players.splice(i, 1);
      if (this.ownerId === id) this.ownerId = this.players[0] ? this.players[0].id : null;
      if (this.phase === 'lobby') this.broadcastLobby(); else this.broadcastState();
      return;
    }
    // Đang chơi
    this.players[i].connected = false;
    if (this.ownerId === id) {
      // Ưu tiên người thật; bot không được làm owner
      this.ownerId = (this.players.find(p => p.id !== id && p.connected && !p.isBot) || this.players.find(p => p.id !== id && !p.isBot) || {}).id || null;
      if (this.ownerId) {
        const newOwner = this.players.find(p => p.id === this.ownerId);
        if (newOwner) this.broadcast({ t: 'toast', message: `👑 ${newOwner.name} trở thành chủ phòng mới.` });
      }
    }
    const gp = this.state && this.state.players[i];
    if (gp && gp.alive) { gp.alive = false; this.broadcast({ t: 'day', lines: [`🚪 ${name} đã rời phòng (xem như đã chết).`] }); }
    if (this.cur && this.cur.pending) {                 // gỡ khỏi lượt đêm đang chờ, kẻo kẹt
      this.cur.pending.delete(i);
      if (this.cur.wolfActors) this.cur.wolfActors.delete(i);
      if (this.phase === 'night' && this.cur.pending.size === 0) { this.morning(); return; }
    }
    if (this.votes) delete this.votes[i];
    this.broadcastState();
    const win = this.state ? this.E.checkWin(this.state) : null;
    if (win) this.gameOver(win);
  }

  /* ── BẮT ĐẦU VÁN ── */
  start(counts, rng = Math.random, opts = {}, requesterId = null) {
    this.touch();
    if (this.phase !== 'lobby') return { ok: false, error: 'Đã bắt đầu' };
    if (requesterId != null && requesterId !== this.ownerId) return { ok: false, error: 'Chỉ chủ phòng mới được bắt đầu' };
    const notReady = this.players.filter(p => p.id !== this.ownerId && !p.ready).length;
    if (notReady > 0) return { ok: false, error: `Còn ${notReady} người chưa sẵn sàng` };
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
      ownerId: this.ownerId,
    });
  }

  /* ── ĐÊM: mọi vai hành động SONG SONG (gồm Phù Thủy) ── */
  actorsFor(type) {
    const B = this.E.BITING_WOLF_IDS;
    return this.aliveList()
      .filter(({ p }) => (type === 'wolf'
        ? B.includes(p.roleId) || (p.roleId === 'deserter' && this.state.flags.deserterActive)
        : p.roleId === type))
      .map(x => x.i);
  }
  promptOptions(includeDeadForDigger = false) {
    if (includeDeadForDigger)
      return this.state.players.map((p, i) => ({ id: this.pid(i), name: p.name, dead: !p.alive }));
    return this.aliveList().map(x => ({ id: this.pid(x.i), name: x.p.name }));
  }
  maxTargets(type) {
    const f = this.state && this.state.flags;
    if (type === 'cupid' || type === 'balancer' || type === 'detective' || type === 'switcher') return 2;
    if (type === 'fox' || type === 'hoodlum') return 3;
    if (type === 'fluteplayer') return 2;
    if (type === 'wolf') return 1 + (f && f.wolfCubBonusKill ? 1 : 0) + (f && f.direwolfBonus ? 1 : 0);
    return 1;
  }
  promptForActor(type, options, deadline) {
    const total = this.settings.actionSec;
    if (type === 'witch')
      return { t: 'prompt', stepType: 'witch', mode: 'witch', options, deadline, total, healUsed: this.state.flags.witchHealUsed, poisonUsed: this.state.flags.witchPoisonUsed };
    // Roles that need dead players in options
    if (type === 'gravedigger' || type === 'medium' || type === 'graverobber')
      return { t: 'prompt', stepType: type, mode: 'pick', options: this.promptOptions(true), deadline, total, max: 1, deadOnly: true };
    return { t: 'prompt', stepType: type, mode: 'pick', options, deadline, total, max: this.maxTargets(type) };
  }
  startNight() {
    this.nd = this.E.newNightData();
    this.cur = null;
    // Reset per-night transient flags
    if (this.state.flags) {
      this.state.flags.hypnoTarget = null;
      this.state.flags.blackmailTarget = null;
      this.state.flags.diplomatProtected = null;
      this.state.flags.kingDiedThisNight = false;
    }
    this.broadcast({ t: 'scene', phase: 'night', nightNo: this.state.night });
    const steps = this.E.buildNightSteps(this.state).map(s => s.type);
    for (const t of steps) {
      if (t === 'littlegirl') {
        const caught = Math.random() < (this.settings.lgCaughtChance || 0);
        this.E.applyNightAction(this.state, this.nd, 'littlegirl', { caught });
      }
      // Hinter: auto-assign private hint
      if (t === 'hinter') {
        const hIdx = this.state.players.findIndex(p => p.alive && p.roleId === 'hinter');
        const wolves = this.aliveList().filter(x => this.E.WOLF_IDS.includes(x.p.roleId));
        if (hIdx >= 0 && wolves.length) {
          const pick = wolves[Math.floor(Math.random() * wolves.length)];
          const firstChar = pick.p.name.charAt(0).toUpperCase();
          this.send(this.pid(hIdx), { t: 'privateResult', text: `💡 Kẻ Gợi Ý: chữ cái đầu tên 1 Sói còn sống là "${firstChar}"` });
        }
        this.E.applyNightAction(this.state, this.nd, 'hinter', { targets: [] });
      }
      // BountyHunter night 1: auto-assign random target
      if (t === 'bountyhunter' && this.state.night === 1 && this.state.flags.bountyTarget == null) {
        const bhIdx = this.state.players.findIndex(p => p.alive && p.roleId === 'bountyhunter');
        const cands = this.aliveList().filter(x => x.p.roleId !== 'bountyhunter');
        if (bhIdx >= 0 && cands.length) {
          const pick = cands[Math.floor(Math.random() * cands.length)];
          this.state.flags.bountyTarget = pick.i;
          this.send(this.pid(bhIdx), { t: 'privateResult', text: `🎖️ Nhiệm vụ bí mật: tiêu diệt ${pick.p.name}!` });
          this.E.applyNightAction(this.state, this.nd, 'bountyhunter', { targets: [pick.i] });
        }
      }
    }
    const autoSteps = ['littlegirl','hinter','bountyhunter'];
    this.startWave(steps.filter(t => !autoSteps.includes(t)));
  }
  startWave(types) {
    const cur = { pending: new Set(), stepByActor: {}, wolfActors: new Set(), wolfVotes: {}, wolfResolved: false };
    for (const type of types)
      for (const i of this.actorsFor(type)) { cur.stepByActor[i] = type; cur.pending.add(i); if (type === 'wolf') cur.wolfActors.add(i); }
    this.cur = cur;
    if (cur.pending.size === 0) return this.morning();
    const options = this.promptOptions();
    const deadline = now() + this.settings.actionSec * 1000;
    this._promptDeadline = deadline;
    for (const p of this.players) {
      const i = this.idx(p.id);
      if (this.state.players[i].alive && cur.pending.has(i)) this.send(p.id, this.promptForActor(cur.stepByActor[i], options, deadline));
      /* Gửi deadline vào sleep để non-actor có countdown "chờ vai khác" trong turn indicator. */
      else this.send(p.id, { t: 'sleep', deadline, total: this.settings.actionSec });
    }
    this.timer = this.sched.set(this.settings.actionSec * 1000, () => this.waveTimeout());
  }
  handleAction(pid, action) {
    this.touch();
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
    if (!res.ok) { this.send(pid, { t: 'error', message: res.error }); return; }
    if (res.private) {
      const priv = res.private;
      let txt;
      if (type === 'seer') txt = `🔮 Soi ${priv.name}: ${priv.seen === 'wolf' ? '🔴 LÀ MA SÓI' : '🔵 KHÔNG phải Sói'}`;
      else if (type === 'fox') txt = `🦊 Nhóm ${priv.names.join(', ')}: ${priv.hasWolf ? '🔴 CÓ SÓI' : '🔵 Không có Sói'}`;
      else if (type === 'detective') txt = `🕵️ ${priv.names.join(' & ')}: ${priv.same ? 'CÙNG phe' : 'KHÁC phe'}`;
      else if (type === 'gravedigger') txt = `⚰️ ${priv.name} là ${priv.icon} ${priv.role}`;
      else if (type === 'medium') txt = `🕯️ ${priv.name}: ${priv.isWolf ? '🔴 LÀ SÓI' : '🔵 Không phải Sói'}`;
      else if (type === 'tracker') txt = `🔭 ${priv.name}: ${priv.active ? '🟡 RỜI NHÀ (dùng kỹ năng)' : '🔵 Ở nhà (không dùng kỹ năng)'}`;
      else if (type === 'sorcerer') txt = `🧿 ${priv.name}: ${priv.isMystic ? '🔴 TIÊN TRI / PHÙ THỦY' : '🔵 Không phải'}`;
      else if (type === 'wolfseer') txt = `🔮 Sói Tiên Tri: ${priv.name} là ${priv.icon} ${priv.role} (${priv.team === 'wolf' ? '🔴 SÓI' : '🔵 Dân'})`;
      else if (type === 'copycat') txt = `🪞 Bạn đã sao chép thành: ${priv.icon} ${priv.copied}`;
      else if (type === 'graverobber') txt = `⛏️ Bạn kế thừa role: ${priv.role} (phe ${priv.team})`;
      if (txt) this.send(pid, { t: 'privateResult', text: txt });
    }
    this.done(i);
  }
  done(i) {
    this.cur.pending.delete(i);
    /* Sleep kèm deadline để countdown "chờ vai khác" tiếp tục tick sau khi submit. */
    this.send(this.pid(i), { t: 'sleep', deadline: this._promptDeadline, total: this.settings.actionSec });
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
    const f = this.state.flags;
    const maxK = 1 + (f.wolfCubBonusKill ? 1 : 0) + (f.direwolfBonus ? 1 : 0);
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
  // Danh sách hành động đêm KÈM VAI của mục tiêu (giống bản offline). Dựng TRƯỚC khi phân giải
  // để vai phản ánh đúng thời điểm hành động (vd Kẻ Nguyền Rủa chưa hoá Sói).
  nightEvents() {
    const nd = this.nd, s = this.state;
    const nr = i => (s.players[i] ? `${s.players[i].name} (${this.E.roleOf(s.players[i].roleId).name})` : '?');
    const ev = [];
    if (s.night === 1 && s.cupidPair && s.cupidPair.length === 2) ev.push(`💘 Cupid ghép đôi: ${nr(s.cupidPair[0])} & ${nr(s.cupidPair[1])}`);
    if (s.night === 1 && nd.wildchildTarget != null) ev.push(`🐾 Dã Nhân chọn thần tượng: ${nr(nd.wildchildTarget)}`);
    if (s.night === 1 && nd.direwolfTarget != null) ev.push(`😡 Sói Cuồng Nộ chọn tri kỷ: ${nr(nd.direwolfTarget)}`);
    if (s.night === 1 && nd.balancerPair && nd.balancerPair.length === 2) ev.push(`⚖️ Kẻ Cân Bằng liên kết: ${nr(nd.balancerPair[0])} & ${nr(nd.balancerPair[1])}`);
    if (nd.wolfTargets && nd.wolfTargets.length) ev.push(`🐺 Sói cắn: ${nd.wolfTargets.map(nr).join(', ')}`);
    if (nd.switcherTargets && nd.switcherTargets.length === 2) ev.push(`🔄 Kẻ Đánh Tráo hoán đổi: ${nr(nd.switcherTargets[0])} ↔ ${nr(nd.switcherTargets[1])}`);
    if (nd.whitewolfTarget != null) ev.push(`🤍 Sói Trắng cắn: ${nr(nd.whitewolfTarget)}`);
    if (nd.hellhoundTarget != null) ev.push(`🔥 Sói Lửa đốt: ${nr(nd.hellhoundTarget)}`);
    if (nd.poisonwolfTarget != null) ev.push(`🧪 Sói Độc phun: ${nr(nd.poisonwolfTarget)}`);
    if (nd.bigbadwolfTarget != null) ev.push(`💪 Sói Khổng Lồ cắn thêm: ${nr(nd.bigbadwolfTarget)}`);
    if (nd.cursedwolfTarget != null) ev.push(`🌀 Sói Nguyền nguyền: ${nr(nd.cursedwolfTarget)}`);
    if (nd.bodyguardTarget != null) ev.push(`🛡️ Bảo Vệ bảo vệ: ${nr(nd.bodyguardTarget)}`);
    if (nd.doctorTarget != null) ev.push(`💉 Bác Sĩ cứu: ${nr(nd.doctorTarget)}`);
    if (nd.icewitchTarget != null) ev.push(`❄️ Nữ Phù Thủy Băng Giá đóng băng: ${nr(nd.icewitchTarget)}`);
    if (nd.seerTarget != null) ev.push(`🔮 Tiên Tri soi ${nr(nd.seerTarget)} → ${nd.seerResult === 'wolf' ? '🔴 MA SÓI' : '🔵 Không phải Sói'}`);
    if (nd.foxTargets && nd.foxTargets.length === 3) ev.push(`🦊 Cáo soi nhóm: ${nd.foxTargets.map(nr).join(', ')} → ${nd.foxResult === 'wolf' ? '🔴 CÓ SÓI' : '🔵 Không có Sói'}`);
    if (nd.detectiveTargets && nd.detectiveTargets.length === 2) ev.push(`🕵️ Thám Tử: ${nr(nd.detectiveTargets[0])} & ${nr(nd.detectiveTargets[1])} → ${nd.detectiveResult === 'same' ? 'CÙNG phe' : 'KHÁC phe'}`);
    if (nd.diplomatTarget != null) ev.push(`🕊️ Nhà Ngoại Giao bảo hộ: ${nr(nd.diplomatTarget)}`);
    if (nd.witchHealTarget != null) ev.push(`💊 Phù Thủy cứu: ${nr(nd.witchHealTarget)}`);
    if (nd.witchPoison != null) ev.push(`☠️ Phù Thủy đầu độc: ${nr(nd.witchPoison)}`);
    if (nd.hunterTarget != null) ev.push(`🏹 Thợ Săn bắn: ${nr(nd.hunterTarget)}`);
    if (nd.gunsmithTarget != null) ev.push(`🔫 Xạ Thủ bắn: ${nr(nd.gunsmithTarget)}`);
    if (nd.priestTarget != null) ev.push(`✝️ Linh Mục ném nước thánh: ${nr(nd.priestTarget)}`);
    if (nd.skTarget != null) ev.push(`🔪 Sát Nhân giết: ${nr(nd.skTarget)}`);
    if (nd.nighthunterTarget != null) ev.push(`🌙 Kẻ Săn Đêm nhắm: ${nr(nd.nighthunterTarget)}`);
    if (nd.fluteTargets && nd.fluteTargets.length) ev.push(`🪈 Chàng Thổi Sáo thôi miên: ${nd.fluteTargets.map(nr).join(' & ')}`);
    if (nd.gatekeeperTarget != null) ev.push(`🚪 Kẻ Gác Cổng chặn: ${nr(nd.gatekeeperTarget)}`);
    if (nd.blackmailTarget != null) ev.push(`📬 Kẻ Tống Tiền tống tiền: ${nr(nd.blackmailTarget)}`);
    if (nd.assassinPickTarget != null) ev.push(`🗡️ Kẻ Ám Sát chọn mục tiêu bí mật (đêm ${s.flags.assassinKillNight})`);
    return ev;
  }
  morning() {
    if (this.phase !== 'night') return;
    this.clearTimer();
    this.cur = null;
    const actions = this.nightEvents();
    const r = this.E.resolveMorning(this.state, this.nd);
    this.history.push({
      type: 'night', no: this.state.night,
      actions,
      deaths: r.deaths.map(i => ({ name: this.state.players[i].name, role: this.E.roleOf(this.state.players[i].roleId).name })),
    });
    // Gửi private results từ engine
    if (r.privateResults) {
      for (const { idx, text } of r.privateResults)
        this.send(this.pid(idx), { t: 'privateResult', text });
    }
    // Xử lý events đặc biệt
    if (r.events) {
      for (const ev of r.events) {
        if (ev.startsWith('avengerRevenge:')) {
          // Auto pick random alive non-avenger
          const cands = this.aliveList();
          if (cands.length) {
            const pick = cands[Math.floor(Math.random() * cands.length)];
            const rv = this.E.applyAvengerCurse(this.state, pick.i);
            r.publicLines.push(...rv.lines);
            if (rv.win && !r.win) r.win = rv.win;
          }
        }
      }
    }
    // Bounty Hunter win notification (target just died?)
    const bt = this.state.flags.bountyTarget;
    if (bt != null && !this.state.players[bt].alive && r.deaths.includes(bt)) {
      const bhIdx = this.state.players.findIndex(p => p.alive && p.roleId === 'bountyhunter');
      if (bhIdx >= 0) {
        this.send(this.pid(bhIdx), { t: 'privateResult', text: `🎖️ Mục tiêu của bạn đã chết – THẮNG RIÊNG!` });
        r.publicLines.push(`🎖️ Thợ Săn Tiền Thưởng hoàn thành nhiệm vụ!`);
      }
      this.state.flags.bountyTarget = null;
    }
    // Challenger win notification
    const ct = this.state.flags.challengerTarget;
    if (ct != null && !this.state.players[ct].alive && r.deaths.includes(ct)) {
      const chalIdx = this.state.players.findIndex(p => p.alive && p.roleId === 'challenger');
      if (chalIdx >= 0) {
        this.send(this.pid(chalIdx), { t: 'privateResult', text: `🎯 Kẻ thù của bạn đã chết – THẮNG RIÊNG!` });
        r.publicLines.push(`🎯 Kẻ Thách Thức hoàn thành thách thức!`);
      }
      this.state.flags.challengerTarget = null;
    }
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
    this.broadcast({ t: 'scene', phase: 'day', dayNo: this.state.day, deadline: now() + this.settings.discussionSec * 1000, total: this.settings.discussionSec });
    this.timer = this.sched.set(this.settings.discussionSec * 1000, () => {
      this.voteOpen = true;
      this._voteDeadline = now() + this.settings.voteSec * 1000;
      this.broadcast({ t: 'voteOpen', deadline: this._voteDeadline, options: this.promptOptions(), total: this.settings.voteSec });
      this.timer = this.sched.set(this.settings.voteSec * 1000, () => this.closeVote());
    });
  }
  handleVote(pid, targetPid) {
    this.touch();
    if (this.phase !== 'day' || !this.voteOpen) return;
    const vi = this.idx(pid), ti = this.idx(targetPid);
    if (vi < 0 || ti < 0 || !this.state.players[vi].alive) return;
    this.votes[vi] = ti;
    const c = {};
    Object.entries(this.votes).forEach(([v, t]) => {
      const p = this.state.players[+v];
      if (!p || !p.alive || p.idiotRevealed) return;
      c[t] = (c[t] || 0) + 1;
    });
    this.broadcast({ t: 'voteTally', tally: c });
  }
  closeVote() {
    if (this.phase !== 'day') return;
    this.clearTimer();
    this.voteOpen = false;
    const { top } = this.E.tallyVotes(this.state, this.votes);
    // Bảng phiếu (để hiện trong lịch sử ngày, giống bản offline)
    const voteCount = {}; Object.values(this.votes).forEach(t => { voteCount[t] = (voteCount[t] || 0) + 1; });
    const voteLines = Object.entries(voteCount).sort((a, b) => b[1] - a[1])
      .map(([ti, c]) => `${this.state.players[+ti].name}: ${c} phiếu`);
    // Yêu cầu: ≥ 2/3 người sống bỏ phiếu cho top mới treo được. Nếu không đủ → không ai bị treo.
    const aliveCnt = this.aliveList().length;
    const threshold = Math.ceil(aliveCnt * 2 / 3);
    const topCount = top != null ? (voteCount[top] || 0) : 0;
    const enoughVotes = top != null && topCount >= threshold;
    let lines;
    if (top != null && !enoughVotes) {
      const name = this.state.players[top].name;
      lines = [`⚖️ Không đủ 2/3 phiếu để treo cổ (cần ≥${threshold}, ${name} chỉ có ${topCount}). Không ai bị treo.`];
      this.history.push({ type: 'day', no: this.state.day, target: null, votes: voteLines, insufficient: true, needed: threshold, topName: name, topCount });
    } else if (top != null) {
      const name = this.state.players[top].name;
      const role = this.E.roleOf(this.state.players[top].roleId).name;
      const r = this.E.resolveHang(this.state, top);   // vẫn chạy để engine xử lý tác dụng
      // Thông báo CÔNG KHAI: chỉ tên, KHÔNG lộ vai.
      if (r.win && r.win.reason === 'joker') lines = [`🪢 ${name} bị treo cổ… và đó đúng là điều hắn mong muốn!`];
      else if (r.blocked) lines = [`🪢 ${name} bị đưa lên giá treo nhưng thoát chết!`];
      else lines = [`🪢 ${name} đã bị treo cổ.`];
      const dayEntry = { type: 'day', no: this.state.day, target: { name, role }, votes: voteLines, blocked: !!r.blocked, joker: !!(r.win && r.win.reason === 'joker'), dragged: null };
      if (r.events && r.events.some(e => e === 'hunterwolfRevenge' || e.startsWith('avengerRevenge'))) {
        let postWin = null;
        for (const ev of r.events) {
          if (ev === 'hunterwolfRevenge') {
            const cand = this.aliveList().filter(x => x.i !== top);
            if (cand.length) {
              const pick = cand[Math.floor(Math.random() * cand.length)].i;
              const rv = this.E.applyRevenge(this.state, pick);
              lines.push(`💥 ${this.state.players[pick].name} bị kéo chết theo!`);
              dayEntry.dragged = { name: this.state.players[pick].name, role: this.E.roleOf(this.state.players[pick].roleId).name };
              if (rv.win) postWin = rv.win;
            }
          } else if (ev.startsWith('avengerRevenge:')) {
            const cands = this.aliveList();
            if (cands.length) {
              const pick = cands[Math.floor(Math.random() * cands.length)].i;
              const rv = this.E.applyAvengerCurse(this.state, pick);
              lines.push(...rv.lines);
              if (rv.win) postWin = rv.win;
            }
          }
        }
        this.history.push(dayEntry);
        if (postWin) { this.broadcast({ t: 'day', lines }); return this.gameOver(postWin); }
      } else this.history.push(dayEntry);
      if (r.win) { this.broadcast({ t: 'day', lines }); return this.gameOver(r.win); }
    } else {
      lines = ['Không treo ai (hòa hoặc không đủ phiếu).'];
      this.history.push({ type: 'day', no: this.state.day, target: null, votes: voteLines });
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
    this.touch();
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
    // Hủy owner grace timer nếu chủ cũ vừa reconnect
    if (this._ownerGraceTimer && id === this._ownerGraceForId) {
      this.sched.clear(this._ownerGraceTimer);
      this._ownerGraceTimer = null; this._ownerGraceForId = null;
    }
    this.broadcastState();
    if (!this.state) { this.send(id, { t: 'lobby', players: this.publicPlayers(), ownerId: this.ownerId }); return; }
    const deal = this.E.dealInfo(this.state);
    this.send(id, { t: 'yourRole', role: deal[i].role, mates: (deal[i].mates || []).map(m => ({ name: m.name })) });
    if (this.phase === 'night' && this.cur && this.cur.pending) {
      if (this.cur.pending.has(i)) {
        const dl = this._promptDeadline ? Math.max(now() + 5000, this._promptDeadline) : now() + this.settings.actionSec * 1000;
        this.send(id, this.promptForActor(this.cur.stepByActor[i], this.promptOptions(), dl));
      } else this.send(id, { t: 'sleep', deadline: this._promptDeadline, total: this.settings.actionSec });
    } else if (this.phase === 'day' && this.voteOpen && this.state.players[i].alive) {
      const dl = this._voteDeadline ? Math.max(now() + 5000, this._voteDeadline) : now() + this.settings.voteSec * 1000;
      this.send(id, { t: 'voteOpen', deadline: dl, options: this.promptOptions(), total: this.settings.voteSec });
    } else if (this.phase === 'ended' && this._lastGameOver) {
      /* Ván đã kết thúc — re-send để client dựng lại endBox + reveal + lịch sử chi tiết */
      this.send(id, { t: 'gameOver', ...this._lastGameOver });
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
    const reveal = this.state.players.map((p, i) => { const r = this.E.roleOf(p.roleId); return { name: p.name, role: r.name, team: r.team, alive: p.alive, isBot: !!(this.players[i] && this.players[i].isBot) }; });
    /* Lưu snapshot để resume/reconnect sau ended vẫn nhận được reveal + history */
    this._lastGameOver = { winner: win.winner, desc: win.desc, reveal, history: this.history, hasBot: this.hasBot() };
    /* Broadcast state trước để client update phase='ended' → tắt timer statusbar */
    this.broadcastState();
    this.broadcast({ t: 'gameOver', ...this._lastGameOver });
    if (this.onGameOver) this.onGameOver(win.winner, reveal, this.players);
    // Dọn timers của bot (bot entry giữ trong players[] để state.players index vẫn khớp cho resume/reveal)
    this._destroyBots();
  }

  /* ── VÁN MỚI CÙNG NHÓM: giữ người chơi (đang online), xoá ván cũ, về phòng chờ ── */
  newMatch() {
    if (this.phase !== 'ended') return;
    this.clearTimer();
    this.state = null; this.nd = null; this.cur = null;
    this._promptDeadline = null; this._voteDeadline = null;
    this.votes = {}; this.voteOpen = false;
    this.chatLog = { main: [], wolf: [], dead: [] };
    this.history = [];
    this._lastGameOver = null;
    // Dọn bot cũ (bot của ván trước không tự chơi tiếp; nếu vẫn thiếu người, quickMatch mới sẽ tạo bot mới)
    this._destroyBots();
    // Loại người đã mất kết nối HOẶC là bot (bot không sang ván mới)
    const removed = this.players.filter(p => p.connected === false || p.isBot);
    if (removed.length) {
      this.players = this.players.filter(p => p.connected !== false && !p.isBot);
      // Reassign owner nếu chủ cũ nằm trong nhóm bị loại
      if (removed.some(p => p.id === this.ownerId)) {
        // Ưu tiên người thật kết nối tốt
        const cand = this.players.find(p => p.connected) || this.players[0];
        this.ownerId = cand ? cand.id : null;
        if (this._ownerGraceTimer) { this.sched.clear(this._ownerGraceTimer); this._ownerGraceTimer = null; this._ownerGraceForId = null; }
        if (cand) this.broadcast({ t: 'toast', message: `👑 ${cand.name} là chủ phòng mới.` });
      }
    }
    this.players.forEach(p => { p.ready = false; });
    this.phase = 'lobby';
    this.broadcast({ t: 'newMatch' });
    this.broadcastLobby();
    this.broadcastState();
    if (removed.length) {
      const names = removed.map(p => p.name).join(', ');
      this.broadcast({ t: 'toast', message: `🚪 Đã loại người mất kết nối: ${names}` });
    }
  }

  /* ── BỀN BỈ: snapshot / khôi phục (restart không mất ván) ── */
  serialize() {
    const c = this.cur;
    return {
      id: this.id, phase: this.phase, settings: this.settings, ownerId: this.ownerId, password: this.password,
      players: this.players.map(p => ({ id: p.id, name: p.name, connected: false, ready: !!p.ready })),
      state: this.state, nd: this.nd, votes: this.votes, voteOpen: this.voteOpen, chatLog: this.chatLog, history: this.history,
      cur: c && c.pending ? { pending: [...c.pending], stepByActor: c.stepByActor || {}, wolfActors: [...(c.wolfActors || [])], wolfVotes: c.wolfVotes || {}, wolfResolved: !!c.wolfResolved } : null,
      promptDeadline: this._promptDeadline, voteDeadline: this._voteDeadline,
    };
  }
  static restore(snap, send, scheduler) {
    const r = new Room({ id: snap.id, send, scheduler, settings: snap.settings });
    r.phase = snap.phase; r.players = snap.players || []; r.state = snap.state || null; r.nd = snap.nd || null;
    r.ownerId = snap.ownerId || (r.players[0] && r.players[0].id) || null;
    r.password = snap.password || '';
    r.history = snap.history || [];
    r.votes = snap.votes || {}; r.voteOpen = !!snap.voteOpen; r.chatLog = snap.chatLog || { main: [], wolf: [], dead: [] };
    if (snap.cur) r.cur = { pending: new Set(snap.cur.pending), stepByActor: snap.cur.stepByActor || {}, wolfActors: new Set(snap.cur.wolfActors), wolfVotes: snap.cur.wolfVotes || {}, wolfResolved: !!snap.cur.wolfResolved };
    r._promptDeadline = snap.promptDeadline || null;
    r._voteDeadline = snap.voteDeadline || null;
    r.rearm();
    return r;
  }
  rearm() {   // dựng lại timer cho giai đoạn hiện tại sau khi khôi phục — giữ deadline gốc nếu còn hạn.
    this.clearTimer();
    const remain = (dl, fullSec) => {
      if (!dl) return fullSec * 1000;
      const r = dl - now();
      return Math.max(1000, r); // tối thiểu 1s để không kích ngay tức khắc
    };
    if (this.phase === 'night' && this.cur && this.cur.pending)
      this.timer = this.sched.set(remain(this._promptDeadline, this.settings.actionSec), () => this.waveTimeout());
    else if (this.phase === 'day') {
      if (this.voteOpen) this.timer = this.sched.set(remain(this._voteDeadline, this.settings.voteSec), () => this.closeVote());
      else this.startDay();
    }
  }
}
