// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The deterministic floating-geometry gate must override a self-graded visual
// review. Here the agent hands in a fully-accepted visualReview that claims
// "no stray or floating geometry" — but the two bodies sit 30 mm apart. The
// loop must still reject the attempt on geometry, and let an explicit
// allow-list of the named code through when the separation is intended.

import { describe, expect, it } from 'vitest';
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

const FLOATING_BODY = `
  const arm = assembly('rig');
  arm.part('base', box(10, 10, 10, true))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.part('link', box(10, 10, 10, true))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [40, 0, 0] }, axis: [0, 0, 1] });
  arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });
  return arm.model();
`;

const acceptedVisualReview = {
  accepted: true,
  screenshotPath: '/tmp/rig-iso.png',
  findings: ['Looks like one clean coherent body from every canonical view.'],
  checks: [
    { code: 'main-object-count', passed: true, finding: 'One primary object, not duplicate assemblies.' },
    { code: 'proportions-match-reference', passed: true, finding: 'Proportions match the requested object closely enough.' },
    { code: 'required-visible-features', passed: true, finding: 'Required visible features are present, legible, unobstructed, and not covered.' },
    { code: 'no-stray-or-floating-geometry', passed: true, finding: 'No stray, floating, or unexplained extra geometry is visible; each secondary component is supported by contact or near-contact into the parent body, with no visible air gap.' },
    { code: 'attachment-plausibility', passed: true, finding: 'Visible brackets and case-band interfaces connect through a load-bearing geometry anchored into the parent case body, seated and exposed with no buried half-inserted hardware.' },
    { code: 'semantic-orientation-alignment', passed: true, finding: 'Labels and indicators point in deliberate, reference-consistent directions.' },
    { code: 'device-depth-and-construction', passed: true, finding: 'Side and canonical views show real wall thickness, housing, body layers, and non-facade construction.' },
    { code: 'canonical-views-physically-coherent', passed: true, finding: 'Canonical views read as one physically coherent object.' },
  ],
};

describe('design_loop floating-geometry gate overrides self-graded visual review', () => {
  it('rejects a floating body despite a fully accepted visual review', { timeout: 60_000 }, async () => {
    const result = await designLoopTool({
      goal: 'Build a single connected two-part yaw joint.',
      attempts: [{ id: '01', title: 'floating', code: FLOATING_BODY, visualReview: acceptedVisualReview }],
    });

    expect(result.ok).toBe(false);
    const attempt = result.attempts[0];
    expect(attempt.reviewFacts.some((f) => f.code === 'assembly.geometry.floating-body')).toBe(true);
    expect(attempt.nextActionPrompt).toContain('link');
  });

  it('accepts the same design when the floating-body code is explicitly allow-listed', { timeout: 60_000 }, async () => {
    const result = await designLoopTool({
      goal: 'Two intentionally separate bodies staged for later assembly.',
      allowReviewWarnings: ['assembly.geometry.floating-body'],
      attempts: [{ id: '01', title: 'staged', code: FLOATING_BODY, visualReview: acceptedVisualReview }],
    });

    const attempt = result.attempts[0];
    expect(attempt.reviewFacts.some((f) => f.code === 'assembly.geometry.floating-body')).toBe(false);
  });
});
