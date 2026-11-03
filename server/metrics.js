/* Match records for the private dashboard. Same Redis as the rooms when REDIS_URL is set. */

const KINGDOMS = ['Emberhold', 'Thornwald', 'Solmere', 'Tidereach'];
const FORMS = ['phone', 'tablet', 'desktop', 'xr'];
const MODES = ['local', 'online'];
const OUTCOMES = ['playing', 'abandoned', 'forfeit', 'vault'];
const WORLD_IDS = ['flood', 'ash', 'wild', 'sun', 'mist', 'ways'];
const RANK = { playing: 0, abandoned: 1, forfeit: 2, vault: 3 };
const ID_RE = /^[A-Za-z0-9:_-]{8,80}$/;
const INDEX = 'corhaven:matches';
const MATCH = (id) => 'corhaven:match:' + id;
const HIT = (ip) => 'corhaven:metrics:ip:' + ip;
const KEEP = 2000;
const TTL = 180 * 24 * 3600;
export const MATCH_LIMIT_MS = 60 * 60 * 1000;

function clampInt(n, lo, hi) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '');
  if (!ID_RE.test(id)) return null;
  const mode = MODES.includes(raw.mode) ? raw.mode : null;
  const outcome = OUTCOMES.includes(raw.outcome) ? raw.outcome : 'playing';
  const kingdoms = Array.isArray(raw.kingdoms)
    ? [...new Set(raw.kingdoms.map((k) => String(k)).filter((k) => KINGDOMS.includes(k)))]
    : [];
  const players = clampInt(raw.players, 1, 4);
  const humans = clampInt(raw.humans, 0, 4);
  const computers = clampInt(raw.computers, 0, 4);
  const startedAt = clampInt(raw.startedAt, 0, Date.now() + 60000);
  const endedAt = raw.endedAt == null ? null : clampInt(raw.endedAt, 0, Date.now() + 60000);
  const device = raw.device && typeof raw.device === 'object' ? {
    form: FORMS.includes(raw.device.form) ? raw.device.form : 'desktop',
    touch: !!raw.device.touch,
    xr: !!raw.device.xr,
    w: clampInt(raw.device.w, 1, 8000),
    h: clampInt(raw.device.h, 1, 8000),
    lang: String(raw.device.lang || '').slice(0, 16),
  } : null;
  const winner = KINGDOMS.includes(raw.winner) ? raw.winner : null;
  return {
    id,
    startedAt: startedAt || Date.now(),
    endedAt,
    mode: mode || 'local',
    outcome,
    completed: outcome === 'vault' || raw.completed === true,
    players: players || kingdoms.length || 2,
    humans: humans == null ? null : humans,
    computers: computers == null ? null : computers,
    kingdoms,
    winner,
    worlds: clampInt(raw.worlds, 0, 200) || 0,
    turns: clampInt(raw.turns, 0, 20000) || 0,
    playerTurns: clampInt(raw.playerTurns, 0, 20000) || 0,
    rounds: clampInt(raw.rounds, 0, 2000) || 0,
    doubles: clampInt(raw.doubles, 0, 20000) || 0,
    greed: clampInt(raw.greed, 0, 2000) || 0,
    worldPicks: sanitizeWorldPicks(raw.worldPicks),
    device,
  };
}

function sanitizeWorldPicks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  WORLD_IDS.forEach((id) => {
    const n = clampInt(raw[id], 0, 200);
    if (n) out[id] = n;
  });
  return out;
}

function mergePicks(a, b) {
  const out = {};
  WORLD_IDS.forEach((id) => {
    const n = Math.max((a && a[id]) || 0, (b && b[id]) || 0);
    if (n) out[id] = n;
  });
  return out;
}

