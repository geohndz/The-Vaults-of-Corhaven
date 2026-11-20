/* Authoritative online game: lobby seats, the order roll, turns, forfeits and timers.
   Every function mutates a plain room object that is stored as JSON in Redis. */
import { randomInt } from 'node:crypto';
import '../lib/rules.js';
import { recordFromRoom } from './metrics.js';

function noteMatch(room, outcome) {
  if (process.env.NODE_TEST_CONTEXT) return;
  recordFromRoom(room, outcome).catch(() => {});
}

const R = globalThis.CorhavenRules;
const { GOAL, BONUS } = R;

export const TURN_MS = 20000;
export const AWAY_MS = 60000;
export const MAX_SEATS = 4;
/* Every device waits out this cue, then starts the theme from the same server instant. */
export const MATCH_CUE_MS = 3400;
export const MATCH_LIMIT_MS = 60 * 60 * 1000;
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
    case 'orderTurn': return 2200;
    case 'turn': return 300;
    case 'orderRoll': return 4500;
    case 'orderTie': return 3000;
    case 'order': return 4500;
    case 'roll': return 1700;
    case 'thirdDouble': return 4000;
    case 'noMove': return 2800;
    case 'forfeit': return 900;
    case 'world': return e.change ? (e.id ? 7000 : 2600) : 0;
    case 'fate': return 7000;
    case 'fateKept': return (e.decree ? 2400 : 1600) + (e.wander ? 1200 : 0);
    case 'decree': return 900;
    case 'reroll': return 1700;
    case 'finish': return 2600;
    case 'move': {
      const span = R.walkSpan({ h: e.h, p: e.from, at: e.fromAt }, { np: e.to, at: e.at, shift: e.shift, land: e.land, exit: e.exit });
      return 500 + (e.exit ? 440 : span * (span > 8 ? 95 : 165)) + (e.shift ? 700 : 0) + (e.captures.length ? 750 : 0) + (e.goal ? 300 : 0);
    }
    default: return 0;
  }
}

const KNOWN_MODES = new Set(['normal', 'gauntlet']);

export function modeLabel(room) {
  if (room && room.mode === 'gauntlet') return 'Gauntlet';
  if (room && room.ranked) return 'Gauntlet';
  return 'Normal';
}

function applyMode(room, mode) {
  if (!KNOWN_MODES.has(mode)) return;
  room.mode = mode;
  if (mode === 'gauntlet') {
    room.worlds = true;
    room.ranked = true;
  } else {
    room.worlds = true;
    room.ranked = false;
  }
}

export function newRoom(code, now) {
  return { code, v: 0, created: now, status: 'lobby', hostId: null, seats: [], seq: 0, events: [], game: null, closed: null, private: false, worlds: true, ranked: false, mode: 'normal' };
}

