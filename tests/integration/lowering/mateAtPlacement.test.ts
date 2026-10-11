// tests/integration/lowering/mateAtPlacement.test.ts
//
// A part placed with `at` and fastened (or hinged, or slid) to another part
// must land where the mate puts it. The built scene part's shape already
// carries its `at`; the scene part's `worldTransform` is the motion the mate
// adds on top. The mate used to compute that motion as if the part sat at the
// origin, so the `at` was added on top of it (rotated by the joint), and a
// child did not follow a parent placed with `at`.
//
// Every expected number below is worked out by hand from the box sizes and
// connector origins, not read back from the solver.
//
//   mount: box(20, 20, 10, centred) -> local x,y in [-10, 10], z in [-5, 5]
//          connector `seat` at local [4, -3, 5] (on the top face)
//   valve: box(12, 6, 8, centred)   -> local x in [-6, 6], y in [-3, 3], z in [-4, 4]
//          connector `base` at local [1, 2, -4] (on the bottom face)

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { buildModel, updateModelParams, type BuiltModel } from '../../../src/modeling/buildModel';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { Scene } from '../../../src/modeling/validation/scene';
import { solveMates } from '../../../src/modeling/mates/solver';
import { resolvedPartAt, sceneMotion } from '../../../src/modeling/mates/partFrame';
import { reposedLoweredAssemblyScene } from '../../../src/modeling/mates/loweredAssemblyScene';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import type { Transform } from '../../../src/shared/runtime/se3';

type V3 = [number, number, number];
interface Box { min: V3; max: V3 }
type MateKind = 'fastened' | 'revolute' | 'prismatic';

function script(opts: {
  entry: 'solvedModel' | 'model';
  kind: MateKind;
  valveAt?: V3;
  mountAt?: V3;
}): string {
  const { entry, kind, valveAt, mountAt } = opts;
  const type = kind === 'fastened' ? `type: 'frame'` : `type: 'axis'`;
  // The revolute turns about +X so that a wrongly carried `at` = [0, 0, 27]
  // shows up rotated (along -Y), not just along Z.
  const axis = kind === 'revolute' ? ', axis: [1, 0, 0]' : kind === 'prismatic' ? ', axis: [0, 0, 1]' : '';
  const pose = kind === 'revolute' ? ', { pose: 90 }' : kind === 'prismatic' ? ', { pose: 6 }' : '';
  const at = (v?: V3) => (v === undefined ? '' : `, { at: [${v.join(', ')}] }`);
  const ret = entry === 'solvedModel'
    ? `return arm.solvedModel({}, { validate: 'off' });`
    : 'return arm.model();';
  return `
    const arm = assembly('rig');
    arm.part('mount', box(20, 20, 10, true)${at(mountAt)})
       .connector('seat', { ${type}, origin: { kind: 'vec3', value: [4, -3, 5] }${axis} });
    arm.part('valve', box(12, 6, 8, true)${at(valveAt)})
       .connector('base', { ${type}, origin: { kind: 'vec3', value: [1, 2, -4] }${axis} });
    arm.mate('m', 'mount.seat', 'valve.base', '${kind}'${pose});
    ${ret}
  `;
}

/** World bounding box of every part of the built scene, by part name. */
async function builtBoxes(code: string): Promise<Map<string, Box>> {
  const { records } = await runScript({ code, fileName: 'mate-at.kcad.ts' });
  const r = await new RecomputeEngine(new OcctLowerer()).run(records);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const scene = r.shapes.get(records[records.length - 1].id);
  if (!isSceneBackend(scene)) throw new Error('the model did not build to an assembly scene');
  const out = new Map<string, Box>();
  for (const p of scene.parts) {
    const bb = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform).boundingBox();
    out.set(p.name, { min: [bb.min[0], bb.min[1], bb.min[2]], max: [bb.max[0], bb.max[1], bb.max[2]] });
  }
  return out;
}

function expectBox(actual: Box | undefined, expected: Box): void {
  expect(actual).toBeDefined();
  for (let i = 0; i < 3; i++) {
    expect(actual!.min[i]).toBeCloseTo(expected.min[i], 6);
    expect(actual!.max[i]).toBeCloseTo(expected.max[i], 6);
  }
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const near = (a: readonly number[], b: readonly number[]): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 6);
};

