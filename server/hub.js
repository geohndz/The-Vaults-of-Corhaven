/* WebSocket side of the online rooms. Any instance may hold any player's socket: the room lives in the
   store, every change is published, and each instance forwards it to the sockets it holds. */
import { randomUUID } from 'node:crypto';
import { getStore } from './store.js';
import * as G from './game.js';

const ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
const local = new Map(); // room code -> { conns:Set, timer, unsub }

const send = (conn, msg) => { if (conn.ws.readyState === 1) conn.ws.send(JSON.stringify(msg)); };

function schedule(code, view) {
  const entry = local.get(code);
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.timer = null;
  const due = view.due;
  if (!Number.isFinite(due)) return;
  entry.timer = setTimeout(() => {
    mutate(code, () => false).catch(() => {});
  }, Math.max(0, due - Date.now()) + 60);
}

async function watch(conn, code) {
  if (conn.code === code) return;
  if (conn.code) await unwatch(conn);
  conn.code = code;
  let entry = local.get(code);
  if (!entry) {
    entry = { conns: new Set(), timer: null, unsub: null };
    local.set(code, entry);
    const store = await getStore();
    entry.unsub = await store.subscribe(code, (view) => {
      const e = local.get(code);
      if (!e) return;
      e.conns.forEach((c) => send(c, { t: 'state', room: view, now: Date.now() }));
      schedule(code, view);
    });
  }
  entry.conns.add(conn);
}

async function unwatch(conn) {
  const code = conn.code;
  conn.code = null;
  const entry = local.get(code);
  if (!entry) return;
  entry.conns.delete(conn);
  if (entry.conns.size) return;
  local.delete(code);
  clearTimeout(entry.timer);
  if (entry.unsub) await entry.unsub();
}

/* Runs fn on the room under its lock. fn returns an error code, true when it changed the room, or false. */
async function mutate(code, fn) {
  const store = await getStore();
  const release = await store.lock(code);
  try {
    const room = await store.get(code);
    if (!room) return 'gone';
    const now = Date.now();
    const ticked = G.tick(room, now);
    const result = fn(room, now);
    const error = typeof result === 'string' ? result : null;
    if (!ticked && result !== true) return error;
    room.v++;
    await store.set(room);
    await store.publish(code, { ...G.publicView(room), due: G.nextDue(room) });
    return error;
  } finally {
    release();
  }
}

async function createRoom(id) {
  const store = await getStore();
  for (let i = 0; i < 20; i++) {
    const code = G.newCode();
    if (await store.exists(code)) continue;
    const release = await store.lock(code);
    try {
      if (await store.exists(code)) continue;
      const room = G.newRoom(code, Date.now());
      G.addSeat(room, id);
      await store.set(room);
      return code;
    } finally {
      release();
    }
  }
  throw new Error('no free code');
}

async function enter(conn, id, code) {
  conn.id = id;
  let pid = null;
  const err = await mutate(code, (room) => {
    const known = G.seatOf(room, id);
    if (!known) {
      if (room.status === 'closed') return 'gone';
      const e = G.addSeat(room, id);
      if (e) return e;
    } else if (known.out) return 'forfeited';
    const seat = G.seatOf(room, id);
    pid = seat.pid;
    seat.connId = conn.connId;
    seat.away = false;
    seat.awaySince = null;
    return true;
  });
  if (err) return send(conn, { t: 'error', code: err, during: 'join' });
  await watch(conn, code);
  send(conn, { t: 'joined', code, pid });
  const store = await getStore();
  const room = await store.get(code);
  if (!room) return;
  const view = { ...G.publicView(room), due: G.nextDue(room) };
  send(conn, { t: 'state', room: view, now: Date.now() });
  schedule(code, view);
}

async function handle(conn, msg) {
  const t = msg && msg.t;
  if (t === 'ping') return send(conn, { t: 'pong', now: Date.now() });
  if (t === 'create' || t === 'join') {
    if (!ID_RE.test(msg.id || '')) return send(conn, { t: 'error', code: 'bad-id', during: t });
    if (t === 'create') {
      const code = await createRoom(msg.id);
      return enter(conn, msg.id, code);
    }
    const code = G.normalizeCode(msg.code);
    if (code.length !== 5) return send(conn, { t: 'error', code: 'gone', during: 'join' });
    return enter(conn, msg.id, code);
  }
  if (!conn.code || !conn.id) return send(conn, { t: 'error', code: 'not-in-room' });
  const id = conn.id;
  let err = null;
  switch (t) {
    case 'name': err = await mutate(conn.code, (room) => G.setName(room, id, msg.name) || true); break;
    case 'pick': err = await mutate(conn.code, (room) => G.pickKingdom(room, id, msg.h) || true); break;
    case 'start': err = await mutate(conn.code, (room, now) => G.start(room, id, now) || true); break;
    case 'roll': err = await mutate(conn.code, (room, now) => G.playRoll(room, id, now) || true); break;
    case 'move': err = await mutate(conn.code, (room, now) => G.playMove(room, id, msg.idx, msg.di, now) || true); break;
    case 'away': err = await mutate(conn.code, (room, now) => G.setAway(room, id, true, now)); break;
    case 'back': err = await mutate(conn.code, (room, now) => G.setAway(room, id, false, now)); break;
    case 'leave': {
      const code = conn.code;
      conn.left = true;
      await unwatch(conn);
      await mutate(code, (room, now) => G.leave(room, id, now));
      send(conn, { t: 'left' });
      return;
    }
    default: return;
  }
  if (err) send(conn, { t: 'error', code: err, during: t });
}

export function attach(wss) {
  wss.on('connection', (ws) => {
    const conn = { ws, connId: randomUUID(), id: null, code: null, left: false };
    let chain = Promise.resolve();
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(String(data)); } catch { return; }
      chain = chain.then(() => handle(conn, msg)).catch((e) => {
        console.error('room message failed', e);
        send(conn, { t: 'error', code: 'server' });
      });
    });
    const alive = setInterval(() => { if (ws.readyState === 1) ws.ping(); }, 25000);
    ws.on('close', () => {
      clearInterval(alive);
      chain = chain.then(async () => {
        const code = conn.code;
        if (!code) return;
        await unwatch(conn);
        if (!conn.left && conn.id) await mutate(code, (room, now) => G.setAway(room, conn.id, true, now, conn.connId));
      }).catch((e) => console.error('room close failed', e));
    });
  });
}
