/* Shared Node request helpers for the dashboard and the metrics ingest. */
export function send(res, status, body, headers) {
  if (res.headersSent) return;
  if (status === 204) { res.writeHead(204, { 'Cache-Control': 'no-store', ...headers }); res.end(); return; }
  const html = typeof body === 'string';
  res.writeHead(status, {
    'Content-Type': html ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(html ? body : JSON.stringify(body));
}

export function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  });
  return out;
}

export function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || '';
}

export function readBody(req, limit = 16384) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) {
        req.destroy();
        reject(Object.assign(new Error('too large'), { code: 'too-large' }));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function formFields(buf) {
  const out = {};
  String(buf).split('&').forEach((part) => {
    if (!part) return;
    const i = part.indexOf('=');
    const k = decodeURIComponent((i < 0 ? part : part.slice(0, i)).replace(/\+/g, ' '));
    const v = decodeURIComponent((i < 0 ? '' : part.slice(i + 1)).replace(/\+/g, ' '));
    out[k] = v;
  });
  return out;
}

export function pathname(req) {
  try { return new URL(req.url || '/', 'http://x').pathname; } catch { return '/'; }
}
