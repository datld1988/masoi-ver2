import { describe, it, expect } from 'vitest';
import { Room } from '../src/room.js';

// rng cố định → vai chia theo thứ tự pool (villager,villager,wolf,seer,witch)
const noShuffle = () => 0.999999;

function setup() {
  const inbox = {};                       // pid -> [msg...]
  const send = (pid, msg) => { (inbox[pid] ||= []).push(msg); };
  let current = null;                     // Room chỉ giữ 1 timer tại một thời điểm
  const scheduler = {
    set: (ms, fn) => { current = { fn }; return current; },
    clear: (h) => { if (current === h) current = null; },
  };
  const tick = () => { const c = current; current = null; if (c) c.fn(); };
  const room = new Room({ id: 'T', send, scheduler, settings: { lgCaughtChance: 0 } });
  return { room, inbox, tick };
}
const last = (arr, t) => [...(arr || [])].reverse().find(m => m.t === t);

describe('Room auto-MC', () => {
  it('chạy trọn 1 ván: Phù Thủy cứu đêm 1, dân treo Sói ngày 1 → Dân thắng', () => {
    const { room, inbox, tick } = setup();
    ['An', 'Bình', 'Cường', 'Dũng', 'En'].forEach((n, i) => room.join('p' + i, n));

    const r = room.start({ villager: 2, wolf: 1, seer: 1, witch: 1 }, noShuffle);
    expect(r.ok).toBe(true);
    expect(last(inbox.p2, 'yourRole').role.id).toBe('wolf');
    expect(last(inbox.p3, 'yourRole').role.id).toBe('seer');
    expect(last(inbox.p4, 'yourRole').role.id).toBe('witch');

    // ĐÊM 1 (tuần tự: wolf → seer → witch)
    room.handleAction('p2', { targets: ['p0'] });          // Sói cắn p0
    room.handleAction('p3', { targets: ['p2'] });          // Tiên Tri soi p2
    expect(last(inbox.p3, 'privateResult').text).toContain('LÀ MA SÓI');
    room.handleAction('p4', { heal: 'p0' });               // Phù Thủy cứu p0

    // SÁNG: p0 được cứu, không ai chết
    expect(last(inbox.p0, 'morning')).toBeTruthy();
    expect(room.state.players[0].alive).toBe(true);
    expect(room.phase).toBe('day');

    // NGÀY: thảo luận → vote → treo Sói
    tick();                                                // hết thảo luận → voteOpen
    expect(last(inbox.p0, 'voteOpen')).toBeTruthy();
    ['p0', 'p1', 'p3', 'p4'].forEach(v => room.handleVote(v, 'p2'));
    tick();                                                // hết giờ vote → closeVote

    const over = last(inbox.p0, 'gameOver');
    expect(over).toBeTruthy();
    expect(over.winner).toBe('village');
    expect(room.phase).toBe('ended');
  });

  it('không lộ vai người khác: mỗi client chỉ nhận yourRole của mình', () => {
    const { room, inbox } = setup();
    ['A', 'B', 'C', 'D', 'E'].forEach((n, i) => room.join('p' + i, n));
    room.start({ villager: 2, wolf: 1, seer: 1, witch: 1 }, noShuffle);
    // mỗi hộp thư chỉ có đúng 1 yourRole (của chính mình)
    for (let i = 0; i < 5; i++) {
      const roles = (inbox['p' + i] || []).filter(m => m.t === 'yourRole');
      expect(roles.length).toBe(1);
    }
  });

  it('không cho join khi ván đã bắt đầu', () => {
    const { room } = setup();
    ['A', 'B', 'C'].forEach((n, i) => room.join('p' + i, n));
    room.start({ villager: 2, wolf: 1 }, noShuffle);
    expect(room.join('pX', 'X').ok).toBe(false);
  });

  it('chat: kênh Sói chỉ tới Sói; kênh chung ban đêm bị chặn', () => {
    const { room, inbox } = setup();
    ['A', 'B', 'C', 'D', 'E'].forEach((n, i) => room.join('p' + i, n));
    room.start({ villager: 2, wolf: 1, seer: 1, witch: 1 }, noShuffle); // p2 = Sói
    room.handleChat('p2', 'wolf', 'ping bầy sói');
    expect(last(inbox.p2, 'chatMsg')?.text).toBe('ping bầy sói');    // Sói nhận
    expect(last(inbox.p0, 'chatMsg')).toBeFalsy();                    // Dân KHÔNG nhận
    expect(last(inbox.p3, 'chatMsg')).toBeFalsy();                    // Tiên Tri KHÔNG nhận
    room.handleChat('p0', 'main', 'hello');                           // main ban đêm: chặn
    expect(last(inbox.p1, 'chatMsg')).toBeFalsy();
  });

  it('reconnect: resume gửi lại yourRole + state', () => {
    const { room, inbox } = setup();
    ['A', 'B', 'C', 'D', 'E'].forEach((n, i) => room.join('p' + i, n));
    room.start({ villager: 2, wolf: 1, seer: 1, witch: 1 }, noShuffle);
    inbox.p2.length = 0;                                              // giả lập rớt mạng: xóa hộp thư
    room.resume('p2');
    expect(last(inbox.p2, 'yourRole').role.id).toBe('wolf');
    expect(last(inbox.p2, 'state')).toBeTruthy();
  });

  it('đêm song song: đợt A nhận hành động thứ tự bất kỳ; Phù Thủy chạy sau & biết nạn nhân', () => {
    const { room, inbox } = setup();
    // p0 villager, p1 wolf, p2 seer, p3 witch, p4 bodyguard
    ['N0', 'N1', 'N2', 'N3', 'N4'].forEach((n, i) => room.join('p' + i, n));
    room.start({ villager: 1, wolf: 1, seer: 1, witch: 1, bodyguard: 1 }, noShuffle);
    room.handleAction('p2', { targets: ['p1'] });   // seer nộp TRƯỚC sói (song song)
    expect(last(inbox.p2, 'privateResult').text).toContain('LÀ MA SÓI');
    room.handleAction('p4', { skip: true });        // bảo vệ bỏ
    room.handleAction('p1', { targets: ['p0'] });   // sói cắn p0 → xong đợt A → sang Phù Thủy
    const wp = last(inbox.p3, 'prompt');
    expect(wp.mode).toBe('witch');
    expect(wp.victims).toContain('N0');             // Phù Thủy ĐƯỢC biết nạn nhân
    room.handleAction('p3', { heal: 'p0' });        // cứu đúng nạn nhân
    expect(room.state.players[0].alive).toBe(true);
  });
});
