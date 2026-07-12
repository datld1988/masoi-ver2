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
import { Room } from './room.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const rooms = new Map();          // code -> Room
const sockets = new Map();        // playerId(token) -> ws

function sendTo(pid, msg) { const ws = sockets.get(pid); if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Room({ id: code, send: sendTo }));
  return rooms.get(code);
}
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : randomUUID());

/* ── Bền bỉ: snapshot phòng ra file, nạp lại khi khởi động ── */
const DATA_DIR = join(__dirname, '..', 'data');
const SNAP = join(DATA_DIR, 'rooms.json');
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

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }

    if (m.t === 'join') {
      const room = getRoom(m.room);
      const pid = newId();
      ws._room = room; ws._pid = pid;
      sockets.set(pid, ws);
      ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid }));
      room.join(pid, m.name);
      scheduleSave();
      return;
    }
    if (m.t === 'resume') {
      const room = getRoom(m.room);
      const pid = m.token;
      if (pid && room.hasPlayer(pid)) {
        ws._room = room; ws._pid = pid;
        sockets.set(pid, ws);
        ws.send(JSON.stringify({ t: 'welcome', id: pid, token: pid, resumed: true }));
        room.resume(pid);
      } else {
        ws.send(JSON.stringify({ t: 'error', message: 'Phiên không còn hợp lệ, hãy vào lại phòng.' }));
      }
      return;
    }

    if (m.t === 'listRooms') {
      const list = [];
      for (const [code, room] of rooms) if (room.phase === 'lobby') list.push({ code, count: room.players.length });
      ws.send(JSON.stringify({ t: 'rooms', list }));
      return;
    }

    const room = ws._room, pid = ws._pid;
    if (!room || !pid) return;
    switch (m.t) {
      case 'start': { const rs = room.start(m.counts || {}, undefined, m.settings || {}); if (!rs.ok) ws.send(JSON.stringify({ t: 'error', message: rs.error })); break; }
      case 'action': room.handleAction(pid, m.action || {}); break;
      case 'vote':   room.handleVote(pid, m.target); break;
      case 'chat':   room.handleChat(pid, m.channel, m.text); break;
      case 'newMatch': room.newMatch(); break;
      case 'ready': room.setReady(pid, m.value); break;
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
httpServer.listen(PORT, () => {
  console.log(`Ma Sói server chạy: http://localhost:${PORT}  (client thử)  ·  ws://localhost:${PORT}`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveRooms(); process.exit(0); });
