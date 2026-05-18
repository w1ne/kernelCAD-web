// eval/oracle/cadQueryEvalScorer.test.ts
//
// Tests for the pure enrichment helper that lifts the opaque "Mesh is
// not manifold" symptom emitted by the cqe Python scorer (open3d
// is_watertight) into the structured `mesher.cone-self-intersection`
// diagnostic when the source script used `.revolve(...)`. The
// enrichment is conditional on BOTH (watertight failed) AND (revolve
// present in source) — non-revolve watertight failures (e.g. raw mesh
// imports producing non-manifold edges) are surfaced unchanged.

import { describe, it, expect } from 'vitest';
import {
  annotateK1ConeIfApplicable,
  type CadQueryEvalScoreResult,
} from './cadQueryEvalScorer';
import { HINT_TEMPLATES } from '../../src/shared/diagnostics/codes';

function baseResult(over: Partial<CadQueryEvalScoreResult> = {}): CadQueryEvalScoreResult {
  return {
    passed: false,
    reason: 'failed checks: [watertight]',
    is_watertight: false,
    is_single_component: true,
    bbox_accurate: true,
    volume_passed: true,
    chamfer_passed: true,
    hausdorff_passed: true,
    chamfer_distance: 0.258,
    hausdorff_95p: 0.5,
    hausdorff_99p: 0.6,
    icp_fitness: 0.99,
    volume_ratio: 0.9999,
    reference_volume: 1000,
    generated_volume: 1000,
    iogt: 1.0,
    reference_bbox_diagonal: null,
    relative_threshold: null,
    errors: [],
    generatedStlPath: '/tmp/g.stl',
    referenceStlPath: '/tmp/r.stl',
    exportMs: 100,
    scoreMs: 200,
    ...over,
  };
}

describe('annotateK1ConeIfApplicable', () => {
  it('returns input unchanged when watertight passed (no enrichment regardless of revolve presence)', () => {
    const input = baseResult({ is_watertight: true });
    const out = annotateK1ConeIfApplicable(input, 'path().revolve([0,0,1])');
    expect(out).toEqual(input);
  });

  it('returns input unchanged when watertight failed but source has no revolve', () => {
    const input = baseResult({ is_watertight: false });
    const src = `const s = kcad.box(10, 10, 10).fillet({ radius: 1 }); return s;`;
    const out = annotateK1ConeIfApplicable(input, src);
    expect(out).toEqual(input);
  });

  it('enriches reason + errors with the mesher.cone-self-intersection hint when watertight failed AND source has revolve', () => {
    const input = baseResult({ is_watertight: false, reason: 'failed checks: [watertight]', errors: [] });
    const src = `const profile = path().moveTo(1, 0).lineTo(5, 10).lineTo(1, 10).close(); return profile.revolve({ axis: [0, 0, 1] });`;
    const expectedHint = HINT_TEMPLATES['mesher.cone-self-intersection'].template;

    const out = annotateK1ConeIfApplicable(input, src);

    expect(out.reason).toContain('failed checks: [watertight]');
    expect(out.reason).toContain(expectedHint);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]).toContain('mesher.cone-self-intersection');
    expect(out.errors[0]).toContain(expectedHint);
    // All non-enriched fields preserved.
    expect(out.is_watertight).toBe(false);
    expect(out.chamfer_distance).toBe(0.258);
    expect(out.passed).toBe(false);
  });

  it('detects revolve called with whitespace and with method-chained call sites', () => {
    const input = baseResult({ is_watertight: false });
    const variants = [
      `return path().revolve({ axis: [0,0,1] });`,
      `return path()\n  .revolve({ axis: [0,0,1] });`,
      `return profile .revolve ({ axis: [0,0,1] });`,
      `const s = sketch.revolve(axis);`,
    ];
    for (const src of variants) {
      const out = annotateK1ConeIfApplicable(input, src);
      expect(out.reason, `expected enrichment for: ${src}`).not.toEqual(input.reason);
    }
  });
});
