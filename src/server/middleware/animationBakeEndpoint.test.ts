// Integration test for the animation-bake endpoint against a REAL kernel
// build of the revolute-sweep fixture (a two-mate assembly: grounded `base`,
// revolute `arm`, prismatic `slider`). Verifies the baked timeline shape,
// monotonic times, that a MOVING part's matrices differ across frames while
// the GROUNDED base stays constant, and that params are restored after bake.

import { describe, it, expect } from 'vitest';
import { buildModelFromFile, type BuiltModel } from '../../modeling/buildModel';
import {
  createAnimationBakeEndpoint,
  MAX_BAKE_FRAMES,
  type AnimationBakeReqLike,
  type AnimationBakeResult,
} from './animationBakeEndpoint';
import type { SessionPool } from '../sessionPool';

const FIXTURE = 'tests/fixtures/animation/revolute-sweep.kcad.ts';
const COLLIDING_FIXTURE = 'tests/fixtures/animation/colliding-sweep.kcad.ts';
const GEOMETRY_PARAM_FIXTURE = 'tests/fixtures/animation/geometry-param-sweep.kcad.ts';

function fakeReq(query: string): AnimationBakeReqLike {
  return { url: `/__kernelcad/animation-bake${query}`, method: 'POST' };
}

function fakeRes() {
  const out = { statusCode: 0, body: undefined as unknown };
  return {
    res: {
      statusCode: 0,
      setHeader() {},
      end(chunk?: string) {
        out.statusCode = this.statusCode;
        out.body = chunk ? JSON.parse(chunk) : undefined;
      },
    },
    out,
  };
}

function fakePool(model: BuiltModel | null): SessionPool {
  const entry = model
    ? { token: 't1', scriptPath: '/s', model, lastAccessAt: 0, onRelower: () => () => {} }
    : null;
  return {
    get: (token: string) => (token === 't1' && entry ? (entry as never) : undefined),
    getOrCreate: async () => entry as never,
    runExclusive: (fn) => fn(),
    eject() {},
    prune() {},
    entries: function* () {} as never,
    rebuildByScript: async () => false,
  };
}

function paramSnapshot(model: BuiltModel): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  for (const entry of model.session.paramTable.list()) out[entry.name] = entry.value;
  return out;
}

