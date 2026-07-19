'use strict';
/* BotPlayer — người chơi ảo cho quick match khi thiếu người thật.
   Chạy server-side, nhận message qua `send()` như client thật, phản ứng có delay
   để giống người (2-10s action, 4-15s vote, 8-25s chat).
   Bot được cấp quyền "biết" role của chính mình + có ref tới Room để chọn action
   hợp lệ (KHÔNG biết vai người khác — trừ đồng đội Sói qua `mates`).

   Import phải LAZY qua constructor để tránh circular với room.js. */

import E from '@masoi/engine';
import { genChat, tryReply } from './bot-chat.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Sinh action HỢP LỆ cho bot dựa trên roleId + state hiện tại của phòng.
 *  Bot Sói có "thông tin nội bộ" biết đồng đội (thực tế client Sói cũng biết qua mates).
 *  Bot Dân KHÔNG biết ai là Sói → chọn target ngẫu nhiên. */
function botNightAction(room, botIdx, stepType, promptMsg) {
  const S = room.state;
  const al = room.aliveList();
  const others = al.filter(x => x.i !== botIdx);
  const pid = (i) => room.pid(i);
  const isWolf = (rid) => E.WOLF_IDS.includes(rid);
  const isBiter = (rid) => E.BITING_WOLF_IDS.includes(rid);

  switch (stepType) {
    case 'wolf': {
      // Sói bot: cắn 1 người không phải Sói bất kỳ
      const targets = al.filter(x => !isBiter(x.p.roleId) && x.p.roleId !== 'deserter');
      if (!targets.length) return { skip: true };
      const t = pick(targets);
      return { targets: [pid(t.i)] };
    }
    case 'whitewolf': {
      // Sói Trắng có thể cắn 1 Sói khác — auto skip 50% để không dồn ép
      if (Math.random() < 0.5) return { skip: true };
      const wolves = al.filter(x => isWolf(x.p.roleId) && x.p.roleId !== 'whitewolf');
      if (!wolves.length) return { skip: true };
      return { targets: [pick(wolves).i ? pid(pick(wolves).i) : pid(wolves[0].i)] };
    }
    case 'seer': case 'sorcerer': case 'wolfseer':
    case 'medium': case 'gravedigger': case 'graverobber':
    case 'tracker': case 'switcher': case 'detective':
    case 'fox': case 'copycat': {
      // Roles cần chọn target(s) từ options
      const opts = promptMsg && promptMsg.options ? promptMsg.options : null;
      if (!opts || !opts.length) return { skip: true };
      const max = promptMsg.max || 1;
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(max, shuffled.length))
        .filter(o => o && o.id !== room.pid(botIdx));  // không tự chọn mình
      if (!chosen.length) return { skip: true };
      return { targets: chosen.map(o => o.id) };
    }
    case 'bodyguard': {
      const cands = al.filter(x => x.i !== S.flags.bodyguardLastIdx);
      if (!cands.length) return { skip: true };
      return { targets: [pid(pick(cands).i)] };
    }
    case 'doctor': {
      const cands = al;
      if (!cands.length) return { skip: true };
      return { targets: [pid(pick(cands).i)] };
    }
    case 'cupid': {
      if (al.length < 2) return { skip: true };
      const shuffled = [...al].sort(() => Math.random() - 0.5);
      return { targets: [pid(shuffled[0].i), pid(shuffled[1].i)] };
    }
    case 'hunter': {
      const t = others.length ? pick(others) : null;
      return t ? { targets: [pid(t.i)] } : { skip: true };
    }
    case 'serialkiller': case 'nighthunter': case 'assassin': {
      const t = others.length ? pick(others) : null;
      return t ? { targets: [pid(t.i)] } : { skip: true };
    }
    case 'witch': {
      // Dùng độc random khi có wolf sống, luôn cứu = null (bot mù, không biết ai)
      if (!S.flags.witchPoisonUsed && Math.random() < 0.3) {
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
      const opts = promptMsg && promptMsg.options ? promptMsg.options : null;
      if (!opts || !opts.length) return { skip: true };
      const max = promptMsg.max || 1;
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(max, shuffled.length))
        .filter(o => o && o.id !== room.pid(botIdx));
      if (!chosen.length) return { skip: true };
      return { targets: chosen.map(o => o.id) };
    }
    default:
      // Vai không rõ hoặc auto-handle bởi server (hinter, littlegirl, ...)
      return { skip: true };
  }
}

