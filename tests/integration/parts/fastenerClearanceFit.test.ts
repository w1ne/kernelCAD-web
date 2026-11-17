// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Envelope fit. ISO 273 normal clearance for M6 is 6.6 mm, written here as a
// literal. The fastener envelope is the nominal shank. A too-short ISO 4014
// is rejected before a solid exists.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { fastenerSolid } from '../../../src/modeling/parts/fastenerGeometry';
import { resolvePart } from '../../../src/modeling/parts/familyTable';
import { KernelError } from '../../../src/shared/intent/kernelError';

const PLATE = 10;

function plateWithHole(diameterMm: number): OcctBackend {
  const plate = OcctBackend.box(30, 30, PLATE).translate(-15, -15, 0);
  const cutter = OcctBackend.cylinder(PLATE + 2, diameterMm / 2).translate(0, 0, -1);
  return plate.subtract(cutter);
}

describe('ISO 4014 envelope in a clearance hole', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('seats an M6×30 hex bolt in an ISO 273 normal hole and clashes with an undersize hole', () => {
    const bolt = resolvePart({ family: 'hex-head-bolt-partial', thread: 'M6', lengthMm: 30 });
    expect(bolt.iso?.threadLengthMm).toBe(18);
    const box = fastenerSolid(bolt, 'envelope').boundingBox({ exact: true });
    // Flat facing +X: x is across flats (10), y is the circumscribed diameter 2*10/√3.
    expect(box.max[0] - box.min[0]).toBeCloseTo(10, 1);
    expect(box.max[1] - box.min[1]).toBeCloseTo((2 * 10) / Math.sqrt(3), 1);

    const seated = () => fastenerSolid(bolt, 'envelope').translate(0, 0, PLATE);
    const clearance = seated().intersectionVolume(plateWithHole(6.6));
    expect(clearance).toBeLessThan(1);

    const undersize = seated().intersectionVolume(plateWithHole(5.8));
    // Shell π(3² − 2.9²) × 10 mm ≈ 18.5 mm³. The head is above the plate.
    expect(undersize).toBeGreaterThan(10);
    expect(undersize).toBeLessThan(30);

    const washer = fastenerSolid(resolvePart({ family: 'flat-washer', thread: 'M6' }), 'envelope');
    const shank = fastenerSolid(bolt, 'envelope').translate(0, 0, 4);
    expect(washer.intersectionVolume(shank)).toBeLessThan(1);
  });

  it('refuses ISO 4014 M5×16 before a solid is built', () => {
    expect(() => resolvePart({ family: 'ISO 4014', thread: 'M5', lengthMm: 16 })).toThrow(KernelError);
    expect(() => resolvePart({ family: 'ISO 4014', thread: 'M5', lengthMm: 16 })).toThrow(/ISO 4017/);
  });
});
