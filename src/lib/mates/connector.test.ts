import { describe, it, expect } from 'vitest';
import { makeConnector, type Connector } from './connector';

describe('Connector (numeric origin)', () => {
  it('creates a frame connector with Vec3 origin', () => {
    const c: Connector = makeConnector({
      name: 'mountFlange',
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 5] },
    });
    expect(c.name).toBe('mountFlange');
    expect(c.type).toBe('frame');
    expect(c.origin.kind).toBe('vec3');
  });

  it('rejects duplicate-name connector creation via factory', () => {
    expect(() => makeConnector({ name: '', type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } }))
      .toThrow(/connector name must be non-empty/i);
  });

  it('accepts all four connector types', () => {
    for (const t of ['frame', 'axis', 'planar', 'ball'] as const) {
      const c = makeConnector({ name: 't', type: t, origin: { kind: 'vec3', value: [0, 0, 0] } });
      expect(c.type).toBe(t);
    }
  });
});