describe('animationBakeEndpoint', () => {
  it('400 without a session token, 404 for an unknown one', async () => {
    const handler = createAnimationBakeEndpoint({ pool: fakePool(null) });
    const missing = fakeRes();
    await handler(fakeReq(''), missing.res as never);
    expect(missing.out.statusCode).toBe(400);
    const unknown = fakeRes();
    await handler(fakeReq('?session=nope'), unknown.res as never);
    expect(unknown.out.statusCode).toBe(404);
  });

  it(
    'bakes the revolute-sweep timeline: frame count, monotonic times, arm moves, base static, params restored',
    async () => {
      const model = await buildModelFromFile({ file: FIXTURE });
      expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const before = paramSnapshot(model);

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      await handler(fakeReq('?session=t1'), r.res as never);

      expect(r.out.statusCode).toBe(200);
      const body = r.out.body as AnimationBakeResult;

      // fps 12 over 2000 ms → ceil(2 * 12) = 24 scheduled frames.
      expect(body.fps).toBe(12);
      expect(body.durationMs).toBe(2000);
      expect(body.frames).toBe(24);
      expect(body.times).toHaveLength(24);
      // times are monotonic non-decreasing, start at 0, end exactly at duration.
      expect(body.times[0]).toBe(0);
      expect(body.times[body.times.length - 1]).toBe(2000);
      for (let i = 1; i < body.times.length; i += 1) {
        expect(body.times[i]).toBeGreaterThan(body.times[i - 1]);
      }

      // Every part carries one matrix per frame.
      const partNames = body.parts.map((p) => p.name).sort();
      expect(partNames).toEqual(['arm', 'base', 'slider']);
      for (const part of body.parts) {
        expect(part.matrices).toHaveLength(24);
        for (const m of part.matrices) expect(m).toHaveLength(16);
      }

      // Grounded base: identical matrix at every frame.
      const base = body.parts.find((p) => p.name === 'base')!;
      for (let i = 1; i < base.matrices.length; i += 1) {
        expect(base.matrices[i]).toEqual(base.matrices[0]);
      }

      // Revolute arm: the mid-timeline pose differs from the rest pose.
      const arm = body.parts.find((p) => p.name === 'arm')!;
      const mid = Math.floor(arm.matrices.length / 2);
      expect(arm.matrices[mid]).not.toEqual(arm.matrices[0]);

      // Prismatic slider also moves at some point in the sweep.
      const slider = body.parts.find((p) => p.name === 'slider')!;
      const sliderMoved = slider.matrices.some(
        (m) => JSON.stringify(m) !== JSON.stringify(slider.matrices[0]),
      );
      expect(sliderMoved).toBe(true);

      // Restoration contract: the paramTable shows the pre-bake values.
      expect(paramSnapshot(model)).toEqual(before);
    },
    120_000,
  );

  it(
    'emits EXACTLY ONE relower across a 24-frame bake (after the pose restore, not per frame)',
    async () => {
      const model = await buildModelFromFile({ file: FIXTURE });
      expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

      // Subscribe to the SAME per-session engine the SSE hub forwards from.
      // The silent per-frame sweep must emit nothing; only the (non-silent)
      // post-restore updateModelParams should fan a single relower out.
      const engine = model.session.engine;
      expect(engine).toBeDefined();
      const relowers: string[][] = [];
      const off = engine!.onRelower((ids) => relowers.push([...ids]));

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      try {
        await handler(fakeReq('?session=t1'), r.res as never);
      } finally {
        off();
      }

      expect(r.out.statusCode).toBe(200);
      const body = r.out.body as AnimationBakeResult;
      expect(body.frames).toBe(24);
      // The whole point of the fix: 24 baked frames, ONE relower (the restore).
      expect(relowers).toHaveLength(1);
    },
    120_000,
  );

  it(
    'frame-cap: a timeline above MAX_BAKE_FRAMES is a typed 422 error',
    async () => {
      const model = await buildModelFromFile({ file: FIXTURE });
      // Rewrite the animationView metadata to a high-fps, long timeline whose
      // sampleTracks frame count blows past the ceiling, then bake.
      const anim = model.records.find((rec) => rec.kind === 'animationView');
      expect(anim).toBeDefined();
      const meta = anim!.metadata as unknown as { fps: number; tracks: Array<{ keys: Array<{ atMs: number }> }> };
      meta.fps = 240;
      // Push the last key far out so ceil(durationMs/1000 * fps) > MAX_BAKE_FRAMES.
      meta.tracks[0].keys[meta.tracks[0].keys.length - 1].atMs = 60_000;

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      await handler(fakeReq('?session=t1'), r.res as never);
      expect(r.out.statusCode).toBe(422);
      const body = r.out.body as { code?: string };
      expect(body.code).toBe('animation.bake.too-many-frames');
      // Sanity: the constant is the documented ceiling.
      expect(MAX_BAKE_FRAMES).toBe(600);
    },
    120_000,
  );

  it(
    'B1: a timeline whose track param drives GEOMETRY (not a mate pose) is refused with animation.bake.geometry-param',
    async () => {
      const model = await buildModelFromFile({ file: GEOMETRY_PARAM_FIXTURE });
      expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      await handler(fakeReq('?session=t1'), r.res as never);

      expect(r.out.statusCode).toBe(422);
      const body = r.out.body as { code?: string; error?: string; hint?: string };
      expect(body.code).toBe('animation.bake.geometry-param');
      // The message must steer the user to the offline tool.
      expect(body.hint).toContain('kernelcad animate');
    },
    120_000,
  );

  it(
    'I1: the bake response carries an empty collisions[] for a clean (air-gapped) mechanism',
    async () => {
      const model = await buildModelFromFile({ file: FIXTURE });
      expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      await handler(fakeReq('?session=t1'), r.res as never);

      expect(r.out.statusCode).toBe(200);
      const body = r.out.body as AnimationBakeResult;
      expect(Array.isArray(body.collisions)).toBe(true);
      expect(body.collisions).toEqual([]);
    },
    120_000,
  );

  it(
    'I1: a self-colliding timeline still bakes (200) but the response advises the collisions',
    async () => {
      const model = await buildModelFromFile({ file: COLLIDING_FIXTURE });
      expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      await handler(fakeReq('?session=t1'), r.res as never);

      // NON-FATAL: the bake succeeds; collisions are advisory.
      expect(r.out.statusCode).toBe(200);
      const body = r.out.body as AnimationBakeResult;
      expect(body.frames).toBeGreaterThan(0);
      expect(body.parts.length).toBeGreaterThan(0);
      expect(body.collisions.length).toBeGreaterThan(0);
      for (const c of body.collisions) {
        expect(typeof c.tMs).toBe('number');
        expect(typeof c.a).toBe('string');
        expect(typeof c.b).toBe('string');
        expect(c.volumeMm3).toBeGreaterThan(0);
      }
    },
    120_000,
  );

  it(
    'I1: the advisory collision check does NOT add SSE relowers — still exactly ONE across the whole bake',
    async () => {
      const model = await buildModelFromFile({ file: COLLIDING_FIXTURE });
      expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

      const engine = model.session.engine;
      expect(engine).toBeDefined();
      const relowers: string[][] = [];
      const off = engine!.onRelower((ids) => relowers.push([...ids]));

      const handler = createAnimationBakeEndpoint({ pool: fakePool(model) });
      const r = fakeRes();
      try {
        await handler(fakeReq('?session=t1'), r.res as never);
      } finally {
        off();
      }

      expect(r.out.statusCode).toBe(200);
      // The silent verifyAnimation sweep must emit nothing; only the post-bake
      // pose restore fans a single relower out.
      expect(relowers).toHaveLength(1);
    },
    120_000,
  );
});
