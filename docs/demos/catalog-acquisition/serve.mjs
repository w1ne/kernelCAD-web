// Local static server for the acquisition-page browser demo and HTTP checks.
// Invocation: node docs/demos/catalog-acquisition/serve.mjs site-build 4179
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'site-build');
const port = Number(process.argv[3] ?? 4179);
const maxLifetimeMs = 15 * 60 * 1000;
const idleTimeoutMs = 2 * 60 * 1000;
const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.step': 'application/step', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const hostHeaders = new Map();
try {
  let currentPath = null;
  for (const line of readFileSync(join(root, '_headers'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      currentPath = line.trim();
      hostHeaders.set(currentPath, {});
    } else if (currentPath) {
      const match = line.trim().match(/^([^:]+):\s*(.*)$/);
      if (match) hostHeaders.get(currentPath)[match[1].toLowerCase()] = match[2];
    }
  }
} catch {
  // Builds without generated download headers still serve ordinary static files.
}

let closed = false;
let idleTimer;
const server = createServer((request, response) => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(stop, idleTimeoutMs);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400).end(); return; }
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const target = resolve(root, `.${relativePath}`);
  if (!target.startsWith(`${root}${sep}`) && target !== root) { response.writeHead(403).end(); return; }
  let file = target;
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    const headers = {
      'Content-Length': String(info.size),
      'Content-Type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      ...(hostHeaders.get(pathname) ?? {}),
    };
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Length': '0' }).end();
  }
});

function stop() {
  if (closed) return;
  closed = true;
  clearTimeout(idleTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1_000).unref();
}

server.listen(port, '127.0.0.1', () => {
  console.log(`catalog static server http://127.0.0.1:${port} root=${root}; max=${maxLifetimeMs}ms idle=${idleTimeoutMs}ms`);
  idleTimer = setTimeout(stop, idleTimeoutMs);
});
setTimeout(stop, maxLifetimeMs).unref();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
