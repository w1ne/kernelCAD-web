// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { randomUUID } from 'node:crypto';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuiltModel } from '../../composition/buildModel';

interface ViewerOptions {
  dist?: string;
  mesh?: (model: BuiltModel) => Promise<unknown>;
}

function findViewerDist(): string | undefined {
  if (process.env.KERNELCAD_VIEWER_DIST !== undefined) return process.env.KERNELCAD_VIEWER_DIST;
  const dir = fileURLToPath(new URL('.', import.meta.url));
  return [process.env.KERNELCAD_VIEWER_DIST, resolve(dir, '../mcp-viewer'), resolve(dir, '../../../dist/mcp-viewer')]
    .find(candidate => candidate && existsSync(resolve(candidate, 'index.html')));
}

async function meshModel(model: BuiltModel): Promise<unknown> {
  const [{ meshFeaturesPerFeature }, { serializeForBridge }, { viewerDimensionsForRoot }] = await Promise.all([
    import('../../modeling/capture/featureMeshing'),
    import('../../modeling/capture/featureMeshSerialize'),
    import('../../composition/viewerDimensionsForModel'),
  ]);
  const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
  if (meshing.failedFeatureIds.length) throw new Error(`Failed to mesh: ${meshing.failedFeatureIds.join(', ')}`);
  return {
    source: model.code,
    features: meshing.features.map(serializeForBridge),
    featureRecords: model.records,
    bounds: meshing.bounds,
    params: model.session.paramTable.serialize(),
    rootFeatureIds: model.rootId ? [model.rootId] : [],
    dimensions: viewerDimensionsForRoot(model).dimensions,
  };
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

const UPDATE_FRAME = 'event: relower\ndata: {"affectedIds":[]}\n\nevent: source-changed\ndata: {}\n\n';
interface ViewerState {
  model?: BuiltModel;
  mesh?: Promise<unknown>;
  clients: Set<ServerResponse>;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function subscribeViewer(req: IncomingMessage, res: ServerResponse, clients: Set<ServerResponse>): void {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(UPDATE_FRAME); // Reconnects catch up even if an update was missed.
  clients.add(res);
  req.socket.unref();
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 15_000);
  heartbeat.unref();
  res.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
}

function cachedMesh(state: ViewerState, model: BuiltModel, meshModel: (model: BuiltModel) => Promise<unknown>): Promise<unknown> {
  if (!state.mesh) {
    const pending = meshModel(model).catch(error => {
      if (state.mesh === pending) state.mesh = undefined;
      throw error;
    });
    state.mesh = pending;
  }
  return state.mesh;
}

async function serveViewerApi(req: IncomingMessage, res: ServerResponse, request: URL, token: string, state: ViewerState, meshModel: (model: BuiltModel) => Promise<unknown>): Promise<void> {
  if (req.method !== 'GET') { json(res, 405, { error: 'MCP drives this viewer; edit through MCP and evaluate again.' }); return; }
  const model = state.model;
  if (!model || (request.searchParams.get('script') !== token && request.searchParams.get('session') !== token)) {
    json(res, 404, { error: 'unknown viewer session' }); return;
  }
  switch (request.pathname) {
    case '/__kernelcad/source': json(res, 200, { source: model.code ?? '' }); return;
    case '/__kernelcad/session': json(res, 200, { sessionToken: token }); return;
    case '/__kernelcad/mesh': json(res, 200, await cachedMesh(state, model, meshModel)); return;
    case '/__kernelcad/review':
      // Build diagnostics, not a claim of a full CAD/physics review.
      json(res, 200, { ok: !model.diagnostics?.some(d => d.severity === 'error'), diagnostics: model.diagnostics ?? [], live: true, sourceReplaced: true }); return;
    case '/__kernelcad/events': subscribeViewer(req, res, state.clients); return;
    default: json(res, 404, { error: 'unsupported viewer endpoint' }); return;
  }
}

async function serveViewerAsset(res: ServerResponse, request: URL, root: string): Promise<void> {
  const path = decodeURIComponent(request.pathname);
  const file = resolve(root, path === '/' ? 'index.html' : `.${path}`);
  if (!file.startsWith(root + sep)) { json(res, 403, { error: 'forbidden path' }); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { json(res, 404, { error: 'not found' }); }
}

function viewerServer(root: string, token: string, state: ViewerState, mesh: (model: BuiltModel) => Promise<unknown>, getUrl: () => string): Server {
  return createServer((req, res) => {
    const serve = async () => {
      // Exact Host/Origin checks prevent DNS rebinding and cross-origin source reads.
      const origin = new URL(getUrl()).origin;
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
        json(res, 403, { error: 'forbidden origin' }); return;
      }
      const request = new URL(req.url ?? '/', origin);
      if (request.pathname.startsWith('/__kernelcad/')) await serveViewerApi(req, res, request, token, state, mesh);
      else await serveViewerAsset(res, request, root);
    };
    void serve().catch(error => {
      if (!res.headersSent) json(res, 500, { error: error instanceof Error ? error.message : String(error) });
      else res.end();
    });
  });
}

/** One process-local MCP edit loop. The token and URL survive model replacement.
 * No files are written and no script is re-evaluated to open the viewer. */
export function createLiveViewer(options: ViewerOptions = {}) {
  const token = randomUUID();
  const state: ViewerState = { clients: new Set() };
  let server: Server | undefined;
  let starting: Promise<string> | undefined;
  let url = '';

  async function start(): Promise<string> {
    const dist = options.dist ?? findViewerDist();
    if (!dist || !existsSync(resolve(dist, 'index.html'))) {
      throw new Error('Studio viewer bundle missing. Run npm run build:mcp-viewer or reinstall kernelcad.');
    }
    server = viewerServer(resolve(dist), token, state, options.mesh ?? meshModel, () => url);
    await new Promise<void>((done, fail) => {
      server!.once('error', fail);
      server!.listen(0, '127.0.0.1', done);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Could not bind Studio viewer.');
    url = `http://127.0.0.1:${address.port}/?script=${token}&mcp=1`;
    server.unref();
    return url;
  }

  return {
    async update(next: BuiltModel): Promise<string> {
      starting ??= start().catch(error => { starting = undefined; throw error; });
      const link = await starting;
      state.model = next;
      state.mesh = undefined;
      for (const client of state.clients) client.write(UPDATE_FRAME);
      return link;
    },
    async close(): Promise<void> {
      if (starting) await starting.catch(() => undefined);
      for (const client of state.clients) client.end();
      state.clients.clear();
      if (server) await new Promise<void>(done => { server!.close(() => done()); server!.closeAllConnections(); });
      server = undefined;
      starting = undefined;
      state.model = undefined;
      state.mesh = undefined;
    },
  };
}

let lastViewerResult: { viewerUrl?: string; viewerError?: string } | undefined;
/** Identity changes on every full build, even though viewerUrl remains stable. */
export function getMcpViewerResult() { return lastViewerResult; }

let viewer: ReturnType<typeof createLiveViewer> | undefined;
export async function updateMcpViewer(model: BuiltModel): Promise<{ viewerUrl?: string; viewerError?: string }> {
  try {
    viewer ??= createLiveViewer();
    lastViewerResult = { viewerUrl: await viewer.update(model) };
    return lastViewerResult;
  } catch (error) {
    lastViewerResult = { viewerError: error instanceof Error ? error.message : String(error) };
    return lastViewerResult;
  }
}
export async function closeMcpViewer(): Promise<void> {
  await viewer?.close();
  viewer = undefined;
  lastViewerResult = undefined;
}
