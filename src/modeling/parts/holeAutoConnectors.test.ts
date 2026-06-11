// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  generateBoltHoleConnectors,
  type HoleCenter,
} from './holeAutoConnectors';

describe('generateBoltHoleConnectors', () => {
  it('emits bolt-holes-1 for a single hole', () => {
    const holes: HoleCenter[] = [{ u: 0, v: 0, depthMm: 3, axis: [0, 0, -1] }];
    const conns = generateBoltHoleConnectors(holes, { partName: 'bracket' });
    expect(conns.length).toBe(1);
    expect(conns[0].name).toBe('bolt-holes-1');
    expect(conns[0].ref).toBe('@kc[bracket/connector/bolt-holes-1]');
  });

  it('numbers consecutively for a multi-hole pattern', () => {
    const holes: HoleCenter[] = [
      { u: -10, v: 0, depthMm: 3, axis: [0, 0, -1] },
      { u: 10, v: 0, depthMm: 3, axis: [0, 0, -1] },
      { u: 0, v: 10, depthMm: 3, axis: [0, 0, -1] },
    ];
    const conns = generateBoltHoleConnectors(holes, { partName: 'bracket' });
    expect(conns.map((c) => c.name)).toEqual([
      'bolt-holes-1',
      'bolt-holes-2',
      'bolt-holes-3',
    ]);
  });

  it('deterministic ordering for ties (sort by u then v)', () => {
    const holes: HoleCenter[] = [
      { u: 10, v: 0, depthMm: 3, axis: [0, 0, -1] },
      { u: -10, v: 0, depthMm: 3, axis: [0, 0, -1] },
      { u: 0, v: 10, depthMm: 3, axis: [0, 0, -1] },
    ];
    const conns = generateBoltHoleConnectors(holes, { partName: 'bracket' });
    // Sort: -10,0; 0,10; 10,0 -> u-then-v
    expect(conns[0].origin[0]).toBe(-10);
    expect(conns[1].origin[0]).toBe(0);
    expect(conns[2].origin[0]).toBe(10);
  });
});
