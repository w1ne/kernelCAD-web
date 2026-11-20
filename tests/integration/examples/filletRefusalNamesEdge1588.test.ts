// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A refused fillet or chamfer must name the failing edge and a size the
// same-edge kernel probe built (#1588). The drafting-review mounting plate is
// the part: its clean edge features stay quiet, an oversized chamfer or
// fillet on one named top edge names that edge, and a retry at the reported
// size on the reported selector builds.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { refuseFromDiagnostics } from '../../../src/shared/diagnostics/refuse';

const PLATE = 'examples/drafting-review/mounting-plate.kcad.ts';
const PERIMETER_CHAMFER = ".chamfer(0.5, q.edge(q.createdBy(stock.id)).and(q.withLabel('top-perimeter')))";
const EDGE_REFUSALS = ['feature.kernel-failed', 'feature.edge-feature.short-edges-skipped'];

async function evaluate(code: string) {
  const { evaluation } = await evaluateAndBuildScript({ code });
  const errors = evaluation.diagnostics.filter(d => d.severity === 'error');
  return { evaluation, errors, refusal: errors.find(d => EDGE_REFUSALS.includes(d.code)) };
}

describe('fillet and chamfer refusals on the drafting-review mounting plate', () => {
  it('names the failing edge and a size that builds on it', async () => {
    const source = readFileSync(PLATE, 'utf8');
    expect(source).toContain(PERIMETER_CHAMFER);

    // Clean baseline: no refusal and no failing-edge facts.
    const clean = await evaluate(source);
    expect(clean.evaluation.exitCode).toBe(0);
    expect(clean.errors).toEqual([]);
    expect(clean.evaluation.diagnostics.some(d => d.details?.failingEdgeStatus !== undefined)).toBe(false);

    // Oversized chamfer on the four top-perimeter edges: each is named.
    const all = await evaluate(source.replace('.chamfer(0.5,', '.chamfer(20,'));
    expect(all.refusal?.featureId).toBe('chamfer_1');
    expect(all.refusal?.details?.failingEdgeStatus).toBe('named');
    expect(all.refusal?.details?.failingEdgeCount).toBe(4);
    const ids = String(all.refusal?.details?.failingEdgeIds).split(',');
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) expect(all.refusal?.hint).toContain(`@kc[fillet_1/edge/${id}]`);

    // Two different named edges, one refused chamfer and one refused fillet.
    const seen: { edge: string; locator: string }[] = [];
    for (const [id, op] of [[ids[0], 'chamfer'], [ids[2], 'fillet']] as const) {
      const ref = `@kc[fillet_1/edge/${id}]`;
      const oversized = await evaluate(source.replace(PERIMETER_CHAMFER, `.${op}(20, '${ref}')`));
      const details = oversized.refusal?.details;
      expect(oversized.refusal?.featureId).toBe(`${op}_${op === 'fillet' ? 2 : 1}`);
      expect(details?.failingEdgeStatus).toBe('named');
      expect(details?.failingEdgeCount).toBe(1);
      expect(details?.failingEdgeRef).toBe(ref);
      expect(oversized.refusal?.hint).toContain(`Failing edge: ${ref} (${String(details?.failingEdgeLocator)})`);
      expect(refuseFromDiagnostics(oversized.evaluation.diagnostics)?.location?.edge).toBe(ref);
      seen.push({ edge: ref, locator: String(details?.failingEdgeLocator) });

      const max = Number(details?.maxFeasibleValue);
      expect(max).toBeGreaterThan(0);
      expect(max).toBeLessThan(20);
      const retried = await evaluate(source.replace(PERIMETER_CHAMFER, `.${op}(${max}, '${ref}')`));
      expect(retried.errors).toEqual([]);
      expect(retried.evaluation.exitCode).toBe(0);
      expect(retried.evaluation.featureHealth).toEqual([]);
    }
    expect(seen[0]!.edge).not.toBe(seen[1]!.edge);
    expect(seen[0]!.locator).not.toBe(seen[1]!.locator);

    // A stale edge ID is a typed miss, not a blend on a neighbouring edge.
    const stale = await evaluate(source.replace(PERIMETER_CHAMFER, ".chamfer(1, '@kc[fillet_1/edge/s0000000000000000]')"));
    expect(stale.errors[0]?.code).toBe('feature.invalid-args');
    expect(stale.errors[0]?.featureId).toBe('chamfer_1');
    expect(stale.errors[0]?.message).toContain('does not match an edge on the current shape');
  }, 60_000);

  it('reports interaction when no selected edge fails alone', async () => {
    const source = readFileSync(PLATE, 'utf8');
    const { refusal } = await evaluate(source.replace('.fillet(6,', '.fillet(40,'));
    expect(refusal?.featureId).toBe('fillet_1');
    expect(refusal?.details?.failingEdgeStatus).toBe('interaction');
    expect(refusal?.details?.failingEdgeCount).toBe(0);
    expect(refusal?.details).not.toHaveProperty('failingEdgeRef');
    expect(refusal?.hint).toContain('No single edge is the limit');
  }, 60_000);
});
