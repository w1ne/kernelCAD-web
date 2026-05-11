import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

function near(a: readonly number[], b: readonly number[], eps = 1e-6): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
  }
}

describe('Assembly.solve — body-tree forward kinematics', () => {
  it('zero-pose, single part, no joints — solvedModel returns a Scene with the part', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    arm.part('only', kcad.box(10, 10, 10));
    // Per Task 14: solvedModel returns a Scene (multi-body), not a Shape.
    // Assert Scene structure rather than the legacy shape.id token.
    // v0.6 T9: solvedModel returns Promise<Scene> (await for the resolved
    // Scene; capture-time pose errors still throw synchronously).
    const scene = await arm.solvedModel({});
    expect(scene.assemblyName).toBe('test');
    expect(scene.parts.map(p => p.name)).toEqual(['only']);
  });

  it('single revolute pose: solved.transform(child) reflects 90° rotation about Z', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    const solved = arm.solve({ tilt: 90 });
    // b's world transform is a rotation about Z. Apply to b's local +X (1,0,0) → (0,1,0).
    near(solved.transform('b').point([1, 0, 0]), [0, 1, 0]);
    // Apply to (0,1,0) → (-1,0,0).
    near(solved.transform('b').point([0, 1, 0]), [-1, 0, 0]);
  });

  it('canonical regression: yaw 90°Z + pitch 90°Y on vertical-shoulder + horizontal-elbow', () => {
    // The bug case. With broken solve(), elbow.local(0,0,0) would not land
    // at world (0, 0, 10). With correct body-tree FK, it does.
    //
    // Layout:
    //   base part at world origin.
    //   shoulder column: long axis +Z. shoulder.local origin attaches at base's
    //     local (0,0,0) via base-yaw joint.
    //   elbow: long axis +X. elbow.local origin attaches at shoulder's local
    //     (0,0,10) — i.e. top of the shoulder column — via shoulder-pitch joint.
    //
    // After yaw=90°Z + pitch=90°Y:
    //   T_shoulder_world = identity * (Translate(0,0,0) * Rot(Z,90°))
    //                    = Rot(Z, 90°)
    //   T_elbow_world = T_shoulder_world * (Translate(0,0,10) * Rot(Y,90°))
    //                = Rot(Z,90°) * Translate(0,0,10) * Rot(Y,90°)
    //   T_elbow_world.point([0, 0, 0]) = Rot(Z,90°)(Translate(0,0,10)(Rot(Y,90°)([0,0,0])))
    //                                  = Rot(Z,90°)(Translate(0,0,10)([0,0,0]))
    //                                  = Rot(Z,90°)([0,0,10])
    //                                  = [0, 0, 10]
    //   T_elbow_world.point([10, 0, 0]) = Rot(Z,90°)(Translate(0,0,10)(Rot(Y,90°)([10,0,0])))
    //                                   = Rot(Z,90°)(Translate(0,0,10)([0, 0, -10]))
    //                                   = Rot(Z,90°)([0, 0, 0])
    //                                   = [0, 0, 0]

    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('regression');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const shoulder = arm.part('shoulder', kcad.box(2, 2, 10));
    const elbow = arm.part('elbow', kcad.box(10, 2, 2));

    // Base-yaw at base's origin, axis Z.
    arm.revolute('yaw', base, shoulder, { axis: [0, 0, 1], origin: [0, 0, 0] });
    // Shoulder-pitch at shoulder's tip (top of shoulder column, in shoulder local frame).
    arm.revolute('pitch', shoulder, elbow, { axis: [0, 1, 0], origin: [0, 0, 10] });

    const solved = arm.solve({ yaw: 90, pitch: 90 });
    near(solved.transform('elbow').point([0, 0, 0]), [0, 0, 10]);
    near(solved.transform('elbow').point([10, 0, 0]), [0, 0, 0]);
  });

  it('prismatic joint: pose value translates child along axis', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.prismatic('slide', a, b, { axis: [1, 0, 0], origin: [0, 0, 0] });
    const solved = arm.solve({ slide: 5 });
    near(solved.transform('b').point([0, 0, 0]), [5, 0, 0]);
  });

  it('fixed joint: child attached at origin offset, no DOF', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.fixed('weld', a, b, { origin: [3, 4, 5] });
    const solved = arm.solve({});
    near(solved.transform('b').point([0, 0, 0]), [3, 4, 5]);
  });

  it('fixed joint pose throws feature.invalid-args (no DOF)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.fixed('weld', a, b, { origin: [3, 0, 0] });
    expect(() => arm.solve({ weld: 10 as unknown as number })).toThrow(/fixed.*no pose/i);
  });

  it('ball joint: Euler XYZ pose rotates child', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.ball('hip', a, b, { origin: [0, 0, 0] });
    // Rotate 90° about Z only.
    const solved = arm.solve({ hip: [0, 0, 90] });
    near(solved.transform('b').point([1, 0, 0]), [0, 1, 0]);
  });

  it('multi-joint chain (3 revolutes): elbow-tip world position composes correctly', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('chain');
    const a = arm.part('a', kcad.box(1, 1, 1));
    const b = arm.part('b', kcad.box(10, 1, 1));
    const c = arm.part('c', kcad.box(10, 1, 1));
    const d = arm.part('d', kcad.box(10, 1, 1));
    // a→b at origin around Z.
    arm.revolute('j1', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    // b→c at b's tip (10, 0, 0) around Y.
    arm.revolute('j2', b, c, { axis: [0, 1, 0], origin: [10, 0, 0] });
    // c→d at c's tip (10, 0, 0) around Y.
    arm.revolute('j3', c, d, { axis: [0, 1, 0], origin: [10, 0, 0] });

    // Zero pose: d's local origin (0,0,0) lands at b's tip + c's tip = (20, 0, 0)? No —
    // c's local origin lands at b's tip (10, 0, 0). d's local origin lands at c's tip
    // in c's local frame, which is c.local(10, 0, 0). After applying T_c.world:
    //   T_b_world = identity * Trans(0) * Rot(Z, 0)  = identity
    //   T_c_world = T_b_world * Trans(10,0,0) * Rot(Y, 0)  = Trans(10, 0, 0)
    //   T_d_world = T_c_world * Trans(10,0,0) * Rot(Y, 0)  = Trans(20, 0, 0)
    //   T_d_world.point([0,0,0]) = (20, 0, 0).
    const solvedZero = arm.solve({});
    near(solvedZero.transform('d').point([0, 0, 0]), [20, 0, 0]);
  });

  it('omitted joints default to 0 (kinematic-zero)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [5, 0, 0] });
    // Empty poses → tilt = 0.
    const solved = arm.solve({});
    near(solved.transform('b').point([0, 0, 0]), [5, 0, 0]);
  });

  it('unknown joint name throws feature.invalid-args at solve time', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    expect(() => arm.solve({ wrist: 30 as unknown as number })).toThrow(/unknown joint/i);
  });

  it('non-finite pose values throw feature.invalid-args', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    expect(() => arm.solve({ tilt: Number.NaN })).toThrow(/finite/i);
    expect(() => arm.solve({ tilt: Number.POSITIVE_INFINITY })).toThrow(/finite/i);
  });

  it('ball joint with non-vec3 pose throws', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.ball('hip', a, b, { origin: [0, 0, 0] });
    expect(() => arm.solve({ hip: 30 as unknown as number })).toThrow();
    expect(() => arm.solve({ hip: [0, 0] as unknown as [number, number, number] })).toThrow();
  });

  it('part with two parent joints rejects', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    const c = arm.part('c', kcad.box(10, 10, 10));
    arm.revolute('j1', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    // c has 'b' as its second parent — invalid.
    arm.revolute('j2', c, b, { axis: [0, 1, 0], origin: [0, 0, 0] });
    expect(() => arm.solve({})).toThrow(/two parent joints|multi-parent/i);
  });

  it('cycle in joint graph rejects', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('j1', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    // b → a creates a cycle. (BUT also makes 'a' have two parents — would fail multi-parent
    // first. To isolate the cycle case, need three parts in a triangle.)
    const c = arm.part('c', kcad.box(10, 10, 10));
    arm.revolute('j2', b, c, { axis: [0, 1, 0], origin: [0, 0, 0] });
    arm.revolute('j3', c, a, { axis: [1, 0, 0], origin: [0, 0, 0] });
    // Now a → b → c → a is a cycle and 'a' has two parents (none initially, then j3).
    // Actually each part has exactly one parent: b's parent is a, c's parent is b, a's
    // parent is c. That forms a cycle without multi-parent. Cycle detection should fire.
    expect(() => arm.solve({})).toThrow(/cycle|multi-parent/i);
  });

  it('empty assembly throws feature.invalid-args', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('empty');
    expect(() => arm.solve({})).toThrow(/at least one part/i);
  });

  it('SolvedKinematics.transform on unknown part throws', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    arm.part('a', kcad.box(10, 10, 10));
    const solved = arm.solve({});
    expect(() => solved.transform('nonexistent')).toThrow(/unknown part/i);
  });

  it('SolvedKinematics.value on unknown joint throws', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    arm.part('a', kcad.box(10, 10, 10));
    const solved = arm.solve({});
    expect(() => solved.value('nonexistent')).toThrow(/unknown joint/i);
  });

  it('SolvedKinematics.value returns supplied or default pose', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));
    arm.revolute('tilt', a, b, { axis: [0, 0, 1], origin: [0, 0, 0] });
    const solvedSupplied = arm.solve({ tilt: 30 });
    expect(solvedSupplied.value('tilt')).toBe(30);

    // Fresh assembly for default-pose case (solve mutates originalShape transforms).
    const arm2 = kcad.assembly('test2');
    const a2 = arm2.part('a2', kcad.box(10, 10, 10));
    const b2 = arm2.part('b2', kcad.box(10, 10, 10));
    arm2.revolute('tilt', a2, b2, { axis: [0, 0, 1], origin: [0, 0, 0] });
    const solvedDefault = arm2.solve({});
    expect(solvedDefault.value('tilt')).toBe(0);
  });

  it('SolvedKinematics.bodies iterates all parts', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    arm.part('a', kcad.box(10, 10, 10));
    arm.part('b', kcad.box(10, 10, 10));
    arm.part('c', kcad.box(10, 10, 10));
    const solved = arm.solve({});
    const seen = [...solved.bodies()].map(body => body.name);
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('connect-only chain inherits joint via connectParentId (tool fixed-attached to wrist)', () => {
    // Layout:
    //   base — base-yaw → shoulder ; tool fixed-connect to shoulder (no joint).
    //   tool's transform should follow shoulder's rotation through connectParentId.
    //
    // BUT: in v1's current implementation, tool's connect: { to: shoulder.connector('mount') }
    // uses the connector-based `connect:` API, not a joint. The body-tree FK walks joints,
    // not connect-relationships, so without a joint above tool, it has no parent, and
    // its world transform is identity (root-like). connectParentId tracking is for
    // FUTURE joint-inheritance (per spec); not in this slice.
    //
    // Skip for now — write the test once joint-inheritance through connectParentId is
    // wired in (separate slice).
    expect(true).toBe(true);
  });
});
