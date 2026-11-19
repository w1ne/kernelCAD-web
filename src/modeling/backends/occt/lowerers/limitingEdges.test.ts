// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import { refuseFromDiagnostics } from '../../../../shared/diagnostics/refuse';
import { probeMaxFeasible } from './feasibilityProbe';
import { findLimitingEdges, MAX_SOLO_EDGE_PROBES, withLimitingEdges, type LimitingEdgeReport } from './limitingEdges';

interface FakeEdge { name: string; length: number; limit: number }
const builds = (edge: FakeEdge, value: number): boolean => value <= edge.limit;
const lengthOf = (edge: FakeEdge): number => edge.length;

const refusal: CompilerDiagnostic = {
  target: 'export-occt',
  code: 'feature.kernel-failed',
  featureId: 'fillet_2',
  severity: 'error',
  message: 'OCCT fillet failed',
  hint: 'Use radius ≤ 2 mm.',
  details: { param: 'radius', maxFeasibleValue: 2 },
};

describe('probeMaxFeasible', () => {
  it('reports the smallest value it saw fail, above the value it built', () => {
    const r = probeMaxFeasible(8, (v) => v <= 2.5, 8);
    expect(r.maxFeasible).toBeLessThanOrEqual(2.5);
    expect(r.minInfeasible).toBeGreaterThan(2.5);
    expect(r.minInfeasible).toBeLessThan(2.6);
  });

  it('keeps the requested value as the failing bound when nothing builds', () => {
    const r = probeMaxFeasible(8, () => false, 3);
    expect(r.maxFeasible).toBeUndefined();
    expect(r.minInfeasible).toBe(1);
  });
});

describe('findLimitingEdges', () => {
  it('names only the edges that fail alone at the probe value', () => {
    const edges: FakeEdge[] = [
      { name: 'long', length: 80, limit: 30 },
      { name: 'tight', length: 12, limit: 2 },
      { name: 'mid', length: 40, limit: 9 },
    ];
    const found = findLimitingEdges(edges, 2.5, builds, lengthOf);
    expect(found.status).toBe('named');
    expect(found.limiting.map((e) => e.name)).toEqual(['tight']);
    expect(found.attempts).toBe(3);
    expect(found.unprobed).toBe(0);
  });

  it('names a one-edge selection without a kernel call', () => {
    let calls = 0;
    const edge: FakeEdge = { name: 'only', length: 10, limit: 1 };
    const found = findLimitingEdges([edge], 4, (e, v) => { calls++; return builds(e, v); }, lengthOf);
    expect(found).toEqual({ status: 'named', limiting: [edge], attempts: 0, unprobed: 0 });
    expect(calls).toBe(0);
  });

  it('reports interaction when every edge builds alone', () => {
    const edges: FakeEdge[] = [
      { name: 'a', length: 12, limit: 60 },
      { name: 'b', length: 12, limit: 60 },
    ];
    const found = findLimitingEdges(edges, 35, builds, lengthOf);
    expect(found.status).toBe('interaction');
    expect(found.limiting).toEqual([]);
  });

  it('bounds the kernel calls and probes the shortest edges first', () => {
    const edges: FakeEdge[] = Array.from({ length: MAX_SOLO_EDGE_PROBES + 5 }, (_, i) => ({
      name: `e${i}`, length: 100 - i, limit: 10,
    }));
    const tried: string[] = [];
    const found = findLimitingEdges(edges, 3, (e, v) => { tried.push(e.name); return builds(e, v); }, lengthOf);
    expect(tried).toHaveLength(MAX_SOLO_EDGE_PROBES);
    expect(tried[0]).toBe(`e${MAX_SOLO_EDGE_PROBES + 4}`);
    expect(found.unprobed).toBe(5);
  });
});

describe('withLimitingEdges', () => {
  const named: LimitingEdgeReport = {
    status: 'named',
    probeValue: 2.03125,
    attempts: 3,
    unprobed: 0,
    edges: [
      { id: 's0123456789abcdef', ref: '@kc[box_1/edge/s0123456789abcdef]', locator: 'LINE, 12 mm long, midpoint (50, 35, 6)' },
      { id: 'sfedcba9876543210', locator: 'LINE, 12 mm long, midpoint (0, 35, 6)' },
    ],
  };

  it('puts the failing edge on the hint, the details and the refuse location', () => {
    const diag = withLimitingEdges(refusal, named, 'radius', 3);
    expect(diag.hint).toContain('Use radius ≤ 2 mm. Failing edges (2 of 3), each rejected alone at radius 2.031 mm:');
    expect(diag.hint).toContain('@kc[box_1/edge/s0123456789abcdef] (LINE, 12 mm long, midpoint (50, 35, 6))');
    // No unique selector for the second edge: its bare ID is shown, never a guessed ref.
    expect(diag.hint).toContain('sfedcba9876543210 (LINE, 12 mm long, midpoint (0, 35, 6))');
    expect(diag.hint).not.toContain('edge/sfedcba9876543210');
    expect(diag.details).toMatchObject({
      maxFeasibleValue: 2,
      failingEdgeStatus: 'named',
      failingEdgeCount: 2,
      failingEdgeId: 's0123456789abcdef',
      failingEdgeRef: '@kc[box_1/edge/s0123456789abcdef]',
      failingEdgeIds: 's0123456789abcdef,sfedcba9876543210',
      failingEdgeProbeValue: 2.03125,
    });
    expect(refuseFromDiagnostics([diag])?.location).toEqual({
      featureId: 'fillet_2', param: 'radius', edge: '@kc[box_1/edge/s0123456789abcdef]',
    });
  });

  it('names no edge when the selected edges limit each other', () => {
    const diag = withLimitingEdges(refusal, { ...named, status: 'interaction', edges: [] }, 'radius', 3);
    expect(diag.hint).toContain('No single edge is the limit');
    expect(diag.details?.failingEdgeStatus).toBe('interaction');
    expect(diag.details?.failingEdgeCount).toBe(0);
    expect(diag.details).not.toHaveProperty('failingEdgeId');
    expect(refuseFromDiagnostics([diag])?.location).toEqual({ featureId: 'fillet_2', param: 'radius' });
  });
});
