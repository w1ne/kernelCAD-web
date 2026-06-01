import { describe, it, expect } from 'vitest';
import { Transform, type Vec3 } from '../../../src/shared/runtime/se3';

function near(a: Vec3, b: Vec3, eps = 1e-6): void {
  expect(Math.abs(a[0] - b[0])).toBeLessThan(eps);
  expect(Math.abs(a[1] - b[1])).toBeLessThan(eps);
  expect(Math.abs(a[2] - b[2])).toBeLessThan(eps);
}

describe('Transform', () => {
  it('identity leaves points unchanged', () => {
    const t = Transform.identity();
    near(t.point([1, 2, 3]), [1, 2, 3]);
  });

  it('translation moves points', () => {
    const t = Transform.translation(5, 0, -3);
    near(t.point([1, 2, 3]), [6, 2, 0]);
  });

  it('rotationAxisAngleDeg([0,0,1], 90deg) sends X to Y', () => {
    const t = Transform.rotationAxisAngleDeg([0, 0, 1], 90);
    near(t.point([1, 0, 0]), [0, 1, 0]);
  });

  it('rotationAxisAngleDeg([0,1,0], 90deg) sends X to -Z', () => {
    const t = Transform.rotationAxisAngleDeg([0, 1, 0], 90);
    near(t.point([1, 0, 0]), [0, 0, -1]);
  });

  it('rotationAroundPivot rotates about a non-origin pivot', () => {
    // 90deg about Z, pivot at (5, 0, 0). Point (5, 1, 0):
    //   relative to pivot: (0, 1, 0). Rotate 90deg about Z: (-1, 0, 0). + pivot: (4, 0, 0).
    const t = Transform.rotationAroundPivot([0, 0, 1], 90, [5, 0, 0]);
    near(t.point([5, 1, 0]), [4, 0, 0]);
  });

  it('compose: this * other applies other first, then this', () => {
    // Translate(1, 0, 0) compose Translate(0, 2, 0): apply (0,2,0) first, then (1,0,0).
    const t = Transform.translation(1, 0, 0).compose(Transform.translation(0, 2, 0));
    near(t.point([0, 0, 0]), [1, 2, 0]);
  });

  it('canonical regression: yaw 90Z then pitch 90Y on shoulder.tip + elbow', () => {
    // Body-tree FK convention used by Tasks 2-7:
    //   shoulderT = identity * shoulderJointLocal     where shoulderJointLocal = Translate(origin) * Rot(axis, deg)
    //   elbowT    = shoulderT * elbowJointLocal       where elbow's local origin sits at (0,0,10) in shoulder's frame
    //
    //   shoulderT = Rot(Z, 90)
    //   elbowT    = Rot(Z, 90) * Translate(0,0,10) * Rot(Y, 90)
    //
    // For p = [0, 0, 0] (elbow's local origin = shoulder.tip):
    //   Rot(Y,90)([0,0,0]) = [0,0,0]
    //   Translate(0,0,10) -> [0,0,10]
    //   Rot(Z,90) -> [0,0,10]   (Z preserved)
    //
    // For p = [10, 0, 0] (elbow's +X tip in elbow's local frame):
    //   Rot(Y,90)([10,0,0]) = [0, 0, -10]
    //   Translate(0,0,10) -> [0, 0, 0]
    //   Rot(Z,90) -> [0, 0, 0]
    //
    // For p = [0, 10, 0]:
    //   Rot(Y,90)([0,10,0]) = [0, 10, 0]    (Y preserved)
    //   Translate(0,0,10) -> [0, 10, 10]
    //   Rot(Z,90)([0,10,10]) = [-10, 0, 10]  (X<-(-Y), Y<-X, Z preserved)

    const baseT = Transform.identity();
    const shoulderJointLocal = Transform.translation(0, 0, 0).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 90));
    const shoulderT = baseT.compose(shoulderJointLocal);
    const elbowJointLocal = Transform.translation(0, 0, 10).compose(Transform.rotationAxisAngleDeg([0, 1, 0], 90));
    const elbowT = shoulderT.compose(elbowJointLocal);

    // Elbow's origin in world (= shoulder's tip in world).
    near(elbowT.point([0, 0, 0]), [0, 0, 10], 1e-6);
    // Elbow's +X tip (10, 0, 0 in elbow's local).
    near(elbowT.point([10, 0, 0]), [0, 0, 0], 1e-6);
    // Elbow's +Y at unit distance.
    near(elbowT.point([0, 10, 0]), [-10, 0, 10], 1e-6);
  });

  it('decomposeToTranslateAndRotate round-trips identity', () => {
    const d = Transform.identity().decomposeToTranslateAndRotate();
    near(d.translate, [0, 0, 0]);
    expect(d.rotateDeg).toBeCloseTo(0);
  });

  it('decomposeToTranslateAndRotate round-trips pure translation', () => {
    const t = Transform.translation(5, -2, 7);
    const d = t.decomposeToTranslateAndRotate();
    near(d.translate, [5, -2, 7]);
    expect(d.rotateDeg).toBeCloseTo(0);
  });

  it('decomposeToTranslateAndRotate round-trips pure rotation', () => {
    const t = Transform.rotationAxisAngleDeg([0, 1, 0], 45);
    const d = t.decomposeToTranslateAndRotate();
    near(d.translate, [0, 0, 0]);
    expect(d.rotateDeg).toBeCloseTo(45);
    near(d.rotateAxis, [0, 1, 0], 1e-6);
  });

  it('decomposeToTranslateAndRotate round-trips T * R', () => {
    const original = Transform.translation(3, 4, 5).compose(Transform.rotationAxisAngleDeg([1, 0, 0], 30));
    const d = original.decomposeToTranslateAndRotate();
    // Reconstruct via Translate(t) * Rotate(axis, deg) == original
    const reconstructed = Transform.translation(d.translate[0], d.translate[1], d.translate[2])
      .compose(Transform.rotationAxisAngleDeg(d.rotateAxis, d.rotateDeg));
    // Compare via point-mapping.
    near(reconstructed.point([1, 0, 0]), original.point([1, 0, 0]), 1e-6);
    near(reconstructed.point([0, 1, 0]), original.point([0, 1, 0]), 1e-6);
    near(reconstructed.point([0, 0, 1]), original.point([0, 0, 1]), 1e-6);
  });

  it('decomposeToTranslateAndRotate handles 180deg rotation', () => {
    const t = Transform.rotationAxisAngleDeg([0, 0, 1], 180);
    const d = t.decomposeToTranslateAndRotate();
    expect(d.rotateDeg).toBeCloseTo(180);
    near(d.rotateAxis, [0, 0, 1], 1e-6);
  });

  it('eulerXYZDeg(0,0,0) is identity', () => {
    const t = Transform.eulerXYZDeg(0, 0, 0);
    near(t.point([1, 2, 3]), [1, 2, 3]);
  });

  it('eulerXYZDeg(90,0,0) rotates about X', () => {
    const t = Transform.eulerXYZDeg(90, 0, 0);
    near(t.point([0, 1, 0]), [0, 0, 1], 1e-6);
  });

  it('axisDir applies rotation but not translation', () => {
    const t = Transform.translation(100, 200, 300).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 90));
    near(t.axisDir([1, 0, 0]), [0, 1, 0], 1e-6);
  });

  // ────────────────────────────────────────────────────────────────────
  // Inverse — used by the physics-loop rigidity check (P0.2).
  // ────────────────────────────────────────────────────────────────────

  it('inverse of identity is identity', () => {
    const inv = Transform.identity().inverse();
    near(inv.point([1, 2, 3]), [1, 2, 3]);
  });

  it('inverse of pure translation negates translation', () => {
    const t = Transform.translation(5, -2, 7);
    const inv = t.inverse();
    near(inv.point([5, -2, 7]), [0, 0, 0]);
    near(inv.point([0, 0, 0]), [-5, 2, -7]);
  });

  it('inverse of pure rotation transposes rotation', () => {
    // Rot(Z, 90) sends [1,0,0] -> [0,1,0]. Its inverse must send [0,1,0] -> [1,0,0].
    const t = Transform.rotationAxisAngleDeg([0, 0, 1], 90);
    const inv = t.inverse();
    near(inv.point([0, 1, 0]), [1, 0, 0], 1e-6);
    near(inv.point([0, 0, 1]), [0, 0, 1], 1e-6); // axis fixed
  });

  it('T.compose(T.inverse()) is identity', () => {
    const t = Transform.translation(3, 4, 5).compose(Transform.rotationAxisAngleDeg([1, 0, 0], 30));
    const id = t.compose(t.inverse());
    // Sample a few points; all should land at themselves.
    near(id.point([0, 0, 0]), [0, 0, 0], 1e-9);
    near(id.point([1, 0, 0]), [1, 0, 0], 1e-9);
    near(id.point([0, 1, 0]), [0, 1, 0], 1e-9);
    near(id.point([0, 0, 1]), [0, 0, 1], 1e-9);
  });

  it('T.inverse().compose(T) is identity', () => {
    const t = Transform.rotationAxisAngleDeg([1, 1, 0], 47)
      .compose(Transform.translation(8, -3, 2))
      .compose(Transform.rotationAxisAngleDeg([0, 0, 1], 120));
    const id = t.inverse().compose(t);
    near(id.point([0, 0, 0]), [0, 0, 0], 1e-9);
    near(id.point([10, 20, 30]), [10, 20, 30], 1e-9);
  });

  it('inverse of T*R: T = Translate ∘ Rotate, T^-1 = Rotate^T ∘ Translate(-t)', () => {
    // Round-trip a non-trivial transform through inverse and confirm
    // it sends T·p back to p for a representative set of points.
    const t = Transform.translation(10, 20, 30).compose(Transform.rotationAxisAngleDeg([0, 1, 0], 45));
    const inv = t.inverse();
    const samples: Vec3[] = [
      [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [5, -7, 13], [-100, 0.5, 0.001],
    ];
    for (const p of samples) {
      near(inv.point(t.point(p)), p, 1e-9);
    }
  });
});
