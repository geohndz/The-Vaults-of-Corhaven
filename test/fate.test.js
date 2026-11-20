import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/rules.js';

const R = globalThis.CorhavenRules;
const hands = (h, cards) => { const out = R.emptyHands(); out[h] = cards; return out; };
const pc = (h, p, idx = 0) => ({ h, idx, p });

test('a shrine is a star that is not a gate', () => {
  assert.equal(R.landedShrine(pc(0, 7)), true);
  assert.equal(R.landedShrine(pc(0, 0)), false);
  assert.equal(R.landedShrine(pc(0, 64)), false);
  assert.equal(R.landedShrine(pc(1, 7)), true);
});

test('a deal skips cards already held, True Sight when the mist is off, and a decree the gate cannot take', () => {
  const kept = [{ id: 'favor', seq: 1 }];
  const onRoad = [pc(0, 10)];
  const quiet = R.fateOffer(kept, () => 0.2, { pieces: onRoad, h: 0, worldId: null, hands: hands(0, kept), mistOn: false });
  assert.equal(quiet.length, 4);
  assert.equal(quiet.includes('favor'), false);
  assert.equal(quiet.includes('sight'), false);
  assert.equal(quiet.includes('decree'), false);
  const inKeep = [pc(0, -1)];
  const open = R.fateOffer([], () => 0.2, { pieces: inKeep, h: 0, worldId: null, hands: R.emptyHands(), mistOn: true });
  assert.equal(open.length, 4);
  assert.equal(R.canDecree(inKeep, 0, null, R.emptyHands()), true);
  assert.equal(R.canDecree(onRoad, 0, null, R.emptyHands()), false);
  assert.equal(R.canDecree(inKeep, 0, null, hands(0, [{ id: 'sealed' }])), false);
});

test('a deal never offers two fates that rewrite the same bonus', () => {
  for (let s = 0; s < 40; s++) {
    let n = s + 1;
    const rng = () => { n = (n * 17 + 3) % 97; return n / 97; };
    const offer = R.fateOffer([], rng, { pieces: [pc(0, -1)], h: 0, worldId: null, hands: R.emptyHands(), mistOn: true });
    const bonus = offer.filter((id) => id === 'mark' || id === 'burden');
    assert.ok(bonus.length <= 1, offer.join(','));
  }
  const held = [{ id: 'mark', seq: 1 }];
  const next = R.fateOffer(held, () => 0.4, { pieces: [pc(0, -1)], h: 0, worldId: null, hands: hands(0, held), mistOn: true });
  assert.equal(next.includes('mark') || next.includes('burden'), false);
  assert.equal(R.fateClashes('mark', 'wanderer'), false);
  const kept = R.fateAccept([{ id: 'mark', seq: 1 }, { id: 'favor', seq: 2 }], ['wanderer'], 'wanderer', null, (id) => ({ id, seq: 3 }));
  assert.equal(kept.instant, 'wanderer');
  assert.deepEqual(kept.hand.map((c) => c.id), ['mark', 'favor']);
  assert.equal(R.fateClashes('mark', 'burden'), true);
  assert.equal(R.fateClashes('mark', 'favor'), false);
});

test('a hand of two gives one up, and a decree never takes a slot', () => {
  const held = [{ id: 'favor', seq: 1 }, { id: 'mark', seq: 2 }];
  const replaced = R.fateAccept(held, ['phantom', 'burden'], 'phantom', 'favor', (id) => ({ id, seq: 3 }));
  assert.deepEqual(replaced.hand.map((c) => c.id), ['mark', 'phantom']);
  assert.equal(R.fateAccept(held, ['phantom'], 'phantom', null, (id) => ({ id, seq: 3 })), null);
  const instant = R.fateAccept(held, ['decree'], 'decree', null, (id) => ({ id, seq: 3 }));
  assert.equal(instant.instant, 'decree');
  assert.equal(instant.hand.length, 2);
  assert.equal(R.fateAccept(held, ['decree'], 'decree', 'favor', (id) => ({ id, seq: 3 })), null);
  assert.equal(R.fateAccept([], ['favor'], 'mark', null, (id) => ({ id, seq: 1 })), null);
});

