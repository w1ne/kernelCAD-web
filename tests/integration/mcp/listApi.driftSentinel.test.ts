// tests/integration/mcp/listApi.driftSentinel.test.ts
//
// Drift sentinel: the `list_api` curated surface must match the real
// runtime API. Future API additions that miss `listApi.ts` fail this test.
import { describe, it, expect } from 'vitest';
import { listApiTool } from '../../../src/mcp/tools/listApi';
import { createApi } from '../../../src/modules/api';
import { CaptureSession } from '../../../src/capture/captureSession';
import { Shape } from '../../../src/capture/proxy';
import { Sketch, PathBuilder } from '../../../src/capture/sketch';
import { Scene } from '../../../src/intent/scene';

describe('list_api drift sentinels', () => {
  it('GLOBALS matches the keys returned by createApi(ctx)', async () => {
    const ctx = { session: new CaptureSession() };
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

  it('SCENE_METHODS lists every public Scene.prototype method/getter and known instance properties', async () => {
    const r = await listApiTool({});
    const advertised = new Set(r.sceneMethods!.map(m => m.name));

    // Scene exposes both prototype methods (part/toCompound/toUnion/toShape),
    // a prototype getter (bbox), and instance fields (assemblyName/parts) set
    // in the constructor. Walk the prototype for methods + getters; the
    // instance fields are documented but not introspectable from prototype.
    const proto = Scene.prototype as Record<string, unknown>;
    const protoNames = Object.getOwnPropertyNames(proto)
      .filter(n => n !== 'constructor' && !n.startsWith('_') && !n.startsWith('require'))
      // Drop test hooks / static-only members exposed on prototype (none today).
      .filter(n => {
        const desc = Object.getOwnPropertyDescriptor(proto, n);
        return desc !== undefined && (typeof desc.value === 'function' || typeof desc.get === 'function');
      });

    for (const name of protoNames) {
      expect(advertised.has(name), `SCENE_METHODS missing entry for Scene.prototype.${name}`).toBe(true);
    }

    // Instance fields documented under sceneMethods (not on prototype).
    expect(advertised.has('assemblyName')).toBe(true);
    expect(advertised.has('parts')).toBe(true);
  });

  it('SCENE_PART_PROPERTIES lists every ScenePart field declared in the type', async () => {
    const r = await listApiTool({});
    const advertised = new Set(r.scenePartProperties!.map(p => p.name));

    // ScenePart is a structural interface — there's no prototype to walk.
    // The fields below match the `ScenePart` interface in src/intent/scene.ts;
    // any field added there must be added to SCENE_PART_PROPERTIES.
    const expectedFields = ['name', 'shape', 'worldTransform', 'color', 'metadata'];
    for (const field of expectedFields) {
      expect(advertised.has(field), `SCENE_PART_PROPERTIES missing entry for ScenePart.${field}`).toBe(true);
    }
  });
});
