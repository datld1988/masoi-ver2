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

const ROLE_CATALOG = E.ROLES.map(r => ({ id: r.id, name: r.name, icon: r.icon, team: r.team }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const rooms = new Map();          // code -> Room
const sockets = new Map();        // playerId(token) -> ws

function sendTo(pid, msg) { const ws = sockets.get(pid); if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, new Room({
      id: code, send: sendTo,
      onGameOver(winner, reveal, roomPlayers) {
        for (let i = 0; i < roomPlayers.length; i++) {
          const uid = roomPlayers[i].id;
          if (userDB.has(uid) && reveal[i]) recordResult(uid, winner, reveal[i].team);
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
const userDB = new Map(); // uid -> { uid, displayName, photoURL, gamesPlayed, wins, winsByTeam, createdAt }

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
function upsertUser(uid, { displayName, photoURL }) {
  if (!userDB.has(uid)) userDB.set(uid, { uid, displayName, photoURL, gamesPlayed: 0, wins: 0, winsByTeam: {}, createdAt: Date.now() });
  const u = userDB.get(uid);
  if (displayName) u.displayName = displayName;
  if (photoURL !== undefined) u.photoURL = photoURL;
  u.lastSeen = Date.now();
  return u;
}
function recordResult(uid, winner, team) {
  const u = userDB.get(uid); if (!u) return;
  u.gamesPlayed = (u.gamesPlayed || 0) + 1;
  if (winner === team) {
    u.wins = (u.wins || 0) + 1;
    u.winsByTeam = u.winsByTeam || {};
    u.winsByTeam[team] = (u.winsByTeam[team] || 0) + 1;
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
const httpServer = createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0];
  const name = STATIC[url];
  if (!name) { res.writeHead(404); res.end('not found'); return; }
  try {
    const data = await readFile(join(__dirname, '..', 'public', name));
    const ct = name.endsWith('.js') ? 'application/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end(name + ' không tìm thấy');
  }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) { ws.close(1008, 'Rate limit exceeded'); return; }
  ws.send(JSON.stringify({ t: 'roles', roles: ROLE_CATALOG }));   // danh mục 22 vai cho lobby
  ws.on('message', async (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }

    const sendErr = (msg) => ws.send(JSON.stringify({ t: 'error', message: msg }));

    /* ── Xử lý xác thực Firebase và lấy pid + tên ── */
    async function resolveIdentity(preferredName) {
      if (m.idToken) {
        const decoded = await verifyFirebaseToken(m.idToken);
        if (!decoded) { sendErr('Token đăng nhập không hợp lệ, hãy đăng nhập lại.'); return null; }
        const uid = decoded.uid;
        const name = decoded.name || preferredName || 'Ẩn danh';
        const u = upsertUser(uid, { displayName: decoded.name, photoURL: decoded.picture });
        ws.send(JSON.stringify({ t: 'userProfile', uid: u.uid, displayName: u.displayName, gamesPlayed: u.gamesPlayed, wins: u.wins, winsByTeam: u.winsByTeam }));
        return { pid: uid, name };
      }
      return { pid: newId(), name: preferredName || 'Ẩn danh' };
    }

    if (m.t === 'create') {
      const code = (m.room || '').trim();
      if (!code) return sendErr('Nhập tên phòng.');
      if (rooms.has(code) && rooms.get(code).players.length) return sendErr('Phòng đã tồn tại — chọn tên khác hoặc bấm Vào phòng.');
      const identity = await resolveIdentity(m.name);
      if (!identity) return;
      const { pid, name } = identity;
      const room = getRoom(code);
      room.password = (m.password || '');
      ws._room = room; ws._pid = pid; sockets.set(pid, ws);
      ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid }));
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
      ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid }));
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

loadRooms();   // khôi phục phòng đang chơi (nếu server vừa restart)
loadUsers();   // nạp hồ sơ người dùng
httpServer.listen(PORT, () => {
  console.log(`Ma Sói server chạy: http://localhost:${PORT}  (client thử)  ·  ws://localhost:${PORT}`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveRooms(); saveUsers(); process.exit(0); });
