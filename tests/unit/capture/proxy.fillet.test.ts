import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';

describe('Shape.fillet / chamfer capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('registers a fillet record with base input and no face filter', async () => {
    const code = `return box(10, 10, 10).fillet(2);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(2);
    expect(result.records[1].kind).toBe('fillet');
    expect(result.records[1].inputs.base).toEqual({ kind: 'feature', id: result.records[0].id });
    expect(result.records[1].inputs.face).toBeUndefined();
    expect(result.records[1].params.radius.evaluated).toBe(2);
  });

  it('registers a fillet record with a canonical face filter', async () => {
    const code = `return box(10, 10, 10).fillet(2, { face: 'top' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(2);
    const fillet = result.records[1];
    expect(fillet.kind).toBe('fillet');
    expect(fillet.inputs.face).toEqual({
      kind: 'face',
      featureId: result.records[0].id,
      ref: { kind: 'canonical', face: 'top' },
    });
  });

  it('registers a chamfer record with distance param', async () => {
    const code = `return box(10, 10, 10).chamfer(1.5, { face: 'bottom' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const chamfer = result.records[1];
    expect(chamfer.kind).toBe('chamfer');
    expect(chamfer.params.distance.evaluated).toBe(1.5);
    expect(chamfer.inputs.face).toEqual({
      kind: 'face',
      featureId: result.records[0].id,
      ref: { kind: 'canonical', face: 'bottom' },
    });
  });
});
