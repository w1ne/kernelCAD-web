// tests/unit/backends/occt/mirror-coincident.test.ts
//
// Regression: when Shape.mirror(plane) joins a source half-silhouette to its
// reflection across a plane that the closing edge of the source touches (so
// the two halves share a single zero-thickness coincident face), the fused
// result must remain a topologically valid solid that subsequent boolean
// operations can consume.
//
// History: an earlier draft of this test ("mirror-coincident.repro.test.ts")
// claimed mirror() dropped the source half on this configuration. Empirical
// inspection showed mirror() returns the correct volume and bounding box;
// the subtract test that "broke" did so because its cutout box was placed
// outside the body's Z extent. Tests 1 and 2 below correspond to the
// original repro (and pass); the subtract tests have been corrected to
// place the cutout inside the body, and asymmetric +X and -X cutouts are
// asserted explicitly to prove both halves carry material.
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

beforeAll(async () => { await initOcct(); }, 60000);

const EYEWEAR_HALF_DECL = `
  const half = path()
    .moveTo(0, 24)
    .sagittaArc(64, 30, 1.5)
    .tangentArc(70, 23)
    .sagittaArc(70, -1, -0.3)
    .tangentArc(64, -7)
    .sagittaArc(0, -7.5, -0.5)
    .lineTo(0, 24)
    .close()
    .extrude(10);
`;

async function buildLast(code: string) {
  const run = await runScript({ code, fileName: '<test>' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(run.records);
  const id = run.records[run.records.length - 1].id;
  return {
    shape: result.shapes.get(id)!,
    errors: result.diagnostics.filter((d) => d.severity === 'error'),
  };
}

describe('Shape.mirror() with coincident face on mirror plane', () => {
  it('rect half (closing edge on yz-plane) → full rect, volume 300', async () => {
    // Right half of a simple rectangle silhouette: (0,0) → (10,0) → (10,5) → (0,5) → close.
    // The closing edge (from (0,5) back to (0,0)) lies on x=0.
    // Extruded by depth=3, then mirrored across yz.
    // Source occupies x in [0,10], reflection occupies x in [-10,0].
    // They share ONLY the face at x=0 (zero-thickness intersection).
    // Expected union volume: 10*5*3 + 10*5*3 = 300 mm³.
    const code = `
      const half = path()
        .moveTo(0, 0)
        .lineTo(10, 0)
        .lineTo(10, 5)
        .lineTo(0, 5)
        .close()
        .extrude(3);
      return half.mirror('yz');
    `;
    const { shape, errors } = await buildLast(code);
    expect(errors).toEqual([]);
    const bb = shape.boundingBox();
    expect(shape.volume()).toBeCloseTo(300, 0);
    expect(bb.min[0]).toBeCloseTo(-10, 1);
    expect(bb.max[0]).toBeCloseTo(10, 1);
  }, 60000);

  it('eyewear half (arcs, closing edge on yz-plane) → bbox spans [-70, 70], Z [0, 10]', async () => {
    // Eyewear-like right half silhouette traced and extruded. The closing
    // edge lies on x=0 (zero-thickness intersection with the mirror plane).
    const { shape, errors } = await buildLast(`${EYEWEAR_HALF_DECL}return half.mirror('yz');`);
    expect(errors).toEqual([]);
    const bb = shape.boundingBox();
    expect(bb.min[0]).toBeLessThan(-60);
    expect(bb.max[0]).toBeGreaterThan(60);
    // Body Z extent is [0, 10] (the extrude depth); this is a precondition
    // for the subtract tests below and is asserted here so any future change
    // to the eyewear shape catches the regression at the right test.
    expect(bb.min[2]).toBeCloseTo(0, 1);
    expect(bb.max[2]).toBeCloseTo(10, 1);
  }, 60000);

  it('+X cutout inside the body subtracts material (proves +X half is solid)', async () => {
    // Cutout 4×12×4 around +X half (corner at x=40) with z=3 placing it
    // squarely inside body z=[0, 10]. If mirror had dropped the +X half,
    // the cutout would have no material to remove.
    const { shape: base, errors: baseErr } = await buildLast(
      `${EYEWEAR_HALF_DECL}return half.mirror('yz');`,
    );
    expect(baseErr).toEqual([]);
    const { shape: cut, errors: cutErr } = await buildLast(`
      ${EYEWEAR_HALF_DECL}
      const body = half.mirror('yz');
      return body.subtract(box(4, 12, 4).translate(40, -1, 3));
    `);
    expect(cutErr).toEqual([]);
    const removed = base.volume() - cut.volume();
    // 4×12×4 cutout = 192 mm³; the cutout overlaps body interior so the
    // removed volume should be the bulk of the cutout (>100 mm³).
    expect(removed).toBeGreaterThan(100);
    expect(removed).toBeLessThanOrEqual(192 + 1);
  }, 60000);

  it('-X cutout removes the same material (symmetric reflection is solid)', async () => {
    const { shape: base, errors: baseErr } = await buildLast(
      `${EYEWEAR_HALF_DECL}return half.mirror('yz');`,
    );
    expect(baseErr).toEqual([]);
    const { shape: cut, errors: cutErr } = await buildLast(`
      ${EYEWEAR_HALF_DECL}
      const body = half.mirror('yz');
      return body.subtract(box(4, 12, 4).translate(-44, -1, 3));
    `);
    expect(cutErr).toEqual([]);
    const removed = base.volume() - cut.volume();
    expect(removed).toBeGreaterThan(100);
    expect(removed).toBeLessThanOrEqual(192 + 1);
  }, 60000);

  it('wide cutout spanning both halves removes the expected volume', async () => {
    // 40×12×4 wide cutout straddling the mirror plane by ±20 mm. Locks in
    // the bulk volume math; if mirror produced two separate solids that
    // only touched at x=0 without welding, a single boolean still has to
    // hit material on both sides.
    const { shape: base, errors: baseErr } = await buildLast(
      `${EYEWEAR_HALF_DECL}return half.mirror('yz');`,
    );
    expect(baseErr).toEqual([]);
    const { shape: cut, errors: cutErr } = await buildLast(`
      ${EYEWEAR_HALF_DECL}
      const body = half.mirror('yz');
      return body.subtract(box(40, 12, 4).translate(-20, -1, 3));
    `);
    expect(cutErr).toEqual([]);
    const removed = base.volume() - cut.volume();
    // 40×12×4 = 1920 mm³ cutout, mostly inside the body interior on both halves.
    expect(removed).toBeGreaterThan(800);
    expect(removed).toBeLessThanOrEqual(1920 + 1);
  }, 60000);
});
