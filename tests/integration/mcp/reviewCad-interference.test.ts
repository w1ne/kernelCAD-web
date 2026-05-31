// tests/integration/mcp/reviewCad-interference.test.ts
//
// Canonical end-to-end test for the `includeInterference: true` gate on the
// `review_cad` MCP tool. Closes the C1 audit's Q2 hard FIX:
//
//   "every integration test for these tools passes `includeInterference:
//    false` (10 instances in reviewCad.test.ts). The interference gate IS
//    implemented in the tool, but no test currently exercises it
//    end-to-end."
//
// User's "agents must build non-clashing models" rule (memory:
// feedback_agents_must_build_non_clashing_models.md) requires the
// interference-detection path stay reachable through the MCP surface. This
// test fixes a 2-part fastened-mate fixture with deliberate 5 mm overlap,
// flips the flag, and asserts:
//
//   - includeInterference: true   → `assembly.interference.overlap` surfaces
//   - includeInterference: false  → it does NOT
//
// The fixture mirrors the proven clash pattern in
// `tests/integration/examples/desktop3axisMates.test.ts` lines 187-204
// (which exercises the same overlap via `solvedModel({ validate: 'error' })`).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const CLASH_FIXTURE = `
  const rig = assembly('clash-fixture');
  rig.part('p', box(10, 10, 10))
    .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  rig.part('q', box(10, 10, 10))
    .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  rig.mate('m', 'p.c', 'q.c', 'fastened');
  return rig.solvedModel({}, { validate: 'warn' });
`;

describe('review_cad MCP tool — interference suppression flag', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('surfaces assembly.interference.overlap when includeInterference: true', async () => {
    const r = await reviewCadTool({
      code: CLASH_FIXTURE,
      includeInterference: true,
      // Suppress the pose-envelope sweep — this fixture has no articulating
      // mates and we only care about the default-pose clash detection here.
      includePoseEnvelope: false,
    });

    expect(r.ok).toBe(false);
    const overlap = r.diagnostics.find((d) => d.code === 'assembly.interference.overlap');
    expect(
      overlap,
      `expected assembly.interference.overlap in [${r.diagnostics.map((d) => d.code).join(', ')}]`,
    ).toBeDefined();
    // The raw-pair channel mirrors the diagnostic — the HUD reads this even
    // when the script silences specific pairs.
    expect(r.rawInterferencePairs?.length ?? 0).toBeGreaterThan(0);
  }, 60000);

  it('does NOT surface assembly.interference.overlap when includeInterference: false', async () => {
    const r = await reviewCadTool({
      code: CLASH_FIXTURE,
      includeInterference: false,
      includePoseEnvelope: false,
    });

    // The script itself succeeds and the validator stays silent on the
    // interference axis when the flag is off. The fixture has no other
    // mechanical issues, so review_cad should report functional under the
    // suppressed gate.
    const overlap = r.diagnostics.find((d) => d.code === 'assembly.interference.overlap');
    expect(overlap).toBeUndefined();
    // Raw-pair channel is also empty when interference detection is skipped.
    expect(r.rawInterferencePairs ?? []).toEqual([]);
  }, 60000);
});
