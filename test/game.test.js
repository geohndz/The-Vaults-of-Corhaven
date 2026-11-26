import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../server/game.js';

const R = globalThis.CorhavenRules;
const ids = ['aaaaaaaaaaaaaaaa1', 'bbbbbbbbbbbbbbbb2', 'cccccccccccccccc3', 'dddddddddddddddd4', 'eeeeeeeeeeeeeeee5'];

function lobby(n, now = 0) {
  const room = G.newRoom('ABCDE', now);
  for (let i = 0; i < n; i++) {
    assert.equal(G.addSeat(room, ids[i]), null);
    assert.equal(G.setName(room, ids[i], 'Player ' + i), null);
    assert.equal(G.pickKingdom(room, ids[i], i), null);
  }
  return room;
}
const idOfH = (room, h) => room.seats.find((s) => s.h === h).id;
const curH = (room) => room.game.players[room.game.cur].h;

/* Plays by pressing roll and the first legal move, letting the clock run out now and then. */
function play(room, rand, now = 1, maxSteps = 20000) {
  for (let i = 0; i < maxSteps && room.status === 'playing'; i++) {
    const g = room.game;
    const id = idOfH(room, curH(room));
    if (rand() < 0.1) { now = g.deadline + 1; G.tick(room, now); continue; }
    now += 50;
    if (g.phase === 'roll' || g.phase === 'orderRoll') assert.equal(G.playRoll(room, id, now), null);
    else if (g.phase === 'choose') {
      /* Conquest moves by its own rules, which the server passes where a world id goes. */
      const opts = R.options(g.pieces, curH(room), g.pending, g.mode === 'conquest' ? R.CONQUEST : g.world, g.fate && g.fate.hands);
      if (!opts.length && g.canReroll) { assert.equal(G.playReroll(room, id, now), null); continue; }
      assert.ok(opts.length, 'choose phase always has a legal move');
      const o = opts[Math.floor(rand() * opts.length)];
      assert.equal(G.playMove(room, id, o.pc.idx, o.di, now), null);
    } else if (g.phase === 'fate') {
      const offer = g.fate.offer;
      const choice = R.bestFate(offer.ids, g.fate.hands[offer.h], g.pieces, offer.h);
      assert.equal(G.playFate(room, idOfH(room, offer.h), choice.pick, choice.drop, now), null);
    } else if (g.phase === 'decree') {
      const troop = g.pieces.find((p) => p.h === curH(room) && p.p < 0);
      assert.ok(troop, 'a decree needs a troop in the keep');
      assert.equal(G.playDecree(room, id, troop.idx, now), null);
    } else assert.fail('unexpected phase ' + g.phase);
  }
  return now;
}
function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

test('the host can set gauntlet mode and the open-room card shows it', () => {
  const room = lobby(2);
  assert.equal(G.setOpts(room, ids[0], { mode: 'gauntlet' }), null);
  assert.equal(room.mode, 'gauntlet');
  assert.equal(room.ranked, true);
  assert.equal(room.worlds, true);
  const card = G.lobbyCard(room);
  assert.equal(card.mode, 'gauntlet');
  assert.equal(card.modeLabel, 'Gauntlet');
});

test('classic mode plays without the Mist or Fate Cards', () => {
  const room = lobby(2);
  assert.equal(G.setOpts(room, ids[0], { mode: 'no-such-mode' }), null);
  assert.equal(room.mode, 'normal');
  assert.equal(G.setOpts(room, ids[0], { mode: 'classic' }), null);
  assert.equal(room.mode, 'classic');
  assert.equal(room.worlds, false);
  assert.equal(room.ranked, false);
  assert.equal(room.fate, false);
  assert.equal(G.lobbyCard(room).modeLabel, 'Classic');
  G.start(room, ids[0], 0);
  const g = room.game;
  assert.equal(g.fateOn, false);
  assert.equal(G.publicView(room).game.mode, 'classic');
  assert.equal(G.publicView(room).game.fateOn, false);
  let now = 1;
  while (g.ordering && now < 8000) {
    assert.equal(G.playRoll(room, idOfH(room, curH(room)), now), null);
    now += 80;
  }
  const h = curH(room);
  const pc = g.pieces.find((p) => p.h === h && p.idx === 0);
  pc.p = 5;
  g.phase = 'choose';
  g.pending = [{ v: 2 }, { v: 3, used: true }];
  assert.equal(G.playMove(room, idOfH(room, h), pc.idx, 0, now), null);
  assert.equal(pc.p, 7);
  assert.ok(R.landedShrine(pc));
  assert.notEqual(g.phase, 'fate');
  assert.equal(g.fate.offer, null);
  play(room, rng(13), now + 100);
  assert.equal(room.status, 'over');
  assert.equal(g.winReason, 'vault');
  assert.equal(g.world, null);
  assert.ok(g.fate.hands.every((hand) => hand.length === 0));
  assert.ok(!room.events.some((e) => e.type === 'world' || e.type === 'fate'));
});

