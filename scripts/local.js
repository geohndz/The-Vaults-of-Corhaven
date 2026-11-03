/* Serves the game and the online rooms on one port for play on this machine: node scripts/local.js */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { attach } from '../server/hub.js';
import metricsHandler from '../api/metrics.js';
import dashboardHandler from '../api/dashboard.js';

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] == null) process.env[k] = v;
  }
} catch {}

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 3000;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

function run(handler, req, res) {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(err);
    if (!res.headersSent) { res.writeHead(500); res.end('error'); }
  });
}

const server = http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/dashboard' || path === '/api/dashboard') return run(dashboardHandler, req, res);
  if (path === '/api/metrics') return run(metricsHandler, req, res);
  if (path === '/') path = '/The Vaults of Corhaven.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || /[\\/](server|api|scripts|node_modules)[\\/]|[\\/]\./.test(file.slice(root.length - 1))) {
    res.writeHead(404); return res.end();
  }
  try {
    const body = await readFileAsync(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
attach(wss);
server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url, 'http://x').pathname !== '/api/ws') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});
server.listen(port, () => console.log(`The Vaults of Corhaven at http://localhost:${port}`));
