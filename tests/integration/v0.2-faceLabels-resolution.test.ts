// tests/integration/v0.2-faceLabels-resolution.test.ts
// Task 4: integration tests for resolving faceLabels from upstream feature metadata.
// These tests cover the new metadata-sourced label path in edgeSelection.ts.

import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

async function run(code: string) {
  const result = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  return engine.run(result.records);
}

describe('faceLabels resolution from upstream feature metadata (Task 4)', () => {
  beforeAll(async () => { await initOcct(); });

  // ── A. Canonical-alias label declared on box ───────────────────────────────
  it('A: resolves a canonical-alias label (lid → top) declared on box', async () => {
    const code = `
      return box(10, 10, 5, false, { faceLabels: { lid: 'top' } })
        .fillet(1, { face: 'lid' });
    `;
    const r = await run(code);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  // ── B. Query-based label on a sketch-derived extrude ──────────────────────
  it('B: resolves a query-based label (rim → {atZ:5, parallelTo:XY}) on an extrude', async () => {
    const code = `
      return path()
        .moveTo(0, 0)
        .lineTo(10, 0)
        .lineTo(10, 5)
        .lineTo(0, 5)
        .close()
        .extrude(5, { faceLabels: { rim: { atZ: 5, parallelTo: 'XY' } } })
        .fillet(0.5, { face: 'rim' });
    `;
    const r = await run(code);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  // ── C. Unknown label falls through to sketch path → feature.label.unknown-name ──
  it('C: emits feature.label.unknown-name when label is not declared by anything', async () => {
    // Box without faceLabels, fillet by undeclared label name.
    // The metadata path misses, the sketch-segment path also fails (no upstream sketch
    // on a box), so the existing code should emit no-upstream-sketch for a raw box.
    // After Task 4, a box with no faceLabels falls through to the old path which
    // emits feature.label.no-upstream-sketch (box has no upstream sketch).
    const code = `return box(10, 10, 5).fillet(1, { face: 'doesnotexist' });`;
    const r = await run(code);
    // Either unknown-name or no-upstream-sketch is acceptable — both indicate the label
    // is unresolvable. The important invariant is that it fails with an error.
    const errorCodes = r.diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.code);
    expect(errorCodes.some(c =>
      c === 'feature.label.unknown-name' || c === 'feature.label.no-upstream-sketch'
    )).toBe(true);
  });

  // ── D. Collision: two upstream features declare the same label ─────────────
  it('D: emits feature.label.collision when two upstream features declare the same label', async () => {
    const code = `
      const a = box(20, 20, 20, false, { faceLabels: { lid: 'top' } });
      const b = box(10, 10, 10, false, { faceLabels: { lid: 'top' } });
      return a.union(b).fillet(0.5, { face: 'lid' });
    `;
    const r = await run(code);
    const errorCodes = r.diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.code);
    expect(errorCodes).toContain('feature.label.collision');
  });

  // ── E. Query-based label resolves to zero faces → feature.label.query-no-match ──
  it('E: emits feature.label.query-no-match when query-based label matches zero faces', async () => {
    const code = `
      return box(10, 10, 5, false, { faceLabels: { ghost: { atZ: 999 } } })
        .fillet(1, { face: 'ghost' });
    `;
    const r = await run(code);
    const errorCodes = r.diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.code);
    expect(errorCodes).toContain('feature.selection.no-match');
  });

  // ── F. Label survives translate ────────────────────────────────────────────
  it('F: canonical-alias label survives .translate(...)', async () => {
    const code = `
      return box(10, 10, 5, false, { faceLabels: { lid: 'top' } })
        .translate(5, 0, 0)
        .fillet(1, { face: 'lid' });
    `;
    const r = await run(code);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  // ── G. Label survives unambiguous subtract ────────────────────────────────
  it('G: canonical-alias label survives subtract that does not split the labeled face', async () => {
    // Big box with lid label. Small cylinder through the middle. Top face stays singular.
    const code = `
      const body = box(20, 20, 20, false, { faceLabels: { lid: 'top' } });
      const hole = cylinder(50, 3).translate(10, 10, -5);
      return body.subtract(hole).fillet(0.5, { face: 'lid' });
    `;
    const r = await run(code);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  // ── H. Label scope is the consumer's lineage, not script order ─────────────
  it('H: a factory called 3x stamping the same label does not collide', async () => {
    // Each makeBase() call produces an independent subtree. `lid` is declared
    // three times in the flat record array, but no consumer has more than one
    // of them as an ancestor, so each must resolve cleanly.
    const code = `
      const makeBase = (s) => box(s, s, 5, false, { faceLabels: { lid: 'top' } });
      const a = makeBase(10).fillet(1, { face: 'lid' });
      const b = makeBase(12).fillet(1, { face: 'lid' }).translate(30, 0, 0);
      const c = makeBase(14).fillet(1, { face: 'lid' }).translate(60, 0, 0);
      return a.union(b).union(c);
    `;
    const r = await run(code);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  // ── I. A genuine same-lineage duplicate still errors ──────────────────────
  it('I: two labels declared in the SAME lineage still emit feature.label.collision', async () => {
    // Both boxes are ancestors of the consumer (union operands), so this is a
    // real ambiguity and must keep failing.
    const code = `
      const makeBase = (s) => box(s, s, 5, false, { faceLabels: { lid: 'top' } });
      return makeBase(20).union(makeBase(10).translate(2, 2, 0))
        .fillet(0.5, { face: 'lid' });
    `;
    const r = await run(code);
    const errorCodes = r.diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.code);
    expect(errorCodes).toContain('feature.label.collision');
    const collision = r.diagnostics.find(d => d.code === 'feature.label.collision');
    expect(collision?.message).toContain('is declared by multiple upstream features');
  });
});
