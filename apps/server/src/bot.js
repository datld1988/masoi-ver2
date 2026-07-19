'use strict';
/* BotPlayer — người chơi ảo cho quick match khi thiếu người thật.
   Chạy server-side, nhận message qua `send()` như client thật, phản ứng có delay
   để giống người (2-8s action, 4-15s vote, 3-25s chat).

   Bot có "beliefs" (ai là Sói / Dân) build từ:
   - `mates` (bot Sói biết đồng đội qua yourRole message)
   - `privateResult` (bot Tiên Tri/Medium/Sói Tiên Tri parse text → beliefs)
   Chưa xử: sorcerer (chỉ mystic), detective (2 cùng phe), fox (nhóm có sói).

   Bot dùng beliefs để: không cắn mate, không soi lại người đã soi, poison sói đã lộ,
   vote sói đã lộ, bandwagon top vote. Chat phản ứng theo diễn biến ngày (RIP tên,
   hoan hô treo sói, tiếc treo dân). */

import E from '@masoi/engine';
import { genChat, tryReply } from './bot-chat.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Sinh action HỢP LỆ + có ý thức dựa trên roleId + state + beliefs của bot. */
function botNightAction(room, botIdx, stepType, promptMsg, bot) {
  const S = room.state;
  const al = room.aliveList();
  const myPid = room.pid(botIdx);
  const others = al.filter(x => x.i !== botIdx);
  const pid = (i) => room.pid(i);
  const isWolf = (rid) => E.WOLF_IDS.includes(rid);
  const isBiter = (rid) => E.BITING_WOLF_IDS.includes(rid);
  const mateIds = new Set((bot.mates || []).map(m => m.id).filter(Boolean));
  const knownWolves = () => [...bot.beliefs.entries()]
    .filter(([, b]) => b.wolf === true && b.confidence >= 0.9)
    .map(([p]) => p)
    .filter(p => { const i = room.idx(p); return i >= 0 && S.players[i] && S.players[i].alive && i !== botIdx; });

  switch (stepType) {
    case 'wolf': {
      // Bot Sói: KHÔNG cắn mate (Sói khác) + KHÔNG cắn deserter. Ưu tiên người
      // bot chưa có belief (giả định là vai quan trọng như Tiên Tri/Bảo Vệ).
      const targets = al.filter(x => {
        if (isBiter(x.p.roleId) || x.p.roleId === 'deserter') return false;
        const p = pid(x.i);
        if (p === myPid || mateIds.has(p)) return false;
        // Loại người bot đã biết là Sói (dù sao cũng không cắn)
        const b = bot.beliefs.get(p);
        if (b && b.wolf === true) return false;
        return true;
      });
      if (!targets.length) return { skip: true };
      // Ưu tiên người CHƯA có belief (nhiều khả năng là vai đặc biệt bot chưa lộ)
      const unknown = targets.filter(x => !bot.beliefs.has(pid(x.i)));
      const t = pick(unknown.length ? unknown : targets);
      return { targets: [pid(t.i)] };
    }
    case 'whitewolf': {
      if (Math.random() < 0.5) return { skip: true };
      const wolves = al.filter(x => isWolf(x.p.roleId) && x.p.roleId !== 'whitewolf');
      if (!wolves.length) return { skip: true };
      return { targets: [pid(pick(wolves).i)] };
    }
    case 'seer': {
      // Bot Tiên Tri: không soi lại người đã soi + không soi mình
      const opts = promptMsg?.options || [];
      const fresh = opts.filter(o => o && o.id !== myPid && !bot.seerSeen.has(o.id));
      const chosen = fresh.length ? pick(fresh) : (opts.filter(o => o.id !== myPid)[0] || null);
      if (!chosen) return { skip: true };
      bot.seerSeen.add(chosen.id);
      return { targets: [chosen.id] };
    }
    case 'sorcerer': case 'wolfseer':
    case 'medium': case 'gravedigger': case 'graverobber':
    case 'tracker': case 'switcher': case 'detective':
    case 'fox': case 'copycat': {
      const opts = promptMsg?.options || [];
      if (!opts.length) return { skip: true };
      const max = promptMsg.max || 1;
      const shuffled = [...opts].filter(o => o && o.id !== myPid).sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(max, shuffled.length));
      if (!chosen.length) return { skip: true };
      return { targets: chosen.map(o => o.id) };
    }
    case 'bodyguard': {
      // Không bảo vệ cùng người 2 đêm liên tiếp (server đã chặn qua bodyguardLastIdx).
      // Ưu tiên bảo vệ người bot đã biết là Dân (belief villager, confidence cao).
      const cands = al.filter(x => x.i !== S.flags.bodyguardLastIdx);
      if (!cands.length) return { skip: true };
      const villagers = cands.filter(x => {
        const b = bot.beliefs.get(pid(x.i));
        return b && b.wolf === false && b.confidence >= 0.9;
      });
      const t = pick(villagers.length ? villagers : cands);
      return { targets: [pid(t.i)] };
    }
    case 'doctor': {
      // Doctor cứu random — không có info để chọn tốt hơn
      if (!al.length) return { skip: true };
      return { targets: [pid(pick(al).i)] };
    }
    case 'cupid': {
      if (al.length < 2) return { skip: true };
      const shuffled = [...al].sort(() => Math.random() - 0.5);
      return { targets: [pid(shuffled[0].i), pid(shuffled[1].i)] };
    }
    case 'hunter': case 'serialkiller': case 'nighthunter': case 'assassin': {
      // Bot phe Dân: nếu biết Sói → giết Sói
      const isVillage = bot.roleTeam === 'village' || bot.roleTeam === 'third' || bot.roleTeam === 'neutral';
      if (isVillage) {
        const wolves = knownWolves();
        if (wolves.length) return { targets: [wolves[0]] };
      }
      const t = others.length ? pick(others) : null;
      return t ? { targets: [pid(t.i)] } : { skip: true };
    }
    case 'witch': {
      // Bot Phù Thủy: nếu biết Sói → poison Sói đó. Heal không có info bị cắn → null.
      if (!S.flags.witchPoisonUsed) {
        const wolves = knownWolves();
        if (wolves.length && Math.random() < 0.75) return { heal: null, poison: wolves[0] };
      }
      // Fallback: đôi khi random poison (chỉ khi chưa biết sói nào)
      if (!S.flags.witchPoisonUsed && Math.random() < 0.15) {
        const w = al.find(x => isBiter(x.p.roleId) && x.i !== botIdx);
        if (w) return { heal: null, poison: pid(w.i) };
      }
      return { heal: null, poison: null };
    }
    case 'icewitch': case 'blackmailer': case 'flute': case 'fluteplayer':
    case 'poisonwolf': case 'hypnowolf': case 'bigbadwolf':
    case 'diplomat': case 'priest': case 'gunsmith': case 'magistrate':
    case 'survivor': case 'queencard': case 'hellhound': case 'direwolf':
    case 'cursedwolf': case 'balancer': case 'challenger': case 'hoodlum':
    case 'bountyhunter': case 'wildchild': case 'doppelganger': case 'lycan': {
      const opts = promptMsg?.options || [];
      if (!opts.length) return { skip: true };
      const max = promptMsg.max || 1;
      // Bot Sói-team các vai đêm: né mate
      const filtered = opts.filter(o => o && o.id !== myPid && !mateIds.has(o.id));
      const pool = filtered.length ? filtered : opts.filter(o => o && o.id !== myPid);
      if (!pool.length) return { skip: true };
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(max, shuffled.length));
      return { targets: chosen.map(o => o.id) };
    }
    default:
      return { skip: true };
  }
}