export const isJoinable = (room) => room && room.status === 'lobby' && room.seats.length > 0 && room.seats.length < MAX_SEATS;
export const isListed = (room) => isJoinable(room) && !room.private;
export function lobbyCard(room) {
  const mode = room.mode || (room.ranked ? 'gauntlet' : 'normal');
  return {
    code: room.code,
    taken: room.seats.length,
    open: MAX_SEATS - room.seats.length,
    names: room.seats.map((s) => s.name).filter(Boolean),
    kingdoms: room.seats.map((s) => s.h).filter((h) => h != null),
    mode,
    modeLabel: modeLabel(room),
    ranked: !!room.ranked,
    worlds: room.worlds !== false,
  };
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

export function setOpts(room, id, msg) {
  if (room.status !== 'lobby') return 'started';
  if (id !== room.hostId) return 'not-host';
  if (typeof msg.private === 'boolean') room.private = msg.private;
  if (typeof msg.mode === 'string') applyMode(room, msg.mode);
  else {
    if (typeof msg.worlds === 'boolean') room.worlds = msg.worlds;
    if (typeof msg.ranked === 'boolean') room.ranked = msg.ranked;
    if (typeof msg.ranked === 'boolean' || typeof msg.worlds === 'boolean') {
      room.mode = room.ranked ? 'gauntlet' : 'normal';
    }
  }
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
    worlds: room.worlds !== false,
    fate: { hands: R.emptyHands(), seq: 0, turns: [0, 0, 0, 0], offer: null },
    canReroll: false,
    ranked: !!room.ranked,
    places: [],
    diceStats: { turns: 0, noMoves: 0, assisted: 0, started: now, doubles: 0, greed: 0, rounds: 0, playerTurns: 0, worldPicks: {} },
    themeAt: now + MATCH_CUE_MS,
  };
  step(room, now, () => beginOrderGroup(room));
  noteMatch(room, 'playing');
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

function diceStatsOf(g) {
  if (!g.diceStats) g.diceStats = { turns: 0, noMoves: 0, assisted: 0, started: 0, doubles: 0, greed: 0, rounds: 0, playerTurns: 0, worldPicks: {} };
  if (!g.diceStats.worldPicks) g.diceStats.worldPicks = {};
  return g.diceStats;
}

function fateState(g) {
  if (!g.fate) g.fate = { hands: R.emptyHands(), seq: 0, turns: [0, 0, 0, 0], offer: null };
  return g.fate;
}
const handsOf = (g) => fateState(g).hands;

function beginTurn(room, again) {
  const g = room.game;
  const h = curH(room);
  let burn = g.fateBurn || [];
  g.fateBurn = null;
  if (!again) {
    g.doubles = 0;
    diceStatsOf(g).playerTurns = (diceStatsOf(g).playerTurns || 0) + 1;
    const fate = fateState(g);
    fate.turns[h] = (fate.turns[h] || 0) + 1;
    const tick = R.fateTick(fate.hands, { turn: { h, count: fate.turns[h] } });
    fate.hands = tick.hands;
    burn = burn.concat(tick.spent);
  }
  g.canReroll = false;
  g.phase = 'roll';
  g.pending = [];
  emit(room, { type: 'turn', h, again: !!again, burn });
}

/* Every round is announced so each seat can count it. change is true only when the mist arrives or lifts. */
function turnWorld(room, rounds) {
  const g = room.game;
  const id = R.worldAfter(rounds);
  const prev = g.world || null;
  const change = id !== prev;
  g.world = id;
  if (change && id) {
    const d = diceStatsOf(g);
    d.worldPicks[id] = (d.worldPicks[id] || 0) + 1;
  }
  let burn = [];
  if (change && (id === 'mist') !== (prev === 'mist')) {
    const tick = R.fateTick(handsOf(g), { mist: id === 'mist' });
    fateState(g).hands = tick.hands;
    burn = tick.spent;
  }
  emit(room, { type: 'world', id, change, burn });
}

const isHome = (g, h) => Array.isArray(g.places) && g.places.includes(h);
/* Kingdoms still on the road: not forfeited, and not already placed in a ranked match. */
const racers = (room) => room.game.players.filter((p) => !isOut(room, p.h) && !isHome(room.game, p.h));

function nextTurn(room) {
  const g = room.game;
  g.dbl = false;
  g.pending = [];
  const from = g.cur;
  let to = from;
  for (let k = 1; k <= g.players.length; k++) {
    const i = (g.cur + k) % g.players.length;
    if (!isOut(room, g.players[i].h) && !isHome(g, g.players[i].h)) { to = i; break; }
  }
  g.cur = to;
  /* A round is one turn each. Wrapping back, or staying on the only kingdom left, ends it. */
  if (to <= from) {
    diceStatsOf(g).rounds = (diceStatsOf(g).rounds || 0) + 1;
    const tick = R.fateTick(handsOf(g), { round: diceStatsOf(g).rounds });
    fateState(g).hands = tick.hands;
    if (g.worlds !== false) {
      turnWorld(room, diceStatsOf(g).rounds);
      const ev = room.events[room.events.length - 1];
      if (ev && ev.type === 'world') ev.burn = tick.spent.concat(ev.burn || []);
    } else g.fateBurn = tick.spent;
  }
  g.cur = to;
  beginTurn(room, false);
}

/* Ranked play: a kingdom with every troop home takes the next place, and the rest march on until one is left. */
function placeKingdom(room, h) {
  const g = room.game;
  g.places.push(h);
  emit(room, { type: 'finish', h, place: g.places.length });
  const left = racers(room);
  if (left.length <= 1) {
    left.forEach((p) => g.places.push(p.h));
    return win(room, g.places[0], 'vault');
  }
  nextTurn(room);
}

function roll(room, auto) {
  const g = room.game;
  if (g.phase === 'orderRoll') return orderRoll(room, auto);
  const h = curH(room);
  const pl = g.players[g.cur];
  const plan = R.adaptRoll(g.pieces, h, g.world, pl, g.players, () => randomInt(0x100000000) / 0x100000000, g.adapt, handsOf(g));
  const [a, b] = plan.vals || [die(), die()];
  const d = diceStatsOf(g);
  d.turns++;
  if (plan.assisted) d.assisted++;
  R.noteFinish(g.pieces, h, g.world, pl, a, b, handsOf(g));
  g.dbl = a === b;
  if (g.dbl) {
    g.doubles++;
    d.doubles = (d.doubles || 0) + 1;
  }
  if (g.dbl && g.doubles === 3) {
    d.greed = (d.greed || 0) + 1;
    const lost = g.pieces.filter((pc) => pc.h === h && pc.p >= 0 && pc.p < GOAL).sort((x, y) => y.p - x.p)[0];
    emit(room, { type: 'thirdDouble', h, vals: [a, b], idx: lost ? lost.idx : null, from: lost ? lost.p : null, auto: !!auto });
    if (lost) { lost.p = -1; delete lost.at; }
    return nextTurn(room);
  }
  g.pending = [{ v: a }, { v: b }];
  emit(room, { type: 'roll', h, vals: [a, b], dbl: g.dbl, auto: !!auto });
  continueTurn(room);
}

function holdingChance(g, h) {
  return g.pending.length > 0 && g.pending.every((d) => !d.used) && g.pending.some((d) => !d.bonus) && R.holds(R.handOf(handsOf(g), h), 'chance');
}

function continueTurn(room) {
  const g = room.game;
  const h = curH(room);
  const opts = R.options(g.pieces, h, g.pending, g.world, handsOf(g));
  if (holdingChance(g, h)) { g.canReroll = true; g.phase = 'choose'; return; }
  g.canReroll = false;
  if (!opts.length) {
    const left = g.pending.filter((d) => !d.used);
    const usedDie = g.pending.some((d) => d.used && !d.bonus);
    R.noteDry(g.players[g.cur], usedDie);
    if (!usedDie && left.some((d) => !d.bonus)) {
      if (!g.diceStats) g.diceStats = { turns: 0, noMoves: 0, assisted: 0, started: 0 };
      g.diceStats.noMoves++;
    }
    if (left.length) emit(room, { type: 'noMove', h, vals: [...new Set(left.map((d) => d.v))], bonusOnly: left.length === 1 && !!left[0].bonus, bonus: left.length === 1 && left[0].bonus ? left[0].v : null });
    return endTurn(room);
  }
  if (g.dbl) {
    const open = R.phalanxDouble(g.pieces, h, g.pending, g.world, handsOf(g));
    if (open) return applyMove(room, open, false);
  }
  const uniq = new Set(opts.map((o) => o.v + ':' + o.pc.p));
  if (uniq.size === 1) return applyMove(room, opts[0], false);
  g.phase = 'choose';
}

function endTurn(room) {
  const g = room.game;
  g.pending = [];
  if (g.dbl) beginTurn(room, true);
  else nextTurn(room);
}

function settleFate(g, h, info) {
  const resolved = R.fateResolve(handsOf(g), h, info);
  fateState(g).hands = resolved.hands;
  return resolved;
}

function offerFate(room, pc) {
  const g = room.game;
  if (!R.landedShrine(pc)) return false;
  const fate = fateState(g);
  const offer = R.fateOffer(fate.hands[pc.h] || [], () => randomInt(0x100000000) / 0x100000000, {
    pieces: g.pieces, h: pc.h, worldId: g.world, hands: fate.hands, mistOn: g.worlds !== false,
  });
  if (!offer.length) return false;
  g.phase = 'fate';
  fate.offer = { h: pc.h, idx: pc.idx, ids: offer };
  emit(room, { type: 'fate', h: pc.h, idx: pc.idx, offer });
  return true;
}

function applyMove(room, opt, auto) {
  const g = room.game;
  const { pc, di, r } = opt;
  const d = g.pending[di];
  d.used = true;
  g.canReroll = false;
  if (!d.bonus) R.noteDry(g.players.find((p) => p.h === pc.h), true);
  const from = pc.p;
  const fromAt = pc.at != null ? pc.at : null;
  pc.p = r.np;
  if (r.at != null) pc.at = r.at;
  else delete pc.at;
  const captures = r.captures.map((o) => ({ h: o.h, idx: o.idx, from: o.p }));
  const spared = (r.spared || []).map((o) => ({ h: o.h, idx: o.idx }));
  const goal = pc.p === GOAL;
  const resolved = settleFate(g, pc.h, { favor: !!opt.favor, pilgrim: !!r.pilgrim, spared: spared.map((o) => o.h), captures: captures.length, goal });
  r.captures.forEach((o) => { o.p = -1; delete o.at; g.pending.push({ v: resolved.captureBonus, bonus: true }); });
  if (goal) { R.noteVault(g.players.find((p) => p.h === pc.h)); g.pending.push({ v: resolved.vaultBonus, bonus: true }); }
  emit(room, { type: 'move', h: pc.h, idx: pc.idx, di, from, fromAt, to: pc.p, at: r.at != null ? r.at : null, exit: !!r.exit, captures, spared, goal, auto: !!auto, shift: !!r.shift, land: r.shift ? r.land : null, spent: resolved.spent, captureBonus: captures.length ? resolved.captureBonus : null, vaultBonus: goal ? resolved.vaultBonus : null });
  if (R.allHome(g.pieces, pc.h)) return g.ranked ? placeKingdom(room, pc.h) : win(room, pc.h, 'vault');
  if (offerFate(room, pc)) return;
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
  emit(room, { type: 'win', h, reason, places: g.places && g.places.length ? g.places.slice() : null, diceStats: g.diceStats ? R.diceReport(g.diceStats) : null });
  noteMatch(room, reason === 'forfeit' ? 'forfeit' : 'vault');
}

/* ---------------- Player actions ---------------- */

/* A client retries the same act when a reply is lost. The first one plays; a repeat is a no-op. */
function actId(act) {
  const n = Number(act);
  if (!Number.isInteger(n) || n < 1 || n > 1e15) return null;
  return n;
}

function repeatedAct(seat, act) {
  const n = actId(act);
  if (n == null) return false;
  if (seat.lastAct === n || (seat.lastAct != null && n < seat.lastAct)) return true;
  return false;
}

function noteAct(seat, act) {
  const n = actId(act);
  if (n != null) seat.lastAct = n;
}

export function playRoll(room, id, now, act) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out) return 'nope';
  if (repeatedAct(seat, act)) return null;
  if (curH(room) !== seat.h || (g.phase !== 'roll' && g.phase !== 'orderRoll')) return 'not-your-turn';
  step(room, now, () => roll(room, false));
  noteAct(seat, act);
  return null;
}

