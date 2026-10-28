/* Authoritative online game: lobby seats, the order roll, turns, forfeits and timers.
   Every function mutates a plain room object that is stored as JSON in Redis. */
import { randomInt } from 'node:crypto';
import '../lib/rules.js';

const R = globalThis.CorhavenRules;
const { GOAL, BONUS } = R;

export const TURN_MS = 20000;
export const AWAY_MS = 60000;
export const MAX_SEATS = 4;
const MAX_EVENTS = 40;
const NAME_MAX = 16;
const CODE_CHARS = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
const CODE_LEN = 5;

const die = () => 1 + randomInt(6);
const token = (n) => Array.from({ length: n }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

export const newCode = () => token(CODE_LEN);
export const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);

/* Time the page needs to animate each event, so a player's 20 seconds start after the board settles. */
function eventMs(e) {
  switch (e.type) {
    case 'orderTurn': case 'turn': return 300;
    case 'orderRoll': return 2400;
    case 'orderTie': return 1500;
    case 'order': return 2600;
    case 'roll': return 1700;
    case 'thirdDouble': return 2300;
    case 'noMove': return 1300;
    case 'forfeit': return 900;
    case 'world': {
      const intro = { flood: 5500, ash: 4200, wild: 3600, mist: 7000, sun: 4200, ways: 2000 };
      return 1750 + (intro[e.id] || 2000);
    }
    case 'move': {
      if (e.fromAt != null && !e.exit) return 500 + 480 + (e.captures.length ? 750 : 0) + (e.goal ? 300 : 0);
      const span = e.exit ? 0 : Math.max(0, (e.shift ? e.land : e.to) - e.from);
      return 500 + (e.exit ? 440 : span * (span > 8 ? 95 : 165)) + (e.shift ? 700 : 0) + (e.captures.length ? 750 : 0) + (e.goal ? 300 : 0);
    }
    default: return 0;
  }
}

export function newRoom(code, now) {
  return { code, v: 0, created: now, status: 'lobby', hostId: null, seats: [], seq: 0, events: [], game: null, closed: null };
}

export const seatOf = (room, id) => room.seats.find((s) => s.id === id) || null;
const seatOfH = (room, h) => room.seats.find((s) => s.h === h) || null;
const nameOfH = (room, h) => (seatOfH(room, h) || {}).name || 'A kingdom';

function emit(room, e) {
  room.seq++;
  room.events.push({ seq: room.seq, ...e });
  if (room.events.length > MAX_EVENTS) room.events.splice(0, room.events.length - MAX_EVENTS);
}

/* Runs a step of play, then restarts the turn clock if the step moved the game forward. */
function step(room, now, fn) {
  const from = room.seq;
  const result = fn();
  const fresh = room.events.filter((e) => e.seq > from);
  const g = room.game;
  if (g && room.status === 'playing' && fresh.some((e) => e.type !== 'forfeit')) {
    g.deadline = now + fresh.reduce((t, e) => t + eventMs(e), 0) + TURN_MS;
  }
  return result;
}

/* ---------------- Lobby ---------------- */

export function addSeat(room, id) {
  if (seatOf(room, id)) return null;
  if (room.status !== 'lobby') return 'started';
  if (room.seats.length >= MAX_SEATS) return 'full';
  room.seats.push({ id, pid: token(8), name: null, h: null, away: false, awaySince: null, out: false, connId: null });
  if (!room.hostId) room.hostId = id;
  return null;
}

export function setName(room, id, raw) {
  const seat = seatOf(room, id);
  if (!seat || room.status !== 'lobby') return 'nope';
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!name) return 'name-empty';
  if (room.seats.some((s) => s !== seat && s.name && s.name.toLowerCase() === name.toLowerCase())) return 'name-taken';
  seat.name = name;
  return null;
}

export function pickKingdom(room, id, h) {
  const seat = seatOf(room, id);
  if (!seat || room.status !== 'lobby' || !seat.name) return 'nope';
  if (!Number.isInteger(h) || h < 0 || h > 3) return 'nope';
  const holder = seatOfH(room, h);
  if (holder && holder !== seat) return 'kingdom-taken';
  seat.h = h;
  return null;
}

function removeSeat(room, seat) {
  room.seats = room.seats.filter((s) => s !== seat);
  if (seat.id === room.hostId) {
    room.status = 'closed';
    room.closed = 'host-left';
  }
}

