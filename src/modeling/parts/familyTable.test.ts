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