export function playMove(room, id, idx, di, now, act) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out) return 'nope';
  if (repeatedAct(seat, act)) return null;
  if (curH(room) !== seat.h || g.phase !== 'choose') return 'not-your-turn';
  const opt = R.options(g.pieces, seat.h, g.pending, g.world, handsOf(g)).find((o) => o.pc.idx === idx && o.di === di);
  if (!opt) return 'illegal';
  step(room, now, () => applyMove(room, opt, false));
  noteAct(seat, act);
  return null;
}

function shrineTroop(room, h, idx) {
  const pieces = room.game.pieces;
  if (idx != null) {
    const named = pieces.find((p) => p.h === h && p.idx === idx);
    if (named && R.landedShrine(named)) return named;
  }
  return pieces.find((p) => p.h === h && R.landedShrine(p)) || null;
}

function wanderLand(room, h, idx) {
  const pc = shrineTroop(room, h, idx);
  if (!pc) return null;
  const land = R.wanderSquare(room.game.pieces, pc, () => randomInt(0x100000000) / 0x100000000);
  if (!land) return null;
  const from = pc.p;
  const fromAt = pc.at != null ? pc.at : null;
  pc.p = land.np;
  delete pc.at;
  return { idx: pc.idx, from, fromAt, to: land.np };
}

