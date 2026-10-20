// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Focused coverage for the /__kernelcad/bom session-parity branch: a valid
// pool token computes from the pooled BuiltModel (not a script re-eval), and
// an unknown token falls back to the script path instead of 500ing. Uses the
// same vite-config boot harness as viteReviewLiveEndpoint.test.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import viteConfig from '../../../vite.config';
import { computeBom } from '../../../src/agent/script-runtime/bom';
import { inspectBomTool } from '../../../src/agent/mcp/tools/inspectBom';

const h = vi.hoisted(() => ({ liveToken: 'tok-live' }));

const bomRows = [
  {
    item: 1,
    name: 'panel',
    quantity: 1,
    kind: 'fabricated' as const,
    material: 'aluminum',
    density: 2700,
    massGPerUnit: 12,
    massGTotal: 12,
    bboxMm: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] },
    process: 'sheet-cut' as const,
    processSource: 'declared' as const,
    instancePaths: ['panel'],
  },
];
const bomTotals = { partCount: 1, uniquePartCount: 1, totalMassG: 12 };

const pooledEntry = {
  model: {
    records: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    session: { assemblies: new Map([['main', { name: 'main' }]]) },
  },
};

vi.mock('../../../src/agent/script-runtime/bom', () => ({
  computeBom: vi.fn(async () => ({ rows: bomRows, totals: bomTotals, diagnostics: [] })),
}));

vi.mock('../../../src/agent/mcp/tools/inspectBom', () => ({
  inspectBomTool: vi.fn(async () => ({
    ok: true,
    featureCount: 3,
    assembly: 'main',
    rows: bomRows,
    totals: bomTotals,
    diagnostics: [],
  })),
}));

vi.mock('../../../src/server/sessionPool', () => ({
  createSessionPool: vi.fn(() => ({
    get: vi.fn((token: string) => (token === h.liveToken ? pooledEntry : undefined)),
    prune: vi.fn(),
    rebuildByScript: vi.fn(),
  })),
}));

vi.mock('../../../src/server/middleware/sessionEndpoint', () => ({
  createSessionEndpoint: vi.fn(() => async () => undefined),
}));
vi.mock('../../../src/server/middleware/eventsEndpoint', () => ({
  createEventsEndpoint: vi.fn(() => async () => undefined),
}));
vi.mock('../../../src/server/middleware/paramsEndpoint', () => ({
  createParamsEndpoint: vi.fn(() => async () => undefined),
}));
vi.mock('../../../src/server/middleware/transformsEndpoint', () => ({
  createTransformsEndpoint: vi.fn(() => async () => undefined),
}));
vi.mock('../../../src/server/middleware/animationBakeEndpoint', () => ({
  createAnimationBakeEndpoint: vi.fn(() => async () => undefined),
}));
vi.mock('../../../src/composition/buildModel', () => ({
  buildModelFromFile: vi.fn(),
}));

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

async function getBomHandler(): Promise<Handler> {
  const resolved = typeof viteConfig === 'function'
    ? await viteConfig({ command: 'serve', mode: 'test' })
    : viteConfig;
  const plugin = (resolved.plugins ?? [])
    .flat()
    .find((candidate) => candidate && candidate.name === 'kernelcad-mesh-endpoint');
  if (!plugin || !('configureServer' in plugin) || typeof plugin.configureServer !== 'function') {
    throw new Error('kernelcad-mesh-endpoint plugin not found');
  }

  const handlers = new Map<string, Handler>();
  plugin.configureServer({
    middlewares: {
      use: (path: string, handler: Handler) => {
        handlers.set(path, handler);
      },
    },
    ws: { send: vi.fn() },
    config: { logger: { info: vi.fn(), error: vi.fn() } },
  } as never);

  const handler = handlers.get('/__kernelcad/bom');
  if (!handler) throw new Error('/__kernelcad/bom handler not registered');
  return handler;
}

function createResponse() {
  let body = '';
  const headers = new Map<string, string>();
  const res = {
    statusCode: 0,
    setHeader: (name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    },
    end: (chunk: string) => {
      body = chunk;
    },
  };
  return {
    res: res as unknown as ServerResponse,
    read: () => ({
      statusCode: res.statusCode,
      contentType: headers.get('content-type'),
      json: JSON.parse(body) as {
        ok?: boolean;
        featureCount?: number;
        assembly?: string;
        rows?: unknown[];
        totals?: unknown;
        error?: string;
      },
    }),
  };
}

describe('Vite /__kernelcad/bom session parity', () => {
  beforeEach(() => {
    vi.mocked(computeBom).mockClear();
    vi.mocked(inspectBomTool).mockClear();
  });

  it('computes from the pooled model when a valid session token is present', async () => {
    const handler = await getBomHandler();
    const { res, read } = createResponse();

    await handler({
      method: 'GET',
      url: '?session=tok-live&script=examples/bom/panel-with-fasteners.kcad.ts',
    } as IncomingMessage, res);

    const response = read();
    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('application/json');
    expect(response.json.ok).toBe(true);
    expect(response.json.assembly).toBe('main');
    expect(response.json.featureCount).toBe(3);
    expect(response.json.rows).toHaveLength(1);
    expect(response.json.totals).toEqual(bomTotals);
    // The pooled path must not re-evaluate the script.
    expect(inspectBomTool).not.toHaveBeenCalled();
    expect(computeBom).toHaveBeenCalledTimes(1);
    expect(vi.mocked(computeBom).mock.calls[0]![0]).toEqual({ name: 'main' });
  });

  it('falls back to the script path for an unknown session token (no 500)', async () => {
    const handler = await getBomHandler();
    const { res, read } = createResponse();

    await handler({
      method: 'GET',
      url: '?session=bogus-token&script=examples/bom/panel-with-fasteners.kcad.ts',
    } as IncomingMessage, res);

    const response = read();
    expect(response.statusCode).toBe(200);
    expect(response.json.ok).toBe(true);
    expect(inspectBomTool).toHaveBeenCalledTimes(1);
    expect(computeBom).not.toHaveBeenCalled();
  });
});
