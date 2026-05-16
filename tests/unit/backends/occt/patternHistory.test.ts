// tests/unit/backends/occt/patternHistory.test.ts
import { describe, it, expect } from 'vitest';
import { retagInstance } from '../../../../src/kernel/backends/occt/patternHistory';
import type { HistoryMap, FaceLineage } from '../../../../src/kernel/naming/evolutionRecord';

const lineageWith = (featureId: string | undefined, labelName?: string): FaceLineage => ({
  rootHash: 'root',
  rootFeatureId: 'box_1',
  featureId,
  labelName,
});

describe('retagInstance', () => {
  it('rewrites featureId matching sourceId to <sourceId>_pattern_<i>', () => {
    const map: HistoryMap = new Map([
      ['hashA', lineageWith('hole_1', 'wall')],
      ['hashB', lineageWith('hole_1', 'floor')],
      ['hashC', lineageWith('box_1', undefined)],     // canonical, untouched
    ]);
    const out = retagInstance(map, 'hole_1', 2);
    expect(out.get('hashA')?.featureId).toBe('hole_1_pattern_2');
    expect(out.get('hashB')?.featureId).toBe('hole_1_pattern_2');
    expect(out.get('hashC')?.featureId).toBe('box_1');     // unchanged
  });

  it('preserves labelName, snapshot, and surfaceType on retagged entries', () => {
    const snap = { centroid: [1, 2, 3] as [number, number, number],
                   normal: [0, 0, 1] as [number, number, number], area: 7 };
    const map: HistoryMap = new Map([['h', {
      rootHash: 'root', rootFeatureId: 'box_1',
      featureId: 'hole_1', labelName: 'wall',
      snapshot: snap, snapshotAtCreate: snap, surfaceType: 'CYLINDRE' as const,
      featureKind: 'hole' as const, featureName: 'mountBolt',
    }]]);
    const out = retagInstance(map, 'hole_1', 0);
    const l = out.get('h')!;
    expect(l.labelName).toBe('wall');
    expect(l.snapshot).toBe(snap);
    expect(l.surfaceType).toBe('CYLINDRE');
    expect(l.featureName).toBe('mountBolt');
    expect(l.featureId).toBe('hole_1_pattern_0');
  });

  it('returns an empty map when input is empty', () => {
    expect(retagInstance(new Map(), 'x', 1).size).toBe(0);
  });
});