export function merge(prev, next) {
  if (!prev) return { ...next, durationMs: duration(next) };
  const rank = Math.max(RANK[prev.outcome] || 0, RANK[next.outcome] || 0);
  const outcome = OUTCOMES.find((o) => RANK[o] === rank) || next.outcome;
  const startedAt = Math.min(prev.startedAt || next.startedAt, next.startedAt || prev.startedAt);
  const endedAt = [prev.endedAt, next.endedAt].filter((n) => n != null).sort((a, b) => b - a)[0] || null;
  const merged = {
    ...prev,
    ...next,
    id: prev.id,
    startedAt,
    endedAt,
    outcome,
    completed: prev.completed || next.completed || outcome === 'vault',
    kingdoms: next.kingdoms && next.kingdoms.length >= (prev.kingdoms || []).length ? next.kingdoms : prev.kingdoms,
    device: prev.device || next.device,
    winner: outcome === 'vault' || outcome === 'forfeit' ? (next.winner || prev.winner) : (prev.winner || next.winner),
    worlds: Math.max(prev.worlds || 0, next.worlds || 0),
    turns: Math.max(prev.turns || 0, next.turns || 0),
    playerTurns: Math.max(prev.playerTurns || 0, next.playerTurns || 0),
    rounds: Math.max(prev.rounds || 0, next.rounds || 0),
    doubles: Math.max(prev.doubles || 0, next.doubles || 0),
    greed: Math.max(prev.greed || 0, next.greed || 0),
    worldPicks: mergePicks(prev.worldPicks, next.worldPicks),
    players: next.players || prev.players,
    humans: next.humans == null ? prev.humans : next.humans,
    computers: next.computers == null ? prev.computers : next.computers,
    mode: next.mode || prev.mode,
  };
  merged.durationMs = duration(merged);
  merged.test = !!(prev && prev.test);
  return merged;
}