function decreeChoices(room) {
  const g = room.game;
  const h = curH(room);
  return g.pieces.filter((p) => {
    if (p.h !== h || p.p >= 0) return false;
    const r = R.moveResult(g.pieces, p, 1, g.world, handsOf(g));
    return !!(r && r.exit);
  });
}

function acceptFate(room, pick, drop, auto) {
  const g = room.game;
  const fate = fateState(g);
  const offer = fate.offer;
  if (!offer || g.phase !== 'fate') return 'not-your-turn';
  const h = offer.h;
  const result = R.fateAccept(fate.hands[h] || [], offer.ids, pick, drop || null, (id) => {
    fate.seq += 1;
    return R.fateStamp(id, fate.seq, fate.turns[h] || 0, diceStatsOf(g).rounds || 0, g.world === 'mist');
  });
  if (!result) return 'illegal';
  fate.hands[h] = result.hand;
  fate.offer = null;
  const wander = result.instant === 'wanderer' ? wanderLand(room, h, offer.idx) : null;
  const troops = result.instant === 'decree' ? decreeChoices(room) : null;
  const needsChoice = !!(troops && troops.length !== 1);
  emit(room, { type: 'fateKept', h, pick, drop: result.dropped, hand: result.hand.map((c) => c.id), decree: needsChoice, wander, auto: !!auto });
  if (needsChoice) { g.phase = 'decree'; return null; }
  if (troops && troops.length === 1) { g.phase = 'decree'; return applyDecree(room, troops[0].idx, auto); }
  continueTurn(room);
  return null;
}

