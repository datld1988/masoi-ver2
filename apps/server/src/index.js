'use strict';
/* Server Ma Sói authoritative: HTTP (phục vụ client thử play.html) + WebSocket cùng một cổng.
   Chạy: node src/index.js   (cổng mặc định 8080, đổi bằng PORT)
   - Mở trình duyệt: http://localhost:8080        → client thử
   - Client nối WebSocket tới:   ws://localhost:8080

   Message client → server (JSON):
     { t:'join',   room, name }
     { t:'start',  counts }
     { t:'action', action:{ targets:[id...] | heal:id, poison:id | skip:true } }
     { t:'vote',   target }
   Server → client: xem room.js (welcome, yourRole, state, scene, prompt, sleep,
     privateResult, morning, voteOpen, voteTally, day, gameOver, error). */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Room } from './room.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const rooms = new Map();          // code -> Room
const sockets = new Map();        // playerId -> ws
let seq = 0;

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
  const pid = 'p' + (++seq);
  sockets.set(pid, ws);
  ws._pid = pid;

  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }
    if (m.t === 'join') {
      ws._room = getRoom(m.room);
      ws.send(JSON.stringify({ t: 'welcome', id: pid }));
      ws._room.join(pid, m.name);
      return;
    }
    const room = ws._room;
    if (!room) return;
    switch (m.t) {
      case 'start': { const rs = room.start(m.counts || {}); if (!rs.ok) ws.send(JSON.stringify({ t: 'error', message: rs.error })); break; }
      case 'action': room.handleAction(pid, m.action || {}); break;
      case 'vote':   room.handleVote(pid, m.target); break;
      default: break;   // chat/dm/reconnect: TODO
    }
  });

  ws.on('close', () => { sockets.delete(pid); });
});

httpServer.listen(PORT, () => {
  console.log(`Ma Sói server chạy: http://localhost:${PORT}  (client thử)  ·  ws://localhost:${PORT}`);
});
