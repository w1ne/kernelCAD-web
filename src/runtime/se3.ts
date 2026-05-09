// src/runtime/se3.ts
//
// Internal SE(3) math primitives. Used by:
//   - Assembly.solve(poses) for body-tree forward kinematics
//   - Shape.transform(t) for applying SE(3) to a shape
//   - SolvedKinematics.transform(name) as the read-only output handle
//
// NOT exported as a public authoring API in v1. Joint axis + origin remain
// numeric Vec3 in user code; full Transform exists only on the output side.
//
// Storage: 4x4 matrix, column-major (matches OpenGL / OCCT conventions).

export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

function deg2rad(d: number): number { return d * DEG; }

export class Transform {
  private readonly m: Float64Array;  // 16 elements, column-major

  private constructor(m: Float64Array) {
    this.m = m;
  }

  static identity(): Transform {
    const m = new Float64Array(16);
    m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
    return new Transform(m);
  }

  static translation(x: number, y: number, z: number): Transform {
    const m = new Float64Array(16);
    m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
    m[12] = x; m[13] = y; m[14] = z;
    return new Transform(m);
  }

  /** Rotation around an axis (NOT necessarily unit) by angle in degrees. */
  static rotationAxisAngleDeg(axis: Vec3, deg: number): Transform {
    const len = Math.hypot(axis[0], axis[1], axis[2]);
    if (len === 0) return Transform.identity();
    const ux = axis[0] / len, uy = axis[1] / len, uz = axis[2] / len;
    const a = deg2rad(deg);
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    const m = new Float64Array(16);
    // Column-major: m[col * 4 + row]
    m[0]  = c + ux*ux*t;
    m[1]  = uy*ux*t + uz*s;
    m[2]  = uz*ux*t - uy*s;
    m[3]  = 0;
    m[4]  = ux*uy*t - uz*s;
    m[5]  = c + uy*uy*t;
    m[6]  = uz*uy*t + ux*s;
    m[7]  = 0;
    m[8]  = ux*uz*t + uy*s;
    m[9]  = uy*uz*t - ux*s;
    m[10] = c + uz*uz*t;
    m[11] = 0;
    m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
    return new Transform(m);
  }

  /** Rotation around an axis passing through pivot point. */
  static rotationAroundPivot(axis: Vec3, deg: number, pivot: Vec3): Transform {
    return Transform.translation(pivot[0], pivot[1], pivot[2])
      .compose(Transform.rotationAxisAngleDeg(axis, deg))
      .compose(Transform.translation(-pivot[0], -pivot[1], -pivot[2]));
  }

  /** Extrinsic XYZ Euler rotation (rotate about world X, then Y, then Z). */
  static eulerXYZDeg(rx: number, ry: number, rz: number): Transform {
    return Transform.rotationAxisAngleDeg([1, 0, 0], rx)
      .compose(Transform.rotationAxisAngleDeg([0, 1, 0], ry))
      .compose(Transform.rotationAxisAngleDeg([0, 0, 1], rz));
  }

  /** Compose: this * other. Read as "apply other, then this." */
  compose(other: Transform): Transform {
    const a = this.m, b = other.m;
    const m = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
        m[col * 4 + row] = sum;
      }
    }
    return new Transform(m);
  }

  /** Apply to a point (homogeneous, w=1). */
  point(p: Vec3): Vec3 {
    const m = this.m;
    return [
      m[0]*p[0] + m[4]*p[1] + m[8]*p[2]  + m[12],
      m[1]*p[0] + m[5]*p[1] + m[9]*p[2]  + m[13],
      m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14],
    ];
  }

  /** Apply to a direction vector (no translation). */
  axisDir(v: Vec3): Vec3 {
    const m = this.m;
    return [
      m[0]*v[0] + m[4]*v[1] + m[8]*v[2],
      m[1]*v[0] + m[5]*v[1] + m[9]*v[2],
      m[2]*v[0] + m[6]*v[1] + m[10]*v[2],
    ];
  }

  /**
   * Decompose to translate + rotate components. Result satisfies:
   *   T = Translate(translate) * Rotate(rotateAxis, rotateDeg)
   *
   * For zero rotation, rotateAxis defaults to [0, 0, 1] with rotateDeg = 0.
   * Numerically stable via the quaternion-based axis-angle extraction.
   */
  decomposeToTranslateAndRotate(): {
    translate: Vec3;
    rotateAxis: Vec3;
    rotateDeg: number;
  } {
    const m = this.m;
    const translate: Vec3 = [m[12], m[13], m[14]];
    // Rotation matrix (3x3 part) - column-major reads as columns.
    const r00 = m[0],  r10 = m[1],  r20 = m[2];
    const r01 = m[4],  r11 = m[5],  r21 = m[6];
    const r02 = m[8],  r12 = m[9],  r22 = m[10];
    // Quaternion from rotation matrix (Shoemake's algorithm - numerically stable).
    const tr = r00 + r11 + r22;
    let qw: number, qx: number, qy: number, qz: number;
    if (tr > 0) {
      const s = Math.sqrt(tr + 1) * 2;
      qw = 0.25 * s;
      qx = (r21 - r12) / s;
      qy = (r02 - r20) / s;
      qz = (r10 - r01) / s;
    } else if (r00 > r11 && r00 > r22) {
      const s = Math.sqrt(1 + r00 - r11 - r22) * 2;
      qw = (r21 - r12) / s;
      qx = 0.25 * s;
      qy = (r01 + r10) / s;
      qz = (r02 + r20) / s;
    } else if (r11 > r22) {
      const s = Math.sqrt(1 + r11 - r00 - r22) * 2;
      qw = (r02 - r20) / s;
      qx = (r01 + r10) / s;
      qy = 0.25 * s;
      qz = (r12 + r21) / s;
    } else {
      const s = Math.sqrt(1 + r22 - r00 - r11) * 2;
      qw = (r10 - r01) / s;
      qx = (r02 + r20) / s;
      qy = (r12 + r21) / s;
      qz = 0.25 * s;
    }
    // Quaternion -> axis-angle.
    const angleRad = 2 * Math.acos(Math.min(1, Math.max(-1, qw)));
    const sinHalf = Math.sqrt(1 - qw * qw);
    let rotateAxis: Vec3;
    let rotateDeg = angleRad / DEG;
    if (sinHalf < 1e-9) {
      // Identity rotation (or numerical noise).
      rotateAxis = [0, 0, 1];
      rotateDeg = 0;
    } else {
      rotateAxis = [qx / sinHalf, qy / sinHalf, qz / sinHalf];
    }
    return { translate, rotateAxis, rotateDeg };
  }

  /** Read-only access to the internal Mat4 (column-major). */
  toMat4(): readonly number[] {
    return Array.from(this.m);
  }
}
