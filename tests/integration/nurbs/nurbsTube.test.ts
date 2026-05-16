import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import harness from '../../../eval/tasks/nurbs-tube/harness';

describe('corpus: nurbs-tube', () => {
  beforeAll(async () => { await initOcct(); });

  it('expert solution passes all gates', async () => {
    const result = await harness('eval/tasks/nurbs-tube/solution-expert.kcad.ts');
    expect(result.gates['evaluates clean']).toBe(true);
    expect(result.gates['non-empty solid']).toBe(true);
    expect(result.gates['no nurbs diagnostics']).toBe(true);
  });
});
