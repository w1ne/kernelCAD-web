// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Envelope fit. ISO 273 normal clearance for M6 is 6.6 mm, written here as a
// literal. The fastener envelope is the nominal shank. A too-short ISO 4014
// is rejected before a solid exists.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { fastenerSolid } from '../../../src/modeling/parts/fastenerGeometry';
import { nutLiesOnThread, planStackFor, resolvePart } from '../../../src/modeling/parts/familyTable';
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
    // Shell π(3² − 2.9²) × 10 mm. The head is above the plate. The band is
    // the boolean tolerance around that cylinder shell.
    const shell = Math.PI * (3 ** 2 - 2.9 ** 2) * PLATE;
    // Measured common is the analytic shell (about 18.535 mm³) to 0.001 mm³.
    expect(undersize).toBeCloseTo(shell, 3);

    const washer = fastenerSolid(resolvePart({ family: 'flat-washer', thread: 'M6' }), 'envelope');
    const shank = fastenerSolid(bolt, 'envelope').translate(0, 0, 4);
    expect(washer.intersectionVolume(shank)).toBeLessThan(1);
  });

  it('draws an ISO 4014 M6×30 full solid with a plain shank and a shorter thread', () => {
    const bolt = resolvePart({ family: 'hex-head-bolt-partial', thread: 'M6', lengthMm: 30 });
    expect(bolt.iso?.threadLengthMm).toBe(18);
    const plan = planStackFor('hex-head-bolt-partial', { thread: 'M6', gripMm: 14, mode: 'bolt' });
    expect(nutLiesOnThread(plan)).toBe(true);
    const screw = plan.members.find((member) => member.role === 'screw')!;
    const nut = plan.members.find((member) => member.role === 'nut')!;
    // Bolt frame: head bearing at z = 0, tip at z = −length. Stack Z is the
    // bolt frame shifted by the head-washer offset.
    const nutMid = (nut.offsetZ + nut.part.headHeightMm / 2) - screw.offsetZ;
    expect(nutMid).toBeLessThan(-bolt.lengthMm + (bolt.iso?.threadLengthMm ?? 0));
    expect(nutMid).toBeGreaterThan(-bolt.lengthMm);

    const full = fastenerSolid(bolt, 'full');
    const envelope = fastenerSolid(bolt, 'envelope');
    const fullVolume = full.volume();
    const envelopeVolume = envelope.volume();
    expect(fullVolume).toBeLessThan(envelopeVolume * 0.95);
    expect(fullVolume).toBeGreaterThan(envelopeVolume * 0.85);

    const band = (z: number) => OcctBackend.cylinder(1, 15).translate(0, 0, z);
    const nominal = Math.PI * 3 * 3;
    const plain = full.intersectionVolume(band(-6));
    const threaded = full.intersectionVolume(band(nutMid - 0.5));
    const envelopeThread = envelope.intersectionVolume(band(nutMid - 0.5));
    expect(plain).toBeCloseTo(nominal, 4);
    expect(envelopeThread).toBeCloseTo(nominal, 4);
    // The helical profile removes material. A 1 mm slab of the envelope is the
    // full Ø6 disk; the same slab through the thread is about 0.81 of that.
    expect(threaded).toBeGreaterThan(nominal * 0.75);
    expect(threaded).toBeLessThan(nominal * 0.88);
  });

  it('refuses ISO 4014 M5×16 before a solid is built', () => {
    expect(() => resolvePart({ family: 'ISO 4014', thread: 'M5', lengthMm: 16 })).toThrow(KernelError);
    expect(() => resolvePart({ family: 'ISO 4014', thread: 'M5', lengthMm: 16 })).toThrow(/ISO 4017/);
  });

  it('inserts an ISO 4014 bolt through a clearance hole with the nut on the thread', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const plate = kcad.box(40, 40, 14, true).hole('top', {
      u: 0,
      v: 0,
      diameter: 6.6,
      depth: 'through',
    });
    const fitted = await kcad.lib.insert(plate, {
      diameterMm: 6.6,
      family: 'hex-head-bolt-partial',
      mode: 'bolt',
      detail: 'envelope',
    });
    expect(fitted.holes).toHaveLength(1);
    const hole = fitted.holes[0]!;
    expect(hole.thread).toBe('M6');
    expect(hole.fit).toBe('normal');
    expect(hole.lengthMm).toBe(30);
    expect(hole.nut).toBeDefined();
    expect(hole.headWasher).toBeDefined();
    // Centered 14 mm plate: mouth at z = 7. Head washer 1.6, ISO 4014 M6 k = 4.
    // Thread length b = 18, so the plain shank ends 12 mm under the head bearing.
    const mouthZ = 7;
    const headBearingZ = mouthZ + 1.6;
    const tipZ = headBearingZ - 30;
    const threadTopZ = tipZ + 18;
    const screwBox = await (await hole.screw.lower()).boundingBox();
    expect(screwBox.max[2]).toBeCloseTo(headBearingZ + 4, 2);
    expect(screwBox.min[2]).toBeCloseTo(tipZ, 2);
    const nutBox = await (await hole.nut!.lower()).boundingBox();
    expect(nutBox.min[2]).toBeGreaterThan(tipZ - 0.05);
    expect(nutBox.max[2]).toBeLessThan(threadTopZ - 0.05);

    const thin = kcad.box(40, 40, 8, true).hole('top', {
      u: 0,
      v: 0,
      diameter: 6.6,
      depth: 'through',
    });
    await expect(kcad.lib.insert(thin, {
      diameterMm: 6.6,
      family: 'hex-head-bolt-partial',
      mode: 'bolt',
      detail: 'envelope',
    })).rejects.toThrow(/plain shank/);
    await expect(kcad.lib.insert(thin, {
      diameterMm: 6.6,
      family: 'hex-head-bolt-partial',
      mode: 'bolt',
      detail: 'envelope',
    })).rejects.toThrow(/ISO 4017/);
  });
});