test('the host can hide a room and skip the March', () => {
  const room = lobby(2);
  assert.equal(G.setOpts(room, ids[1], { private: true }), 'not-host');
  assert.equal(G.setOpts(room, ids[0], { private: true, worlds: false }), null);
  assert.equal(room.private, true);
  assert.equal(room.worlds, false);
  assert.equal(G.isJoinable(room), true);
  assert.equal(G.isListed(room), false);
  G.start(room, ids[0], 0);
  assert.equal(room.game.worlds, false);
  play(room, rng(11));
  assert.equal(room.status, 'over');
  assert.equal(room.game.world, null);
  assert.ok(!room.events.some((e) => e.type === 'world'));
});

test('a lobby with a free seat is listed without seat ids', () => {
  const room = lobby(2);
  assert.equal(G.isJoinable(room), true);
  const card = G.lobbyCard(room);
  assert.equal(card.code, 'ABCDE');
  assert.equal(card.taken, 2);
  assert.equal(card.open, 2);
  assert.deepEqual(card.names, ['Player 0', 'Player 1']);
  assert.deepEqual(card.kingdoms, [0, 1]);
  assert.equal('id' in card, false);
  assert.equal(JSON.stringify(card).includes(ids[0]), false);
  const full = lobby(4);
  assert.equal(G.isJoinable(full), false);
  G.start(room, ids[0], 0);
  assert.equal(G.isJoinable(room), false);
});

test('lobby enforces names, kingdoms, seats and host start', () => {
  const room = lobby(2);
  assert.equal(G.addSeat(room, ids[2]), null);
  assert.equal(G.setName(room, ids[2], '  player 0 '), 'name-taken');
  assert.equal(G.setName(room, ids[2], '   '), 'name-empty');
  assert.equal(G.setName(room, ids[2], 'Cora'), null);
  assert.equal(G.pickKingdom(room, ids[2], 0), 'kingdom-taken');
  assert.equal(G.start(room, ids[0], 0), 'not-ready');
  assert.equal(G.pickKingdom(room, ids[2], 3), null);
  assert.equal(G.addSeat(room, ids[3]), null);
  assert.equal(G.addSeat(room, ids[4]), 'full');
  G.leave(room, ids[3], 0);
  assert.equal(G.start(room, ids[1], 0), 'not-host');
  assert.equal(G.start(room, ids[0], 0), null);
  assert.equal(room.game.phase, 'orderRoll');
  assert.equal(G.addSeat(room, ids[3]), 'started');
  assert.ok(room.game.deadline >= G.TURN_MS);
});

test('host leaving the lobby closes the room', () => {
  const room = lobby(3);
  G.leave(room, ids[0], 0);
  assert.equal(room.status, 'closed');
});

test('a game played to the end has one winner with every troop in the vault', () => {
  const room = lobby(4);
  G.start(room, ids[0], 0);
  play(room, rng(7));
  assert.equal(room.status, 'over');
  assert.equal(room.game.winReason, 'vault');
  const w = room.game.winner;
  assert.ok(room.game.pieces.filter((p) => p.h === w).every((p) => p.p === R.GOAL));
});

test('a match that lasts an hour is closed without a winner', () => {
  const room = lobby(2);
  const now = 1000;
  G.start(room, ids[0], now);
  assert.equal(room.status, 'playing');
  assert.ok(G.nextDue(room) <= now + G.MATCH_LIMIT_MS);
  G.tick(room, now + 1);
  assert.equal(room.status, 'playing');
  assert.equal(G.tick(room, now + G.MATCH_LIMIT_MS), true);
  assert.equal(room.status, 'over');
  assert.equal(room.game.winReason, 'time');
  assert.equal(room.game.winner, null);
  assert.ok(room.events.some((e) => e.type === 'timeout'));
});

test('moves out of turn or illegal moves are refused', () => {
  const room = lobby(2);
  G.start(room, ids[0], 0);
  const other = idOfH(room, room.game.players[(room.game.cur + 1) % 2].h);
  assert.equal(G.playRoll(room, other, 1), 'not-your-turn');
  assert.equal(G.playMove(room, idOfH(room, curH(room)), 0, 0, 1), 'not-your-turn');
});

test('the clock plays for an idle player and keeps the game moving', () => {
  const room = lobby(2);
  G.start(room, ids[0], 0);
  let now = 0;
  for (let i = 0; i < 4000 && room.status === 'playing'; i++) { now = room.game.deadline; G.tick(room, now); }
  assert.equal(room.status, 'over');
  assert.ok(room.events.some((e) => e.auto));
});

test('the last player standing wins when everyone else leaves', () => {
  const room = lobby(3);
  G.start(room, ids[0], 0);
  const now = play(room, rng(3), 1, 60);
  const [a, b] = room.game.players.slice(0, 2).map((p) => idOfH(room, p.h));
  G.leave(room, a, now);
  assert.equal(room.status, 'playing');
  assert.ok(!room.game.pieces.some((p) => p.h === room.seats.find((s) => s.id === a).h));
  G.leave(room, b, now);
  assert.equal(room.status, 'over');
  assert.equal(room.game.winReason, 'forfeit');
});

test('being away for a minute forfeits, coming back cancels it', () => {
  const room = lobby(2);
  G.start(room, ids[0], 0);
  G.setAway(room, ids[1], true, 1000);
  G.setAway(room, ids[1], false, 30000);
  G.tick(room, 70000);
  assert.equal(room.status, 'playing');
  G.setAway(room, ids[1], true, 70000);
  G.tick(room, 129999);
  assert.equal(room.status, 'playing');
  G.tick(room, 130000);
  assert.equal(room.status, 'over');
  assert.equal(room.game.winner, 0);
});