export function start(room, id, now) {
  if (room.status !== 'lobby') return 'started';
  if (id !== room.hostId) return 'not-host';
  const ready = room.seats.filter((s) => s.name && s.h !== null);
  if (ready.length < 2) return 'need-two';
  if (ready.length !== room.seats.length) return 'not-ready';
  const players = ready.slice().sort((a, b) => a.h - b.h).map((s) => ({ h: s.h, orderRoll: 0 }));
  room.status = 'playing';
  room.game = {
    players,
    pieces: players.flatMap(({ h }) => [0, 1, 2, 3].map((idx) => ({ h, idx, p: -1 }))),
    phase: 'orderRoll',
    cur: 0,
    pending: [],
    dbl: false,
    doubles: 0,
    ordering: true,
    ranking: [players.map((_, i) => i)],
    queue: [],
    deadline: null,
    winner: null,
    winReason: null,
    world: null,
    worldBag: [],
    diceStats: { turns: 0, noMoves: 0, assisted: 0, started: now },
  };
  step(room, now, () => beginOrderGroup(room));
  return null;
}

/* ---------------- Order roll ---------------- */

const isOut = (room, h) => { const s = seatOfH(room, h); return !s || s.out; };
const curH = (room) => room.game.players[room.game.cur].h;

function beginOrderGroup(room) {
  const g = room.game;
  const group = g.ranking.find(Array.isArray);
  if (!group) return finishOrder(room);
  group.forEach((i) => { g.players[i].orderRoll = 0; });
  g.queue = group.slice();
  g.cur = g.queue[0];
  g.phase = 'orderRoll';
  emit(room, { type: 'orderTurn', h: curH(room) });
}

function orderRoll(room, auto) {
  const g = room.game;
  const vals = [die(), die()];
  const pl = g.players[g.cur];
  pl.orderRoll = vals[0] + vals[1];
  emit(room, { type: 'orderRoll', h: pl.h, vals, total: pl.orderRoll, auto: !!auto });
  g.queue.shift();
  if (g.queue.length) {
    g.cur = g.queue[0];
    emit(room, { type: 'orderTurn', h: curH(room) });
  } else resolveGroup(room);
}

function resolveGroup(room) {
  const g = room.game;
  const gi = g.ranking.findIndex(Array.isArray);
  const entries = g.ranking[gi].map((i) => ({ id: i, total: g.players[i].orderRoll }));
  const parts = [];
  R.orderGroups(entries).forEach((grp) => {
    const ids = grp.map((e) => e.id);
    if (ids.length > 1) {
      parts.push(ids);
      emit(room, { type: 'orderTie', hs: ids.map((i) => g.players[i].h), total: grp[0].total });
    } else parts.push(ids[0]);
  });
  g.ranking.splice(gi, 1, ...parts);
  beginOrderGroup(room);
}

function finishOrder(room) {
  const g = room.game;
  const ranked = g.ranking.map((i) => g.players[i]);
  const left = g.players.filter((p) => !ranked.includes(p));
  g.players = ranked.concat(left);
  g.ordering = false;
  g.ranking = [];
  g.queue = [];
  g.cur = 0;
  emit(room, { type: 'order', hs: ranked.map((p) => p.h) });
  beginTurn(room, false);
}

/* ---------------- Turns ---------------- */

function beginTurn(room, again) {
  const g = room.game;
  if (!again) g.doubles = 0;
  g.phase = 'roll';
  g.pending = [];
  emit(room, { type: 'turn', h: curH(room), again: !!again });
}

/* Deals every world event once, then shuffles again. A fresh bag does not open on the event that just ended. */
export function takeWorld(game, rng = (n) => randomInt(n)) {
  const ids = Object.keys(R.WORLD);
  if (!Array.isArray(game.worldBag) || !game.worldBag.length) {
    const bag = ids.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = rng(i + 1);
      const t = bag[i];
      bag[i] = bag[j];
      bag[j] = t;
    }
    const last = bag.length - 1;
    if (game.world && bag[last] === game.world && last > 0) {
      const j = rng(last);
      const t = bag[last];
      bag[last] = bag[j];
      bag[j] = t;
    }
    game.worldBag = bag;
  }
  game.world = game.worldBag.pop();
  return game.world;
}

function openWorld(room) {
  const id = takeWorld(room.game);
  emit(room, { type: 'world', id });
}

function nextTurn(room) {
  const g = room.game;
  g.dbl = false;
  g.pending = [];
  const from = g.cur;
  let to = from;
  for (let k = 1; k <= g.players.length; k++) {
    const i = (g.cur + k) % g.players.length;
    if (!isOut(room, g.players[i].h)) { to = i; break; }
  }
  g.cur = to;
  /* A round is one turn each. Wrapping back, or staying on the only kingdom left, is when the March turns. */
  if (to <= from) openWorld(room);
  beginTurn(room, false);
}

