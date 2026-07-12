// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import viteConfig from '../../../vite.config';

const livePairs = [
  { a: 'raw-a', b: 'raw-b', volumeMm3: 1 },
  { a: 'real-a', b: 'real-b', volumeMm3: 30 },
];

vi.mock('../../../src/agent/mcp/tools/reviewCad', () => ({
  reviewCadTool: vi.fn(async () => {
    throw new Error('live-only review should not run full reviewCadTool');
  }),
}));

vi.mock('../../../src/modeling/runtime/detectInterferences', () => ({
  detectInterferences: vi.fn(() => ({ pairs: livePairs })),
}));

vi.mock('../../../src/modeling/mates/physicalUseCase', () => ({
  reviewPhysicalUseCasesWithReachability: vi.fn(async () => ({
    checkedUseCaseCount: 1,
    diagnostics: [
      {
        code: 'assembly.physical-use-case.contact-unreachable',
        severity: 'error',
        message: 'target contact cannot be reached',
        hint: 'move the contact connector',
      },
    ],
  })),
}));

vi.mock('../../../src/kernel/backends/sceneBackend', () => ({
  isSceneBackend: vi.fn(() => true),
}));

vi.mock('../../../src/server/sessionPool', () => ({
  createSessionPool: vi.fn(() => ({
    get: vi.fn(() => ({
      model: {
        session: {
          cachedShapes: new Map([['tail-id', { parts: [{ name: 'a' }, { name: 'b' }] }]]),
          assemblies: new Map([['hand', { name: 'hand' }]]),
        },
        tailId: 'tail-id',
        tailShape: undefined,
      },
    })),
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

vi.mock('../../../src/modeling/buildModel', () => ({
  buildModelFromFile: vi.fn(),
}));

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

async function getReviewHandler(): Promise<Handler> {
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

  const handler = handlers.get('/__kernelcad/review');
  if (!handler) throw new Error('/__kernelcad/review handler not registered');
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
      body,
      json: JSON.parse(body) as {
        rawInterferencePairs?: typeof livePairs;
        diagnostics?: Array<{ code?: string; severity?: string }>;
        ok?: boolean;
        livePhysicalUseCaseReview?: boolean;
        fitness?: { functional?: boolean; repairMode?: string; blockingReasons?: unknown[] };
        interferenceSummary?: {
          rawCount: number;
          contactNoiseCount: number;
          actionableCount: number;
          capMm3: number;
        };
      },
    }),
  };
}

describe('Vite /__kernelcad/review live endpoint', () => {
  it('returns an interference summary with live raw pairs', async () => {
    const handler = await getReviewHandler();
    const { res, read } = createResponse();

    await handler({
      method: 'GET',
      url: '?script=examples/robot-arm/desktop-3axis-mates.kcad.ts&session=tok-live&live=1',
    } as IncomingMessage, res);

    const response = read();
    expect(response.statusCode).toBe(200);
    expect(response.contentType).toBe('application/json');
    expect(response.json.rawInterferencePairs).toEqual(livePairs);
    expect(response.json.interferenceSummary).toMatchObject({
      rawCount: 2,
      contactNoiseCount: 1,
      actionableCount: 1,
      capMm3: 20,
    });
  });

  it('adds physical use case reachability diagnostics on live review when the script declares one', async () => {
    const handler = await getReviewHandler();
    const { res, read } = createResponse();

    await handler({
      method: 'GET',
      url: '?script=tests/fixtures/robot-hand/rejected-five-finger-kinematic-hand.kcad.ts&session=tok-live&live=1',
    } as IncomingMessage, res);

    const response = read();
    expect(response.statusCode).toBe(200);
    expect(response.json.ok).toBe(false);
    expect(response.json.livePhysicalUseCaseReview).toBe(true);
    expect(response.json.diagnostics?.map((diagnostic) => diagnostic.code)).toContain(
      'assembly.physical-use-case.contact-unreachable',
    );
    expect(response.json.fitness).toMatchObject({
      functional: false,
      repairMode: 'physical-use-case',
    });
  });
});
