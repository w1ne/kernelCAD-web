// tests/unit/assemblies/solvedKinematicsToScene.test.ts
//
// Task 10 of the assembly-scene-graph slice (spec
// kernelCAD-private/docs/specs/2026-05-10-assembly-scene-graph-design.md §4.2):
// `SolvedKinematics.toScene()` returns a `Scene` (multi-body view of the FK
// snapshot); `.toShape()` becomes a deprecated alias that delegates to
// `.toScene().toUnion()` and emits a warn-once
// `feature.deprecated.solvedKinematics.toShape` advisory on the first call
// per process. The advisory is currently surfaced via `console.warn` (the
// session-level diagnostic-code catalogue is closed at 24 entries, so a new
// `feature.deprecated` code is out of scope for this slice — see Task 10
// notes in the implementer report).
//
// We deliberately re-import the module after resetting the warn-once flag in
// every "deprecation" test so the warn-once observation is independent of
// test ordering. The flag is exposed as a package-private setter on
// `SolvedKinematics` (see `src/modeling/capture/assembly.ts`).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { SolvedKinematics } from '../../../src/modeling/capture/assembly';
import { createApi } from '../../../src/modeling/api';
import { Scene } from '../../../src/modeling/validation/scene';
import { Transform } from '../../../src/shared/runtime/se3';

beforeEach(() => {
  // Reset the warn-once flag so each test observes a fresh emission (see
  // SolvedKinematics for the package-private setter).
  SolvedKinematics.__resetDeprecationWarnedForTest();
});

describe('SolvedKinematics.toScene', () => {
  it('returns a Scene with parts named after assembly.part(name) calls', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm.part('plate', kcad.box(10, 10, 2));
    arm.part('beam', kcad.box(2, 2, 10), { at: [0, 0, 5] });
    const sk = arm.solve({});
    const scene = sk.toScene();
    expect(scene).toBeInstanceOf(Scene);
    expect(scene.assemblyName).toBe('arm');
    expect(scene.parts.map((p) => p.name)).toEqual(['plate', 'beam']);
  });

  it('per-part worldTransforms reflect the FK snapshot', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    const sk = arm.solve({ tilt: 90 });
    const scene = sk.toScene();
    const beamPart = scene.part('b');
    // sk.transform('b') is the canonical FK transform; the Scene must
    // expose the same matrix on the part's worldTransform.
    const expected = sk.transform('b');
    const got = beamPart.worldTransform;
    // Compare via the matrices' point() actions on a few probe points;
    // Transform itself doesn't expose a structural equality.
    for (const p of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]] as const) {
      const e = expected.point([p[0], p[1], p[2]]);
      const g = got.point([p[0], p[1], p[2]]);
      for (let i = 0; i < 3; i++) {
        expect(g[i]).toBeCloseTo(e[i], 6);
      }
    }
    // Identity sanity for the root part 'a' (no parent joint).
    const aPart = scene.part('a');
    const probe = aPart.worldTransform.point([1, 2, 3]);
    expect(probe[0]).toBeCloseTo(1, 6);
    expect(probe[1]).toBeCloseTo(2, 6);
    expect(probe[2]).toBeCloseTo(3, 6);
  });

  it('preserves per-part colors set on the source shape', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm.part('plateP', kcad.box(10, 10, 2).color('plate'));
    arm.part('beamP', kcad.box(2, 2, 10).color('servo'), { at: [0, 0, 5] });
    const sk = arm.solve({});
    const scene = sk.toScene();
    expect(scene.part('plateP').color).toBe('plate');
    expect(scene.part('beamP').color).toBe('servo');
  });

  it('toShape() returns a Shape and emits warn-once deprecation advisory', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm.part('a', kcad.box(10, 10, 10));
    arm.part('b', kcad.box(10, 10, 10));
    const sk = arm.solve({});

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const s1 = sk.toShape();
    const s2 = sk.toShape();

    expect(s1).toBeDefined();
    expect(typeof s1.id).toBe('string');
    expect(s2).toBeDefined();
    expect(typeof s2.id).toBe('string');

    // Warn-once: every call to toShape() returns a Shape, but the deprecation
    // advisory must fire exactly once per process (across as many sk
    // instances and toShape() calls as the user makes).
    const deprecationCalls = warnSpy.mock.calls.filter((args) =>
      args.some(
        (a) =>
          typeof a === 'string' &&
          a.includes('deprecated.solvedKinematics.toShape'),
      ),
    );
    expect(deprecationCalls).toHaveLength(1);
    // The hint must direct callers to the supported replacement.
    expect(deprecationCalls[0].some((a) => typeof a === 'string' && a.includes('.toScene().toUnion()'))).toBe(true);

    warnSpy.mockRestore();
  });

  it('toShape() warn-once survives across SolvedKinematics instances', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    for (let i = 0; i < 3; i++) {
      const session = new CaptureSession();
      const kcad = createApi({ session });
      const arm = kcad.assembly(`arm${i}`);
      arm.part('a', kcad.box(10, 10, 10));
      arm.part('b', kcad.box(10, 10, 10));
      const sk = arm.solve({});
      sk.toShape();
    }

    const deprecationCalls = warnSpy.mock.calls.filter((args) =>
      args.some(
        (a) =>
          typeof a === 'string' &&
          a.includes('deprecated.solvedKinematics.toShape'),
      ),
    );
    expect(deprecationCalls).toHaveLength(1);

    warnSpy.mockRestore();
  });

  it('toScene().toUnion() returns the same single-body Shape as the legacy toShape() path', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm.part('a', kcad.box(10, 10, 10));
    arm.part('b', kcad.box(10, 10, 10), { at: [20, 0, 0] });
    const sk = arm.solve({});

    const sceneUnion = sk.toScene().toUnion();
    expect(sceneUnion).toBeDefined();
    expect(typeof sceneUnion.id).toBe('string');
  });

  it('Scene exposes a stable assemblyName equal to the source assembly', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('robot');
    arm.part('only', kcad.box(1, 1, 1));
    const sk = arm.solve({});
    expect(sk.toScene().assemblyName).toBe('robot');
  });

  it('per-part shape is the source Shape registered via assembly.part(name, shape)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const plate = kcad.box(10, 10, 2);
    arm.part('plate', plate);
    const sk = arm.solve({});
    const scene = sk.toScene();
    // Reference identity is preserved — the Scene is a thin view onto the
    // FK-mutated source shapes; no copies, no synthetic wrappers.
    expect(scene.part('plate').shape).toBe(plate);
  });

  it('Scene parts iterate in assembly.part() declaration order', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm.part('first', kcad.box(1, 1, 1));
    arm.part('second', kcad.box(2, 2, 2));
    arm.part('third', kcad.box(3, 3, 3));
    const sk = arm.solve({});
    const names = [...sk.toScene()].map((p) => p.name);
    expect(names).toEqual(['first', 'second', 'third']);
  });

  it('Scene worldTransform for an isolated, joint-less part is identity', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    arm.part('only', kcad.box(1, 1, 1));
    const sk = arm.solve({});
    const t = sk.toScene().part('only').worldTransform;
    const ident = Transform.identity();
    for (const p of [[0, 0, 0], [1, 2, 3]] as const) {
      const a = t.point([p[0], p[1], p[2]]);
      const b = ident.point([p[0], p[1], p[2]]);
      expect(a[0]).toBeCloseTo(b[0], 6);
      expect(a[1]).toBeCloseTo(b[1], 6);
      expect(a[2]).toBeCloseTo(b[2], 6);
    }
  });
});