test("the King's Favor lengthens the first die only when that march is legal", () => {
  const board = [pc(0, 0)];
  const held = hands(0, [{ id: 'favor', seq: 1, born: 1 }]);
  const opts = R.options(board, 0, [{ v: 2 }, { v: 4 }], null, held);
  assert.equal(opts.find((o) => o.di === 0).v, 3);
  assert.equal(opts.find((o) => o.di === 0).favor, true);
  assert.equal(opts.find((o) => o.di === 1).v, 4);
  assert.equal(opts.find((o) => o.di === 1).favor, false);
  const near = [pc(0, 65)];
  const exact = R.options(near, 0, [{ v: 6 }], null, held);
  assert.equal(exact[0].v, 6);
  assert.equal(exact[0].favor, false);
  assert.equal(exact[0].r.np, R.GOAL);
});

test('Phantom March and Wayfarer\'s Grace pass a phalanx and still cannot land on it', () => {
  const foeA = pc(1, 56, 0);
  const foeB = pc(1, 56, 1);
  const mover = pc(0, 3);
  const wall = [mover, foeA, foeB];
  assert.equal(R.moveResult(wall, mover, 4, null), null);
  const passed = R.moveResult(wall, mover, 4, null, hands(0, [{ id: 'phantom' }]));
  assert.equal(passed.np, 7);
  assert.equal(R.moveResult(wall, mover, 2, null, hands(0, [{ id: 'phantom' }])), null);
  const ownA = pc(0, 5, 1);
  const ownB = pc(0, 5, 2);
  const own = [mover, ownA, ownB];
  assert.equal(R.moveResult(own, mover, 4, null), null);
  const grace = R.moveResult(own, mover, 4, null, hands(0, [{ id: 'grace' }]));
  assert.equal(grace.np, 7);
  assert.equal(R.moveResult(own, mover, 2, null, hands(0, [{ id: 'grace' }])), null);
});

test('Broken Formation forbids a new phalanx and Sealed Gates keeps the keep shut', () => {
  const friend = pc(0, 6, 1);
  const mover = pc(0, 4);
  assert.equal(R.moveResult([mover, friend], mover, 2, null).np, 6);
  assert.equal(R.moveResult([mover, friend], mover, 2, null, hands(0, [{ id: 'broken' }])), null);
  const gate = pc(0, -1);
  assert.equal(R.moveResult([gate], gate, 1, null).exit, true);
  assert.equal(R.moveResult([gate], gate, 1, null, hands(0, [{ id: 'sealed' }])), null);
});

test('The Unbroken leaves the troop standing and spends itself', () => {
  const mover = pc(0, 9);
  const foe = pc(1, 61);
  const board = [mover, foe];
  const held = hands(1, [{ id: 'unbroken', seq: 1, born: 1 }]);
  const open = R.moveResult(board, mover, 1, null);
  assert.equal(open.captures[0], foe);
  const spared = R.moveResult(board, mover, 1, null, held);
  assert.equal(spared.np, 10);
  assert.equal(spared.captures.length, 0);
  assert.equal(spared.spared[0], foe);
  const done = R.fateResolve(held, 0, { spared: [1] });
  assert.equal(done.hands[1].length, 0);
  assert.equal(done.spent[0].id, 'unbroken');
});

test('The Pilgrim adds two on the move into the passage', () => {
  const entering = pc(0, 62);
  const held = hands(0, [{ id: 'pilgrim', seq: 1 }]);
  const step = R.moveResult([entering], entering, 2, null, held);
  assert.equal(step.np, 66);
  assert.equal(step.pilgrim, true);
  const early = R.moveResult([pc(0, 60)], pc(0, 60), 2, null, held);
  assert.equal(early.np, 62);
  assert.equal(early.pilgrim, undefined);
  const inside = R.moveResult([pc(0, 66)], pc(0, 66), 2, null, held);
  assert.equal(inside.np, 70);
  assert.equal(inside.pilgrim, true);
});