test('leaving during the order roll still produces a valid turn order', () => {
  for (let seed = 1; seed < 300; seed++) {
    const rand = rng(seed);
    const room = lobby(4);
    G.start(room, ids[0], 0);
    let now = 1;
    let left = 0;
    for (let i = 0; i < 40 && room.game.ordering && room.status === 'playing'; i++) {
      now += 50;
      if (left < 2 && rand() < 0.25) {
        const live = room.seats.filter((s) => !s.out);
        G.leave(room, live[Math.floor(rand() * live.length)].id, now);
        left++;
        continue;
      }
      G.playRoll(room, idOfH(room, curH(room)), now);
    }
    if (room.status !== 'playing') continue;
    assert.equal(room.game.ordering, false, 'seed ' + seed);
    assert.ok(!room.seats.find((s) => s.h === curH(room)).out, 'seed ' + seed);
    play(room, rand, now);
    assert.equal(room.status, 'over', 'seed ' + seed);
  }
});

test('random games with leavers and timeouts always finish cleanly', () => {
  for (let seed = 1; seed < 120; seed++) {
    const rand = rng(seed * 13);
    const n = 2 + (seed % 3);
    const room = lobby(n);
    G.start(room, ids[0], 0);
    let now = 1;
    for (let i = 0; i < 30000 && room.status === 'playing'; i++) {
      const g = room.game;
      if (rand() < 0.0008) {
        const live = room.seats.filter((s) => !s.out);
        G.leave(room, live[Math.floor(rand() * live.length)].id, now);
        continue;
      }
      now = play(room, rand, now, 1);
      for (const h of new Set(g.pieces.map((p) => p.h))) assert.equal(g.pieces.filter((p) => p.h === h).length, 4);
      assert.ok(!room.seats.find((s) => s.h === curH(room)).out || room.status !== 'playing');
    }
    assert.equal(room.status, 'over', 'seed ' + seed);
  }
});

const piece = (h, idx, p) => ({ h, idx, p });

test('a blessed march is two squares longer, and never longer than the vault', () => {
  const road = [piece(3, 0, 10)];
  assert.equal(R.moveResult(road, road[0], 4, 'flood').np, 16);
  assert.equal(R.moveResult(road, road[0], 4, 'ash').np, 14);
  const near = [piece(3, 0, 70)];
  assert.equal(R.moveResult(near, near[0], 1, 'flood').np, R.GOAL);
  const keep = [piece(3, 0, -1)];
  assert.equal(R.moveResult(keep, keep[0], 2, 'flood'), null);
  assert.equal(R.moveResult(keep, keep[0], 1, 'flood').exit, true);
});

test('a shifting stone carries the troop and captures only on arrival', () => {
  const mover = piece(0, 0, 12);
  const leftBehind = piece(2, 0, 47);
  const passed = R.moveResult([mover, leftBehind], mover, 1, 'ways');
  assert.equal(passed.shift, true);
  assert.equal(passed.land, 13);
  assert.equal(R.trackIndex(0, passed.land), 13);
  assert.equal(passed.np, 47);
  assert.equal(passed.captures.length, 0);
  const waiting = piece(2, 0, 13);
  const taken = R.moveResult([mover, waiting], mover, 1, 'ways');
  assert.equal(taken.np, 47);
  assert.equal(taken.captures[0], waiting);
});

test('a portal carries you even when the pair is off your road, and never captures the troop on the stone you enter', () => {
  const mover = piece(3, 0, 29);
  const foe = piece(0, 0, 13);
  const r = R.moveResult([mover, foe], mover, 1, 'ways');
  assert.equal(r.shift, true);
  assert.equal(r.at, 47);
  assert.equal(r.np, 30);
  assert.equal(r.captures.length, 0);
  const waiting = piece(1, 0, 30);
  const taken = R.moveResult([mover, waiting], mover, 1, 'ways');
  assert.equal(taken.captures[0], waiting);
  const ghost = piece(2, 0, 0);
  ghost.at = 47;
  const takenGhost = R.moveResult([mover, ghost], mover, 1, 'ways');
  assert.equal(takenGhost.captures[0], ghost);
  const blocked = [mover, piece(1, 0, 30), piece(1, 1, 30)];
  assert.equal(R.moveResult(blocked, mover, 1, 'ways'), null);
  const stood = piece(3, 0, 30);
  stood.at = 47;
  const step = R.moveResult([stood], stood, 1, 'ways');
  assert.equal(step.at, 48);
  assert.equal(step.np, 30);
  const gate = piece(3, 0, 30);
  gate.at = 50;
  const home = R.moveResult([gate], gate, 1, null);
  assert.equal(home.np, 0);
  assert.equal(home.at, undefined);
  assert.equal(R.walkSpan(stood, step), 1);
  assert.equal(R.walkSpan(gate, home), 1);
  const along = piece(3, 0, 30);
  along.at = 47;
  const back = R.moveResult([along], along, 4, null);
  assert.equal(back.np, 0);
  assert.equal(R.walkSpan(along, back), 4);
});

