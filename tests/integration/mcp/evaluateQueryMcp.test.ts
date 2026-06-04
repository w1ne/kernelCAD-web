// tests/integration/mcp/evaluateQueryMcp.test.ts
//
// Q8a — evaluate_query MCP tool. The discovery primitive for the Query DSL.
// Per spec §3.6: takes a Query (string @kc[...] / @kcq[...] / JSON-AST) plus
// a script, returns the resolved entity list before consuming it in a
// feature op. Mirrors resolve_topo_ref but for the broader Query surface.

import { describe, it, expect } from 'vitest';
import { evaluateQueryTool } from '../../../src/agent/mcp/tools/evaluateQuery';

describe('evaluate_query MCP tool (Q8a)', () => {
  it('resolves a string @kcq[face(everything(face))] against a primitive box', async () => {
    const r = await evaluateQueryTool({
      code: `return box(10, 10, 10);`,
      query: '@kcq[face(everything(face))]',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.entities?.length).toBe(6);
    for (const e of r.entities ?? []) {
      expect(e.kind).toBe('face');
      expect(e.ref).toMatch(/^@kc\[/);
    }
  });

  it('resolves an @kc[...] string through the strings-as-sugar path (canonical face)', async () => {
    const r = await evaluateQueryTool({
      code: `return box(10, 10, 10);`,
      query: '@kc[box_1/face/top]',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.entities?.length).toBe(1);
    expect(r.entities?.[0].kind).toBe('face');
  });

  it('returns the diagnostic envelope on query.unknown-label', async () => {
    const r = await evaluateQueryTool({
      code: `return box(10, 10, 10);`,
      query: '@kcq[face(withLabel("nonexistent"))]',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.errorCode).toBe('query.unknown-label');
    expect(r.errorHint).toBeDefined();
  });

  it('expect: "unique" raises query.over-determined on multi-hit', async () => {
    const r = await evaluateQueryTool({
      code: `return box(10, 10, 10);`,
      query: '@kcq[face(everything(face))]',
      expect: 'unique',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.errorCode).toBe('query.over-determined');
  });

  it('echoes the parsed Query in JSON-AST form on success', async () => {
    const r = await evaluateQueryTool({
      code: `return box(10, 10, 10);`,
      query: '@kcq[face(everything(face))]',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.query?.ast).toBeDefined();
    expect(typeof r.query?.ast.op).toBe('string');
  });

  it('surfaces invalid syntax as query.invalid-syntax', async () => {
    const r = await evaluateQueryTool({
      code: `return box(10, 10, 10);`,
      query: 'not-a-valid-ref',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.errorCode).toBe('query.invalid-syntax');
  });
});