function duration(m) {
  if (!m.endedAt || !m.startedAt || m.outcome === 'playing') return null;
  const ms = m.endedAt - m.startedAt;
  return ms > 0 ? ms : null;
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function settleMatch(m, now = Date.now()) {
  if (!m || m.outcome !== 'playing') return m;
  const started = m.startedAt || 0;
  if (!started || now - started < MATCH_LIMIT_MS) return m;
  const endedAt = started + MATCH_LIMIT_MS;
  return { ...m, outcome: 'abandoned', endedAt, durationMs: MATCH_LIMIT_MS };
}

export function summarize(matches) {
  matches = matches.filter((m) => !m.test).map((m) => settleMatch(m));
  const ended = matches.filter((m) => m.outcome && m.outcome !== 'playing');
  const vault = matches.filter((m) => m.outcome === 'vault');
  const durations = ended.map((m) => m.durationMs).filter((n) => n && n > 4000);
  const players = matches.map((m) => m.players).filter((n) => n > 0);
  const humans = matches.map((m) => m.humans).filter((n) => n != null);
  const computers = matches.map((m) => m.computers).filter((n) => n != null);
  const worlds = ended.map((m) => m.worlds || 0);
  const turns = ended.map((m) => (m.playerTurns != null ? m.playerTurns : m.turns) || 0);
  const rounds = ended.map((m) => (m.rounds != null ? m.rounds : m.worlds) || 0);
  const byMode = { local: 0, online: 0 };
  const byDevice = { phone: 0, tablet: 0, desktop: 0, xr: 0 };
  const byOutcome = { vault: 0, forfeit: 0, abandoned: 0, playing: 0 };
  const kingdoms = {};
  const worldRank = {};
  KINGDOMS.forEach((k) => { kingdoms[k] = { appeared: 0, won: 0 }; });
  WORLD_IDS.forEach((id) => { worldRank[id] = 0; });
  let greedTotal = 0;
  let rollCount = 0;
  let doubleCount = 0;
  matches.forEach((m) => {
    if (byMode[m.mode] != null) byMode[m.mode]++;
    const form = m.device && m.device.form;
    if (byDevice[form] != null) byDevice[form]++;
    if (byOutcome[m.outcome] != null) byOutcome[m.outcome]++;
    (m.kingdoms || []).forEach((k) => { if (kingdoms[k]) kingdoms[k].appeared++; });
    if (m.winner && kingdoms[m.winner]) kingdoms[m.winner].won++;
    greedTotal += m.greed || 0;
    const picks = m.worldPicks || {};
    WORLD_IDS.forEach((id) => { worldRank[id] += picks[id] || 0; });
    if (m.doubles != null || m.playerTurns != null || m.greed != null) {
      rollCount += m.turns || 0;
      doubleCount += m.doubles || 0;
    }
  });
  const week = Date.now() - 7 * 24 * 3600 * 1000;
  const total = matches.length;
  return {
    total,
    ended: ended.length,
    completed: vault.length,
    completionRate: ended.length ? vault.length / ended.length : 0,
    avgDurationMs: avg(durations),
    avgPlayers: avg(players),
    avgHumans: avg(humans),
    avgComputers: avg(computers),
    avgWorlds: avg(worlds),
    avgTurns: avg(turns),
    avgRounds: avg(rounds),
    localShare: total ? byMode.local / total : 0,
    onlineShare: total ? byMode.online / total : 0,
    doublesRate: rollCount ? doubleCount / rollCount : 0,
    rollCount,
    greedTotal,
    worldRank,
    last7Days: matches.filter((m) => m.startedAt >= week).length,
    byMode,
    byDevice,
    byOutcome,
    kingdoms,
  };
}

const mem = { rows: new Map() };

/* The room store hides the Redis client. Open one here when we need sorted sets. */
let cmdPromise = null;
async function redisCmd() {
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (!url) return null;
  if (!cmdPromise) {
    const { default: Redis } = await import('ioredis');
    cmdPromise = new Redis(url, { maxRetriesPerRequest: 3, enableReadyCheck: false });
  }
  return cmdPromise;
}

export async function upsert(patch) {
  const next = sanitize(patch);
  if (!next) return null;
  const cmd = await redisCmd();
  if (!cmd) {
    const prev = mem.rows.get(next.id);
    const merged = merge(prev, next);
    mem.rows.set(merged.id, merged);
    return merged;
  }
  const prevRaw = await cmd.get(MATCH(next.id));
  const prev = prevRaw ? JSON.parse(prevRaw) : null;
  const merged = merge(prev, next);
  await cmd.set(MATCH(merged.id), JSON.stringify(merged), 'EX', TTL);
  await cmd.zadd(INDEX, merged.startedAt, merged.id);
  await cmd.zremrangebyrank(INDEX, 0, -(KEEP + 1));
  return merged;
}

export async function listMatches(limit = 200) {
  const cmd = await redisCmd();
  if (!cmd) {
    return [...mem.rows.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, limit).map((m) => settleMatch(m));
  }
  const ids = await cmd.zrevrange(INDEX, 0, Math.max(0, limit - 1));
  if (!ids.length) return [];
  const rows = await cmd.mget(ids.map(MATCH));
  return rows.filter(Boolean).map((s) => settleMatch(JSON.parse(s)));
}

export async function markTest(id, test) {
  if (!ID_RE.test(String(id || ''))) return null;
  const cmd = await redisCmd();
  if (!cmd) {
    const prev = mem.rows.get(id);
    if (!prev) return null;
    prev.test = !!test;
    mem.rows.set(id, prev);
    return prev;
  }
  const raw = await cmd.get(MATCH(id));
  if (!raw) return null;
  const row = JSON.parse(raw);
  row.test = !!test;
  await cmd.set(MATCH(id), JSON.stringify(row), 'EX', TTL);
  return row;
}

export async function allowIp(ip) {
  if (!ip) return true;
  const cmd = await redisCmd();
  if (!cmd) return true;
  const n = await cmd.incr(HIT(ip));
  if (n === 1) await cmd.expire(HIT(ip), 600);
  return n <= 40;
}

export async function recordFromRoom(room, outcome) {
  if (!room || !room.game || !room.code) return;
  const g = room.game;
  const players = g.players || [];
  const kingdoms = players.map((p) => KINGDOMS[p.h]).filter(Boolean);
  const started = (g.diceStats && g.diceStats.started) || g.themeAt || Date.now();
  const ended = outcome && outcome !== 'playing' ? Date.now() : null;
  const d = g.diceStats || {};
  const picks = d.worldPicks || {};
  const worldCount = WORLD_IDS.reduce((n, id) => n + (picks[id] || 0), 0);
  await upsert({
    id: 'online:' + room.code,
    startedAt: started,
    endedAt: ended,
    mode: 'online',
    outcome: OUTCOMES.includes(outcome) ? outcome : 'playing',
    completed: outcome === 'vault',
    players: players.length,
    humans: players.length,
    computers: 0,
    kingdoms,
    winner: g.winner != null ? KINGDOMS[g.winner] : null,
    worlds: worldCount,
    turns: d.turns || 0,
    playerTurns: d.playerTurns || 0,
    rounds: d.rounds || 0,
    doubles: d.doubles || 0,
    greed: d.greed || 0,
    worldPicks: picks,
  });
}
