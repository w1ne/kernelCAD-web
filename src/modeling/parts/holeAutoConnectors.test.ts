// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import {
  generateBoltHoleConnectors,
  holeAxisAutoConnectorsForShape,
  type AutoConnector,
  type HoleCenter,
} from './holeAutoConnectors';

function feature(
  id: string,
  kind: string,
  inputs: FeatureRecord['inputs'],
): FeatureRecord {
  return {
    id,
    kind: kind as FeatureRecord['kind'],
    inputs,
    params: {},
    transforms: [],
    suppressed: false,
  };
}

function bolt(name: string, holeRef: string): AutoConnector {
  return {
    name,
    ref: `@kc[part/connector/${name}]`,
    origin: [0, 0, 0],
    axis: [0, 0, -1],
    type: 'frame',
    topology: { kind: 'hole-axis', name: holeRef },
  };
}

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

  it('keeps each hole-axis ref on the hole it was authored for', () => {
    const holes: HoleCenter[] = [
      { u: 10, v: 0, depthMm: 3, axis: [0, 0, -1], holeRef: 'holes1[1]' },
      { u: -10, v: 0, depthMm: 3, axis: [0, 0, -1], holeRef: 'holes1[0]' },
    ];
    const conns = generateBoltHoleConnectors(holes, { partName: 'bracket' });
    expect(conns[0].name).toBe('bolt-holes-1');
    expect(conns[0].topology).toEqual({ kind: 'hole-axis', name: 'holes1[0]' });
    expect(conns[1].topology).toEqual({ kind: 'hole-axis', name: 'holes1[1]' });
  });
});

describe('holeAxisAutoConnectorsForShape', () => {
  it('numbers a later hole feature after the earlier holes feature', () => {
    const records = [
      feature('box', 'box', {}),
      feature('holes', 'holes', { target: { kind: 'feature', id: 'box' } }),
      feature('hole', 'hole', { target: { kind: 'feature', id: 'holes' } }),
    ];
    const autos = new Map<string, AutoConnector[]>([
      ['holes', [bolt('bolt-holes-1', 'holes1[0]'), bolt('bolt-holes-2', 'holes1[1]')]],
      ['hole', [bolt('bolt-holes-1', 'hole1')]],
    ]);
    const conns = holeAxisAutoConnectorsForShape(records, autos, 'hole');
    expect(conns.map((c) => c.name)).toEqual(['bolt-holes-1', 'bolt-holes-2', 'bolt-holes-3']);
    expect(conns.map((c) => c.topology.name)).toEqual(['holes1[0]', 'holes1[1]', 'hole1']);
  });

  it('keeps a hole authored on a boolean cutter', () => {
    const records = [
      feature('plate', 'box', {}),
      feature('cutter', 'box', {}),
      feature('hole', 'hole', { target: { kind: 'feature', id: 'cutter' } }),
      feature('diff', 'boolean', {
        base: { kind: 'feature', id: 'plate' },
        cutter_0: { kind: 'feature', id: 'hole' },
      }),
    ];
    const autos = new Map<string, AutoConnector[]>([
      ['hole', [bolt('bolt-holes-1', 'hole1')]],
    ]);
    const conns = holeAxisAutoConnectorsForShape(records, autos, 'diff');
    expect(conns.map((c) => c.topology.name)).toEqual(['hole1']);
    expect(conns[0]?.name).toBe('bolt-holes-1');
  });
});
