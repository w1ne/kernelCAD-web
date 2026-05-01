// tests/integration/mcp/listApi.driftSentinel.test.ts
//
// Drift sentinel: the `list_api` curated surface must match the real
// runtime API. Future API additions that miss `listApi.ts` fail this test.
import { describe, it, expect } from 'vitest';
import { listApiTool } from '../../../src/mcp/tools/listApi';
import { createApi } from '../../../src/modules/api';
import { CaptureSession } from '../../../src/capture/captureSession';
import { ParamRegistry } from '../../../src/compute/paramRegistry';
import { Shape } from '../../../src/capture/proxy';
import { Sketch, PathBuilder } from '../../../src/capture/sketch';

describe('list_api drift sentinels', () => {
  it('GLOBALS matches the keys returned by createApi(ctx)', async () => {
    const ctx = { session: new CaptureSession(), params: new ParamRegistry() };
    const api = createApi(ctx);
    const apiKeys = Object.keys(api).sort();

    const r = await listApiTool({});
    const advertisedGlobals = r.globals!.map(g => g.name).sort();

    expect(advertisedGlobals).toEqual(apiKeys);
  });

  it('SHAPE_METHODS lists every public Shape.prototype method', async () => {
    const r = await listApiTool({});
    const advertised = new Set(r.shapeMethods!.map(m => m.name));

    // Read Shape's own enumerable method names (constructor + prototype methods).
    const shapeMethodNames = Object.getOwnPropertyNames(Shape.prototype)
      .filter(n => n !== 'constructor' && typeof (Shape.prototype as Record<string, unknown>)[n] === 'function');

    for (const name of shapeMethodNames) {
      expect(advertised.has(name)).toBe(true);
    }
  });

  it('SKETCH_METHODS lists every public Sketch.prototype method', async () => {
    const r = await listApiTool({});
    const advertised = new Set(r.sketchMethods!.map(m => m.name));

    const sketchMethodNames = Object.getOwnPropertyNames(Sketch.prototype)
      .filter(n => n !== 'constructor' && typeof (Sketch.prototype as Record<string, unknown>)[n] === 'function');

    for (const name of sketchMethodNames) {
      expect(advertised.has(name)).toBe(true);
    }
  });

  it('PATH_BUILDER_METHODS lists every public PathBuilder.prototype method', async () => {
    const r = await listApiTool({});
    const advertised = new Set(r.pathBuilderMethods!.map(m => m.name));

    const pbMethodNames = Object.getOwnPropertyNames(PathBuilder.prototype)
      .filter(n => n !== 'constructor' && typeof (PathBuilder.prototype as Record<string, unknown>)[n] === 'function');

    for (const name of pbMethodNames) {
      expect(advertised.has(name)).toBe(true);
    }
  });
});
