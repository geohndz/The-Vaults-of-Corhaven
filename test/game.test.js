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
      const opts = R.options(g.pieces, curH(room), g.pending, g.world);
      assert.ok(opts.length, 'choose phase always has a legal move');
      const o = opts[Math.floor(rand() * opts.length)];
      assert.equal(G.playMove(room, id, o.pc.idx, o.di, now), null);
    } else assert.fail('unexpected phase ' + g.phase);
  }
  return now;
}
function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

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
});

test('world events deal every event before one can repeat', () => {
  const game = { world: null, worldBag: [] };
  let s = 11;
  const rng = (n) => { s = (s * 9301 + 49297) % 233280; return Math.floor((s / 233280) * n); };
  const seen = [];
  for (let i = 0; i < 18; i++) seen.push(G.takeWorld(game, rng));
  const ids = Object.keys(R.WORLD);
  for (let round = 0; round < 3; round++) {
    const slice = seen.slice(round * 6, round * 6 + 6);
    assert.equal(new Set(slice).size, 6);
    ids.forEach((id) => assert.ok(slice.includes(id)));
  }
  for (let i = 6; i < seen.length; i += 6) assert.notEqual(seen[i], seen[i - 1]);
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
