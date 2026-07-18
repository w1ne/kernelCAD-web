import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';

describe('OcctBackend.massProperties', () => {
  beforeAll(async () => { await initOcct(); });

  it('computes analytic mass for a 10x10x10 mm cube at density 1000 kg/m^3', () => {
    // Volume = 1000 mm^3 = 1e-6 m^3; mass = 1000 * 1e-6 = 1e-3 kg.
    const cube = OcctBackend.box(10, 10, 10);
    const mp = cube.massProperties(1000);
    expect(mp.mass).toBeCloseTo(1e-3, 6);
  });

  it('places centroid at the geometric center of a cube placed at origin', () => {
    // OcctBackend.box(W, H, D) defaults to non-centered → origin corner at (0,0,0).
    const cube = OcctBackend.box(20, 20, 20);
    const mp = cube.massProperties();
    expect(mp.com[0]).toBeCloseTo(10, 3);
    expect(mp.com[1]).toBeCloseTo(10, 3);
    expect(mp.com[2]).toBeCloseTo(10, 3);
  });

  it('emits the principal inertia diagonal for a cube about its CoM (Ixx=Iyy=Izz)', () => {
    // For a uniform cube of side L=20mm at density 1000 kg/m^3:
    // mass = 1000 * (20e-3)^3 = 8e-3 kg
    // Ixx = (1/6) * m * L^2 = (1/6) * 8e-3 * (20e-3)^2 = 5.333e-7 kg.m^2
    const cube = OcctBackend.box(20, 20, 20);
    const mp = cube.massProperties(1000);
    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    expect(ixx).toBeCloseTo(iyy, 9);
    expect(iyy).toBeCloseTo(izz, 9);
    // OCCT reports MatrixOfInertia about the centroid for a symmetric solid;
    // off-diagonal terms should be (numerically) zero.
    expect(Math.abs(ixy)).toBeLessThan(1e-12);
    expect(Math.abs(ixz)).toBeLessThan(1e-12);
    expect(Math.abs(iyz)).toBeLessThan(1e-12);
    // Sanity-check magnitude (within 1% of analytic 5.333e-7).
    expect(ixx).toBeGreaterThan(5.0e-7);
    expect(ixx).toBeLessThan(5.7e-7);
  });

  it('scales mass linearly with declared density', () => {
    const cube = OcctBackend.box(10, 10, 10);
    const water = cube.massProperties(1000);
    const steel = cube.massProperties(7850);
    expect(steel.mass / water.mass).toBeCloseTo(7.85, 3);
  });

  it('defaults to density 1000 kg/m^3 when no argument is passed', () => {
    const cube = OcctBackend.box(10, 10, 10);
    const explicit = cube.massProperties(1000);
    const defaulted = cube.massProperties();
    expect(defaulted.mass).toBeCloseTo(explicit.mass, 9);
  });
});

