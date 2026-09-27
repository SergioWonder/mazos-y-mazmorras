// Dev tool: receives PNG frames posted by scripts/sprite-capture.ts (running in
// the browser on the Vite dev server) and writes them under an output folder.
// Usage: node scripts/frame-sink.mjs <output-dir> [port=5199]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'frames');
const port = Number(process.argv[3] ?? 5199);
fs.mkdirSync(root, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = (url.searchParams.get('path') ?? '').replace(/\\/g, '/');
  const file = path.resolve(root, rel);
  if (req.method !== 'POST' || !rel.endsWith('.png') || !file.startsWith(root + path.sep)) {
    res.statusCode = 400; res.end('bad request'); return;
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const b64 = body.slice(body.indexOf(',') + 1);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    res.end('ok');
  });
}).listen(port, () => console.log(`frame sink: ${root} on http://localhost:${port}`));
