// tests/integration/mcp/listEdgesRefs.test.ts
//
// F-surface Task F2.2: list_edges emits an @kc[<owner>/edge/<name>] ref per
// edge summary.
import { describe, it, expect, beforeAll } from 'vitest';
import { listEdgesTool } from '../../../src/agent/mcp/tools/listEdges';

describe('list_edges — @kc[...] ref emission (F-surface F2)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('emits ref for each edge on a box', async () => {
    const code = `return box(20, 20, 10);`;
    const r = await listEdgesTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok || !r.edges) throw new Error('expected edges');
    for (const e of r.edges) {
      expect((e as { ref?: string }).ref).toMatch(/^@kc\[[^\]]+\/edge\/[^\]]+\]$/);
    }
  });
});
