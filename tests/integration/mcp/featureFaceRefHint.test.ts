// tests/integration/mcp/featureFaceRefHint.test.ts
//
// F-surface Task F2.6: the three `feature.face-ref.*` diagnostic codes
// (not-resolvable, ambiguous-after-split, snapshot-fallback-used) surface
// their registry hint templates through the MCP error envelope. The
// resolve_topo_ref tool acts as the canonical surface here — addFeature /
// addMate / addConnector route the same diagnostics through KernelError.hint
// per the existing `errorHint: isKernelError(e) ? e.hint : undefined` pattern.
import { describe, it, expect, beforeAll } from 'vitest';
import { resolveTopoRefTool } from '../../../src/agent/mcp/tools/resolveTopoRef';

describe('feature.face-ref.* hints surface through KernelError.hint (F-surface F2)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('not-resolvable diagnostic carries a hint that cites the candidate-refs guidance', async () => {
    const code = `return box(10, 10, 10).hole('top', { u: 0, v: 0, diameter: 3, depth: 'through' });`;
    const r = await resolveTopoRefTool({
      code,
      ref: '@kc[box_1/face/lidThatDoesNotExist]',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.errorCode).toBe('feature.face-ref.not-resolvable');
    // The hint surfaced through the error envelope should match the registry's
    // template wording so the agent can paste the recovery into a next call.
    expect(r.errorHint).toBeDefined();
    expect(r.errorHint).toMatch(/lineage|snapshot|tolerance/i);
  });
});
