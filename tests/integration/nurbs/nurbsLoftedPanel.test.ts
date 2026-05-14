import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import harness from '../../../eval/tasks/nurbs-lofted-panel/harness';

describe('corpus: nurbs-lofted-panel', () => {
  beforeAll(async () => { await initOcct(); });

  it('expert solution passes all gates', async () => {
    const result = await harness('eval/tasks/nurbs-lofted-panel/solution-expert.kcad.ts');
    expect(result.gates['evaluates clean']).toBe(true);
    expect(result.gates['non-empty solid']).toBe(true);
    expect(result.gates['no nurbs diagnostics']).toBe(true);
  });
});
