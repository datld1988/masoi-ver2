'use strict';
/* Server Ma Sói authoritative: HTTP (phục vụ client thử play.html) + WebSocket cùng một cổng.
   Chạy: node src/index.js   (cổng mặc định 8080, đổi bằng PORT)
   - Mở trình duyệt: http://localhost:8080        → client thử
   - Client nối WebSocket tới:   ws://localhost:8080

   Danh tính: mỗi người có "token" ổn định (= playerId). Client lưu token để RECONNECT.
   Message client → server (JSON):
     { t:'join',   room, name }              → server trả { t:'welcome', id, token }
     { t:'resume', room, token }             → vào lại đúng trạng thái
     { t:'start',  counts }
     { t:'action', action:{ targets:[id...] | heal:id, poison:id | skip:true } }
     { t:'vote',   target }
     { t:'chat',   channel:'main'|'wolf'|'dead', text }
   Server → client: xem room.js (welcome, yourRole, state, scene, prompt, sleep,
     privateResult, morning, voteOpen, voteTally, day, chatMsg, gameOver, error). */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import E from '@masoi/engine';
import { Room } from './room.js';

/* ── Firebase Admin (tùy chọn)
   Local dev : đặt FIREBASE_KEY_FILE = đường dẫn tới file JSON service account
   Render/prod: đặt FIREBASE_SERVICE_ACCOUNT = toàn bộ nội dung JSON (string) ── */
let adminAuth = null;
{
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT
    || (process.env.FIREBASE_KEY_FILE ? readFileSync(process.env.FIREBASE_KEY_FILE, 'utf8') : null);
  if (svcJson) {
    try {
      const { initializeApp, cert } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const app = initializeApp({ credential: cert(JSON.parse(svcJson)) });
      adminAuth = getAuth(app);
      console.log('Firebase Admin: khởi tạo OK');
    } catch (e) { console.warn('Firebase Admin không khởi tạo được:', e.message); }
  }
}
async function verifyFirebaseToken(idToken) {
  if (!adminAuth || !idToken) return null;
  try { return await adminAuth.verifyIdToken(idToken); }
  catch { return null; }
}

/* ── Rate limiting (kết nối WebSocket theo IP) ── */
const ipCount = new Map(); // ip -> { count, resetAt }
function checkRate(ip, max = 30, windowMs = 60_000) {
  const now = Date.now();
  let e = ipCount.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + windowMs; }
  e.count++;
  ipCount.set(ip, e);
  return e.count <= max;
}
// Dọn ipCount mỗi 10 phút để tránh memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of ipCount) if (now > e.resetAt) ipCount.delete(ip);
}, 10 * 60_000).unref();

const ROLE_CATALOG = E.ROLES.map(r => ({ id: r.id, name: r.name, icon: r.icon, team: r.team }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const rooms = new Map();          // code -> Room
const sockets = new Map();        // playerId(token) -> ws

function sendTo(pid, msg) { const ws = sockets.get(pid); if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 dễ nhầm
function randomRoomCode() {
  let code;
  do { code = Array.from({ length: 5 }, () => ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, new Room({
      id: code, send: sendTo,
      onGameOver(winner, reveal, roomPlayers) {
        for (let i = 0; i < roomPlayers.length; i++) {
          const uid = roomPlayers[i].id;
          if (userDB.has(uid) && reveal[i]) recordResult(uid, winner, reveal[i].team, reveal, roomPlayers, i);
        }
        scheduleSaveUsers();
      },
    }));
  }
  return rooms.get(code);
}
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : randomUUID());

/* ── Bền bỉ: snapshot phòng + hồ sơ người dùng ── */
const DATA_DIR = join(__dirname, '..', 'data');
const SNAP = join(DATA_DIR, 'rooms.json');
const USERS_FILE = join(DATA_DIR, 'users.json');

/* ── Hồ sơ người dùng (lưu vào users.json) ── */
const userDB = new Map();
const BANS_FILE   = join(DATA_DIR, 'bans.json');
const REPORTS_FILE = join(DATA_DIR, 'reports.json');
const bannedUIDs = new Set();
const reportLog  = [];               // giới hạn 1000 mục cả trong RAM lẫn file
const REPORT_MAX = 1000;

function loadUsers() {
  try {
    if (!existsSync(USERS_FILE)) return;
    const d = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
    for (const [k, v] of Object.entries(d)) userDB.set(k, v);
    console.log(`Nạp ${userDB.size} hồ sơ người dùng`);
  } catch (e) { console.error('Nạp hồ sơ lỗi:', e.message); }
}
function saveUsers() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(USERS_FILE, JSON.stringify(Object.fromEntries(userDB), null, 2));
  } catch (e) { console.error('Lưu hồ sơ lỗi:', e.message); }
}
function loadBans() {
  try {
    if (existsSync(BANS_FILE)) { for (const uid of JSON.parse(readFileSync(BANS_FILE, 'utf8'))) bannedUIDs.add(uid); }
    if (bannedUIDs.size) console.log(`Nạp ${bannedUIDs.size} tài khoản bị ban`);
  } catch (e) { console.error('Nạp bans lỗi:', e.message); }
}
function saveBans() {
  try { writeFileSync(BANS_FILE, JSON.stringify([...bannedUIDs], null, 2)); }
  catch (e) { console.error('Lưu bans lỗi:', e.message); }
}
function loadReports() {
  try {
    if (existsSync(REPORTS_FILE)) { reportLog.push(...JSON.parse(readFileSync(REPORTS_FILE, 'utf8'))); }
  } catch (e) { console.error('Nạp reports lỗi:', e.message); }
}
function saveReports() {
  try { writeFileSync(REPORTS_FILE, JSON.stringify(reportLog.slice(-1000), null, 2)); }
  catch (e) { console.error('Lưu reports lỗi:', e.message); }
}

