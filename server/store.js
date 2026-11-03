/* Room storage. Upstash Redis over TCP when REDIS_URL (or KV_URL) is set, so every function instance
   sees the same rooms and hears every change through pub/sub. Without it, rooms live in this process,
   which is enough for local play on one machine. */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

const ROOM_TTL_S = 6 * 3600;
const CLOSED_TTL_S = 600;
const LOCK_MS = 4000;
const OPEN_MAX = 4;
const roomKey = (code) => 'corhaven:room:' + code;
const lockKey = (code) => 'corhaven:lock:' + code;
const channel = (code) => 'corhaven:ch:' + code;
const OPEN_KEY = 'corhaven:open';
const OPEN_CH = 'corhaven:ch:open';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ttlFor = (room) => (room.status === 'closed' || room.status === 'over' ? CLOSED_TTL_S : ROOM_TTL_S);
const listed = (room) => room && room.status === 'lobby' && room.seats.length > 0 && room.seats.length < OPEN_MAX;

async function redisStore(url) {
  const { default: Redis } = await import('ioredis');
  const opts = { maxRetriesPerRequest: 3, enableReadyCheck: false };
  const cmd = new Redis(url, opts);
  let sub = null;
  const handlers = new Map();
  const subscriber = () => {
    if (sub) return sub;
    sub = new Redis(url, opts);
    sub.on('message', (ch, msg) => {
      const set = handlers.get(ch);
      if (!set) return;
      let data;
      try { data = JSON.parse(msg); } catch { return; }
      set.forEach((fn) => fn(data));
    });
    return sub;
  };
  return {
    async exists(code) { return (await cmd.exists(roomKey(code))) === 1; },
    async get(code) { const s = await cmd.get(roomKey(code)); return s ? JSON.parse(s) : null; },
    async set(room) {
      await cmd.set(roomKey(room.code), JSON.stringify(room), 'EX', ttlFor(room));
      if (room.status === 'lobby') {
        if (listed(room)) await cmd.sadd(OPEN_KEY, room.code);
        else await cmd.srem(OPEN_KEY, room.code);
        await cmd.publish(OPEN_CH, '1');
      } else if (await cmd.srem(OPEN_KEY, room.code)) {
        await cmd.publish(OPEN_CH, '1');
      }
    },
    async listOpen() {
      const codes = await cmd.smembers(OPEN_KEY);
      if (!codes.length) return [];
      const raw = await cmd.mget(codes.map(roomKey));
      const rooms = [];
      const stale = [];
      raw.forEach((s, i) => {
        const room = s ? JSON.parse(s) : null;
        if (listed(room)) rooms.push(room);
        else stale.push(codes[i]);
      });
      if (stale.length) await cmd.srem(OPEN_KEY, ...stale);
      rooms.sort((a, b) => (b.created || 0) - (a.created || 0));
      return rooms;
    },
    async subscribeOpen(fn) {
      if (!handlers.has(OPEN_CH)) { handlers.set(OPEN_CH, new Set()); await subscriber().subscribe(OPEN_CH); }
      handlers.get(OPEN_CH).add(fn);
      return async () => {
        const set = handlers.get(OPEN_CH);
        if (!set) return;
        set.delete(fn);
        if (!set.size) { handlers.delete(OPEN_CH); await subscriber().unsubscribe(OPEN_CH).catch(() => {}); }
      };
    },
    async lock(code) {
      const token = randomUUID();
      for (let i = 0; i < 80; i++) {
        if ((await cmd.set(lockKey(code), token, 'PX', LOCK_MS, 'NX')) === 'OK') return () => cmd.del(lockKey(code)).catch(() => {});
        await sleep(50);
      }
      throw new Error('room busy');
    },
    async publish(code, data) { await cmd.publish(channel(code), JSON.stringify(data)); },
    async subscribe(code, fn) {
      const ch = channel(code);
      if (!handlers.has(ch)) { handlers.set(ch, new Set()); await subscriber().subscribe(ch); }
      handlers.get(ch).add(fn);
      return async () => {
        const set = handlers.get(ch);
        if (!set) return;
        set.delete(fn);
        if (!set.size) { handlers.delete(ch); await subscriber().unsubscribe(ch).catch(() => {}); }
      };
    },
  };
}

function memoryStore() {
  const rooms = new Map();
  const open = new Set();
  const locks = new Map();
  const bus = new EventEmitter();
  bus.setMaxListeners(0);
  const noteOpen = (room) => {
    const was = open.has(room.code);
    if (listed(room)) open.add(room.code);
    else open.delete(room.code);
    if (listed(room) || was) queueMicrotask(() => bus.emit(OPEN_CH, 1));
  };
  return {
    async exists(code) { return rooms.has(code); },
    async get(code) { const s = rooms.get(code); return s ? JSON.parse(s) : null; },
    async set(room) { rooms.set(room.code, JSON.stringify(room)); noteOpen(room); },
    async listOpen() {
      const list = [];
      for (const code of [...open]) {
        const s = rooms.get(code);
        const room = s ? JSON.parse(s) : null;
        if (listed(room)) list.push(room);
        else open.delete(code);
      }
      list.sort((a, b) => (b.created || 0) - (a.created || 0));
      return list;
    },
    async subscribeOpen(fn) { bus.on(OPEN_CH, fn); return async () => bus.off(OPEN_CH, fn); },
    async lock(code) {
      const prev = locks.get(code) || Promise.resolve();
      let release;
      const next = new Promise((r) => { release = r; });
      locks.set(code, prev.then(() => next));
      await prev;
      return () => release();
    },
    async publish(code, data) { const msg = JSON.stringify(data); queueMicrotask(() => bus.emit(channel(code), JSON.parse(msg))); },
    async subscribe(code, fn) { bus.on(channel(code), fn); return async () => bus.off(channel(code), fn); },
  };
}

let storePromise = null;
export function getStore() {
  if (!storePromise) {
    const url = process.env.REDIS_URL || process.env.KV_URL;
    storePromise = url ? redisStore(url) : Promise.resolve(memoryStore());
  }
  return storePromise;
}
