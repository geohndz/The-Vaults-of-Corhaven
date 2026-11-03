import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitize, merge, summarize } from '../server/metrics.js';

test('sanitize keeps a well-formed match and drops a bad id', () => {
  const row = sanitize({
    id: 'local:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_000_900_000,
    mode: 'local',
    outcome: 'vault',
    players: 3,
    humans: 1,
    computers: 2,
    kingdoms: ['Emberhold', 'Solmere', 'nope'],
    winner: 'Emberhold',
    worlds: 2,
    turns: 18,
    device: { form: 'phone', touch: true, xr: false, w: 390, h: 844, lang: 'en-US' },
  });
  assert.equal(row.kingdoms.length, 2);
  assert.equal(row.completed, true);
  assert.equal(row.device.form, 'phone');
  assert.equal(sanitize({ id: 'x', mode: 'local' }), null);
});

test('merge never lets an abandon overwrite a vault', () => {
  const start = sanitize({ id: 'online:ABCDE', startedAt: 100, mode: 'online', outcome: 'playing', players: 2, humans: 2, computers: 0, kingdoms: ['Emberhold', 'Tidereach'] });
  const win = merge(start, sanitize({ id: 'online:ABCDE', startedAt: 100, endedAt: 500, mode: 'online', outcome: 'vault', players: 2, humans: 2, computers: 0, kingdoms: ['Emberhold', 'Tidereach'], winner: 'Tidereach' }));
  const late = merge(win, sanitize({ id: 'online:ABCDE', startedAt: 100, endedAt: 400, mode: 'online', outcome: 'abandoned', players: 2, humans: 2, computers: 0, kingdoms: ['Emberhold', 'Tidereach'] }));
  assert.equal(late.outcome, 'vault');
  assert.equal(late.winner, 'Tidereach');
  assert.equal(late.endedAt, 500);
});

test('summarize reports averages from ended matches', () => {
  const matches = [
    { id: 'a', startedAt: Date.now(), endedAt: Date.now() + 600000, durationMs: 600000, mode: 'local', outcome: 'vault', completed: true, players: 4, humans: 1, computers: 3, kingdoms: ['Emberhold', 'Thornwald', 'Solmere', 'Tidereach'], winner: 'Emberhold', worlds: 2, turns: 20, device: { form: 'desktop' } },
    { id: 'b', startedAt: Date.now(), endedAt: Date.now() + 300000, durationMs: 300000, mode: 'online', outcome: 'abandoned', completed: false, players: 2, humans: 2, computers: 0, kingdoms: ['Emberhold', 'Solmere'], winner: null, worlds: 0, turns: 4, device: { form: 'phone' } },
  ];
  const s = summarize(matches);
  assert.equal(s.total, 2);
  assert.equal(s.ended, 2);
  assert.equal(s.completed, 1);
  assert.equal(s.completionRate, 0.5);
  assert.equal(s.avgPlayers, 3);
  assert.equal(s.avgDurationMs, 450000);
  assert.equal(s.byMode.local, 1);
  assert.equal(s.kingdoms.Emberhold.appeared, 2);
  assert.equal(s.kingdoms.Emberhold.won, 1);
});

test('summarize skips matches marked as test', () => {
  const counted = { id: 'a', startedAt: Date.now(), endedAt: Date.now() + 600000, durationMs: 600000, mode: 'local', outcome: 'vault', completed: true, players: 2, humans: 1, computers: 1, kingdoms: ['Emberhold', 'Solmere'], winner: 'Emberhold', worlds: 1, turns: 10, device: { form: 'desktop' } };
  const skipped = { ...counted, id: 'b', test: true, players: 4, winner: 'Thornwald', kingdoms: ['Emberhold', 'Thornwald'] };
  const s = summarize([counted, skipped]);
  assert.equal(s.total, 1);
  assert.equal(s.avgPlayers, 2);
  assert.equal(s.kingdoms.Thornwald.appeared, 0);
});