/** Vote ngày: dùng beliefs — bot Dân vote sói đã lộ; bot Sói né mate; bandwagon top. */
function botVote(room, botIdx, voteMsg, bot) {
  const opts = voteMsg?.options || [];
  if (!opts.length) return null;
  const S = room.state;
  const myPid = room.pid(botIdx);
  const cands = opts.filter(o => o.id !== myPid);
  if (!cands.length) return null;
  const myRoleId = S.players[botIdx]?.roleId;
  const iAmWolf = myRoleId && E.WOLF_IDS.includes(myRoleId);
  const mateIds = new Set((bot.mates || []).map(m => m.id).filter(Boolean));

  if (iAmWolf) {
    // Bot Sói: không vote mate; ưu tiên vote Dân (theo state — bot Sói biết)
    const filtered = cands.filter(o => !mateIds.has(o.id));
    if (!filtered.length) return null;
    const villagers = filtered.filter(o => {
      const idx = room.idx(o.id);
      if (idx < 0 || !S.players[idx]) return true;
      return !E.WOLF_IDS.includes(S.players[idx].roleId);
    });
    return (villagers.length ? pick(villagers) : pick(filtered)).id;
  }

  // Bot Dân: nếu biết ai là Sói (belief) → vote Sói đó
  const knownWolf = cands.find(o => {
    const b = bot.beliefs.get(o.id);
    return b && b.wolf === true && b.confidence >= 0.9;
  });
  if (knownWolf) return knownWolf.id;

  // Bandwagon: theo tally trước đó nếu có
  if (bot.lastVoteTally) {
    const sorted = Object.entries(bot.lastVoteTally).sort((a, b) => b[1] - a[1]);
    for (const [idxStr] of sorted) {
      const cand = cands.find(o => o.id === room.pid(+idxStr));
      if (cand) return cand.id;
    }
  }
  return pick(cands).id;
}