function applyDecree(room, idx, auto) {
  const g = room.game;
  if (g.phase !== 'decree') return 'not-your-turn';
  const h = curH(room);
  const pc = g.pieces.find((p) => p.h === h && p.idx === idx);
  if (!pc) return 'illegal';
  const r = R.moveResult(g.pieces, pc, 1, g.world, handsOf(g));
  if (!r || !r.exit) return 'illegal';
  const from = pc.p;
  pc.p = r.np;
  delete pc.at;
  const captures = r.captures.map((o) => ({ h: o.h, idx: o.idx, from: o.p }));
  const spared = (r.spared || []).map((o) => ({ h: o.h, idx: o.idx }));
  const resolved = settleFate(g, h, { spared: spared.map((o) => o.h), captures: captures.length, goal: false });
  r.captures.forEach((o) => { o.p = -1; delete o.at; g.pending.push({ v: resolved.captureBonus, bonus: true }); });
  emit(room, { type: 'decree', h, idx, from, captures, spared, spent: resolved.spent, captureBonus: captures.length ? resolved.captureBonus : null, auto: !!auto });
  continueTurn(room);
  return null;
}

function reroll(room, auto) {
  const g = room.game;
  const h = curH(room);
  if (g.phase !== 'choose' || !g.canReroll || !R.holds(R.handOf(handsOf(g), h), 'chance')) return 'illegal';
  if (g.pending.some((d) => d.used)) return 'illegal';
  handsOf(g)[h] = (handsOf(g)[h] || []).filter((c) => c.id !== 'chance');
  g.canReroll = false;
  if (g.dbl) {
    g.doubles = Math.max(0, g.doubles - 1);
    const stats = diceStatsOf(g);
    stats.doubles = Math.max(0, (stats.doubles || 0) - 1);
  }
  const pl = g.players[g.cur];
  const plan = R.adaptRoll(g.pieces, h, g.world, pl, g.players, () => randomInt(0x100000000) / 0x100000000, g.adapt, handsOf(g));
  const [a, b] = plan.vals || [die(), die()];
  if (plan.assisted) diceStatsOf(g).assisted++;
  R.noteFinish(g.pieces, h, g.world, pl, a, b, handsOf(g));
  g.dbl = a === b;
  if (g.dbl) {
    g.doubles++;
    diceStatsOf(g).doubles = (diceStatsOf(g).doubles || 0) + 1;
  }
  emit(room, { type: 'reroll', h, vals: [a, b], dbl: g.dbl, auto: !!auto, spent: [{ h, id: 'chance' }] });
  if (g.dbl && g.doubles === 3) {
    diceStatsOf(g).greed = (diceStatsOf(g).greed || 0) + 1;
    const lost = g.pieces.filter((p) => p.h === h && p.p >= 0 && p.p < GOAL).sort((x, y) => y.p - x.p)[0];
    emit(room, { type: 'thirdDouble', h, vals: [a, b], idx: lost ? lost.idx : null, from: lost ? lost.p : null, auto: !!auto });
    if (lost) { lost.p = -1; delete lost.at; }
    nextTurn(room);
    return null;
  }
  g.pending = [{ v: a }, { v: b }];
  continueTurn(room);
  return null;
}