test('the computer would rather press on than stack a barricade', () => {
  const a = { h: 0, idx: 0, p: 8 };
  const mate = { h: 0, idx: 1, p: 12 };
  const pieces = [a, mate];
  const rand = () => 0;
  const stack = { pc: a, r: { np: 12, captures: [], exit: false } };
  const onward = { pc: a, r: { np: 16, captures: [], exit: false } };
  assert.ok(R.cpuScore(pieces, onward, rand) > R.cpuScore(pieces, stack, rand));
});

test('the mist rolls in after every third round and lifts after the next', () => {
  const seen = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(R.worldAfter);
  assert.deepEqual(seen, [null, null, 'mist', null, null, 'mist', null, null, 'mist']);
  assert.equal(R.worldAfter(0), null);
});

test('online play deals only the mist, and only when the schedule changes it', () => {
  const room = lobby(3);
  G.start(room, ids[0], 0);
  play(room, rng(5));
  const worlds = room.events.filter((e) => e.type === 'world');
  assert.ok(worlds.length, 'rounds are announced');
  worlds.forEach((e) => assert.ok(e.id === null || e.id === 'mist'));
  const picks = room.game.diceStats.worldPicks;
  assert.deepEqual(Object.keys(picks).filter((id) => picks[id]), Object.keys(picks).length ? ['mist'] : []);
});

test('a ranked match plays on until one kingdom is left, and places every finisher in order', () => {
  const room = lobby(4);
  assert.equal(G.setOpts(room, ids[0], { ranked: true }), null);
  G.start(room, ids[0], 0);
  assert.equal(room.game.ranked, true);
  play(room, rng(7), 1, 60000);
  assert.equal(room.status, 'over');
  const g = room.game;
  assert.equal(g.places.length, 4);
  assert.equal(new Set(g.places).size, 4);
  assert.equal(g.winner, g.places[0]);
  const finishes = room.events.filter((e) => e.type === 'finish');
  assert.ok(finishes.length, 'the last finish is still in the event log');
  finishes.forEach((e) => assert.equal(e.h, g.places[e.place - 1]));
  g.places.slice(0, 3).forEach((h) => assert.ok(R.allHome(g.pieces, h)));
  assert.deepEqual(G.publicView(room).game.places, g.places);
});

test('a placed kingdom is skipped, and a forfeit that leaves one racer ends a ranked match', () => {
  const room = lobby(3);
  G.setOpts(room, ids[0], { ranked: true });
  G.start(room, ids[0], 0);
  const g = room.game;
  g.ordering = false;
  g.cur = 0;
  const first = g.players[0].h;
  g.pieces.forEach((pc) => { if (pc.h === first) pc.p = pc.idx === 0 ? R.GOAL - 1 : R.GOAL; });
  g.phase = 'choose';
  g.pending = [{ v: 1 }, { v: 3 }];
  const opt = R.options(g.pieces, first, g.pending, g.world).find((o) => o.r.np === R.GOAL);
  assert.equal(G.playMove(room, idOfH(room, first), opt.pc.idx, opt.di, 10), null);
  assert.deepEqual(g.places, [first]);
  assert.equal(room.status, 'playing');
  assert.notEqual(curH(room), first);
  const leaver = g.players.find((p) => p.h !== first && p.h !== curH(room)).h;
  G.leave(room, idOfH(room, leaver), 20);
  assert.equal(room.status, 'over');
  assert.equal(g.winner, first);
  assert.equal(g.places.length, 2);
  assert.equal(g.places[0], first);
});

test('a turn order is seated from the totals of one roll, and a tiebreak cannot move anyone else', () => {
  const first = R.orderGroups([
    { id: 'you', total: 8 },
    { id: 'a', total: 11 },
    { id: 'b', total: 8 },
    { id: 'c', total: 4 },
  ]);
  assert.deepEqual(first.map((g) => g.map((e) => e.id)), [['a'], ['you', 'b'], ['c']]);
  const again = R.orderGroups([{ id: 'you', total: 9 }, { id: 'b', total: 2 }]);
  assert.deepEqual(again.map((g) => g.map((e) => e.id)), [['you'], ['b']]);
  const seated = [first[0][0].id, again[0][0].id, again[1][0].id, first[2][0].id];
  assert.deepEqual(seated, ['a', 'you', 'b', 'c']);
});

test('a double marches one troop out of a phalanx before the other die is chosen', () => {
  const pair = [piece(0, 0, 10), piece(0, 1, 10)];
  const board = pair.concat([piece(0, 2, 4), piece(0, 3, -1), piece(1, 0, -1)]);
  const doubled = [{ v: 4 }, { v: 4 }];
  const open = R.phalanxDouble(board, 0, doubled, null);
  assert.equal(open.pc.p, 10);
  assert.equal(open.di, 0);
  assert.equal(open.r.np, 14);
  assert.equal(R.phalanxDouble(board, 0, [{ v: 4 }, { v: 5 }], null), null);
  assert.equal(R.phalanxDouble(board, 0, [{ v: 4, used: true }, { v: 4 }], null), null);
  const lone = [piece(0, 0, 10), piece(0, 1, 4), piece(0, 2, -1), piece(0, 3, -1)];
  assert.equal(R.phalanxDouble(lone, 0, doubled, null), null);
  const wall = [piece(0, 0, 10), piece(0, 1, 10)];
  const left = piece(1, 0, 0); left.at = 14;
  const right = piece(2, 0, 0); right.at = 14;
  wall.push(left, right);
  assert.equal(R.phalanxDouble(wall, 0, doubled, null), null);
});