/** Vote ngày: Sói bot ưu tiên vote Dân; Dân bot vote random. Tránh vote bản thân. */
function botVote(room, botIdx, voteMsg) {
  const opts = voteMsg && voteMsg.options ? voteMsg.options : [];
  if (!opts.length) return null;
  const S = room.state;
  const myRoleId = S && S.players[botIdx] ? S.players[botIdx].roleId : null;
  const iAmWolf = myRoleId && E.BITING_WOLF_IDS.includes(myRoleId);
  const cands = opts.filter(o => o.id !== room.pid(botIdx));
  if (!cands.length) return null;

  if (iAmWolf) {
    // Sói bot: vote 1 Dân bất kỳ (biết đồng đội qua state)
    const villagers = cands.filter(o => {
      const idx = room.idx(o.id);
      if (idx < 0 || !S.players[idx]) return true;
      return !E.WOLF_IDS.includes(S.players[idx].roleId);
    });
    return (villagers.length ? pick(villagers) : pick(cands)).id;
  }
  // Dân bot: bandwagon nếu có phiếu áp đảo, else random
  return pick(cands).id;
}

export class BotPlayer {
  constructor({ id, name, room, sched }) {
    this.id = id;
    this.name = name;
    this.room = room;
    this.sched = sched;    // dùng scheduler của room để test có thể tick
    this.roleId = null;
    this.roleTeam = null;
    this.mates = [];
    this.alive = true;
    this.phase = 'lobby';
    this.chatTimer = null;
    this._destroyed = false;
    this._pendingTimers = new Set();
  }

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

  /** Nhận message từ Room (dạng cùng shape gửi cho client thật). */
  send(msg) {
    if (this._destroyed || !msg) return;
    switch (msg.t) {
      case 'yourRole':
        this.roleId = msg.role && msg.role.id;
        this.roleTeam = msg.role && msg.role.team;
        this.mates = msg.mates || [];
        break;
      case 'state':
        this.phase = msg.phase;
        // Tự cập nhật trạng thái sống của bot
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
      case 'sleep':
      case 'privateResult':
      case 'morning':
      case 'day':
      case 'voteTally':
      case 'roles':
      case 'lobby':
      case 'welcome':
      case 'toast':
      case 'error':
        // no-op
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
    // Delay 2-8s để giả lập "thinking"
    const delay = randInt(2000, 8000);
    this._schedule(delay, () => {
      if (this.room.phase !== 'night' || !this.room.cur) return;
      const idx = this.room.idx(this.id);
      if (idx < 0 || !this.room.cur.pending || !this.room.cur.pending.has(idx)) return;
      const type = this.room.cur.stepByActor[idx];
      let action;
      try { action = botNightAction(this.room, idx, type, prompt); }
      catch (e) { action = { skip: true }; }
      try { this.room.handleAction(this.id, action || { skip: true }); }
      catch (e) { try { this.room.handleAction(this.id, { skip: true }); } catch (_) {} }
    });
    // Đêm — nếu là Sói, đôi khi chat kênh wolf
    if (this.roleTeam === 'wolf' && Math.random() < 0.35) {
      this._schedule(randInt(1500, 5000), () => this._sendChat('wolf'));
    }
  }

  /* ── NGÀY (thảo luận) ── */
  _planDayChat() {
    if (!this.alive) {
      // Bot chết: đôi khi chat kênh dead
      if (Math.random() < 0.4) this._schedule(randInt(3000, 10000), () => this._sendChat('dead'));
      return;
    }
    // Sống: 60% cơ hội chat 1-3 câu trong khoảng 5-25s đầu ngày
    const nMsgs = Math.random() < 0.6 ? randInt(1, 3) : 0;
    for (let k = 0; k < nMsgs; k++) {
      this._schedule(randInt(3000 + k * 6000, 8000 + k * 8000), () => {
        if (this.room.phase !== 'day' || !this.alive) return;
        this._sendChat('main');
      });
    }
  }

  /* ── VOTE ── */
  _planVote(voteMsg) {
    if (!this.alive) return;
    // Đôi khi chat trước khi vote
    if (Math.random() < 0.5) this._schedule(randInt(1500, 4500), () => this._sendChat('main', { isVoteOpen: true, options: voteMsg.options }));
    // Delay 4-15s rồi vote
    this._schedule(randInt(4000, 15000), () => {
      if (this.room.phase !== 'day' || !this.room.voteOpen || !this.alive) return;
      const target = botVote(this.room, this.room.idx(this.id), voteMsg);
      if (target) { try { this.room.handleVote(this.id, target); } catch (e) {} }
    });
  }

  /* ── CHAT ── */
  _sendChat(channel, extra = {}) {
    if (this._destroyed) return;
    if (this.room.phase === 'ended') return;
    const opts = (extra.options || []).map(o => o.name).filter(n => n && n !== this.name);
    // Danh sách tên người sống khác để làm target đưa vào template
    const others = this.room.aliveList
      ? this.room.aliveList().filter(x => x.i !== this.room.idx(this.id)).map(x => x.p.name)
      : [];
    const targets = opts.length ? opts : others;
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
    // 25% cơ hội phản ứng, kể cả khi không có keyword
    const r = tryReply({ myName: this.name, incomingText: msg.text, incomingFrom: msg.from });
    if (r) {
      this._schedule(randInt(2000, 6000), () => {
        if (this.room.phase !== 'day' || !this.alive) return;
        try { this.room.handleChat(this.id, 'main', r); } catch (e) {}
      });
    }
  }
}