// Every check below is against a textbook closed form, not against a
// previously-recorded output. A binding that type-checks can still return
// garbage (or throw `BindingError: unbound types`) at runtime, so the numbers
// are the only real evidence that GPropWrapper is wired correctly.
describe('OcctBackend.massProperties — inertia tensor vs closed form', () => {
  beforeAll(async () => { await initOcct(); });

  const DENSITY = 1000;
  /** Relative closeness, since these values span many orders of magnitude. */
  const expectRel = (actual: number, expected: number, rel = 1e-6) => {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * rel);
  };

  it('matches I = m(b^2+c^2)/12 for an asymmetric solid box', () => {
    // Deliberately three DIFFERENT side lengths: a cube cannot distinguish a
    // correct tensor from a transposed / axis-swapped one.
    const [a, b, c] = [20, 10, 30]; // mm
    const mp = OcctBackend.box(a, b, c).massProperties(DENSITY);

    const m = DENSITY * (a * b * c) * 1e-9; // kg
    expect(m).toBeCloseTo(6e-3, 12);
    const [A, B, C] = [a * 1e-3, b * 1e-3, c * 1e-3]; // m

    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    expectRel(ixx, (m * (B * B + C * C)) / 12);
    expectRel(iyy, (m * (A * A + C * C)) / 12);
    expectRel(izz, (m * (A * A + B * B)) / 12);
    // Axis-aligned box about its centroid => products of inertia vanish.
    for (const p of [ixy, ixz, iyz]) expect(Math.abs(p)).toBeLessThan(1e-18);
  });

  it('returns a matrix that is exactly symmetric and agrees with inertia6', () => {
    const mp = OcctBackend.box(20, 10, 30).massProperties(DENSITY);
    const M = mp.inertiaMatrix;
    expect(M).toHaveLength(3);
    for (const row of M) expect(row).toHaveLength(3);
    // Exact equality, not toBeCloseTo: the implementation symmetrises, and
    // URDF/MJCF consumers rely on that being exact.
    expect(M[0][1]).toBe(M[1][0]);
    expect(M[0][2]).toBe(M[2][0]);
    expect(M[1][2]).toBe(M[2][1]);

    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    expect([M[0][0], M[0][1], M[0][2]]).toEqual([ixx, ixy, ixz]);
    expect([M[1][1], M[1][2], M[2][2]]).toEqual([iyy, iyz, izz]);
  });

  it('matches I = 2mr^2/5 about every centroidal axis of a solid sphere', () => {
    const r = 15; // mm
    const mp = OcctBackend.sphere(r).massProperties(DENSITY);

    const R = r * 1e-3;
    const m = DENSITY * (4 / 3) * Math.PI * R ** 3;
    // A sphere is meshed exactly by OCCT's analytic surface, but tolerate a
    // loose band anyway — this asserts the physics, not the tessellator.
    expectRel(mp.mass, m, 1e-4);

    const expected = (2 / 5) * mp.mass * R * R;
    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    for (const d of [ixx, iyy, izz]) expectRel(d, expected, 1e-4);
    for (const p of [ixy, ixz, iyz]) expect(Math.abs(p)).toBeLessThan(expected * 1e-6);
    // Degenerate in all three directions => OCCT should flag a symmetry point.
    expect(mp.hasSymmetryPoint).toBe(true);
  });

  it('matches mr^2/2 axial and m(3r^2+h^2)/12 transverse for a solid cylinder', () => {
    const [r, h] = [8, 40]; // mm; OcctBackend.cylinder extrudes along +Z
    // NOTE: the factory is cylinder(height, radius) — height first.
    const mp = OcctBackend.cylinder(h, r).massProperties(DENSITY);

    const [R, H] = [r * 1e-3, h * 1e-3];
    expectRel(mp.mass, DENSITY * Math.PI * R * R * H, 1e-4);

    const axial = (mp.mass * R * R) / 2;
    const transverse = (mp.mass * (3 * R * R + H * H)) / 12;
    const [ixx, , , iyy, , izz] = mp.inertia6;
    expectRel(izz, axial, 1e-4);
    expectRel(ixx, transverse, 1e-4);
    expectRel(iyy, transverse, 1e-4);
    // Rotationally symmetric about Z, but not spherically symmetric.
    expect(mp.hasSymmetryAxis).toBe(true);
    expect(mp.hasSymmetryPoint).toBe(false);
  });

  it('reports principal moments equal to the diagonal for an axis-aligned box', () => {
    const mp = OcctBackend.box(20, 10, 30).massProperties(DENSITY);
    const [ixx, , , iyy, , izz] = mp.inertia6;

    // The box's principal frame IS the global frame, so the principal moments
    // are a permutation of the diagonal. OCCT does not sort them, so compare
    // as multisets rather than element-wise.
    const sortNum = (v: readonly number[]) => [...v].sort((x, y) => x - y);
    const got = sortNum(mp.principalMoments);
    const want = sortNum([ixx, iyy, izz]);
    for (let i = 0; i < 3; i++) expectRel(got[i], want[i]);

    // Each principal axis must be a unit vector aligned with a global axis,
    // and must pair with the matching diagonal entry at the SAME index.
    const diag = [ixx, iyy, izz];
    for (let i = 0; i < 3; i++) {
      const ax = mp.principalAxes[i];
      expect(Math.hypot(...ax)).toBeCloseTo(1, 9);
      const dominant = ax.findIndex(component => Math.abs(component) > 0.5);
      expect(dominant).toBeGreaterThanOrEqual(0);
      expectRel(mp.principalMoments[i], diag[dominant]);
    }

    // Principal axes must form an orthonormal frame.
    const dot = (u: readonly number[], v: readonly number[]) =>
      u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    expect(Math.abs(dot(mp.principalAxes[0], mp.principalAxes[1]))).toBeLessThan(1e-9);
    expect(Math.abs(dot(mp.principalAxes[0], mp.principalAxes[2]))).toBeLessThan(1e-9);
    expect(Math.abs(dot(mp.principalAxes[1], mp.principalAxes[2]))).toBeLessThan(1e-9);
  });

  it('omits radiusOfGyration unless an axis is requested', () => {
    expect(OcctBackend.box(20, 10, 30).massProperties(DENSITY).radiusOfGyration)
      .toBeUndefined();
  });

  it('computes radius of gyration about an arbitrary axis as sqrt(I/m)', () => {
    const [a, b, c] = [20, 10, 30];
    const box = OcctBackend.box(a, b, c);
    const com: [number, number, number] = [a / 2, b / 2, c / 2];

    // Centroidal Z axis: k_z = sqrt(Izz/m) = sqrt((a^2+b^2)/12), in mm.
    const kz = box.massProperties(DENSITY, { origin: com, direction: [0, 0, 1] })
      .radiusOfGyration!;
    expectRel(kz, Math.sqrt((a * a + b * b) / 12), 1e-9);

    // Radius of gyration is density-independent — both I and m scale with it.
    const kzSteel = box.massProperties(7850, { origin: com, direction: [0, 0, 1] })
      .radiusOfGyration!;
    expectRel(kzSteel, kz, 1e-12);

    // A non-unit direction must be normalised internally, not taken literally.
    const kzScaled = box.massProperties(DENSITY, { origin: com, direction: [0, 0, 7] })
      .radiusOfGyration!;
    expectRel(kzScaled, kz, 1e-12);

    // Parallel-axis check: shifting the axis off the centroid by d in X must
    // give sqrt(k_z^2 + d^2). This proves OCCT applies the shift and that we
    // are not silently ignoring `origin`.
    const d = 25;
    const kOff = box.massProperties(DENSITY, {
      origin: [com[0] + d, com[1], com[2]],
      direction: [0, 0, 1],
    }).radiusOfGyration!;
    expectRel(kOff, Math.sqrt(kz * kz + d * d), 1e-9);
  });

  it('rejects a zero-length gyration axis instead of trapping inside wasm', () => {
    expect(() =>
      OcctBackend.box(10, 10, 10).massProperties(1000, {
        origin: [0, 0, 0],
        direction: [0, 0, 0],
      }),
    ).toThrow(/non-zero vector/);
  });
});
