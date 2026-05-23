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
