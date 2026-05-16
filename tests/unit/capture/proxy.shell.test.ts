import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';

describe('Shape.shell capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('registers a shell record with base + face inputs and thickness param', async () => {
    const code = `return box(20, 20, 20).shell(0.5, { face: 'top' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(2);
    const shell = result.records[1];
    expect(shell.kind).toBe('shell');
    expect(shell.inputs.base).toEqual({ kind: 'feature', id: result.records[0].id });
    expect(shell.inputs.face).toEqual({
      kind: 'face',
      featureId: result.records[0].id,
      ref: { kind: 'canonical', face: 'top' },
    });
    expect(shell.params.thickness.evaluated).toBe(0.5);
  });

  it('shells a box with bottom face open', async () => {
    const code = `return box(20, 20, 20).shell(1, { face: 'bottom' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const shell = result.records[1];
    expect(shell.inputs.face).toEqual({
      kind: 'face',
      featureId: result.records[0].id,
      ref: { kind: 'canonical', face: 'bottom' },
    });
    expect(shell.params.thickness.evaluated).toBe(1);
  });
});
