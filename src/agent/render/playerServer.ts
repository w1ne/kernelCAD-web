// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/playerServer.ts
//
// Self-contained base-URL provisioning for the headless render pipeline
// (#440). Historically every render needed a RUNNING studio dev server at
// http://localhost:5173 — a precondition headless agents don't satisfy. This
// module removes it:
//
//   resolveRenderBaseUrl() →
//     1. the bundled static player (dist/headless-player, built by
//        `npm run build:player`), served from an ephemeral 127.0.0.1 port —
//        fully self-contained, deterministic, preferred; else
//     2. a live studio dev server probe (DEFAULT_RENDER_BASE_URL / VITE_PORT)
//        — the legacy path, kept as fallback for repo dev workflows where the
//        static bundle was never built; else
//     3. a typed KernelError telling the caller exactly how to get one.
//
// The static player is the SAME DemoPlayerPage component the dev server
// serves (see vite.player.config.ts) — camera math and the
// window.__demoPlayer bridge are shared, so captures are identical either way.

import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RENDER_BASE_URL } from './headlessRender';

export interface ResolvedRenderBase {
  baseUrl: string;
  /** Which provisioning lane satisfied the request. */
  source: 'static-player' | 'dev-server' | 'explicit';
  /** Shut down the ephemeral static server (no-op for the other lanes). */
  close: () => Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.hdr': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

/** Dev-server base URL honoring the VITE_PORT override (same convention as
 *  the animation capture engine). */
export function devServerBaseUrl(): string {
  const port = process.env.VITE_PORT;
  return port !== undefined && port !== ''
    ? `http://localhost:${port}`
    : DEFAULT_RENDER_BASE_URL;
}

/**
 * Locate the prebuilt static player (dist/headless-player). Checked in order:
 *   1. KERNELCAD_PLAYER_DIST env override (tests, exotic installs),
 *   2. <moduleDir>/../headless-player — the published-package layout, where
 *      the CLI bundle lives at dist/cli/index.js and the player at
 *      dist/headless-player/,
 *   3. <repoRoot>/dist/headless-player — the in-repo layout when running
 *      from source (src/agent/render → repo root is three levels up).
 */
export function findPlayerDist(): string | undefined {
  const moduleDir = fileURLToPath(new URL('.', import.meta.url));
  const candidates = [
    process.env.KERNELCAD_PLAYER_DIST,
    resolve(moduleDir, '..', 'headless-player'),
    resolve(moduleDir, '..', '..', '..', 'dist', 'headless-player'),
  ];
  for (const dir of candidates) {
    if (dir !== undefined && dir !== '' && existsSync(join(dir, 'index.html'))) {
      return dir;
    }
  }
  return undefined;
}

/**
 * Serve `distDir` on an ephemeral 127.0.0.1 port. Routing mirrors the studio
 * dev server's SPA behavior for the one route the render pipeline visits:
 * any extension-less path (e.g. /demo-player?headless=1) gets index.html;
 * everything else is a static file lookup confined to distDir.
 */
export async function startPlayerServer(
  distDir: string,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const root = resolve(distDir);
  const server: Server = createServer((req, res) => {
    void (async () => {
      const rawPath = (req.url ?? '/').split('?')[0];
      let pathname: string;
      try {
        pathname = decodeURIComponent(rawPath);
      } catch {
        res.writeHead(400).end('bad request');
        return;
      }
      const ext = extname(pathname);
      const relative = ext === '' ? 'index.html' : `.${pathname}`;
      const filePath = resolve(root, normalize(relative));
      // Path-traversal guard: the resolved file must stay inside distDir.
      if (filePath !== root && !filePath.startsWith(root + '/') && !filePath.startsWith(root + '\\')) {
        res.writeHead(403).end('forbidden');
        return;
      }
      try {
        const body = await readFile(ext === '' ? join(root, 'index.html') : filePath);
        res.writeHead(200, {
          'content-type': CONTENT_TYPES[ext === '' ? '.html' : ext] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    })();
  });
  await new Promise<void>((res, rej) => {
    server.once('error', rej);
    server.listen(0, '127.0.0.1', () => res());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('playerServer: could not determine the listening port');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((res) => {
        server.close(() => res());
        // Don't keep the process alive on close-stragglers.
        server.closeAllConnections?.();
      }),
  };
}

/** True when an HTTP GET of `${baseUrl}/demo-player` answers 200 within
 *  `timeoutMs`. The vite dev server SPA-serves index.html for that route. */
export async function probeDevServer(baseUrl: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/demo-player?headless=1`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve a base URL the headless render pipeline can drive.
 *
 * `explicit` (a caller-provided base_url) bypasses provisioning entirely —
 * the caller asked for that server, so failures surface from the render
 * itself rather than a probe.
 */
export async function resolveRenderBaseUrl(explicit?: string): Promise<ResolvedRenderBase> {
  if (explicit !== undefined && explicit !== '') {
    return { baseUrl: explicit, source: 'explicit', close: async () => undefined };
  }
  const dist = findPlayerDist();
  if (dist !== undefined) {
    const { baseUrl, close } = await startPlayerServer(dist);
    return { baseUrl, source: 'static-player', close };
  }
  const devBase = devServerBaseUrl();
  if (await probeDevServer(devBase)) {
    return { baseUrl: devBase, source: 'dev-server', close: async () => undefined };
  }
  throw new Error(
    'No render surface available: the bundled static player (dist/headless-player) was not found ' +
      `and no studio dev server answered at ${devBase}. ` +
      'Run `npm run build:player` once (in-repo), reinstall the kernelcad package (published builds bundle the player), ' +
      'or start `npm run dev` and retry.',
  );
}
