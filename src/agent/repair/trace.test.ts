// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The trace is the join between a modeling step and the script that authored
// it. These tests pin the join itself — the AST ranges, the graph edges, and
// the bound the repair region places on an edit.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { analyzeScript } from './analyze';
import { computeRepairRegion, isWithinRegion } from './trace';
import { applyRepairPatch } from './applyPatch';

// Three features on three distinct lines, with a symbolic parameter feeding
// the last one — the smallest script that exercises every trace edge.
const THREE_FEATURE_SCRIPT = [
  "const radius = param('radius', 2);",   // line 1
  'const base = box(40, 30, 20);',        // line 2
  'const bored = base.hole(\'top\', { u: 0, v: 0, diameter: 6, depth: 25 });', // line 3
  'return bored.fillet(radius);',         // line 4
].join('\n');

describe('feature trace', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('binds every feature to the script line that authored it', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    expect(analysis.ok).toBe(true);
    if (!analysis.ok) return;

    const byId = new Map(analysis.trace.map(entry => [entry.feature_id, entry]));
    expect(byId.get('box_1')?.location?.line).toBe(2);
    expect(byId.get('hole_1')?.location?.line).toBe(3);
    expect(byId.get('fillet_1')?.location?.line).toBe(4);
  });

  it('gives every feature an AST node range and an enclosing statement range', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');

    for (const entry of analysis.trace) {
      expect(entry.nodeRange, `no node range for ${entry.feature_id}`).toBeDefined();
      expect(entry.statementRange, `no statement range for ${entry.feature_id}`).toBeDefined();
      expect(entry.statementRange!.startLine).toBeLessThanOrEqual(entry.nodeRange!.startLine);
      expect(entry.statementRange!.endLine).toBeGreaterThanOrEqual(entry.nodeRange!.endLine);
    }
  });

  it('records upstream inputs and downstream dependents', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');
    const byId = new Map(analysis.trace.map(entry => [entry.feature_id, entry]));

    expect(byId.get('box_1')?.inputs).toEqual([]);
    expect(byId.get('box_1')?.dependents).toContain('hole_1');
    expect(byId.get('hole_1')?.inputs).toContain('box_1');
    expect(byId.get('hole_1')?.dependents).toEqual(['fillet_1']);
    expect(byId.get('fillet_1')?.inputs).toEqual(['hole_1']);
    expect(byId.get('fillet_1')?.dependents).toEqual([]);
  });

  it('carries the named params a feature reads', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');
    const fillet = analysis.trace.find(entry => entry.feature_id === 'fillet_1');
    expect(fillet?.paramRefs).toContain('radius');
  });

  it('attaches diagnostics to the feature they name', async () => {
    const analysis = await analyzeScript({
      code: 'const b = box(10, 10, 10);\nreturn b.fillet(9);',
    });
    if (!analysis.ok) throw new Error('analysis failed');
    const fillet = analysis.trace.find(entry => entry.feature_id === 'fillet_1');
    expect(fillet?.health).toBe('error');
    expect(fillet?.diagnostics.map(d => d.code)).toContain(
      'feature.edge-feature.short-edges-skipped',
    );
    // Every diagnostic reaching the trace carries its structured next action.
    expect(fillet?.diagnostics.every(d => d.nextAction !== undefined)).toBe(true);
  });
});

describe('repair region', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('bounds the region to the failing feature, its inputs, and its params', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');

    const region = computeRepairRegion({
      trace: analysis.trace,
      featureId: 'fillet_1',
      fileName: analysis.fileName,
      spans: analysis.spans,
    });

    const roles = new Map(region.ranges.map(range => [range.role, range]));
    expect(roles.get('failing-feature')).toMatchObject({ startLine: 4, endLine: 4 });
    expect(roles.get('input-feature')).toMatchObject({ startLine: 3, endLine: 3 });
    expect(roles.get('parameter-source')).toMatchObject({ startLine: 1, endLine: 1, paramName: 'radius' });

    // Line 2 authored `box_1`, which is TWO hops upstream. The region is
    // deliberately not transitive — walk to that feature for its own region.
    expect(region.ranges.some(range => range.startLine === 2)).toBe(false);
    expect(isWithinRegion(region, 2, 2)).toBe(false);
  });

  it('refuses a patch that targets a line outside the region', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');
    const region = computeRepairRegion({
      trace: analysis.trace,
      featureId: 'fillet_1',
      fileName: analysis.fileName,
      spans: analysis.spans,
    });

    const outside = {
      startLine: 2,
      endLine: 2,
      before: 'const base = box(40, 30, 20);',
      after: 'const base = box(4, 3, 2);',
    };
    const result = applyRepairPatch(THREE_FEATURE_SCRIPT, outside, region);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('tool.repair.out-of-region');
    expect(result.diagnostic.hint.length).toBeGreaterThan(0);
  });

  it('refuses a patch whose anchor text no longer matches the source', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');
    const region = computeRepairRegion({
      trace: analysis.trace,
      featureId: 'fillet_1',
      fileName: analysis.fileName,
      spans: analysis.spans,
    });

    const drifted = {
      startLine: 4,
      endLine: 4,
      before: 'return bored.fillet(99);', // not what line 4 says
      after: 'return bored.fillet(1);',
    };
    const result = applyRepairPatch(THREE_FEATURE_SCRIPT, drifted, region);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('tool.repair.source-drift');
  });

  it('applies an in-region patch verbatim', async () => {
    const analysis = await analyzeScript({ code: THREE_FEATURE_SCRIPT });
    if (!analysis.ok) throw new Error('analysis failed');
    const region = computeRepairRegion({
      trace: analysis.trace,
      featureId: 'fillet_1',
      fileName: analysis.fileName,
      spans: analysis.spans,
    });

    const result = applyRepairPatch(
      THREE_FEATURE_SCRIPT,
      {
        startLine: 4,
        endLine: 4,
        before: 'return bored.fillet(radius);',
        after: 'return bored.fillet(1);',
      },
      region,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.new_code.split('\n')[3]).toBe('return bored.fillet(1);');
    // Nothing else moved.
    expect(result.new_code.split('\n').slice(0, 3)).toEqual(
      THREE_FEATURE_SCRIPT.split('\n').slice(0, 3),
    );
  });
});