// The mount stays where it was authored.
const MOUNT_AT_ORIGIN: Box = { min: [-10, -10, -5], max: [10, 10, 5] };
// Seat on the mount: mount min corner + [14, 7, 10] = [4, -3, 5].
const seatOf = (mount: Box): V3 => add(mount.min, [14, 7, 10]);

// Fastened: the valve moves so `base` meets `seat`, translation only:
// valve local + ([4, -3, 5] - [1, 2, -4]) = local + [3, -5, 9].
const FASTENED: Box = { min: [-3, -8, 5], max: [9, -2, 13] };
// Revolute about +X by 90 deg at the seat: world = seat + Rx90(local - base),
// Rx90 maps (x, y, z) to (x, -z, y). The valve's 6 mm (Y) and 8 mm (Z) sides
// swap, which is the joint angle.
const REVOLUTE: Box = { min: [-3, -11, 0], max: [9, -3, 6] };
// Prismatic +6 mm along +Z: the fastened box lifted by 6.
const PRISMATIC: Box = { min: [-3, -8, 11], max: [9, -2, 19] };

const EXPECTED: Record<MateKind, Box> = { fastened: FASTENED, revolute: REVOLUTE, prismatic: PRISMATIC };

describe('a mate places a part that has `at` where the mate says', () => {
  beforeAll(async () => { await initOcct(); });

  for (const entry of ['solvedModel', 'model'] as const) {
    for (const kind of ['fastened', 'revolute', 'prismatic'] as const) {
      it(`${entry}: ${kind} valve with at [0, 0, 27] lands on the mount`, async () => {
        const withAt = await builtBoxes(script({ entry, kind, valveAt: [0, 0, 27] }));
        expectBox(withAt.get('mount'), MOUNT_AT_ORIGIN);
        expectBox(withAt.get('valve'), EXPECTED[kind]);

        // The same model without `at` lands in the same place: the mate,
        // not the `at`, decides where a mated part goes.
        const withoutAt = await builtBoxes(script({ entry, kind }));
        expectBox(withoutAt.get('valve'), EXPECTED[kind]);
      });
    }
  }

  it('the valve connector meets the mount connector (fastened)', async () => {
    const boxes = await builtBoxes(script({ entry: 'solvedModel', kind: 'fastened', valveAt: [0, 0, 27] }));
    // `base` on the valve: valve min corner + [7, 5, 0] (unrotated valve).
    near(add(boxes.get('valve')!.min, [7, 5, 0]), seatOf(boxes.get('mount')!));
  });

  it('the revolute keeps its joint angle and its pivot', async () => {
    const boxes = await builtBoxes(script({ entry: 'solvedModel', kind: 'revolute', valveAt: [0, 0, 27] }));
    const valve = boxes.get('valve')!;
    // Rotated 90 deg about X: 12 along X, 8 (was Z) along Y, 6 (was Y) along Z.
    near([valve.max[0] - valve.min[0], valve.max[1] - valve.min[1], valve.max[2] - valve.min[2]], [12, 8, 6]);
    // The pivot (`base`, local [1, 2, -4]) sits at min corner + [7, 8, 5] after
    // the turn, and that is the seat.
    near(add(valve.min, [7, 8, 5]), seatOf(boxes.get('mount')!));
  });

  it('the slider moves the valve connector along the axis by the pose', async () => {
    const boxes = await builtBoxes(script({ entry: 'solvedModel', kind: 'prismatic', valveAt: [0, 0, 27] }));
    near(add(boxes.get('valve')!.min, [7, 5, 0]), add(seatOf(boxes.get('mount')!), [0, 0, 6]));
  });

  for (const kind of ['fastened', 'revolute'] as const) {
    it(`${kind}: a child follows a parent placed with at`, async () => {
      const boxes = await builtBoxes(script({
        entry: 'solvedModel', kind, mountAt: [100, 0, 0], valveAt: [0, 0, 27],
      }));
      // The mount (first part, fixed) keeps its `at`.
      const mount: Box = { min: [90, -10, -5], max: [110, 10, 5] };
      expectBox(boxes.get('mount'), mount);
      // The valve is placed relative to the moved mount.
      const e = EXPECTED[kind];
      expectBox(boxes.get('valve'), { min: add(e.min, [100, 0, 0]), max: add(e.max, [100, 0, 0]) });
    });
  }
});

