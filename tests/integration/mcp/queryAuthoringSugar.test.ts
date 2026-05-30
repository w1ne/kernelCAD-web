// tests/integration/mcp/queryAuthoringSugar.test.ts
//
// Q6 — verifies that the `q` constructor namespace is reachable from inside
// a `.kcad.ts` script via two equivalent forms:
//   1. top-level `q.face(...)` (matches the `box(...)` spread convention),
//   2. namespaced `kc.q.face(...)` (matches SKILL.md prose).
//
// Both bottom out on the same `queryConstructors.q` and produce a
// `Query<FaceMarker>` whose `.evaluate(scene)` returns the box's 6 faces.

import { describe, it, expect } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('Query DSL authoring sugar — Q6', () => {
  it('q.face() is reachable as a top-level global inside a .kcad.ts script', async () => {
    const r = await evaluateScriptTool({
      code: `
        const box1 = box(10, 10, 10);
        const allFaces = q.face();
        // The Query value is opaque from outside; the sanity check is that
        // construction itself succeeds (a non-existent global would throw
        // ReferenceError at script time).
        if (allFaces._kind !== 'kc.query') throw new Error('q.face() did not return a Query value');
        if (allFaces.target !== 'face') throw new Error('q.face() target mismatch');
        return box1;
      `,
    });
    expect(r.ok).toBe(true);
  });

  it('kc.q.face() is reachable as a namespaced global inside a .kcad.ts script', async () => {
    const r = await evaluateScriptTool({
      code: `
        const box1 = kc.box(10, 10, 10);
        const allFaces = kc.q.face();
        if (allFaces._kind !== 'kc.query') throw new Error('kc.q.face() did not return a Query value');
        if (allFaces.target !== 'face') throw new Error('kc.q.face() target mismatch');
        return box1;
      `,
    });
    expect(r.ok).toBe(true);
  });

  it('q and kc.q reference the same constructor namespace', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = q.face(q.withLabel('top'));
        const b = kc.q.face(kc.q.withLabel('top'));
        // Both should have the same structural target + ast.op.
        if (a.target !== b.target) throw new Error('target mismatch');
        if (a.ast.op !== b.ast.op) throw new Error('ast.op mismatch');
        return box(5, 5, 5);
      `,
    });
    expect(r.ok).toBe(true);
  });

  it('q.union(...) composes inside a .kcad.ts script', async () => {
    const r = await evaluateScriptTool({
      code: `
        const composed = q.union(
          q.face(q.withLabel('top')),
          q.face(q.withLabel('bottom')),
        ).asLenient();
        if (composed.ast.op !== 'union') throw new Error('expected union op');
        if (composed.lenient !== true) throw new Error('expected lenient=true');
        return box(5, 5, 5);
      `,
    });
    expect(r.ok).toBe(true);
  });
});
