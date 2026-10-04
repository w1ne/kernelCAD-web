// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import type { ReviewCadInput, ReviewCadOutput } from '../../../src/agent/review/reviewPipeline';
import { REQUIRED_AUTOMOTIVE_STILL_CODES } from '../../../src/agent/likeness/bodyLikeness';

const runReviewPipeline = vi.fn<(input: ReviewCadInput) => Promise<ReviewCadOutput>>();

vi.mock('../../../src/agent/review/reviewPipeline', async () => {
  const actual = await vi.importActual<typeof import('../../../src/agent/review/reviewPipeline')>(
    '../../../src/agent/review/reviewPipeline',
  );
  return {
    ...actual,
    runReviewPipeline: (input: ReviewCadInput) => runReviewPipeline(input),
  };
});

import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';

function cleanReviewOutput(): ReviewCadOutput {
  return {
    ok: true,
    featureCount: 1,
    diagnostics: [],
    assembly: 'clean',
    validator: { status: 'ok', diagnostics: [], partCount: 1, jointCount: 0 },
    fitness: {
      functional: true,
      repairMode: 'none',
      repairDirective: 'No repair needed.',
      passedChecks: ['validator-no-errors'],
      blockingReasons: [],
      mechanismSummary: { sampleCount: 0, interferenceCount: 0, trackedConnectorCount: 0 },
    },
    repairContext: {
      blockingReasons: [],
      topDiagnostics: [],
      preserveInterfaces: [],
      designGoal: '',
    },
  };
}

const BASE_CHECKS = [
  { code: 'main-object-count', passed: true, finding: 'Exactly one primary body is visible in iso and side views.' },
  { code: 'proportions-match-reference', passed: true, finding: 'Length/height proportions match the reference envelope within a small tolerance.' },
  { code: 'required-visible-features', passed: true, finding: 'Required features (wheels, cabin, rocker) are legible and visible, unobstructed and not covered by opaque geometry.' },
  { code: 'no-stray-or-floating-geometry', passed: true, finding: 'No stray floating secondary parts; wheels and body are in contact/near-contact with a continuous path into the parent body and no visible air gap.' },
  { code: 'attachment-plausibility', passed: true, finding: 'Visible mounts and connectors connect through a plausible load-bearing geometry anchored into the parent case body, with seated exposed interfaces and no buried half-inserted hardware.' },
  { code: 'semantic-orientation-alignment', passed: true, finding: 'Nose points +X and wheels sit on Z=0 as specified.' },
  { code: 'device-depth-and-construction', passed: true, finding: 'Side view shows non-facade depth: wall, shell layers, and housing cavity — not a flat two-face facade.' },
  { code: 'canonical-views-physically-coherent', passed: true, finding: 'Front/right/top/iso agree on wheelbase and cabin placement.' },
];

const AUTOMOTIVE_CHECKS = REQUIRED_AUTOMOTIVE_STILL_CODES.map((code) => ({
  code,
  passed: true,
  finding: `Concrete ortho observation for ${code}: cue present and matches the reference silhouette.`,
}));

const VISUAL = {
  accepted: true,
  screenshotPath: '/tmp/side.png',
  findings: ['Side view shows body over wheels with cabin aft of mid-wheelbase.'],
  checks: [...BASE_CHECKS, ...AUTOMOTIVE_CHECKS],
};

describe('design_loop body-likeness gate', () => {
  it('keeps attempt non-ok when likenessProfile set without body_bbox', async () => {
    runReviewPipeline.mockResolvedValueOnce(cleanReviewOutput());
    const result = await designLoopTool({
      goal: 'organic berlinetta body',
      likenessProfile: 'automotive',
      requireVisualReview: true,
      attempts: [{ code: 'return box(1,1,1);', visualReview: VISUAL }],
    });
    expect(result.ok).toBe(false);
    const facts = result.attempts[0]?.reviewFacts ?? [];
    expect(facts.some((f) => f.code === 'reference.likeness.gate-required')).toBe(true);
  });

  it('passes when bodyLikeness is publishReady (stills from visualReview)', async () => {
    runReviewPipeline.mockResolvedValueOnce(cleanReviewOutput());
    const result = await designLoopTool({
      goal: 'organic berlinetta body',
      likenessProfile: 'automotive',
      requireVisualReview: true,
      bodyLikeness: {
        body_bbox: { min: [0, -40, 20], max: [400, 40, 100] },
        wheels: [
          { center: [60, -30, 30], radius: 30 },
          { center: [60, 30, 30], radius: 30 },
          { center: [340, -30, 30], radius: 30 },
          { center: [340, 30, 30], radius: 30 },
        ],
      },
      attempts: [{ code: 'return box(1,1,1);', visualReview: VISUAL }],
    });
    expect(result.ok).toBe(true);
    expect(result.attempts[0]?.reviewFacts ?? []).toEqual([]);
  });
});
