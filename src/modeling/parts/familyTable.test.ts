// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { KernelError } from '../../shared/intent/kernelError';
import { planStack, resolvePart } from './familyTable';

describe('family table', () => {
  it('resolves an ISO 4762 M5x16 to the catalog id', () => {
    const part = resolvePart({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });
    expect(part.id).toBe('iso-4762-m5x16');
    expect(part.connectors.map((c) => c.name)).toEqual(['head-bearing', 'thread-tip', 'head-top']);
    expect(part.headDiameterMm).toBe(8.5);
  });

  it('rejects a length that is not stocked and names the legal ones', () => {
    expect(() => resolvePart({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 17 }))
      .toThrow(KernelError);
    try {
      resolvePart({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 17 });
    } catch (error) {
      expect(String(error)).toContain('16');
      expect(String(error)).toContain('20');
    }
  });

  it('picks the next stocked screw for a bolt stack', () => {
    // washer 1 + grip 10 + washer 1 + nut 4.7 + 2 pitches 1.6 = 18.3
    const plan = planStack({ thread: 'M5', gripMm: 10, mode: 'bolt' });
    expect(plan.lengthMm).toBe(20);
    expect(plan.protrusionMm).toBeCloseTo(3.3, 6);
    expect(plan.members.map((member) => member.role)).toEqual([
      'head-washer',
      'screw',
      'tail-washer',
      'nut',
    ]);
    const screw = plan.members.find((member) => member.role === 'screw')!;
    expect(screw.part.id).toBe('iso-4762-m5x20');
    expect(screw.offsetZ).toBe(1);
  });

  it('stocks lengths per thread, not one list for every size', () => {
    expect(() => resolvePart({ family: 'socket-head-cap-screw', thread: 'M2', lengthMm: 50 }))
      .toThrow(KernelError);
    expect(resolvePart({ family: 'socket-head-cap-screw', thread: 'M12', lengthMm: 40 }).id)
      .toBe('iso-4762-m12x40');
    expect(resolvePart({ family: 'socket-head-cap-screw', thread: 'M20', lengthMm: 200 }).id)
      .toBe('iso-4762-m20x200');
  });

  it('resolves the hex head bolt, set screw and threaded rod families', () => {
    const hex = resolvePart({ family: 'hex-head-bolt', thread: 'M10', lengthMm: 40 });
    expect(hex.id).toBe('iso-4017-m10x40');
    expect(hex.acrossFlatsMm).toBe(16);
    expect(hex.headDiameterMm).toBeCloseTo(18.475, 3);
    const set = resolvePart({ family: 'set-screw', thread: 'M6', lengthMm: 20 });
    expect(set.id).toBe('iso-4026-m6x20');
    expect(set.headHeightMm).toBe(0);
    expect(set.connectors.map((c) => c.name)).toEqual(['first-end', 'second-end', 'axis']);
    const rod = resolvePart({ family: 'threaded-rod', thread: 'M8', lengthMm: 1000 });
    expect(rod.id).toBe('din-975-m8x1000');
  });

  it('stocks M8 to M12 with the standard envelope dimensions', () => {
    const cap = resolvePart({ family: 'socket-head-cap-screw', thread: 'M12', lengthMm: 40 });
    expect(cap.id).toBe('iso-4762-m12x40');
    expect(cap.headDiameterMm).toBe(18);
    expect(cap.headHeightMm).toBe(12);
    const flat = resolvePart({ family: 'flat-head-countersunk', thread: 'M8', lengthMm: 20 });
    expect(flat.headDiameterMm).toBe(17.92);
    const nut = resolvePart({ family: 'hex-nut', thread: 'M10' });
    expect(nut.acrossFlatsMm).toBe(16);
    const washer = resolvePart({ family: 'flat-washer', thread: 'M12' });
    expect(washer.innerDiameterMm).toBe(13);
  });
});

describe('fixture families', () => {
  it('resolves a T-slot nut with its slot pairing and connectors', () => {
    const nut = resolvePart({ family: 't-slot-nut', thread: 'M10' });
    expect(nut.id).toBe('tslot-nut-m10');
    expect(nut.category).toBe('fixture');
    expect(nut.dims?.slotMm).toBe(12);
    expect(nut.connectors.map((connector) => connector.name)).toEqual([
      'mating-face',
      'top-face',
      'thread-bore',
    ]);
  });

  it('resolves a clamping stud length and rejects an unstocked one', () => {
    const stud = resolvePart({ family: 'clamping-stud', thread: 'M8', lengthMm: 100 });
    expect(stud.id).toBe('clamp-stud-m8x100');
    expect(stud.lengthMm).toBe(100);
    expect(() => resolvePart({ family: 'clamping-stud', thread: 'M8', lengthMm: 70 })).toThrow(
      KernelError,
    );
  });

  it('puts the step-block treads at the clamping heights', () => {
    const block = resolvePart({ family: 'step-block', thread: 'M10' });
    const steps = block.connectors.filter((connector) => connector.name.startsWith('step-'));
    expect(steps.map((connector) => connector.name)).toEqual(['step-1', 'step-2', 'step-3', 'step-4']);
    expect(steps.map((connector) => connector.origin?.[2])).toEqual([12, 24, 36, 48]);
  });

  it('declares the strap clamp slot at its origin, nose toward -X', () => {
    const clamp = resolvePart({ family: 'strap-clamp', thread: 'M10' });
    expect(clamp.connectors.map((connector) => connector.name)).toEqual([
      'nose-bearing',
      'tail-bearing',
      'slot-axis',
      'top-face',
    ]);
    const nose = clamp.connectors.find((connector) => connector.name === 'nose-bearing');
    expect(nose?.origin?.[0]).toBe(-48);
    expect(clamp.dims?.slotWidthMm).toBe(12);
  });

  it('resolves a flange nut with its stock across-flats', () => {
    const nut = resolvePart({ family: 'flange-nut', thread: 'M12' });
    expect(nut.id).toBe('flange-nut-m12');
    expect(nut.acrossFlatsMm).toBe(18);
    expect(nut.dims?.flangeDiameterMm).toBe(25); // DIN 6331 M12 d1
  });
});
