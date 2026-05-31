// tests/integration/mcp/designLoop-interference.test.ts
//
// Canonical end-to-end test for the `includeInterference: true` gate on the
// `design_loop` MCP tool. Closes the C1 audit's Q2 hard FIX:
//
//   "every test passes `includeInterference: false` (10 sites in
//    designLoop.test.ts) — gate exists but isn't exercised; add 1 test with
//    the flag on"
//
// `design_loop` is a thin orchestrator over `review_cad` (see designLoop.ts
// line 123 — it forwards `includeInterference` straight through). This test
// asserts the flag round-trips correctly: a clashing attempt is rejected
// when the flag is true and accepted (insofar as interference is concerned)
// when the flag is false.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

const CLASH_FIXTURE = `
  const rig = assembly('clash-fixture');
  rig.part('p', box(10, 10, 10))
    .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  rig.part('q', box(10, 10, 10))
    .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  rig.mate('m', 'p.c', 'q.c', 'fastened');
  return rig.solvedModel({}, { validate: 'warn' });
`;

describe('design_loop MCP tool — interference suppression flag', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('rejects an attempt with clashing parts when includeInterference: true', async () => {
    const result = await designLoopTool({
      goal: 'Verify the clashing fixture is rejected when interference detection is on.',
      includeInterference: true,
      includePoseEnvelope: false,
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'Clashing fixture', code: CLASH_FIXTURE }],
    });

    expect(result.ok).toBe(false);
    expect(result.attempts).toHaveLength(1);
    const attempt = result.attempts[0];
    expect(attempt.ok).toBe(false);
    expect(attempt.functional).toBe(false);
    // assembly.interference.overlap is an error-severity validator
    // diagnostic, so it lands on `blockingReasons` (via mechanismFitness)
    // rather than the warning-only `reviewFacts` channel.
    expect(
      attempt.blockingReasons.some((reason) => reason.includes('overlap')),
      `expected "overlap" in blockingReasons [${attempt.blockingReasons.join(' | ')}]`,
    ).toBe(true);
  }, 120000);

  it('does NOT block on interference when includeInterference: false', async () => {
    const result = await designLoopTool({
      goal: 'Verify the interference gate stays silent when the suppression flag is on.',
      includeInterference: false,
      includePoseEnvelope: false,
      requireVisualReview: false,
      attempts: [{ id: '01', title: 'Clashing fixture (suppressed)', code: CLASH_FIXTURE }],
    });

    expect(result.attempts).toHaveLength(1);
    const attempt = result.attempts[0];
    // When the gate is off, no overlap diagnostic surfaces on either the
    // warning-channel reviewFacts or the error-channel blockingReasons.
    const overlapInReviewFacts = attempt.reviewFacts.find((f) => f.code === 'assembly.interference.overlap');
    expect(overlapInReviewFacts).toBeUndefined();
    expect(attempt.blockingReasons.some((reason) => reason.includes('overlap'))).toBe(false);
  }, 120000);
});