/** Parse text privateResult → cập nhật beliefs. Chỉ xử các signal mạnh (confidence 1.0). */
function parsePrivateResult(bot, text) {
  const t = String(text || '');
  const setB = (name, wolf, reason) => {
    if (!name) return;
    const pid = bot._nameToPid(name);
    if (pid) bot._updateBelief(pid, wolf, 1.0, reason);
  };
  let m;
  if ((m = t.match(/🔮 Soi (.+?): 🔴 LÀ MA SÓI/))) setB(m[1], true, 'seer');
  else if ((m = t.match(/🔮 Soi (.+?): 🔵 KHÔNG phải Sói/))) setB(m[1], false, 'seer');
  else if ((m = t.match(/🕯️ (.+?): 🔴 LÀ SÓI/))) setB(m[1], true, 'medium');
  else if ((m = t.match(/🕯️ (.+?): 🔵 Không phải Sói/))) setB(m[1], false, 'medium');
  else if ((m = t.match(/🔮 Sói Tiên Tri: (.+?) là .+ \(🔴 SÓI\)/))) setB(m[1], true, 'wolfseer');
  else if ((m = t.match(/🔮 Sói Tiên Tri: (.+?) là .+ \(🔵 Dân\)/))) setB(m[1], false, 'wolfseer');
  else if ((m = t.match(/⚰️ (.+?) là .+? (Ma Sói|Sói)/i))) setB(m[1], true, 'gravedigger');
}

export class BotPlayer {
  constructor({ id, name, room, sched }) {
    this.id = id;
    this.name = name;
    this.room = room;
    this.sched = sched;
    this.roleId = null;
    this.roleTeam = null;
    this.mates = [];
    this.alive = true;
    this.phase = 'lobby';
    this.chatTimer = null;
    this._destroyed = false;
    this._pendingTimers = new Set();
    /* ── Memory & beliefs ── */
    this.beliefs = new Map();       // pid → { wolf: true|false, confidence: 0..1, reason }
    this.seerSeen = new Set();      // pid bot đã soi (nếu là Tiên Tri)
    this.lastMorning = null;        // { nightNo, deaths: [names] }
    this.lastDay = null;            // { dayNo, hangedName, hangedRole? }
    this.lastVoteTally = null;      // { idx: count } — bandwagon
    /* ── Persona per-bot để tránh "đồng phục tempo" (dễ lộ toàn bot) ──
       chatty  0.05..0.95 — xác suất chat mỗi cơ hội. 20% bot là "lurker"
                          (chatty<0.15) hầu như không nói.
       patience 0.4..2.2  — multiplier cho mọi delay. Thấp = phản xạ nhanh,
                          cao = chờ gần hết deadline.
       style   4 loại — dùng để chọn pool câu (concise/friendly/cautious/aggressive). */
    const r = Math.random();
    const chatty = r < 0.2 ? 0.05 + Math.random() * 0.1      // 20% lurker
                 : r < 0.6 ? 0.35 + Math.random() * 0.25     // 40% trung bình
                 : 0.65 + Math.random() * 0.3;               // 40% nói nhiều
    this.persona = {
      chatty,
      patience: 0.4 + Math.random() * 1.8,
      style: ['concise', 'friendly', 'cautious', 'aggressive'][Math.floor(Math.random() * 4)],
    };
  }