// ---------------------------------------------------------------------------
// Every path that poses a mated part agrees with the built scene: the
// capture-time Scene, the `solveMates` placement (with `at` taken back out),
// the re-posed lowered scene the pose sweeps use, and the joint-axis gate.

function sameTransform(actual: Transform, expected: Transform): void {
  const a = actual.toMat4();
  const e = expected.toMat4();
  for (let i = 0; i < 16; i++) expect(a[i]).toBeCloseTo(e[i], 9);
}

interface Built { model: BuiltModel; arm: Assembly; scene: Scene; lowered: SceneBackend }

async function build(code: string): Promise<Built> {
  const model = await buildModel({ code, fileName: 'mate-at-paths.kcad.ts' });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const scene = model.returnValue as Scene;
  const lowered = model.shapes.get(scene.__sourceFeatureId()!);
  if (!isSceneBackend(lowered)) throw new Error('the model did not build to an assembly scene');
  const arm = model.session.assemblies.get('rig') as Assembly;
  return { model, arm, scene, lowered };
}

const boxOf = (lowered: SceneBackend, name: string): Box => {
  const p = lowered.parts.find((q) => q.name === name)!;
  const bb = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform).boundingBox();
  return { min: [bb.min[0], bb.min[1], bb.min[2]], max: [bb.max[0], bb.max[1], bb.max[2]] };
};

/** Where one part must be, worked out by hand: its `at`, its world box, and
 *  points fixed to it (`local` in the part's own frame, `world` by hand). */
interface HandPlaced { at: V3; box: Box; points: { local: V3; world: V3 }[] }

/** Check every path that poses the parts against the hand numbers: the built
 *  scene and the re-posed scene (world box, and `worldTransform.point(at +
 *  local)`), the capture Scene (`worldTransform.point(at + local)`), and the
 *  `solveMates` placement (`placement.point(local)`). */
async function expectEveryPathAt(code: string, expected: Record<string, HandPlaced>): Promise<void> {
  const { arm, scene, lowered } = await build(code);
  const solved = await solveMates(arm);
  const reposed = reposedLoweredAssemblyScene(arm, lowered, solved.poses);
  expect(reposed).toBeDefined();
  for (const [name, e] of Object.entries(expected)) {
    expectBox(boxOf(lowered, name), e.box);
    expectBox(boxOf(reposed!, name), e.box);
    const built = lowered.parts.find((p) => p.name === name)!.worldTransform;
    const again = reposed!.parts.find((p) => p.name === name)!.worldTransform;
    const capture = scene.part(name).worldTransform;
    const placement = solved.poses.get(name)!;
    for (const { local, world } of e.points) {
      near(built.point(add(e.at, local)), world);
      near(again.point(add(e.at, local)), world);
      near(capture.point(add(e.at, local)), world);
      near(placement.point(local), world);
    }
  }
}

