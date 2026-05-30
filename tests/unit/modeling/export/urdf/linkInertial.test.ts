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
});
