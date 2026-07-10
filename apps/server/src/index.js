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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { Room } from './room.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const rooms = new Map();          // code -> Room
const sockets = new Map();        // playerId(token) -> ws

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, new Room({
      id: code,
      send: (pid, msg) => {
        const ws = sockets.get(pid);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
      },
    }));
  }
  return rooms.get(code);
}
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : randomUUID());

const httpServer = createServer(async (req, res) => {
  try {
    const html = await readFile(join(__dirname, '..', 'public', 'play.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(404); res.end('play.html không tìm thấy');
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

    const room = ws._room, pid = ws._pid;
    if (!room || !pid) return;
    switch (m.t) {
      case 'start': { const rs = room.start(m.counts || {}); if (!rs.ok) ws.send(JSON.stringify({ t: 'error', message: rs.error })); break; }
      case 'action': room.handleAction(pid, m.action || {}); break;
      case 'vote':   room.handleVote(pid, m.target); break;
      case 'chat':   room.handleChat(pid, m.channel, m.text); break;
      default: break;
    }
  });

  ws.on('close', () => {
    const pid = ws._pid;
    if (pid && sockets.get(pid) === ws) {
      sockets.delete(pid);
      if (ws._room) ws._room.setConnected(pid, false);   // giữ chỗ để reconnect
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Ma Sói server chạy: http://localhost:${PORT}  (client thử)  ·  ws://localhost:${PORT}`);
});
