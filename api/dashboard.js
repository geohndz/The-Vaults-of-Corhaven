import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { send, readBody, formFields } from '../server/http.js';
import { isAuthed, hideDashboard, checkPassword, mintCookie, clearCookie, authRequired } from '../server/auth.js';

const pagePath = fileURLToPath(new URL('../server/dashboard.html', import.meta.url));
async function html() {
  return readFile(pagePath, 'utf8');
}

export default async function handler(req, res) {
  if (hideDashboard()) return send(res, 404, 'Not found');
  const method = req.method || 'GET';
  if (method === 'POST') {
    const fields = formFields(await readBody(req, 4096));
    if (fields.logout) {
      return send(res, 303, 'See Other', { 'Set-Cookie': clearCookie(), Location: '/dashboard' });
    }
    if (!authRequired() || checkPassword(fields.password || '')) {
      return send(res, 303, 'See Other', { 'Set-Cookie': mintCookie(), Location: '/dashboard' });
    }
    const body = (await html()).replace('{{AUTHED}}', 'false').replace('{{ERROR}}', 'That word does not open the records.');
    return send(res, 200, body);
  }
  if (method !== 'GET' && method !== 'HEAD') return send(res, 405, 'Method not allowed');
  const authed = isAuthed(req);
  const body = (await html()).replace('{{AUTHED}}', authed ? 'true' : 'false').replace('{{ERROR}}', '');
  return send(res, 200, body);
}
