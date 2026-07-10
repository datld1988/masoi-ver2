'use strict';
/* Lớp vỏ WebSocket cho Room (authoritative server).
   Chạy: node src/index.js   (mặc định cổng 8080, đổi bằng biến môi trường PORT)
   Message client → server (JSON):
     { t:'join',   room, name }
     { t:'start',  counts }            // người mở phòng bắt đầu; từ đây server tự dẫn ván
     { t:'action', action:{...} }      // hành động đêm (targets / heal / poison)
     { t:'vote',   target }            // bỏ phiếu treo (target = playerId)
   Server → client: xem các message trong room.js (yourRole, prompt, sleep, morning, voteOpen, gameOver...) */

import { WebSocketServer } from 'ws';
import { Room } from './room.js';

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

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  const pid = 'p' + (++seq);
  sockets.set(pid, ws);
  ws._pid = pid;

  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data.toString()); } catch { return; }
    if (m.t === 'join') {
      ws._room = getRoom(m.room);
      ws._room.join(pid, m.name);
      return;
    }
    const room = ws._room;
    if (!room) return;
    switch (m.t) {
      case 'start':  room.start(m.counts || {}); break;
      case 'action': room.handleAction(pid, m.action || {}); break;
      case 'vote':   room.handleVote(pid, m.target); break;
      default: break;   // chat/dm/reconnect: TODO
    }
  });

  ws.on('close', () => { sockets.delete(pid); });
});

console.log(`Ma Sói server (authoritative) đang chạy: ws://localhost:${PORT}`);
