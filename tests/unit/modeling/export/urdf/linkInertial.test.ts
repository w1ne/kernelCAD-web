import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';
import { linkInertialBlock } from '../../../../../src/modeling/export/urdf/linkInertial';

describe('linkInertialBlock — Task B3.B', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits a valid <inertial> block for a cube at default density', () => {
    const cube = OcctBackend.box(20, 20, 20);
    const r = linkInertialBlock(cube, undefined);
    expect(r.xml).toMatch(/<inertial>/);
    expect(r.xml).toMatch(/<mass value="[\d.e+-]+"/);
    expect(r.xml).toMatch(/<inertia ixx="[\d.e+-]+" ixy="[\d.e+-]+"/);
    expect(r.xml).toMatch(/<origin xyz="0\.01[0]* 0\.01[0]* 0\.01[0]*"/);
  });

  it('emits the density-declared warning when density is undefined', () => {
    const cube = OcctBackend.box(10, 10, 10);
    const r = linkInertialBlock(cube, undefined);
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.inertia-density-declared');
  });

  it('emits no warning when density is explicitly declared', () => {
    const cube = OcctBackend.box(10, 10, 10);
    const r = linkInertialBlock(cube, 7850);
    expect(r.diagnostics).toEqual([]);
  });

  it('uses the declared density for the mass value', () => {
    const cube = OcctBackend.box(10, 10, 10);
    const water = linkInertialBlock(cube, 1000);
    const steel = linkInertialBlock(cube, 7850);
    const waterMass = parseFloat(water.xml.match(/<mass value="([\d.e+-]+)"/)![1]);
    const steelMass = parseFloat(steel.xml.match(/<mass value="([\d.e+-]+)"/)![1]);
    expect(steelMass / waterMass).toBeCloseTo(7.85, 2);
  });

  it('scales mass and inertia to a declared massKg', () => {
    // 10 mm cube in the positive octant. Volume 1e-6 m³.
    // At 1000 kg/m³ the geometric mass is 0.001 kg. Declared 0.004 kg
    // scales inertia by 4. About the centre of mass,
    // Ixx = m (a² + a²) / 12.
    const cube = OcctBackend.box(10, 10, 10);
    const declaredKg = 0.004;
    const side = 0.01;
    const ixx = declaredKg * (side * side + side * side) / 12;
    const r = linkInertialBlock(cube, 1000, declaredKg);
    const mass = parseFloat(r.xml.match(/<mass value="([\d.e+-]+)"/)![1]);
    const inertia = parseFloat(r.xml.match(/ixx="([\d.e+-]+)"/)![1]);
    expect(mass).toBeCloseTo(declaredKg, 6);
    expect(Math.abs(inertia - ixx) / ixx).toBeLessThan(5e-6);
    expect(r.diagnostics).toEqual([]);
    const water = linkInertialBlock(cube, undefined, declaredKg);
    expect(water.diagnostics).toEqual([]);
    expect(parseFloat(water.xml.match(/<mass value="([\d.e+-]+)"/)![1])).toBeCloseTo(declaredKg, 6);
  });
});