test('adaptive dice stay uniform until two empty turns, then cap every face at 30%', () => {
  const keep = [0, 1].flatMap((h) => [0, 1, 2, 3].map((idx) => piece(h, idx, -1)));
  const players = [{ h: 0 }, { h: 1 }];
  const idle = R.adaptRoll(keep, 0, null, { dry: 1, finishMiss: 9 }, players, () => 0.2);
  assert.equal(idle.vals, null);
  assert.equal(idle.assisted, false);
  const kept = R.adaptRoll(keep, 0, null, { dry: 2 }, players, () => 0);
  assert.equal(kept.assisted, false);
  assert.deepEqual(kept.vals, [1, 1]);
  const helped = R.adaptRoll(keep, 0, null, { dry: 2 }, players, () => 0.2);
  assert.equal(helped.assisted, true);
  assert.equal(helped.reason, 'inactivity');
  const weights = R.faceWeights(R.usefulFaces(keep, 0, null), 0.3, 0.08);
  assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  weights.forEach((p) => assert.ok(p <= 0.3 + 1e-9 && p >= 0.08 - 1e-9));
  assert.ok(Math.abs(weights[0] - 0.3) < 1e-9);
  assert.ok(Math.abs(weights[5] - 0.3) < 1e-9);
  const counts = [0, 0, 0, 0, 0, 0];
  let assisted = 0;
  for (let n = 0; n < 4000; n++) {
    const plan = R.adaptRoll(keep, 0, null, { dry: 2 }, players, Math.random);
    if (!plan.assisted) continue;
    assisted++;
    plan.vals.forEach((v) => { counts[v - 1]++; });
  }
  assert.ok(assisted > 1200);
  const faces = counts.reduce((a, b) => a + b, 0);
  counts.forEach((c) => assert.ok(c / faces < 0.36));
  assert.ok(counts[0] / faces > 0.22 && counts[5] / faces > 0.22);
  assert.ok(counts[2] / faces < 0.16);
  const stuck = { dry: 0 };
  R.noteDry(stuck, false);
  R.noteDry(stuck, false);
  assert.equal(stuck.dry, 2);
  R.noteDry(stuck, true);
  assert.equal(stuck.dry, 0);
  const done = [0, 1, 2, 3].map((idx) => piece(0, idx, R.GOAL));
  const hopeless = R.adaptRoll(done, 0, null, { dry: 9 }, players, () => 0.2);
  assert.equal(hopeless.assisted, false);
  assert.deepEqual(hopeless.vals, [2, 2]);
});

test('endgame help is off by default and never assists the leader', () => {
  const ahead = [piece(0, 0, 70), piece(0, 1, -1), piece(0, 2, -1), piece(0, 3, -1), piece(1, 0, -1), piece(1, 1, -1), piece(1, 2, -1), piece(1, 3, -1)];
  const players = [{ h: 0 }, { h: 1 }];
  assert.equal(R.inTheLead(ahead, players, 0), true);
  assert.equal(R.adaptRoll(ahead, 0, null, { dry: 0, finishMiss: 5 }, players, () => 0.2, { endgame: true }).vals, null);
  const board = [piece(0, 0, R.GOAL), piece(0, 1, R.GOAL), piece(0, 2, R.GOAL), piece(0, 3, -1), piece(1, 0, 70), piece(1, 1, -1), piece(1, 2, -1), piece(1, 3, -1)];
  assert.equal(R.inTheLead(board, players, 1), false);
  assert.deepEqual(R.finishFaces(board, 1, null), [1]);
  const off = R.adaptRoll(board, 1, null, { dry: 0, finishMiss: 5 }, players, () => 0.2);
  assert.equal(off.vals, null);
  let i = 0;
  const seq = [0.2, 0.4, 0.01, 0.01];
  const on = R.adaptRoll(board, 1, null, { dry: 0, finishMiss: 2 }, players, () => seq[i++], { endgame: true });
  assert.equal(on.assisted, true);
  assert.equal(on.reason, 'endgame');
  assert.deepEqual(on.vals, [1, 1]);
  const miss = { finishMiss: 0 };
  R.noteFinish(board, 1, null, miss, 2, 3);
  assert.equal(miss.finishMiss, 1);
  R.noteFinish(board, 1, null, miss, 1, 4);
  assert.equal(miss.finishMiss, 0);
  R.noteVault(miss);
  assert.equal(miss.finishMiss, 0);
});

test('a match shares one moment for the theme', () => {
  const room = lobby(2);
  G.start(room, ids[0], 1000);
  assert.equal(room.game.themeAt, 1000 + G.MATCH_CUE_MS);
  assert.equal(G.publicView(room).game.themeAt, room.game.themeAt);
});