function roll(room, auto) {
  const g = room.game;
  if (g.phase === 'orderRoll') return orderRoll(room, auto);
  const h = curH(room);
  const pl = g.players[g.cur];
  const plan = R.adaptRoll(g.pieces, h, g.world, pl, g.players, () => randomInt(0x100000000) / 0x100000000, g.adapt);
  const [a, b] = plan.vals || [die(), die()];
  if (!g.diceStats) g.diceStats = { turns: 0, noMoves: 0, assisted: 0, started: 0 };
  g.diceStats.turns++;
  if (plan.assisted) g.diceStats.assisted++;
  R.noteFinish(g.pieces, h, g.world, pl, a, b);
  g.dbl = a === b;
  if (g.dbl) g.doubles++;
  if (g.dbl && g.doubles === 3) {
    const lost = g.pieces.filter((pc) => pc.h === h && pc.p >= 0 && pc.p < GOAL).sort((x, y) => y.p - x.p)[0];
    emit(room, { type: 'thirdDouble', h, vals: [a, b], idx: lost ? lost.idx : null, from: lost ? lost.p : null, auto: !!auto });
    if (lost) { lost.p = -1; delete lost.at; }
    return nextTurn(room);
  }
  g.pending = [{ v: a }, { v: b }];
  emit(room, { type: 'roll', h, vals: [a, b], dbl: g.dbl, auto: !!auto });
  continueTurn(room);
}

function continueTurn(room) {
  const g = room.game;
  const h = curH(room);
  const opts = R.options(g.pieces, h, g.pending, g.world);
  if (!opts.length) {
    const left = g.pending.filter((d) => !d.used);
    const usedDie = g.pending.some((d) => d.used && !d.bonus);
    R.noteDry(g.players[g.cur], usedDie);
    if (!usedDie && left.some((d) => !d.bonus)) {
      if (!g.diceStats) g.diceStats = { turns: 0, noMoves: 0, assisted: 0, started: 0 };
      g.diceStats.noMoves++;
    }
    if (left.length) emit(room, { type: 'noMove', h, vals: [...new Set(left.map((d) => d.v))], bonusOnly: left.length === 1 && !!left[0].bonus });
    return endTurn(room);
  }
  if (g.dbl) {
    const open = R.phalanxDouble(g.pieces, h, g.pending, g.world);
    if (open) return applyMove(room, open, false);
  }
  const uniq = new Set(opts.map((o) => g.pending[o.di].v + ':' + o.pc.p));
  if (uniq.size === 1) return applyMove(room, opts[0], false);
  g.phase = 'choose';
}

function endTurn(room) {
  const g = room.game;
  g.pending = [];
  if (g.dbl) beginTurn(room, true);
  else nextTurn(room);
}

function applyMove(room, opt, auto) {
  const g = room.game;
  const { pc, di, r } = opt;
  const d = g.pending[di];
  d.used = true;
  if (!d.bonus) R.noteDry(g.players.find((p) => p.h === pc.h), true);
  const from = pc.p;
  const fromAt = pc.at != null ? pc.at : null;
  pc.p = r.np;
  if (r.at != null) pc.at = r.at;
  else delete pc.at;
  const captures = r.captures.map((o) => ({ h: o.h, idx: o.idx, from: o.p }));
  r.captures.forEach((o) => { o.p = -1; delete o.at; g.pending.push({ v: BONUS, bonus: true }); });
  const goal = pc.p === GOAL;
  if (goal) { R.noteVault(g.players.find((p) => p.h === pc.h)); g.pending.push({ v: BONUS, bonus: true }); }
  emit(room, { type: 'move', h: pc.h, idx: pc.idx, di, from, fromAt, to: pc.p, at: r.at != null ? r.at : null, exit: !!r.exit, captures, goal, auto: !!auto, shift: !!r.shift, land: r.shift ? r.land : null });
  if (g.pieces.filter((x) => x.h === pc.h).every((x) => x.p === GOAL)) return win(room, pc.h, 'vault');
  continueTurn(room);
}

function win(room, h, reason) {
  const g = room.game;
  room.status = 'over';
  g.phase = 'over';
  g.pending = [];
  g.deadline = null;
  g.winner = h;
  g.winReason = reason;
  emit(room, { type: 'win', h, reason, diceStats: g.diceStats ? R.diceReport(g.diceStats) : null });
}

/* ---------------- Player actions ---------------- */

export function playRoll(room, id, now) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out) return 'nope';
  if (curH(room) !== seat.h || (g.phase !== 'roll' && g.phase !== 'orderRoll')) return 'not-your-turn';
  step(room, now, () => roll(room, false));
  return null;
}

export function playMove(room, id, idx, di, now) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out) return 'nope';
  if (curH(room) !== seat.h || g.phase !== 'choose') return 'not-your-turn';
  const opt = R.options(g.pieces, seat.h, g.pending, g.world).find((o) => o.pc.idx === idx && o.di === di);
  if (!opt) return 'illegal';
  step(room, now, () => applyMove(room, opt, false));
  return null;
}