export function playFate(room, id, pick, drop, now, act) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out || !g) return 'nope';
  if (repeatedAct(seat, act)) return null;
  const offer = g.fate && g.fate.offer;
  if (!offer || g.phase !== 'fate' || offer.h !== seat.h) return 'not-your-turn';
  let err = null;
  step(room, now, () => { err = acceptFate(room, pick, drop, false); });
  if (!err) noteAct(seat, act);
  return err;
}

export function playDecree(room, id, idx, now, act) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out || !g) return 'nope';
  if (repeatedAct(seat, act)) return null;
  if (g.phase !== 'decree' || curH(room) !== seat.h) return 'not-your-turn';
  let err = null;
  step(room, now, () => { err = applyDecree(room, idx, false); });
  if (!err) noteAct(seat, act);
  return err;
}

export function playReroll(room, id, now, act) {
  const g = room.game;
  const seat = seatOf(room, id);
  if (room.status !== 'playing' || !seat || seat.out || !g) return 'nope';
  if (repeatedAct(seat, act)) return null;
  if (curH(room) !== seat.h) return 'not-your-turn';
  let err = null;
  step(room, now, () => { err = reroll(room, false); });
  if (!err) noteAct(seat, act);
  return err;
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
    const remaining = racers(room);
    if (remaining.length <= 1) {
      if (g.places && g.places.length) {
        remaining.forEach((p) => g.places.push(p.h));
        return win(room, g.places[0], 'vault');
      }
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

function matchStarted(room) {
  const g = room.game;
  if (!g) return room.created || 0;
  return (g.diceStats && g.diceStats.started) || g.themeAt || room.created || 0;
}

function expireMatch(room, now) {
  if (room.status !== 'playing' || !room.game) return false;
  const started = matchStarted(room);
  if (!started || now - started < MATCH_LIMIT_MS) return false;
  const g = room.game;
  room.status = 'over';
  g.phase = 'over';
  g.pending = [];
  g.deadline = null;
  g.winner = null;
  g.winReason = 'time';
  emit(room, { type: 'timeout' });
  noteMatch(room, 'abandoned');
  return true;
}

/* Applies everything that is due: away players who ran out of time, then expired turn clocks. */
export function tick(room, now) {
  if (expireMatch(room, now)) return true;
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
    else if (g.phase === 'fate') {
      const offer = fateState(g).offer;
      const choice = offer && R.bestFate(offer.ids, handsOf(g)[offer.h], g.pieces, offer.h);
      step(room, now, () => (choice ? acceptFate(room, choice.pick, choice.drop, true) : (g.deadline = null)));
    } else if (g.phase === 'decree') {
      const h = curH(room);
      const troop = g.pieces.find((p) => p.h === h && p.p < 0 && R.moveResult(g.pieces, p, 1, g.world, handsOf(g)));
      step(room, now, () => (troop ? applyDecree(room, troop.idx, true) : continueTurn(room)));
    } else if (g.phase === 'choose' && g.canReroll && !R.options(g.pieces, curH(room), g.pending, g.world, handsOf(g)).length) {
      step(room, now, () => reroll(room, true));
    } else if (g.phase === 'choose') {
      const opt = R.bestOption(g.pieces, R.options(g.pieces, curH(room), g.pending, g.world, handsOf(g)));
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
  if (room.status === 'playing' && room.game) {
    const started = matchStarted(room);
    if (started) due = Math.min(due, started + MATCH_LIMIT_MS);
  }
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
    private: !!room.private,
    worlds: room.worlds !== false,
    ranked: !!room.ranked,
    mode: room.mode || (room.ranked ? 'gauntlet' : 'normal'),
    modeLabel: modeLabel(room),
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
      worlds: room.game.worlds !== false,
      fate: room.game.fate ? { hands: room.game.fate.hands, offer: room.game.fate.offer, turns: room.game.fate.turns, seq: room.game.fate.seq } : null,
      canReroll: !!room.game.canReroll,
      ranked: !!room.game.ranked,
      places: room.game.places || [],
      themeAt: room.game.themeAt,
      diceStats: room.game.diceStats ? R.diceReport(room.game.diceStats) : null,
    },
  };
}