  /** Scale delay theo persona.patience — mỗi bot có cadence khác nhau. */
  _pd(ms) { return Math.max(400, Math.round(ms * this.persona.patience)); }
  _pdRange(lo, hi) { return randInt(this._pd(lo), this._pd(hi)); }

  destroy() {
    this._destroyed = true;
    for (const t of this._pendingTimers) { try { this.sched.clear(t); } catch (e) {} }
    this._pendingTimers.clear();
    if (this.chatTimer) { try { this.sched.clear(this.chatTimer); } catch (e) {} this.chatTimer = null; }
  }

  _schedule(ms, fn) {
    if (this._destroyed) return;
    const id = this.sched.set(ms, () => {
      this._pendingTimers.delete(id);
      if (!this._destroyed) { try { fn(); } catch (e) { /* nuốt, bot không được crash server */ } }
    });
    this._pendingTimers.add(id);
    return id;
  }

  _nameToPid(name) {
    if (!this.room.state) return null;
    for (let i = 0; i < this.room.state.players.length; i++) {
      if (this.room.state.players[i].name === name) return this.room.pid(i);
    }
    return null;
  }
  _updateBelief(pid, wolf, confidence, reason) {
    if (!pid) return;
    const cur = this.beliefs.get(pid);
    if (cur && cur.confidence >= confidence && cur.wolf === wolf) return;
    this.beliefs.set(pid, { wolf, confidence, reason });
  }
  _seedFromMates() {
    if (!this.mates || !this.mates.length) return;
    // Chỉ set mate = wolf khi mình cũng phe wolf (Cupid mates hoặc rev love ≠ wolf)
    if (this.roleTeam !== 'wolf') return;
    for (const m of this.mates) {
      const p = m.id || this._nameToPid(m.name);
      if (p) this._updateBelief(p, true, 1.0, 'own-mate');
    }
  }

  /** Nhận message từ Room (dạng cùng shape gửi cho client thật). */
  send(msg) {
    if (this._destroyed || !msg) return;
    switch (msg.t) {
      case 'yourRole':
        this.roleId = msg.role && msg.role.id;
        this.roleTeam = msg.role && msg.role.team;
        this.mates = msg.mates || [];
        this._seedFromMates();
        break;
      case 'state':
        this.phase = msg.phase;
        if (msg.players) {
          const me = msg.players.find(p => p.id === this.id);
          if (me) this.alive = me.alive !== false;
        }
        break;
      case 'scene':
        this.phase = msg.phase;
        if (msg.phase === 'day') this._planDayChat();
        break;
      case 'prompt':
        this._planNightAction(msg);
        break;
      case 'voteOpen':
        this._planVote(msg);
        break;
      case 'voteTally':
        this.lastVoteTally = msg.tally || null;
        break;
      case 'morning':
        this.lastMorning = { nightNo: msg.nightNo, deaths: (msg.deaths || []).map(d => d.name || d) };
        this._planMorningChat();
        break;
      case 'day':
        this.lastDay = { dayNo: msg.dayNo, lines: msg.lines || [] };
        this._planDayReactionChat();
        break;
      case 'privateResult':
        parsePrivateResult(this, msg.text);
        break;
      case 'sleep':
      case 'roles':
      case 'lobby':
      case 'welcome':
      case 'toast':
      case 'error':
        break;
      case 'chatMsg':
        this._maybeReply(msg);
        break;
      case 'gameOver':
        this.destroy();
        break;
    }
  }