test('a repeated roll or move does not play twice', () => {
  const room = lobby(2);
  G.start(room, ids[0], 0);
  const id = idOfH(room, curH(room));
  const before = room.seq;
  assert.equal(G.playRoll(room, id, 1, 4), null);
  const seq = room.seq;
  assert.ok(seq > before);
  assert.equal(G.playRoll(room, id, 2, 4), null);
  assert.equal(G.playRoll(room, id, 3, 3), null);
  assert.equal(room.seq, seq);
  assert.equal(room.events.filter((e) => e.type === 'orderRoll').length, 1);
  const goal = room.game.pieces.find((p) => p.h === curH(room));
  goal.p = R.GOAL;
  const kept = room.game.pieces.map((p) => p.p);
  assert.equal(G.playRoll(room, id, 4, 4), null);
  assert.deepEqual(room.game.pieces.map((p) => p.p), kept);
});

test('landing on a shrine deals four fates, and only that seat may keep one', () => {
  const room = lobby(2);
  G.start(room, ids[0], 0);
  let now = 1;
  while (room.game.ordering && now < 8000) {
    assert.equal(G.playRoll(room, idOfH(room, curH(room)), now), null);
    now += 80;
  }
  assert.equal(room.game.ordering, false);
  const g = room.game;
  const h = curH(room);
  const pc = g.pieces.find((p) => p.h === h && p.idx === 0);
  pc.p = 5;
  g.phase = 'choose';
  g.pending = [{ v: 2 }, { v: 3, used: true }];
  g.deadline = now + 20000;
  const seat = idOfH(room, h);
  const other = idOfH(room, g.players.find((p) => p.h !== h).h);
  assert.equal(G.playMove(room, other, pc.idx, 0, now), 'not-your-turn');
  assert.equal(G.playMove(room, seat, pc.idx, 0, now), null);
  assert.equal(pc.p, 7);
  assert.equal(g.phase, 'fate');
  assert.equal(g.fate.offer.h, h);
  assert.equal(g.fate.offer.ids.length, 4);
  assert.equal(G.playFate(room, other, g.fate.offer.ids[0], null, now + 10), 'not-your-turn');
  assert.equal(G.playFate(room, seat, 'nope', null, now + 10), 'illegal');
  const choice = R.bestFate(g.fate.offer.ids, g.fate.hands[h], g.pieces, h);
  assert.equal(G.playFate(room, seat, choice.pick, choice.drop, now + 20), null);
  if (g.phase === 'decree') {
    const troop = g.pieces.find((p) => p.h === h && p.p < 0);
    assert.equal(G.playDecree(room, seat, troop.idx, now + 30), null);
  } else if (R.fateCard(choice.pick).instant) {
    assert.equal(g.fate.hands[h].some((c) => c.id === choice.pick), false);
  } else assert.ok(g.fate.hands[h].some((c) => c.id === choice.pick));
  assert.equal(g.fate.offer, null);
  const view = G.publicView(room);
  assert.ok(view.game.fate);
  assert.equal(view.game.fate.offer, null);
  assert.equal(view.game.fate.hands[h].length, g.fate.hands[h].length);
  const holder = curH(room);
  g.phase = 'fate';
  g.fate.hands[holder] = (g.fate.hands[holder] || []).filter((c) => !['favor', 'phantom', 'grace', 'burden'].includes(c.id));
  g.fate.offer = { h: holder, ids: ['favor', 'phantom', 'grace', 'burden'] };
  g.deadline = now + 40;
  G.tick(room, g.deadline + 1);
  assert.notEqual(g.phase, 'fate');
  assert.ok(room.events.some((e) => e.type === 'fateKept' && e.auto));
});

/* ---------------- Conquest ---------------- */

const troop = (h, idx, p, o = h) => ({ h, idx, p, o });

function conquestRoom(n) {
  const room = lobby(n);
  assert.equal(G.setOpts(room, ids[0], { mode: 'conquest' }), null);
  G.start(room, ids[0], 0);
  let now = 1;
  while (room.game.ordering && now < 8000) {
    assert.equal(G.playRoll(room, idOfH(room, curH(room)), now), null);
    now += 80;
  }
  assert.equal(room.game.ordering, false);
  return { room, now };
}

test('conquest mode turns off the Mist and Fate Cards and marks every troop with its first kingdom', () => {
  const room = lobby(3);
  assert.equal(G.setOpts(room, ids[0], { mode: 'conquest' }), null);
  assert.equal(room.mode, 'conquest');
  assert.equal(room.worlds, false);
  assert.equal(room.fate, false);
  assert.equal(room.ranked, false);
  assert.equal(G.lobbyCard(room).modeLabel, 'Conquest');
  G.start(room, ids[0], 0);
  const g = room.game;
  assert.equal(g.mode, 'conquest');
  assert.equal(g.fateOn, false);
  assert.equal(g.pieces.length, 12);
  g.pieces.forEach((pc) => assert.equal(pc.o, pc.h));
  assert.deepEqual(G.publicView(room).game.fallen, []);
});