export function setAway(room, id, away, now, connId) {
  const seat = seatOf(room, id);
  if (!seat || seat.out) return false;
  if (connId !== undefined && seat.connId !== connId) return false;
  if (away === seat.away) return false;
  seat.away = away;
  seat.awaySince = away ? now : null;
  return true;
}

export function leave(room, id, now) {
  const seat = seatOf(room, id);
  if (!seat) return false;
  if (room.status === 'lobby') { removeSeat(room, seat); return true; }
  if (room.status === 'playing') { if (seat.out) return false; forfeit(room, seat, 'left', now); return true; }
  return false;
}

function forfeit(room, seat, reason, now) {
  const g = room.game;
  seat.out = true;
  seat.away = false;
  seat.awaySince = null;
  const h = seat.h;
  const wasTurn = curH(room) === h;
  g.pieces = g.pieces.filter((pc) => pc.h !== h);
  step(room, now, () => {
    emit(room, { type: 'forfeit', h, name: seat.name, reason });
    const remaining = g.players.filter((p) => !isOut(room, p.h));
    if (remaining.length <= 1) {
      if (remaining.length) return win(room, remaining[0].h, 'forfeit');
      room.status = 'closed';
      room.closed = 'empty';
      return;
    }
    if (g.ordering) return dropFromOrder(room, h, wasTurn);
    if (wasTurn) nextTurn(room);
  });
}

/* The group being rolled is always the first unresolved group in the ranking. */
function dropFromOrder(room, h, wasTurn) {
  const g = room.game;
  const i = g.players.findIndex((p) => p.h === h);
  const rolling = (g.ranking.find(Array.isArray) || []).filter((x) => x !== i);
  g.ranking = g.ranking
    .map((e) => (Array.isArray(e) ? e.filter((x) => x !== i) : e))
    .filter((e) => (Array.isArray(e) ? e.length : e !== i))
    .map((e) => (Array.isArray(e) && e.length === 1 ? e[0] : e));
  g.queue = g.queue.filter((x) => x !== i);
  if (rolling.length < 2) return beginOrderGroup(room);
  if (!g.queue.length) return resolveGroup(room);
  if (wasTurn) {
    g.cur = g.queue[0];
    emit(room, { type: 'orderTurn', h: curH(room) });
  }
}

/* ---------------- Clock ---------------- */

/* Applies everything that is due: away players who ran out of time, then expired turn clocks. */
export function tick(room, now) {
  let changed = false;
  for (const seat of room.seats.slice()) {
    if (!seat.away || seat.out || now - seat.awaySince < AWAY_MS) continue;
    if (room.status === 'lobby') { removeSeat(room, seat); changed = true; }
    else if (room.status === 'playing') { forfeit(room, seat, 'away', now); changed = true; }
  }
  for (let guard = 0; guard < 100; guard++) {
    const g = room.game;
    if (room.status !== 'playing' || !g || !g.deadline || now < g.deadline) break;
    if (g.phase === 'roll' || g.phase === 'orderRoll') step(room, now, () => roll(room, true));
    else if (g.phase === 'choose') {
      const opt = R.bestOption(g.pieces, R.options(g.pieces, curH(room), g.pending, g.world));
      step(room, now, () => (opt ? applyMove(room, opt, true) : continueTurn(room)));
    } else g.deadline = null;
    changed = true;
  }
  return changed;
}

/* The next time the room needs attention when nobody acts. */
export function nextDue(room) {
  let due = Infinity;
  if (room.status === 'playing' && room.game && room.game.deadline) due = room.game.deadline;
  if (room.status === 'lobby' || room.status === 'playing') {
    room.seats.forEach((s) => { if (s.away && !s.out) due = Math.min(due, s.awaySince + AWAY_MS); });
  }
  return due;
}

/* What every player may see. Seat ids act as passwords, so only the public pid leaves the server. */
export function publicView(room) {
  const host = seatOf(room, room.hostId);
  return {
    code: room.code,
    v: room.v,
    status: room.status,
    closed: room.closed,
    hostPid: host ? host.pid : null,
    seats: room.seats.map(({ pid, name, h, away, awaySince, out }) => ({ pid, name, h, away, awaySince, out })),
    seq: room.seq,
    events: room.events,
    game: room.game && {
      players: room.game.players.map(({ dry, finishMiss, ...rest }) => rest),
      pieces: room.game.pieces,
      phase: room.game.phase,
      cur: room.game.cur,
      pending: room.game.pending,
      dbl: room.game.dbl,
      ordering: room.game.ordering,
      deadline: room.game.deadline,
      winner: room.game.winner,
      winReason: room.game.winReason,
      world: room.game.world,
      diceStats: room.game.diceStats ? R.diceReport(room.game.diceStats) : null,
    },
  };
}
