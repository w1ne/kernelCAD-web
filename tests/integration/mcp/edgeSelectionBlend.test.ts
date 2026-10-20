// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { buildModel } from '../../../src/composition/buildModel';
import type { BuiltModel } from '../../../src/composition/buildModel';
import { createSessionPool } from '../../../src/server/sessionPool';
import { createSelectionEndpoint } from '../../../src/server/middleware/selectionEndpoint';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { sharedSelectionTool } from '../../../src/agent/mcp/tools/sharedSelection';
import { applySurfaceBlendTool } from '../../../src/agent/mcp/tools/applySurfaceBlend';

beforeAll(async () => { await initOcct(); });
afterEach(() => vi.unstubAllGlobals());

describe('MCP edge selection to surface blend', () => {
  it.each([
    ['fillet', { radius: 1 }, 1000 - 2 * (1 - Math.PI / 4) * 10],
    ['chamfer', { operation: 'chamfer' as const, distance: 1 }, 990],
  ] as const)('reads a Studio edge pick and applies it as a %s selector', async (operation, amount, expectedVolume) => {
    const model = await buildModel({ code: 'const body = box(10, 10, 10);\nreturn body;', fileName: 'edge-pick.kcad.ts' });
    const pool = createSessionPool({ build: async () => model as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate('edge-pick.kcad.ts');
    const endpoint = createSelectionEndpoint({ pool });
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname !== '/__kernelcad/selection') return nativeFetch(input, init);
      const bodyText = typeof init?.body === 'string' ? init.body : '';
      const request = Object.assign(Readable.from(bodyText ? [bodyText] : []), {
        url: `${url.pathname}${url.search}`,
        method: init?.method ?? 'GET',
      });
      let payload = '';
      const response = { statusCode: 200, setHeader() {}, end(value = '') { payload = value; } };
      await endpoint(request, response);
      return new Response(payload, { status: response.statusCode });
    });

    const meshed = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
    const shapeIndex = meshed.features.findIndex(feature => feature.edgeStableIds?.length);
    const feature = meshed.features[shapeIndex];
    expect(feature?.edgeStableIds?.[0]).toMatch(/^s[0-9a-f]{16}$/);
    const featureId = feature!.edgeOwners?.[0] || feature!.featureId;
    const operationOwner = feature!.featureId;
    const ranges = feature!.edgeRanges!;
    const positions = feature!.edges!;
    const centers = feature!.edgeStableIds!.map((_, edgeIndex) => {
      const start = ranges[edgeIndex * 2]!;
      const count = ranges[edgeIndex * 2 + 1]!;
      const center = [0, 0, 0];
      for (let vertex = start; vertex < start + count; vertex += 1) {
        center[0]! += positions[vertex * 3]!;
        center[1]! += positions[vertex * 3 + 1]!;
        center[2]! += positions[vertex * 3 + 2]!;
      }
      return center.map(value => value / count);
    });
    const verticalEdges = feature!.edgeStableIds!.map((stableId, id) => {
      const start = ranges[id * 2]!;
      const count = ranges[id * 2 + 1]!;
      const first = [positions[start * 3]!, positions[start * 3 + 1]!, positions[start * 3 + 2]!];
      const lastVertex = start + count - 1;
      const last = [positions[lastVertex * 3]!, positions[lastVertex * 3 + 1]!, positions[lastVertex * 3 + 2]!];
      return { stableId, id, center: centers[id]!, direction: last.map((value, axis) => value - first[axis]!) };
    }).filter(edge => Math.abs(edge.direction[2]!) > Math.abs(edge.direction[0]!) + Math.abs(edge.direction[1]!));
    let pair: typeof verticalEdges | null = null;
    let farthest = 0;
    for (const a of verticalEdges) for (const b of verticalEdges) {
      if (a.id >= b.id) continue;
      const distance = Math.hypot(...a.center.map((value, axis) => value - b.center[axis]!));
      if (distance > farthest) { farthest = distance; pair = [a, b]; }
    }
    expect(pair).not.toBeNull();
    const selections = pair!.map(({ id, stableId }) => ({
      shapeIndex, kind: 'edge' as const, id, featureId, stableId,
      ref: `@kc[${operationOwner}/edge/${stableId}]`,
    }));
    const ref = selections[0]!.ref;
    const target = { studio_url: 'http://localhost:5173', session: entry.token, model_generation: 0 };

    const written = await sharedSelectionTool('POST', { ...target, selection: selections[1], selections });
    expect(written).toMatchObject({ ok: true, selection: selections[1], selections });
    const picked = await sharedSelectionTool('GET', target);
    expect(picked).toMatchObject({ ok: true, selection: selections[1], selections });

    const out = await applySurfaceBlendTool({
      code: 'const body = box(10, 10, 10);\nreturn body;',
      shape_binding: 'body',
      ...(operation === 'fillet' ? { radius: amount.radius } : amount),
      ...(operation === 'chamfer' ? { operation: 'chamfer' as const } : {}),
      selector: (picked as { selections: typeof selections }).selections.map(selection => selection.ref!),
    });
    expect(out.ok).toBe(true);
    for (const selection of selections) expect(out.new_code).toContain(selection.ref);
    expect(out.sceneSummary?.valid).toBe(true);
    expect(out.sceneSummary?.volume).toBeCloseTo(expectedVolume, 2);
  });
});
