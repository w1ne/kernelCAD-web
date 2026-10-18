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
    const plan = planStack({ thread: 'M5', gripMm: 10, mode: 'bolt' });
    expect(plan.lengthMm).toBe(16);
    expect(plan.members.map((member) => member.role)).toEqual([
      'head-washer',
      'screw',
      'tail-washer',
      'nut',
    ]);
    const screw = plan.members.find((member) => member.role === 'screw')!;
    expect(screw.part.id).toBe('iso-4762-m5x16');
    expect(screw.offsetZ).toBe(1);
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
    expect(nut.dims?.flangeDiameterMm).toBe(26);
  });
});
