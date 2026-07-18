// tests/integration/mcp/listApi.driftSentinel.test.ts
//
// Drift sentinel: the `list_api` curated surface must match the real
// runtime API. Future API additions that miss `listApi.ts` fail this test.
import { describe, it, expect } from 'vitest';
import {
  listApiTool,
  CURVE3D_METHODS,
  CURVE3D_ANALYTICS_METHODS,
} from '../../../src/agent/mcp/tools/listApi';
import { createApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { Shape } from '../../../src/modeling/capture/proxy';
import { Sketch, PathBuilder } from '../../../src/modeling/capture/sketch';
import { Scene } from '../../../src/modeling/validation/scene';
import { SurfaceProxy } from '../../../src/modeling/capture/surfaceProxy';
import { Curve3DProxy } from '../../../src/modeling/capture/curveProxy';
import { Curve3DAnalyticsImpl } from '../../../src/modeling/capture/curveAnalyticsProxy';
import { ShapeList } from '../../../src/modeling/selection/shapeList';

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

  it('SHAPE_LIST_METHODS lists every public ShapeList selector-algebra member', async () => {
    const r = await listApiTool({});
    const advertised = new Set(r.shapeListMethods!.map((m) => m.name));

    // ShapeList extends Array; only its OWN prototype members are the selector
    // algebra. Inherited array methods are standard JS and not re-advertised,
    // except `at`, which is documented because it is a named terminal accessor.
    const proto = ShapeList.prototype as unknown as Record<string, unknown>;
    const own = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor' && !n.startsWith('_'));

    for (const name of own) {
      expect(
        advertised.has(name),
        `SHAPE_LIST_METHODS missing entry for ShapeList.prototype.${name}`,
      ).toBe(true);
    }
    // And nothing advertised may be absent from the runtime surface.
    for (const name of advertised) {
      const onOwn = own.includes(name);
      const inherited = name in ([] as unknown as Record<string, unknown>);
      expect(onOwn || inherited, `SHAPE_LIST_METHODS advertises ${name}, which ShapeList does not expose`).toBe(true);
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

    // Scene exposes prototype methods (part/toCompound/toUnion), a
    // prototype getter (bbox), and instance fields (assemblyName/parts) set
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

  it('SURFACE_METHODS matches SurfaceProxy.prototype public methods', async () => {
    const r = await listApiTool({});
    const advertised = new Set((r.surfaceMethods ?? []).map(m => m.name));
    // Drift-sentinel convention: underscore-prefixed methods are private
    // and excluded from the drift comparison (matches how Shape's lower-
    // path private helpers are not advertised).
    const actual = new Set(
      Object.getOwnPropertyNames(SurfaceProxy.prototype)
        .filter(n =>
          n !== 'constructor' &&
          !n.startsWith('_') &&
          typeof (SurfaceProxy.prototype as Record<string, unknown>)[n] === 'function',
        ),
    );
    expect(advertised).toEqual(actual);
  });

  it('CURVE3D_METHODS lists every public Curve3DProxy.prototype method', () => {
    const advertised = new Set(CURVE3D_METHODS.map((m) => m.name));
    const proto = Curve3DProxy.prototype as Record<string, unknown>;
    const actual = Object.getOwnPropertyNames(proto).filter(
      (n) =>
        n !== 'constructor' &&
        !n.startsWith('_') &&
        typeof proto[n] === 'function',
    );
    for (const name of actual) {
      expect(
        advertised.has(name),
        `CURVE3D_METHODS missing entry for Curve3DProxy.prototype.${name}`,
      ).toBe(true);
    }
  });

  it('CURVE3D_ANALYTICS_METHODS matches the Curve3DAnalyticsImpl public surface', () => {
    expect(CURVE3D_ANALYTICS_METHODS.map((m) => m.name)).toEqual([
      'closestPoint',
      'closestParam',
      'divideByEqualArcLength',
      'divideByArcLength',
      'derivatives',
      'tessellate',
      'intersect',
    ]);
    // Cross-check: every advertised method actually exists on the impl.
    const proto = Curve3DAnalyticsImpl.prototype as Record<string, unknown>;
    for (const m of CURVE3D_ANALYTICS_METHODS) {
      expect(
        typeof proto[m.name],
        `Curve3DAnalyticsImpl.prototype.${m.name} missing or not a function`,
      ).toBe('function');
    }
  });

  it('documents surfaceFromBoundary as the shipped filling-surface primitive with exact curve order', async () => {
    // Full descriptions are returned for query matches; the default response is
    // compacted (signatures + short blurb) to keep the generation token budget small.
    const r = await listApiTool({ query: 'surfaceFromBoundary' });
    const entry = r.globals!.find(g => g.name === 'surfaceFromBoundary');
    expect(entry).toBeDefined();
    expect(entry!.description).toMatch(/filling surface/i);
    expect(entry!.description).toContain('`curves[0]` = bottom');
    expect(entry!.description).toContain('`curves[1]` = right');
    expect(entry!.description).toContain('`curves[2]` = top');
    expect(entry!.description).toContain('`curves[3]` = left');
    expect(entry!.description).not.toMatch(/Coons/i);
  });
});
