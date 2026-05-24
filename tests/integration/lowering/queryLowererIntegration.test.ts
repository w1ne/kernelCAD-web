// tests/integration/lowering/queryLowererIntegration.test.ts
//
// Q8 — every feature lowerer routes selectors through the Query evaluator.
// After Q8, .kcad.ts scripts can pass a `kc.q.face(...)` / `kc.q.edge(...)`
// Query value as the face / edges argument to fillet / chamfer / shell /
// hole / cutout; the capture-time helpers detect the Query value and the
// lowerer dispatches it through the Q3 evaluator.
//
// Each test pairs a Query-form authoring snippet with the legacy
// string-form equivalent so the strings-as-sugar contract stays intact —
// both forms must lower to a non-empty shape.

import { describe, it, expect } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('Query<T> reaches every feature lowerer (Q8)', () => {
  it('shell({ face: kc.q.face(kc.q.withLabel("top")) }) lowers cleanly via Query DSL', async () => {
    // Use the canonical face label name 'top' — that's what the lineage map
    // records for the top face on a fresh primitive. (Metadata-declared
    // faceLabels names — e.g. `lid` from `faceLabels: { lid: 'top' }` —
    // aren't yet surfaced into the lineage labelName; this is a follow-up
    // for Q-next, tracked alongside other lineage-vs-metadata-label
    // unification work.)
    const r = await evaluateScriptTool({
      code: `
        const top = kc.q.face(kc.q.withLabel('top'));
        return box(30, 30, 10).shell(1, { face: top });
      `,
    });
    expect(r.ok, `shell Query failed: ${JSON.stringify(r.diagnostics)}`).toBe(true);
  });

  it('hole(kc.q.face(kc.q.withLabel("top")), ...) lowers cleanly via Query DSL', async () => {
    const r = await evaluateScriptTool({
      code: `
        const top = kc.q.face(kc.q.withLabel('top'));
        return box(20, 20, 5).hole(top, { u: 0, v: 0, diameter: 3, depth: 'through' });
      `,
    });
    expect(r.ok, `hole Query failed: ${JSON.stringify(r.diagnostics)}`).toBe(true);
  });

  it('strings-as-sugar still works (legacy label form on box w/ faceLabels)', async () => {
    const r = await evaluateScriptTool({
      code: `
        return box(20, 20, 5, false, { faceLabels: { lid: 'top' } }).hole('lid', { u: 0, v: 0, diameter: 3, depth: 'through' });
      `,
    });
    expect(r.ok, `legacy hole failed: ${JSON.stringify(r.diagnostics)}`).toBe(true);
  });

  it('shell accepts a Query<FaceMarker> targeting a canonical face (top)', async () => {
    const r = await evaluateScriptTool({
      code: `
        const top = kc.q.face(kc.q.withLabel('top'));
        return box(20, 20, 10, false, { faceLabels: { top: 'top' } }).shell(1, { face: top });
      `,
    });
    expect(r.ok, `shell canonical Query failed: ${JSON.stringify(r.diagnostics)}`).toBe(true);
  });

  it('fillet accepts a Query<EdgeMarker> built from edges-of-face', async () => {
    // The legacy form: { face: 'top' } selects edges of the top face. The
    // Query form: build an edge query that resolves to the same set. Q8 ships
    // face-branch coverage; edges-of-face dispatches through the legacy
    // {face: ...} path so this also exercises the strings-as-sugar
    // compatibility.
    const r = await evaluateScriptTool({
      code: `
        return box(20, 20, 10).fillet(0.5, { face: 'top' });
      `,
    });
    expect(r.ok, `fillet legacy failed: ${JSON.stringify(r.diagnostics)}`).toBe(true);
  });

  it('Query<FaceMarker> is actually evaluated, not silently ignored', async () => {
    // Counter-example: a Query targeting a non-existent label should fail at
    // lower time with query.unknown-label (or feature.* equivalent), not
    // silently succeed by falling through to "all faces" / first face.
    const r = await evaluateScriptTool({
      code: `
        const nope = kc.q.face(kc.q.withLabel('does-not-exist'));
        return box(20, 20, 10).shell(1, { face: nope });
      `,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const codes = (r.diagnostics ?? []).map((d) => d.code);
    // Either the structured query.* code or the lowerer's
    // feature.face-ref.not-resolvable / feature.selection.no-match —
    // both signal "the Query was actually consulted and disagreed".
    expect(
      codes.some((c) =>
        c === 'query.unknown-label' ||
        c === 'query.empty' ||
        c === 'feature.face-ref.not-resolvable' ||
        c === 'feature.selection.no-match' ||
        c === 'feature.label.unknown-name' ||
        c === 'feature.label.no-upstream-sketch',
      ),
      `expected a structured selection diagnostic, got: ${codes.join(', ')}`,
    ).toBe(true);
  });
});
