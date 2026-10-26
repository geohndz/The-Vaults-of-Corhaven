import http from 'node:http';
import { WebSocketServer } from 'ws';
import { attach } from '../server/hub.js';

const server = http.createServer((req, res) => {
  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('Expected a WebSocket connection');
});
attach(new WebSocketServer({ server, maxPayload: 4096 }));

export default server;