  /* ── ĐÊM ── */
  _planNightAction(prompt) {
    /* Spread 1.5-9s * patience: bot patience 0.4 → ~0.6-3.6s (nhanh),
       patience 2.2 → ~3.3-20s (chờ sát deadline). Không đồng phục. */
    const delay = this._pdRange(1500, 9000);
    this._schedule(delay, () => {
      if (this.room.phase !== 'night' || !this.room.cur) return;
      const idx = this.room.idx(this.id);
      if (idx < 0 || !this.room.cur.pending || !this.room.cur.pending.has(idx)) return;
      const type = this.room.cur.stepByActor[idx];
      let action;
      try { action = botNightAction(this.room, idx, type, prompt, this); }
      catch (e) { action = { skip: true }; }
      try { this.room.handleAction(this.id, action || { skip: true }); }
      catch (e) { try { this.room.handleAction(this.id, { skip: true }); } catch (_) {} }
    });
    /* Wolf chat: chatty * 0.5 tuỳ persona (bot ít nói không xì thùng). */
    if (this.roleTeam === 'wolf' && Math.random() < this.persona.chatty * 0.5) {
      this._schedule(this._pdRange(1200, 6000), () => this._sendChat('wolf'));
    }
  }

  /* ── NGÀY (thảo luận) ── */
  _planDayChat() {
    if (!this.alive) {
      // Chết: chat âm phủ theo chatty * 0.35 (ít hơn — không phải ai chết cũng nhiều lời)
      if (Math.random() < this.persona.chatty * 0.35)
        this._schedule(this._pdRange(3000, 14000), () => this._sendChat('dead'));
      return;
    }
    /* nMsgs 0-3 gate theo chatty: lurker 0.1 → hầu như 0 tin, nói nhiều 0.9 → 1-3 tin.
       Delay k-th tin lệch xa hơn (base + jitter) để bot không chat cùng lúc. */
    const nMsgs = Math.random() < this.persona.chatty ? randInt(1, 3) : 0;
    for (let k = 0; k < nMsgs; k++) {
      const base = 2500 + k * 7000;
      const spread = 12000 + k * 10000;
      this._schedule(this._pdRange(base, base + spread), () => {
        if (this.room.phase !== 'day' || !this.alive) return;
        this._sendChat('main');
      });
    }
  }

  /* Chat phản ứng khi vừa sáng — RIP tên chết / đêm yên bình */
  _planMorningChat() {
    if (!this.alive) return;
    if (!this.lastMorning) return;
    const deaths = this.lastMorning.deaths || [];
    /* Gate theo chatty * 0.55 — lurker gần như không "RIP tên", tránh 4 bot
       cùng RIP một lúc. Delay spread 800-14000ms để tin đến rải rác. */
    if (Math.random() > this.persona.chatty * 0.55) return;
    this._schedule(this._pdRange(800, 14000), () => {
      if (this.room.phase !== 'day' || !this.alive) return;
      let text;
      if (deaths.length === 0) text = pick(['Đêm qua yên bình quá 🌙', 'Không ai chết à? Bảo Vệ tốt đấy 🛡️', 'Nghi Sói ngủ quên nhỉ 😴', 'Sao vậy trời...', 'Ổn quá ổn']);
      else if (deaths.length === 1) text = pick([`RIP ${deaths[0]} 😭`, `Tiếc ${deaths[0]} thật`, `${deaths[0]} chết rồi`, `${deaths[0]} 😔`, `😭 ${deaths[0]}`, `Nghi Sói cắn ${deaths[0]} có kế hoạch`, `${deaths[0]} chắc là Tiên Tri`]);
      else text = pick([`RIP ${deaths.join(', ')} 💀`, `${deaths.length} người chết? Ván này căng`, `Sói ăn mạnh quá 🐺`, `2 mạng luôn à 😱`]);
      try { this.room.handleChat(this.id, 'main', text); } catch (e) {}
    });
  }