function upsertUser(uid, { displayName, photoURL }) {
  if (!userDB.has(uid)) userDB.set(uid, { uid, displayName, photoURL, elo: 1000, gamesPlayed: 0, wins: 0, winsByTeam: {}, createdAt: Date.now() });
  const u = userDB.get(uid);
  if (displayName) u.displayName = displayName;
  if (photoURL !== undefined) u.photoURL = photoURL;
  u.lastSeen = Date.now();
  return u;
}

/* ELO chuẩn: K=32, so với ELO trung bình phe đối thủ */
const ELO_K = 32, ELO_DEFAULT = 1000;
function recordResult(uid, winner, team, allReveal, allPlayers, myIdx) {
  const u = userDB.get(uid); if (!u) return;
  u.gamesPlayed = (u.gamesPlayed || 0) + 1;
  const won = winner === team;
  if (won) {
    u.wins = (u.wins || 0) + 1;
    u.winsByTeam = u.winsByTeam || {};
    u.winsByTeam[team] = (u.winsByTeam[team] || 0) + 1;
  }
  // ELO: so với ELO trung bình phe đối thủ
  const myElo = u.elo || ELO_DEFAULT;
  const oppElos = allReveal
    .map((r, i) => ({ team: r.team, uid: allPlayers[i]?.id, i }))
    .filter(x => x.i !== myIdx && x.team !== team)
    .map(x => (userDB.get(x.uid)?.elo || ELO_DEFAULT));
  if (oppElos.length) {
    const avgOpp = oppElos.reduce((a, b) => a + b, 0) / oppElos.length;
    const exp = 1 / (1 + Math.pow(10, (avgOpp - myElo) / 400));
    u.elo = Math.max(100, Math.round(myElo + ELO_K * ((won ? 1 : 0) - exp)));
  }
}

let saveUsersT = null;
function scheduleSaveUsers() { clearTimeout(saveUsersT); saveUsersT = setTimeout(saveUsers, 1500); }
function saveRooms() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const all = {};
    for (const [code, room] of rooms) if (room.phase !== 'ended') all[code] = room.serialize();
    writeFileSync(SNAP, JSON.stringify(all));
  } catch (e) { console.error('Lưu snapshot lỗi:', e.message); }
}
let saveT = null;
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(saveRooms, 800); }
function loadRooms() {
  try {
    if (!existsSync(SNAP)) return;
    const all = JSON.parse(readFileSync(SNAP, 'utf8'));
    let n = 0;
    for (const code of Object.keys(all)) { rooms.set(code, Room.restore(all[code], sendTo)); n++; }
    if (n) console.log(`Khôi phục ${n} phòng từ snapshot`);
  } catch (e) { console.error('Nạp snapshot lỗi:', e.message); }
}

const STATIC = {
  '/': 'play.html',
  '/play.html': 'play.html',
  '/player-ws.html': 'player-ws.html',
  '/role-art.js': 'role-art.js',
};
const ADMIN_KEY = process.env.ADMIN_KEY || '';

