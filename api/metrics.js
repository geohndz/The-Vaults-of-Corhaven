import { send, readBody, clientIp } from '../server/http.js';
import { isAuthed, hideDashboard } from '../server/auth.js';
import { upsert, listMatches, summarize, allowIp } from '../server/metrics.js';

export default async function handler(req, res) {
  const method = req.method || 'GET';
  if (method === 'POST') {
    if (!(await allowIp(clientIp(req)))) return send(res, 429, { error: 'slow' });
    let raw;
    try { raw = JSON.parse(String(await readBody(req))); } catch (e) {
      return send(res, e.code === 'too-large' ? 413 : 400, { error: 'bad' });
    }
    const row = await upsert(raw);
    if (!row) return send(res, 400, { error: 'bad' });
    return send(res, 204, '');
  }
  if (method !== 'GET') return send(res, 405, { error: 'method' });
  if (hideDashboard() || !isAuthed(req)) return send(res, 401, { error: 'auth' });
  const matches = await listMatches(200);
  return send(res, 200, { stats: summarize(matches), matches });
}
