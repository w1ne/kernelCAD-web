import { describe, it, expect } from 'vitest';
import { RecomputeEngine } from './recomputeEngine';
import type { FeatureEvent } from './featureEvents';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureLowerer, ShapeBackend } from '../backends/backend';

// Minimal mock backend that returns a marker shape per feature
const mockShape = (id: string): ShapeBackend =>
  ({ target: 'export-occt', __mockId: id } as unknown as ShapeBackend);

const mockLowerer: FeatureLowerer = {
  target: 'export-occt',
  supports: new Set(['box', 'cylinder']) as ReadonlySet<import('../intent/types').FeatureKind>,
  async lower(record) {
    return { shape: mockShape(record.id), diagnostics: [] };
  },
};

describe('RecomputeEngine event emission', () => {
  it('emits feature.compiled per healthy feature in topo order', async () => {
    const engine = new RecomputeEngine(mockLowerer);
    const records: FeatureRecord[] = [
      { id: 'box-1', kind: 'box', inputs: {}, params: {}, transforms: [], suppressed: false } as FeatureRecord,
      {
        id: 'cyl-1',
        kind: 'cylinder',
        inputs: { base: { kind: 'feature', id: 'box-1' } },
        params: {},
        transforms: [],
        suppressed: false,
      } as FeatureRecord,
    ];
    const events: FeatureEvent[] = [];
    await engine.run(records, { onEvent: (e) => events.push(e) });

    expect(events.map((e) => e.kind)).toEqual([
      'feature.compiled',
      'feature.compiled',
      'recompute.complete',
    ]);
    const compiled = events.filter((e) => e.kind === 'feature.compiled') as Extract<
      FeatureEvent,
      { kind: 'feature.compiled' }
    >[];
    expect(compiled[0].featureId).toBe('box-1');
    expect(compiled[1].featureId).toBe('cyl-1');
    expect(compiled[1].predecessors).toEqual(['box-1']);
    const completeEvent = events[events.length - 1] as Extract<
      FeatureEvent,
      { kind: 'recompute.complete' }
    >;
    expect(completeEvent.featureCount).toBe(2);
  });

  it('emits feature.failed when lowering throws', async () => {
    const failingLowerer: FeatureLowerer = {
      target: 'export-occt',
      supports: new Set(['box']) as ReadonlySet<import('../intent/types').FeatureKind>,
      async lower() {
        throw new Error('boom');
      },
    };
    const engine = new RecomputeEngine(failingLowerer);
    const records: FeatureRecord[] = [
      { id: 'box-1', kind: 'box', inputs: {}, params: {}, transforms: [], suppressed: false } as FeatureRecord,
    ];
    const events: FeatureEvent[] = [];
    await engine.run(records, { onEvent: (e) => events.push(e) });

    expect(events[0].kind).toBe('feature.failed');
  });

  it('omits emission when no sink provided (back-compat)', async () => {
    const engine = new RecomputeEngine(mockLowerer);
    const records: FeatureRecord[] = [
      { id: 'box-1', kind: 'box', inputs: {}, params: {}, transforms: [], suppressed: false } as FeatureRecord,
    ];
    const result = await engine.run(records);
    expect(result.shapes.size).toBe(1); // baseline still works
  });
});
