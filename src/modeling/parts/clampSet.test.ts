// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { KernelError } from '../../shared/intent/kernelError';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import { planClampSet } from './clampSet';

describe('clamp-set planner', () => {
  it('plans the M10 set around a 36 mm workpiece', () => {
    const plan = planClampSet({ thread: 'M10', workpieceHeightMm: 36 });
    expect(plan.studLengthMm).toBe(80);
    expect(plan.treadMm).toBe(36);
    expect(plan.clampTopMm).toBe(48);
    expect(plan.members.map((member) => member.role)).toEqual([
      't-slot-nut',
      'stud',
      'strap-clamp',
      'step-block',
      'flange-nut',
    ]);
    const at = (role: string) => plan.members.find((member) => member.role === role)!.at;
    expect(at('t-slot-nut')).toEqual([0, 0, -0.6]);
    expect(at('stud')[2]).toBeCloseTo(-7.6, 6); // 0.6 clearance + DIN 508 k = 7
    expect(at('strap-clamp')).toEqual([0, 0, 36]);
    expect(at('step-block')[0]).toBeCloseTo(60, 6);
    expect(at('flange-nut')).toEqual([0, 0, 48]);
  });

  it('plans every stocked thread at its top tread', () => {
    expect(planClampSet({ thread: 'M8', workpieceHeightMm: 40 }).studLengthMm).toBe(100);
    expect(planClampSet({ thread: 'M12', workpieceHeightMm: 60 }).studLengthMm).toBe(160);
  });

  it('refuses a workpiece height that is not a stocked tread', () => {
    expect(() => planClampSet({ thread: 'M10', workpieceHeightMm: 25 })).toThrow(KernelError);
    try {
      planClampSet({ thread: 'M10', workpieceHeightMm: 25 });
    } catch (error) {
      expect(String(error)).toContain('12, 24, 36, 48');
    }
  });
});

describe('clamp set placement', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('places the five members at the planned heights without overlaps', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const set = await kcad.lib.fixture.clampSet({ thread: 'M10', workpieceHeightMm: 36 });
    expect(set.members).toHaveLength(5);
    const shapes = new Map(set.members.map((member) => [member.role, member.shape]));
    const span = async (role: string) => {
      const bounds = await (await shapes.get(role)!.lower()).boundingBox();
      return { minZ: bounds.min[2], maxZ: bounds.max[2], minX: bounds.min[0], maxX: bounds.max[0] };
    };
    const nut = await span('t-slot-nut');
    expect(nut.minZ).toBeCloseTo(-14.6, 6); // 14 mm tall envelope, top 0.6 below the surface
    expect(nut.maxZ).toBeCloseTo(-0.6, 6);
    const stud = await span('stud');
    expect(stud.minZ).toBeCloseTo(-7.6, 6);
    expect(stud.maxZ).toBeCloseTo(72.4, 6);
    const clamp = await span('strap-clamp');
    expect(clamp.minZ).toBeCloseTo(36, 6);
    expect(clamp.maxX).toBeCloseTo(77, 6);
    const block = await span('step-block');
    expect(block.maxZ).toBeCloseTo(48, 6);
    const flange = await span('flange-nut');
    expect(flange.minZ).toBeCloseTo(48, 6);

    // Every pair: contact faces only, no positive-volume overlap.
    const members = [];
    for (const member of set.members) members.push(await member.shape.lower());
    const overlaps: string[] = [];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const volume = Math.abs(members[i]!.intersect(members[j]!).volume());
        if (volume > 1e-6) overlaps.push(`${set.members[i]!.role}/${set.members[j]!.role}=${volume}`);
      }
    }
    expect(overlaps).toEqual([]);
  }, 120000);
});
