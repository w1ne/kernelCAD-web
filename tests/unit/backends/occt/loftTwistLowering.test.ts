import { describe, expect, it } from 'vitest';
import { buildModel } from '../../../../src/modeling/buildModel';

const rib = `path().moveTo(0, -6).lineTo(20, -6).lineTo(0, 6).close()`;

const twistedScript = (rotationBlock: string) => `
  const a = ${rib};
  const b = ${rib};
  const c = ${rib};
  return a.loft([b, c], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 30] },
      { plane: 'XY', origin: [0, 0, 60] },
    ],
    ${rotationBlock}
  });
`;

async function build(code: string) {
  return buildModel({ fileName: 'twist-probe.kcad.ts', code });
}

describe('loft section rotation through the full pipeline', () => {
  it('per-plane rotationDeg reaches the kernel (bbox differs from unrotated)', async () => {
    const flat = await build(twistedScript(''));
    const twisted = await build(twistedScript('').replace(
      `{ plane: 'XY', origin: [0, 0, 60] }`,
      `{ plane: 'XY', origin: [0, 0, 60], rotationDeg: 90 }`,
    ));
    const fb = flat.rootShape!.boundingBox();
    const tb = twisted.rootShape!.boundingBox();
    expect(twisted.rootShape!.volume()).toBeGreaterThan(0);
    expect(Math.abs(tb.max[0] - fb.max[0]) + Math.abs(tb.min[0] - fb.min[0])).toBeGreaterThan(1);
  });

  it('twistCenter reaches the kernel (rotation center shifts the section)', async () => {
    const withTopRotation = (extra: string) => twistedScript(extra).replace(
      `{ plane: 'XY', origin: [0, 0, 60] }`,
      `{ plane: 'XY', origin: [0, 0, 60], rotationDeg: 90 }`,
    );
    const aboutOrigin = await build(withTopRotation(''));
    const aboutTen = await build(withTopRotation('twistCenter: [10, 0]'));
    expect(aboutOrigin.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(aboutTen.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(aboutOrigin.rootShape!.volume()).toBeGreaterThan(0);
    expect(aboutTen.rootShape!.volume()).toBeGreaterThan(0);
    // Top section rotated 90° about (0,0) reaches x = -6; about (10,0) it
    // stays at x >= 4, so min[0] shifts by well over 1 mm.
    const ob = aboutOrigin.rootShape!.boundingBox();
    const tb = aboutTen.rootShape!.boundingBox();
    expect(Math.abs(ob.min[0] - tb.min[0])).toBeGreaterThan(1);
  });

  it('an explicit rotationDeg on the first section overrides the 0° default', async () => {
    const flat = await build(twistedScript(''));
    const firstRotated = await build(twistedScript('').replace(
      `{ plane: 'XY', origin: [0, 0, 0] }`,
      `{ plane: 'XY', origin: [0, 0, 0], rotationDeg: 90 }`,
    ));
    expect(firstRotated.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(firstRotated.rootShape!.volume()).toBeGreaterThan(0);
    const fb = flat.rootShape!.boundingBox();
    const rb = firstRotated.rootShape!.boundingBox();
    expect(Math.abs(rb.min[0] - fb.min[0]) + Math.abs(rb.max[0] - fb.max[0])).toBeGreaterThan(1);
  });

  it('twistDeg shorthand equals the explicit evenly distributed rotations', async () => {
    const flat = await build(twistedScript(''));
    const shorthand = await build(twistedScript('twistDeg: 90'));
    const explicit = await build(twistedScript('').replace(
      `{ plane: 'XY', origin: [0, 0, 30] },`,
      `{ plane: 'XY', origin: [0, 0, 30], rotationDeg: 45 },`,
    ).replace(
      `{ plane: 'XY', origin: [0, 0, 60] }`,
      `{ plane: 'XY', origin: [0, 0, 60], rotationDeg: 90 }`,
    ));
    expect(flat.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shorthand.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(explicit.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const flatVolume = flat.rootShape!.volume();
    // Guard against a vacuous pass: if the twist mapping were dropped, both
    // shorthand and explicit would fall back to the flat geometry and still
    // match each other. Pin that each twisted build actually moved volume.
    expect(shorthand.rootShape!.volume()).not.toBeCloseTo(flatVolume, 0);
    expect(explicit.rootShape!.volume()).not.toBeCloseTo(flatVolume, 0);
    expect(shorthand.rootShape!.volume()).toBeCloseTo(explicit.rootShape!.volume(), 0);
  });

  it('coplanar sections with start/end point terminations remain a valid solid', async () => {
    const result = await build(`
      const a = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      const b = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return a.loft(b, { spacing: 0, startPoint: [0, 0, -5], endPoint: [0, 0, 5] });
    `);
    expect(result.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(false);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.rootShape).toBeDefined();
    expect(result.rootShape!.volume()).toBeGreaterThan(0);
  });

  it('rail-guided lofts reject section rotation instead of silently ignoring it', async () => {
    const railScript = (planesBlock: string, extra: string) => `
      const s0 = path().moveTo(-5,-5).lineTo(5,-5).lineTo(5,5).lineTo(-5,5).close();
      const s1 = path().moveTo(-5,-5).lineTo(5,-5).lineTo(5,5).lineTo(-5,5).close();
      const rail = nurbsCurve([[-5,-5,0],[-5,-5,40]], { degree: 1 });
      return s0.loft(s1, { planes: ${planesBlock}, rails: [rail]${extra} });
    `;
    const plainPlanes = `[
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 40] },
    ]`;
    const withTwist = await build(railScript(plainPlanes, ', twistDeg: 30'));
    const withExplicit = await build(railScript(`[
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 40], rotationDeg: 45 },
    ]`, ''));
    for (const result of [withTwist, withExplicit]) {
      const rejected = result.diagnostics.find(
        d => d.code === 'feature.invalid-args' && d.severity === 'error',
      );
      expect(rejected, JSON.stringify(result.diagnostics)).toBeDefined();
      expect(rejected!.message).toContain('rail-guided');
    }
    // Without rotation the rail loft still lowers.
    const plain = await build(railScript(plainPlanes, ''));
    expect(plain.diagnostics.some(d => d.message.includes('rail-guided'))).toBe(false);
    expect(plain.rootShape!.volume()).toBeGreaterThan(0);
  });

  it('a collapsed NURBS-section loft reports feature.empty-result', async () => {
    const result = await build(`
      function rib() {
        return path().moveTo(0, -2).spline([[0, -2], [6, 0], [0, 2], [-6, 0], [0, -2]]).close();
      }
      return rib().loft(rib(), { spacing: 0 });
    `);
    expect(result.diagnostics.some(d => d.code === 'feature.empty-result')).toBe(true);
  });
});