  /* Chat sau khi có kết quả treo cổ ngày */
  _planDayReactionChat() {
    if (!this.alive) return;
    if (!this.lastDay) return;
    if (Math.random() > this.persona.chatty * 0.4) return;
    this._schedule(this._pdRange(2000, 9000), () => {
      if (this.room.phase !== 'day' || !this.alive) return;
      const line = pick(this.lastDay.lines || []);
      const looksLikeHang = /(bị treo|treo cổ|hang|đã bị)/i.test(String(line || ''));
      const noHang = /không.*treo|không đủ/i.test(String(line || ''));
      let text;
      if (noHang) text = pick(['Không treo được ai à 😑', 'Vote lỏng lẻo quá', 'Phải quyết đoán hơn chứ', '...', 'Chán ghê']);
      else if (looksLikeHang) text = pick(['Treo trúng chưa nhỉ? 👀', 'Ván này sắp rõ rồi', 'Hy vọng đúng Sói', 'Tiếp tục soi thôi 🔍', '🤞', 'Hồi hộp']);
      else return;
      try { this.room.handleChat(this.id, 'main', text); } catch (e) {}
    });
  }

  /* ── VOTE ── */
  _planVote(voteMsg) {
    if (!this.alive) return;
    /* Chat trước vote theo chatty * 0.5 (bot ít nói không nhắc target). */
    if (Math.random() < this.persona.chatty * 0.5)
      this._schedule(this._pdRange(1000, 5500), () => this._sendChat('main', { isVoteOpen: true, options: voteMsg.options }));
    /* Spread vote 2-22s * patience — có bot vote sớm (2s), có bot vote gần deadline.
       Cap ở voteMsg.deadline - 500ms để chắc chắn kịp gửi. */
    let delay = this._pdRange(2000, 22000);
    if (voteMsg && voteMsg.deadline) {
      const remain = voteMsg.deadline - Date.now();
      if (remain > 0) delay = Math.min(delay, Math.max(500, remain - 500));
    }
    this._schedule(delay, () => {
      if (this.room.phase !== 'day' || !this.room.voteOpen || !this.alive) return;
      const target = botVote(this.room, this.room.idx(this.id), voteMsg, this);
      if (target) { try { this.room.handleVote(this.id, target); } catch (e) {} }
    });
  }

  /* ── CHAT ── */
  _sendChat(channel, extra = {}) {
    if (this._destroyed) return;
    if (this.room.phase === 'ended') return;
    const opts = (extra.options || []).map(o => o.name).filter(n => n && n !== this.name);
    const others = this.room.aliveList
      ? this.room.aliveList().filter(x => x.i !== this.room.idx(this.id)).map(x => x.p.name)
      : [];
    /* Nếu bot biết ai là Sói + đang vote → ưu tiên nhắc tên đó */
    let targets = opts.length ? opts : others;
    if (extra.isVoteOpen && this.roleTeam !== 'wolf') {
      const wolvesKnown = [...this.beliefs.entries()]
        .filter(([, b]) => b.wolf === true && b.confidence >= 0.9)
        .map(([p]) => {
          const idx = this.room.idx(p);
          return idx >= 0 && this.room.state && this.room.state.players[idx]
            ? this.room.state.players[idx].name : null;
        })
        .filter(Boolean);
      if (wolvesKnown.length) targets = wolvesKnown;
    }
    const text = genChat({
      phase: this.room.phase,
      channel,
      isWolf: E.WOLF_IDS.includes(this.roleId),
      isDead: !this.alive,
      targets,
      isVoteOpen: !!extra.isVoteOpen,
    });
    if (!text) return;
    try { this.room.handleChat(this.id, channel, text); } catch (e) {}
  }

  _maybeReply(msg) {
    if (this._destroyed) return;
    if (msg.channel !== 'main' || this.phase !== 'day' || !this.alive) return;
    if (msg.from === this.name) return;
    /* Bot lurker gần như không reply — chỉ bot chatty cao mới phản ứng. */
    if (Math.random() > this.persona.chatty * 0.7) return;
    const r = tryReply({ myName: this.name, incomingText: msg.text, incomingFrom: msg.from });
    if (r) {
      this._schedule(this._pdRange(1500, 8000), () => {
        if (this.room.phase !== 'day' || !this.alive) return;
        try { this.room.handleChat(this.id, 'main', r); } catch (e) {}
      });
    }
  }
}
