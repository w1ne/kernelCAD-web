#!/usr/bin/env node
// Standalone HTTP save server for Studio's marking-tool packets.
//
// Why this exists: the vite dev server's middleware is the obvious place to
// land the POST, but vite's main thread routinely spikes to 100% CPU under
// OCCT/replicad transform load and drops connections for minutes at a time.
// When that happens the user paints, hits "Save", and nothing reaches disk
// — fragile in the exact moment the feature is supposed to be invisible.
//
// This is a 50-line http.Server on a separate Node process. It only does the
// POST /__kernelcad/review-paint endpoint, with permissive CORS for the vite
// origin. Run alongside vite (npm-run-all or two terminals); if vite hangs
// the save still works.
//
// Listens on 127.0.0.1:5174 by default. Override with REVIEW_PAINT_PORT.

import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, existsSync, unlinkSync, symlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.REVIEW_PAINT_PORT ?? 5174);
const HOST = '127.0.0.1';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function isPathInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveExampleScript(script) {
  if (!script) return null;
  const examplesRoot = resolve(repoRoot, 'examples');
  const scriptPath = resolve(repoRoot, script);
  if (!script.endsWith('.kcad.ts') || !isPathInside(examplesRoot, scriptPath)) {
    return null;
  }
  return scriptPath;
}

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-max-age', '600');
}

function stripDataUrl(s) {
  const comma = s.indexOf(',');
  const b64 = comma === -1 ? s : s.slice(comma + 1);
  return Buffer.from(b64, 'base64');
}

const server = createServer(async (req, res) => {
  try {
    setCors(res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.url !== '/__kernelcad/review-paint' || req.method !== 'POST') {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'POST /__kernelcad/review-paint only' }));
      return;
    }

    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      chunks.push(chunk);
      total += chunk.length;
      if (total > 16 * 1024 * 1024) {
        res.statusCode = 413;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'packet too large (max 16MB)' }));
        return;
      }
    }
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    const scriptPath = resolveExampleScript(parsed.meta?.scriptPath ?? null);
    const ts = (parsed.meta?.ts ?? new Date().toISOString()).replace(/[:]/g, '-');
    const reviewRoot = scriptPath
      ? `${scriptPath}.review-paint`
      : resolve(repoRoot, '.review-paint');
    const packetDir = join(reviewRoot, ts);
    mkdirSync(packetDir, { recursive: true });
    // Screenshot may be empty when the renderer canvas wasn't found at save
    // time (e.g. brush toggled before the kernel was ready). The mask is
    // always present; the agent can read the painted strokes from it alone.
    if (parsed.screenshot && parsed.screenshot.length > 100) {
      writeFileSync(join(packetDir, 'screenshot.png'), stripDataUrl(parsed.screenshot));
    }
    writeFileSync(join(packetDir, 'mask.png'), stripDataUrl(parsed.mask));
    writeFileSync(
      join(packetDir, 'meta.json'),
      JSON.stringify(
        {
          note: parsed.meta?.note ?? '',
          // Preset intent tags the user picked ("too thick", "missing", …).
          // Carries WHAT is wrong, complementing struckParts (WHERE).
          tags: Array.isArray(parsed.meta?.tags) ? parsed.meta.tags : [],
          scriptPath: scriptPath ? relative(repoRoot, scriptPath) : null,
          ts: parsed.meta?.ts ?? new Date().toISOString(),
          ua: parsed.meta?.ua ?? '',
          screenshotMissing: !!parsed.meta?.screenshotMissing,
          // Assembly part names the brush hit (from a viewport raycast at
          // save time). Lets the agent see *which structures* were marked,
          // not just where the strokes landed on screen.
          struckParts: Array.isArray(parsed.meta?.struckParts) ? parsed.meta.struckParts : [],
          // Per-save diagnostics — counts of painted samples, rays, hits,
          // named hits. When struckParts is empty these tell us *why* (no
          // snapshot, rays missed all meshes, hits had no usable identifier).
          raycastDebug: parsed.meta?.raycastDebug ?? null,
        },
        null,
        2,
      ),
    );
    // Replace `latest` symlink so the agent's hook + MCP tool find the
    // newest packet by simply resolving `latest` instead of sorting timestamps.
    const latest = join(reviewRoot, 'latest');
    try { if (existsSync(latest)) unlinkSync(latest); } catch { /* ignore */ }
    try { symlinkSync(basename(packetDir), latest, 'dir'); } catch { /* platforms without symlink permission */ }

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, path: relative(repoRoot, packetDir) }));
    console.log(`[review-paint-server] wrote ${relative(repoRoot, packetDir)}`);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    console.error(`[review-paint-server] error:`, err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[review-paint-server] listening on http://${HOST}:${PORT}`);
  console.log(`[review-paint-server] writing packets under ${repoRoot}`);
});