test('a conquest march passes the sealed passage and starts another lap', () => {
  const a = troop(0, 0, 62);
  const pieces = [a, troop(1, 0, -1)];
  assert.equal(R.moveResult(pieces, a, 3, null, null).np, 65, 'the standard rules turn into the passage');
  const past = R.moveResult(pieces, a, 3, R.CONQUEST, null);
  assert.equal(past.at, 65);
  assert.equal(R.walkSpan(a, past), 3);
  const lap = R.moveResult(pieces, a, 6, R.CONQUEST, null);
  assert.equal(lap.np, 0);
  assert.equal(lap.at, undefined);
  assert.equal(R.walkSpan(a, lap), 6);
  const far = { h: 0, idx: 1, p: 62, at: 66, o: 0 };
  const home = R.moveResult([far], far, 5, R.CONQUEST, null);
  assert.equal(home.np, 3);
  assert.equal(R.walkSpan(far, home), 5);
  const never = [1, 2, 3, 4, 5, 6, 20].every((v) => { const r = R.moveResult(pieces, a, v, R.CONQUEST, null); return r && r.np <= R.LAST; });
  assert.ok(never, 'no march ends in the passage or the vault');
});

test('conquest has no phalanx: a pair does not block, and both troops fall together', () => {
  const a = troop(0, 0, 2);
  const pair = [troop(1, 0, 0), troop(1, 1, 0)];
  pair.forEach((pc) => { pc.at = 5; });
  const pieces = [a, ...pair];
  assert.equal(R.moveResult(pieces, a, 3, null, null), null, 'a phalanx cannot be landed on in the standard rules');
  assert.equal(R.moveResult(pieces, a, 5, null, null), null, 'or passed');
  const through = R.moveResult(pieces, a, 5, R.CONQUEST, null);
  assert.equal(through.np, 7);
  const strike = R.moveResult(pieces, a, 3, R.CONQUEST, null);
  assert.equal(strike.captures.length, 2);
  const shrine = [troop(0, 0, 4), { h: 1, idx: 0, p: 0, at: 7, o: 1 }, { h: 1, idx: 1, p: 0, at: 7, o: 1 }];
  assert.equal(R.moveResult(shrine, shrine[0], 3, R.CONQUEST, null), null, 'a full shrine still holds only two');
  shrine.pop();
  assert.deepEqual(R.moveResult(shrine, shrine[0], 3, R.CONQUEST, null).captures, [], 'and a shrine is still safe');
  const mine = [troop(0, 0, 2), troop(0, 1, 5), troop(0, 2, 5)];
  assert.equal(R.moveResult(mine, mine[0], 3, R.CONQUEST, null), null, 'a square holds two troops');
  assert.equal(R.phalanxDouble(mine, 0, [{ v: 4 }, { v: 4 }], R.CONQUEST, null), null);
});

test('conquest: a troop on the gate steps one square ahead when another leaves the keep', () => {
  const onGate = troop(0, 0, 0);
  const inKeep = troop(0, 1, -1);
  const pieces = [onGate, inKeep, troop(1, 0, -1)];
  assert.equal(R.moveResult(pieces, inKeep, 6, null, null).push, undefined, 'the standard rules form a phalanx on the gate');
  assert.equal(R.moveResult(pieces, inKeep, 3, R.CONQUEST, null), null, 'leaving the keep still takes a 1 or a 6');
  const out = R.moveResult(pieces, inKeep, 6, R.CONQUEST, null);
  assert.equal(out.np, 0);
  assert.deepEqual(out.push, [onGate]);
  assert.deepEqual(out.captures, []);
  /* The square ahead takes the troop like any landing: enemies there are captured, and it holds only two. */
  const foe = { h: 1, idx: 1, p: 0, at: R.trackIndex(0, 1), o: 1 };
  const strike = R.moveResult([...pieces, foe], inKeep, 1, R.CONQUEST, null);
  assert.deepEqual(strike.captures, [foe]);
  const full = [...pieces, troop(0, 2, 1), troop(0, 3, 1)];
  assert.equal(R.moveResult(full, inKeep, 6, R.CONQUEST, null), null, 'no room ahead, so the troop stays in the keep');
  const alone = [inKeep, troop(1, 0, -1)];
  assert.equal(R.moveResult(alone, inKeep, 6, R.CONQUEST, null).push, undefined, 'an empty gate pushes nobody');

  const { room, now } = conquestRoom(2);
  const g = room.game;
  const h = curH(room);
  const mine = g.pieces.filter((p) => p.h === h);
  const enemy = g.pieces.find((p) => p.h !== h);
  mine[0].p = 0;
  enemy.p = R.progressOn(enemy.h, R.trackIndex(h, 1));
  g.phase = 'choose';
  g.pending = [{ v: 6 }, { v: 2, used: true }];
  assert.equal(G.playMove(room, idOfH(room, h), mine[1].idx, 0, now), null);
  const ev = room.events.find((e) => e.type === 'move' && e.push);
  assert.deepEqual(ev.push, [{ h, idx: mine[0].idx, to: 1 }]);
  assert.equal(ev.exit, true);
  assert.equal(ev.captures.length, 1);
  assert.equal(enemy.h, h, 'the enemy on the square ahead was captured and changed kingdoms');
  assert.equal(g.pieces.filter((p) => p.h === h && R.locKey(p) === 't' + R.STARTS[h]).length, 1, 'the gate holds one troop');
  const stepped = g.pieces.filter((p) => p.h === h && R.locKey(p) === 't' + R.trackIndex(h, 1));
  assert.ok(stepped.includes(mine[0]), 'the troop that was on the gate stands one square ahead');
});