test('capture and vault bonuses follow the card that was drawn later', () => {
  const mark = hands(0, [{ id: 'mark', seq: 2 }, { id: 'burden', seq: 3, born: 1 }]);
  const strike = R.fateResolve(mark, 0, { captures: 1 });
  assert.equal(strike.captureBonus, 30);
  assert.deepEqual(strike.hands[0].map((c) => c.id), ['burden']);
  const burden = R.fateResolve(hands(0, [{ id: 'burden', seq: 1, born: 1 }]), 0, { goal: true, pilgrim: false });
  assert.equal(burden.vaultBonus, 10);
  assert.equal(burden.hands[0].length, 0);
  const home = R.fateResolve(hands(0, [{ id: 'pilgrim', seq: 1 }]), 0, { goal: true });
  assert.equal(home.hands[0].length, 0);
});

test('a card lasts through the next turn, and True Sight follows the mist', () => {
  const held = hands(0, [
    { id: 'favor', seq: 1, born: 1 },
    { id: 'grace', seq: 2, born: 1 },
    { id: 'sight', seq: 3, mist: 'wait' },
  ]);
  const still = R.fateTick(held, { turn: { h: 0, count: 2 } });
  assert.equal(still.hands[0].length, 3);
  const turned = R.fateTick(held, { turn: { h: 0, count: 3 } });
  assert.deepEqual(turned.spent.map((s) => s.id).sort(), ['favor', 'grace']);
  const woke = R.fateTick(held, { mist: true });
  assert.equal(woke.hands[0].find((c) => c.id === 'sight').mist, 'live');
  assert.equal(R.fateSees(woke.hands[0]), true);
  const lifted = R.fateTick(woke.hands, { mist: false });
  assert.equal(lifted.hands[0].some((c) => c.id === 'sight'), false);
});

test('the computer keeps the stronger card and drops a curse to make room', () => {
  const pick = R.bestFate(['burden', 'mark'], [], [pc(0, 4)], 0);
  assert.equal(pick.pick, 'mark');
  assert.equal(pick.drop, null);
  const full = [{ id: 'burden', seq: 1 }, { id: 'broken', seq: 2 }];
  const swap = R.bestFate(['mark'], full, [pc(0, 4)], 0);
  assert.equal(swap.pick, 'mark');
  assert.equal(swap.drop, 'burden');
  const decree = R.bestFate(['decree', 'burden'], full, [pc(0, -1)], 0);
  assert.equal(decree.pick, 'decree');
  assert.equal(decree.drop, null);
});

test('the Wanderer carries the shrine troop to an empty square on its road', () => {
  const troop = pc(0, 7);
  const blocker = pc(0, 10, 1);
  const seen = new Set();
  for (let i = 0; i < 64; i++) {
    const land = R.wanderSquare([troop, blocker], troop, () => i / 64);
    assert.ok(land);
    assert.notEqual(land.np, 7);
    assert.notEqual(land.np, 10);
    const ti = R.trackIndex(0, land.np);
    assert.equal(R.SAFE.has(ti) && R.STARTS.indexOf(ti) < 0, false);
    assert.equal(land.np > R.LAST, false);
    seen.add(land.np > 7 ? 'ahead' : 'behind');
  }
  assert.ok(seen.has('ahead'));
  assert.ok(seen.has('behind'));
  const packed = [troop];
  for (let p = 0; p <= R.LAST; p++) if (p !== 7) packed.push(pc(0, p, p + 1));
  assert.equal(R.wanderSquare(packed, troop, () => 0), null);
  const used = R.fateResolve(hands(0, [{ id: 'favor', seq: 1, born: 1 }]), 0, { favor: true });
  assert.equal(used.hands[0].some((c) => c.id === 'favor'), false);
});