describe('every path agrees with the built scene for a part with `at`', () => {
  beforeAll(async () => { await initOcct(); });

  for (const kind of ['fastened', 'revolute'] as const) {
    it(`${kind}: capture Scene, solveMates and the re-posed scene match the lowered scene`, async () => {
      const code = script({ entry: 'solvedModel', kind, mountAt: [100, 0, 0], valveAt: [0, 0, 27] });
      const { model, arm, scene, lowered } = await build(code);
      const solved = await solveMates(arm);
      const reposed = reposedLoweredAssemblyScene(arm, lowered, solved.poses)!;
      expect(reposed).toBeDefined();
      for (const part of lowered.parts) {
        const at = resolvedPartAt(arm.__parts().find((p) => p.name === part.name)!.at, model.session.paramTable);
        sameTransform(scene.part(part.name).worldTransform, part.worldTransform);
        sameTransform(sceneMotion(solved.poses.get(part.name)!, at), part.worldTransform);
        sameTransform(reposed.parts.find((p) => p.name === part.name)!.worldTransform, part.worldTransform);
      }
    });
  }

  it('prismatic: every path puts the parts where the hand numbers say', async () => {
    // Mount at [100, 0, 0]: seat [4, -3, 5] -> [104, -3, 5]. The slider moves
    // the valve's base 6 mm up the seat's +Z axis: base -> [104, -3, 11], so a
    // valve point lands at [104, -3, 11] + (local - [1, 2, -4]).
    await expectEveryPathAt(
      script({ entry: 'solvedModel', kind: 'prismatic', mountAt: [100, 0, 0], valveAt: [0, 0, 27] }),
      {
        mount: {
          at: [100, 0, 0],
          box: { min: [90, -10, -5], max: [110, 10, 5] },
          points: [{ local: [4, -3, 5], world: [104, -3, 5] }],
        },
        valve: {
          at: [0, 0, 27],
          box: { min: [97, -8, 11], max: [109, -2, 19] },
          points: [
            { local: [1, 2, -4], world: [104, -3, 11] },
            { local: [6, 3, 4], world: [109, -2, 19] },
            { local: [-6, -3, -4], world: [97, -8, 11] },
          ],
        },
      },
    );
  });

  it('a chain: a child follows a parent that has at and is turned by a hinge', async () => {
    // mount box(20, 20, 10) at [100, 0, 0]; pin (axis +Z) at local [10, 0, 0]
    //   -> world [110, 0, 0].
    // link box(30, 6, 6) at [0, 40, 0], hinged at its pin [-15, 0, 0] and
    //   turned 90 deg about +Z. Rz90 maps (x, y, z) to (-y, x, z), so a link
    //   point lands at [110, 0, 0] + Rz90(local + [15, 0, 0]):
    //   x in [0, 30] -> Y in [0, 30]; y in [-3, 3] -> X in [107, 113].
    //   Its `end` [15, 0, 3] -> [110, 30, 3].
    // tip box(4, 4, 10) at [0, 0, 50], fastened by its foot [0, 0, -5] to
    //   the link's `end`, so a tip point lands at
    //   [110, 0, 0] + Rz90(local + [30, 0, 8]): z in [-5, 5] -> Z in [3, 13].
    // If the link's `at` did not cancel inside the link's motion, the tip
    //   would be off by that `at` turned by the hinge, Rz90 · [0, 40, 0] =
    //   [-40, 0, 0] (or its opposite); if its own `at` leaked in, by [0, 0, 50].
    const code = `
      const arm = assembly('rig');
      arm.part('mount', box(20, 20, 10, true), { at: [100, 0, 0] })
         .connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
      const link = arm.part('link', box(30, 6, 6, true), { at: [0, 40, 0] });
      link.connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [-15, 0, 0] }, axis: [0, 0, 1] });
      link.connector('end', { type: 'frame', origin: { kind: 'vec3', value: [15, 0, 3] } });
      arm.part('tip', box(4, 4, 10, true), { at: [0, 0, 50] })
         .connector('foot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -5] } });
      arm.mate('swing', 'mount.pin', 'link.pin', 'revolute', { pose: 90 });
      arm.mate('post', 'link.end', 'tip.foot', 'fastened');
      return arm.solvedModel({}, { validate: 'off' });
    `;
    await expectEveryPathAt(code, {
      mount: {
        at: [100, 0, 0],
        box: { min: [90, -10, -5], max: [110, 10, 5] },
        points: [{ local: [10, 0, 0], world: [110, 0, 0] }],
      },
      link: {
        at: [0, 40, 0],
        box: { min: [107, 0, -3], max: [113, 30, 3] },
        points: [
          { local: [-15, 0, 0], world: [110, 0, 0] },
          { local: [15, 0, 3], world: [110, 30, 3] },
          { local: [15, 3, 3], world: [107, 30, 3] },
        ],
      },
      tip: {
        at: [0, 0, 50],
        box: { min: [108, 28, 3], max: [112, 32, 13] },
        points: [
          { local: [0, 0, -5], world: [110, 30, 3] },
          { local: [0, 0, 5], world: [110, 30, 13] },
          { local: [2, 2, 5], world: [108, 32, 13] },
        ],
      },
    });
  });

  it('a param-driven at is resolved, and the mate still decides after a param edit', async () => {
    const code = `
      const dx = param('dx', 100);
      const lift = param('lift', 27);
      const arm = assembly('rig');
      arm.part('mount', box(20, 20, 10, true), { at: [dx, 0, 0] })
         .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [4, -3, 5] } });
      arm.part('valve', box(12, 6, 8, true), { at: [0, 0, lift] })
         .connector('base', { type: 'frame', origin: { kind: 'vec3', value: [1, 2, -4] } });
      arm.mate('m', 'mount.seat', 'valve.base', 'fastened');
      return arm.solvedModel({}, { validate: 'off' });
    `;
    const { model, lowered } = await build(code);
    expectBox(boxOf(lowered, 'mount'), { min: [90, -10, -5], max: [110, 10, 5] });
    expectBox(boxOf(lowered, 'valve'), { min: [97, -8, 5], max: [109, -2, 13] });

    const updated = await updateModelParams(model, [{ name: 'dx', value: 60 }, { name: 'lift', value: 40 }]);
    const after = updated.result.shape;
    if (!isSceneBackend(after)) throw new Error('the update did not build to an assembly scene');
    expectBox(boxOf(after, 'mount'), { min: [50, -10, -5], max: [70, 10, 5] });
    expectBox(boxOf(after, 'valve'), { min: [57, -8, 5], max: [69, -2, 13] });
  });

  it('topology connectors on a part with at keep landing where they did', async () => {
    // Same shape as the mounting-hole eval task: plate b authored at z=5 so
    // its bottom face meets the top face of plate a.
    const code = `
      const arm = assembly('rig');
      arm.part('a', box(20, 20, 5))
         .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
      arm.part('b', box(20, 20, 5), { at: [0, 0, 5] })
         .connector('h', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } } });
      arm.mate('screw', 'a.h', 'b.h', 'fastened');
      return arm.solvedModel({}, { validate: 'off' });
    `;
    const { scene, lowered } = await build(code);
    expectBox(boxOf(lowered, 'b'), { min: [0, 0, 5], max: [20, 20, 10] });
    for (const part of lowered.parts) sameTransform(scene.part(part.name).worldTransform, part.worldTransform);
  });

  it('the joint-axis gate sees the hinge where the built scene has it', async () => {
    // Hinge axis along +X through both bodies; the valve has `at` off the axis.
    const code = `
      const arm = assembly('rig');
      arm.part('mount', box(20, 20, 10, true))
         .connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [1, 0, 0] });
      arm.part('valve', box(12, 6, 8, true), { at: [0, 0, 27] })
         .connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [-6, 0, 0] }, axis: [1, 0, 0] });
      arm.mate('hinge', 'mount.pin', 'valve.pin', 'revolute', { pose: 30, limitsDeg: [-90, 90] });
      return arm.solvedModel({}, { validate: 'warn' });
    `;
    const { scene, lowered } = await build(code);
    // The valve hangs off the mount's +X face, turned 30 deg about X.
    const valve = boxOf(lowered, 'valve');
    expect(valve.min[0]).toBeCloseTo(10, 6);
    expect(valve.max[0]).toBeCloseTo(22, 6);
    expect(scene.warnings.filter((w) => w.code === 'assembly.joint-axis.unbound')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Two more places move points declared on a part's source shape against
// scene transforms of shapes that carry `at`: tendon anchors (tendon
// meshing) and the bbox corners of the fastened-drift check.

/** Centre of each end ring of a line tendon's tube: the face holds 16
 *  vertices around the `from` anchor, then 16 around the `to` anchor. */
function tendonEnds(vertices: ArrayLike<number>): { from: V3; to: V3 } {
  const ring = (first: number): V3 => {
    const c: V3 = [0, 0, 0];
    for (let i = first; i < first + 16; i++) {
      for (let k = 0; k < 3; k++) c[k] += vertices[i * 3 + k] / 16;
    }
    return c;
  };
  return { from: ring(0), to: ring(16) };
}

describe('tendon anchors and fastened-drift boxes of mated parts with `at`', () => {
  beforeAll(async () => { await initOcct(); });

  it('a tendon between mated parts with at is anchored on their connectors', async () => {
    // The mount (first part) keeps its `at` [100, 0, 0]: hook [-10, 0, 0]
    // -> [90, 0, 0]. The valve is hinged 90 deg about +X at the seat
    // [104, -3, 5]; Rx90 maps (x, y, z) to (x, -z, y), so its eye [6, 0, 0]
    // -> [104, -3, 5] + Rx90([6, 0, 0] - [1, 2, -4]) = [104, -3, 5] + [5, -4, -2]
    // = [109, -7, 3]. Anchors that missed the `at` would sit at [-10, 0, 0]
    // and [109, 20, 3].
    const code = `
      const arm = assembly('rig');
      const mount = arm.part('mount', box(20, 20, 10, true), { at: [100, 0, 0] });
      mount.connector('seat', { type: 'axis', origin: { kind: 'vec3', value: [4, -3, 5] }, axis: [1, 0, 0] });
      mount.connector('hook', { type: 'axis', origin: { kind: 'vec3', value: [-10, 0, 0] }, axis: [0, 0, 1] });
      const valve = arm.part('valve', box(12, 6, 8, true), { at: [0, 0, 27] });
      valve.connector('base', { type: 'axis', origin: { kind: 'vec3', value: [1, 2, -4] }, axis: [1, 0, 0] });
      valve.connector('eye', { type: 'axis', origin: { kind: 'vec3', value: [6, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('m', 'mount.seat', 'valve.base', 'revolute', { pose: 90 });
      arm.tendon('spring', { from: 'mount.hook', to: 'valve.eye', restLengthMm: 30, stiffnessNmm: 0.5 });
      return arm.solvedModel({}, { validate: 'off' });
    `;
    const { records, paramTable, session } = await runScript({ code, fileName: 'mate-at-tendon.kcad.ts' });
    const { features } = await meshFeaturesPerFeature(records, paramTable, session);
    const tendon = features.find((f) => f.assemblyPartName === '__tendon__spring');
    expect(tendon).toBeDefined();
    const { from, to } = tendonEnds(tendon!.faces[0].vertices);
    // Float32 vertex buffer: compare to 1e-3 mm.
    for (let k = 0; k < 3; k++) {
      expect(from[k]).toBeCloseTo([90, 0, 0][k], 3);
      expect(to[k]).toBeCloseTo([109, -7, 3][k], 3);
    }
  });

  it('the fastened-drift check measures a mated part with at in its own frame', async () => {
    // lid: box(12, 6, 8) spans [0, 12] x [0, 6] x [0, 8] in its own frame and
    // has `at` [0, 0, 27]. It is hinged to the mount about +X through its pin
    // [0, 0, 0] and also fastened to the mount, which the hinge breaks: at
    // 90 deg a lid point c moves from [10, 0, 0] + c to [10, 0, 0] + Rx90(c),
    // a drift of |Rx90(c) - c| = sqrt(2 (cy^2 + cz^2)). The worst corner is
    // [0, 6, 8], index 3 in x -> y -> z order: sqrt(200) = 14.14 mm. Corners
    // that kept the `at` (z in [27, 35]) would give 50.22 mm.
    const code = `
      const arm = assembly('rig');
      const mount = arm.part('mount', box(20, 20, 10, true));
      mount.connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [1, 0, 0] });
      mount.connector('pad', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
      const lid = arm.part('lid', box(12, 6, 8), { at: [0, 0, 27] });
      lid.connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
      lid.connector('pad', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      arm.mate('hinge', 'mount.pin', 'lid.pin', 'revolute', { limitsDeg: [0, 90] });
      arm.mate('weld', 'mount.pad', 'lid.pad', 'fastened');
      return arm.solvedModel({}, { validate: 'off' });
    `;
    const { arm } = await build(code);
    // A zero budget skips the BREP sweep; the drift check still reads its
    // boxes from the lowered rest scene.
    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    const drift = result.failures.filter((f) => f.code === 'mechanism.disconnect');
    expect(drift).toHaveLength(1);
    expect(drift[0].message).toContain("at pose sample 'hinge:90' part 'lid' bbox-corner #3 drifts 14.14 mm");
  });
});