test('a captured troop joins the captor, and a kingdom with none of its first troops falls', () => {
  const { room, now } = conquestRoom(3);
  const g = room.game;
  const h = curH(room);
  const [foe, other] = g.players.map((p) => p.h).filter((x) => x !== h);
  const mine = g.pieces.filter((p) => p.h === h);
  const theirs = g.pieces.filter((p) => p.h === foe);
  /* The foe has already lost three of its first troops to the third kingdom, and holds one troop it converted. */
  theirs.slice(1).forEach((pc, i) => { pc.h = other; pc.idx = 4 + i; });
  const turned = g.pieces.find((p) => p.h === other && p.o === other && p.idx === 3);
  turned.h = foe; turned.idx = 1; turned.p = -1;
  const last = theirs[0];
  const target = R.trackIndex(h, 9);
  assert.ok(!R.SAFE.has(target));
  last.p = R.progressOn(foe, target);
  assert.notEqual(last.p, null);
  mine[0].p = 6;
  g.phase = 'choose';
  g.pending = [{ v: 3 }, { v: 2, used: true }];
  assert.equal(G.playMove(room, idOfH(room, h), mine[0].idx, 0, now), null);
  assert.equal(last.h, h);
  assert.equal(last.o, foe);
  assert.equal(last.p, -1);
  assert.equal(last.idx, 4);
  const ev = room.events.find((e) => e.type === 'move' && e.captures.length);
  assert.deepEqual(ev.captures[0].to, { h, idx: 4 });
  assert.equal(ev.captureBonus, R.BONUS);
  assert.deepEqual(g.fallen, [foe]);
  assert.equal(ev.falls.length, 1);
  assert.equal(ev.falls[0].h, foe);
  assert.equal(ev.falls[0].by, h);
  assert.deepEqual(ev.falls[0].troops[0].to, { h, idx: 5 });
  assert.equal(turned.h, h);
  assert.equal(turned.o, other);
  assert.equal(g.pieces.filter((p) => p.h === foe).length, 0);
  assert.equal(room.status, 'playing');
  /* The fallen kingdom is skipped from now on. */
  const before = room.seq;
  play(room, rng(3), now + 100, 400);
  assert.ok(room.seq > before);
  assert.ok(!room.events.some((e) => e.type === 'turn' && e.h === foe));
});

test('a troop won back counts as one of the kingdom\'s first troops again', () => {
  const pieces = [troop(0, 0, 5), troop(0, 4, 3, 1), troop(1, 0, -1), troop(2, 0, -1)];
  assert.equal(R.fallen(pieces, 1), false);
  pieces[2].h = 2; pieces[2].idx = 1;
  assert.equal(R.fallen(pieces, 1), true);
  assert.deepEqual(R.enlist(pieces, pieces[1], 1), { h: 1, idx: 0 });
  assert.equal(R.fallen(pieces, 1), false);
  const road = [troop(1, 0, 10), troop(1, 1, 62), troop(1, 2, -1), troop(0, 0, 0)];
  road[1].at = (R.STARTS[1] + 66) % R.NTRACK;
  const moved = R.absorb(road, 1, 0);
  assert.equal(moved.length, 3);
  assert.deepEqual(moved.map((m) => m.to.idx), [1, 2, 3]);
  assert.equal(R.trackIndex(0, road[0].p), R.trackIndex(1, 10), 'a troop on the road changes banners where it stands');
  assert.equal(R.locKey(road[1]), 't' + (R.STARTS[1] + 66) % R.NTRACK);
  assert.equal(road[2].p, -1);
  road.forEach((pc) => assert.equal(pc.h, 0));
});

test('a conquest match ends when one kingdom holds every troop', () => {
  for (const [n, seed] of [[2, 4], [3, 9], [4, 2]]) {
    const room = lobby(n);
    G.setOpts(room, ids[0], { mode: 'conquest' });
    G.start(room, ids[0], 0);
    const rand = rng(seed);
    let now = 1;
    for (let i = 0; i < 200000 && room.status === 'playing'; i++) {
      const g = room.game;
      const h = curH(room);
      now += 50;
      if (g.phase === 'roll' || g.phase === 'orderRoll') assert.equal(G.playRoll(room, idOfH(room, h), now), null);
      else {
        assert.equal(g.phase, 'choose');
        const opts = R.options(g.pieces, h, g.pending, R.CONQUEST, null);
        const o = R.bestOption(g.pieces, opts, rand, R.CONQUEST);
        assert.equal(G.playMove(room, idOfH(room, h), o.pc.idx, o.di, now), null);
      }
      const seen = new Set(g.pieces.map((pc) => pc.h + ':' + pc.idx));
      assert.equal(seen.size, g.pieces.length, 'every troop keeps its own number');
      assert.ok(g.pieces.every((pc) => pc.p <= R.LAST));
    }
    const g = room.game;
    assert.equal(room.status, 'over');
    assert.equal(g.winReason, 'conquest');
    assert.equal(g.pieces.length, n * 4);
    assert.ok(g.pieces.every((pc) => pc.h === g.winner));
    assert.equal(g.fallen.length, n - 1);
    assert.deepEqual(g.places, [g.winner].concat(g.fallen.slice().reverse()));
    assert.equal(g.world, null);
    assert.ok(g.fate.hands.every((hand) => hand.length === 0));
  }
});