const httpServer = createServer(async (req, res) => {
  const parsed = new URL(req.url || '/', `http://localhost`);
  const path = parsed.pathname, q = parsed.searchParams;

  /* ── File tĩnh ── */
  const name = STATIC[path];
  if (name) {
    try {
      const data = await readFile(join(__dirname, '..', 'public', name));
      const ct = name.endsWith('.js') ? 'application/javascript' : 'text/html';
      res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
      res.end(data);
    } catch { res.writeHead(404); res.end(name + ' không tìm thấy'); }
    return;
  }

  /* ── Bảng xếp hạng (public) ── */
  if (path === '/leaderboard') {
    const top = [...userDB.values()]
      .filter(u => (u.gamesPlayed || 0) >= 1)
      .sort((a, b) => (b.elo || ELO_DEFAULT) - (a.elo || ELO_DEFAULT))
      .slice(0, 20)
      .map(u => ({ displayName: u.displayName, elo: u.elo || ELO_DEFAULT, gamesPlayed: u.gamesPlayed || 0, wins: u.wins || 0 }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(top));
    return;
  }

  /* ── Admin endpoints (cần ADMIN_KEY) ── */
  if (path.startsWith('/admin/')) {
    if (!ADMIN_KEY || q.get('key') !== ADMIN_KEY) { res.writeHead(403); res.end('Forbidden'); return; }
    if (path === '/admin/reports') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reportLog.slice(-100)));
    } else if (path === '/admin/ban') {
      const uid = q.get('uid'); if (!uid) { res.writeHead(400); res.end('Missing uid'); return; }
      bannedUIDs.add(uid); saveBans();
      res.writeHead(200); res.end(`Banned: ${uid}`);
    } else if (path === '/admin/unban') {
      const uid = q.get('uid'); if (!uid) { res.writeHead(400); res.end('Missing uid'); return; }
      bannedUIDs.delete(uid); saveBans();
      res.writeHead(200); res.end(`Unbanned: ${uid}`);
    } else if (path === '/admin/users') {
      const list = [...userDB.values()].sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0)).slice(0, 100);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    } else { res.writeHead(404); res.end('Unknown admin endpoint'); }
    return;
  }

  res.writeHead(404); res.end('not found');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const ip = rawIp.replace(/^::ffff:/i, '');   // normalize IPv4-mapped IPv6
  if (!checkRate(ip)) { ws.close(1008, 'Rate limit exceeded'); return; }
  ws.send(JSON.stringify({ t: 'roles', roles: ROLE_CATALOG }));   // danh mục 22 vai cho lobby
  ws.on('message', async (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch { console.warn('[WS] JSON không hợp lệ từ', ip); return; }

    const sendErr = (msg) => ws.send(JSON.stringify({ t: 'error', message: msg }));

    /* ── Xử lý xác thực Firebase và lấy pid + tên ── */
    async function resolveIdentity(preferredName) {
      const safeName = n => String(n || '').trim().slice(0, 24) || 'Ẩn danh';
      if (m.idToken) {
        if (!adminAuth) {
          // Firebase Admin chưa cấu hình → chơi như khách, không lưu stats
          return { pid: newId(), name: safeName(preferredName) };
        }
        const decoded = await verifyFirebaseToken(m.idToken);
        if (!decoded) { sendErr('Token đăng nhập không hợp lệ, hãy đăng nhập lại.'); return null; }
        const uid = decoded.uid;
        if (bannedUIDs.has(uid)) { sendErr('Tài khoản bị cấm. Liên hệ quản trị viên nếu có nhầm lẫn.'); return null; }
        const name = safeName(decoded.name || preferredName);
        const u = upsertUser(uid, { displayName: decoded.name, photoURL: decoded.picture });
        ws.send(JSON.stringify({ t: 'userProfile', uid: u.uid, displayName: u.displayName, gamesPlayed: u.gamesPlayed, wins: u.wins || 0, elo: u.elo || ELO_DEFAULT, winsByTeam: u.winsByTeam }));
        return { pid: uid, name };
      }
      return { pid: newId(), name: safeName(preferredName) };
    }

    if (m.t === 'create') {
      const code = (m.room || '').trim().slice(0, 32);
      if (!code) return sendErr('Nhập tên phòng.');
      if (rooms.has(code) && rooms.get(code).players.length) return sendErr('Phòng đã tồn tại — chọn tên khác hoặc bấm Vào phòng.');
      const identity = await resolveIdentity(m.name);
      if (!identity) return;
      const { pid, name } = identity;
      const room = getRoom(code);
      room.password = (m.password || '').slice(0, 30);
      ws._room = room; ws._pid = pid; sockets.set(pid, ws);
      ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid, room: code }));
      room.join(pid, name);           // người tạo = chủ phòng
      scheduleSave();
      return;
    }
    if (m.t === 'join') {
      const code = (m.room || '').trim();
      const room = rooms.get(code);
      if (!room || !room.players.length) return sendErr('Phòng không tồn tại.');
      if ((room.password || '') !== (m.password || '')) return sendErr('Sai mật khẩu.');
      if (room.phase !== 'lobby') return sendErr('Ván đã bắt đầu, không vào được.');
      const identity = await resolveIdentity(m.name);
      if (!identity) return;
      const { pid, name } = identity;
      ws._room = room; ws._pid = pid; sockets.set(pid, ws);
      ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid, room: code }));
      room.join(pid, name);
      scheduleSave();
      return;
    }
    if (m.t === 'quickMatch') {
      const identity = await resolveIdentity(m.name);
      if (!identity) return;
      const { pid, name } = identity;
      // Tìm phòng public tốt nhất: có người, chưa bắt đầu, chưa có mật khẩu, chưa đầy
      let best = null;
      for (const [code, room] of rooms) {
        if (room.phase === 'lobby' && !room.password && room.players.length > 0 && room.players.length < 12)
          if (!best || room.players.length > best.room.players.length) best = { code, room };
      }
      const code = best ? best.code : randomRoomCode();
      const room = best ? best.room : getRoom(code);
      ws._room = room; ws._pid = pid; sockets.set(pid, ws);
      ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid, room: code }));
      room.join(pid, name);
      scheduleSave();
      return;
    }
    if (m.t === 'resume') {
      const room = rooms.get((m.room || '').trim());
      const pid = m.token;
      if (room && pid && room.hasPlayer(pid)) {
        ws._room = room; ws._pid = pid; sockets.set(pid, ws);
        ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid, resumed: true }));
        room.resume(pid);
      } else {
        sendErr('Phiên không còn hợp lệ, hãy vào lại phòng.');
      }
      return;
    }
    if (m.t === 'listRooms') {
      const list = [];
      for (const [code, room] of rooms) if (room.phase === 'lobby' && room.players.length) list.push({ code, count: room.players.length, locked: !!room.password });
      ws.send(JSON.stringify({ t: 'rooms', list }));
      return;
    }

    const room = ws._room, pid = ws._pid;
    if (!room || !pid) return;
    switch (m.t) {
      case 'start': { const rs = room.start(m.counts || {}, undefined, m.settings || {}, pid); if (!rs.ok) ws.send(JSON.stringify({ t: 'error', message: rs.error })); break; }
      case 'action': room.handleAction(pid, m.action || {}); break;
      case 'vote':   room.handleVote(pid, m.target); break;
      case 'chat':   room.handleChat(pid, m.channel, m.text); break;
      case 'newMatch': room.newMatch(); break;
      case 'ready': room.setReady(pid, m.value); break;
      case 'report': {
        const target = room.players.find(p => p.id === m.targetId);
        if (target && m.targetId !== pid) {
          const reporter = room.players.find(p => p.id === pid);
          reportLog.push({ time: Date.now(), reporterUid: pid, reporterName: reporter?.name || '?', targetUid: m.targetId, targetName: target.name, reason: (m.reason || '').slice(0, 200), room: room.id });
          if (reportLog.length > REPORT_MAX) reportLog.splice(0, reportLog.length - REPORT_MAX);
          if (reportLog.length % 20 === 0) saveReports();
          ws.send(JSON.stringify({ t: 'toast', message: '✅ Đã ghi nhận báo cáo. Cảm ơn!' }));
        }
        break;
      }
      case 'leave': {
        room.leave(pid);
        sockets.delete(pid);
        ws._room = null; ws._pid = null;
        if (rooms.get(room.id) === room && room.players.length === 0) rooms.delete(room.id);
        break;
      }
      default: break;
    }
    scheduleSave();
  });

  ws.on('close', () => {
    const pid = ws._pid;
    if (pid && sockets.get(pid) === ws) {
      sockets.delete(pid);
      if (ws._room) ws._room.setConnected(pid, false);   // giữ chỗ để reconnect
    }
  });
});

loadRooms();
loadUsers();
loadBans();
loadReports();

// Dọn phòng "chết": lobby trống kết nối > 30 phút, hoặc ván ended > 10 phút
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const allDisc = room.players.length > 0 && room.players.every(p => !p.connected);
    const stale = room._lastActivity && (now - room._lastActivity > (room.phase === 'lobby' ? 30 * 60_000 : 10 * 60_000));
    if (allDisc && stale) { rooms.delete(code); console.log(`[sweep] xóa phòng ${code} (không hoạt động)`); }
  }
}, 5 * 60_000).unref();

httpServer.listen(PORT, () => {
  console.log(`Ma Sói server chạy: http://localhost:${PORT}  ·  ws://localhost:${PORT}`);
  if (ADMIN_KEY) console.log(`Admin: GET /admin/reports?key=... | /admin/ban?uid=...&key=... | /admin/users?key=...`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveRooms(); saveUsers(); saveBans(); saveReports(); process.exit(0); });
