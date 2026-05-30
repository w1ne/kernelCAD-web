// tests/integration/mcp/resolveTopoRef.test.ts
//
// F-surface Task F2.4: the resolve_topo_ref MCP tool — given a script + a
// `@kc[<owner>/<kind>/<name>]` ref, returns a structured resolution result
// (ok/entity-or-error) using the F-foundation parser + resolver.
import { describe, it, expect, beforeAll } from 'vitest';
import { resolveTopoRefTool } from '../../../src/agent/mcp/tools/resolveTopoRef';

describe('resolve_topo_ref MCP tool (F-surface F2)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('resolves @kc[<owner>/face/<canonical>] on a shape whose lineage carries snapshots', async () => {
    // F-foundation's resolveTopoRef filters out lineage entries without a
    // `snapshot` field (it treats those as "consumed-upstream orphans").
    // Primitive boxes don't carry snapshots by default — only downstream
    // ops that invoke `refreshSnapshots` (hole/cutout/emboss/etc.) populate
    // them. We use `.hole(...)` here as the post-op capture site so the
    // surviving box-top lineage gains a snapshot and the ref resolves.
    const code = `return box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 4, depth: 'through' });`;
    const r = await resolveTopoRefTool({ code, ref: '@kc[box_1/face/top]' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(`expected ok; got error: ${r.error}`);
    expect(r.entity).toBeDefined();
    expect(r.entity!.kind).toBe('face');
  });

  it('returns not-resolvable with a structured code for an unknown ref name', async () => {
    const code = `return box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 4, depth: 'through' });`;
    const r = await resolveTopoRefTool({ code, ref: '@kc[box_1/face/lidthatdoesnotexist]' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.errorCode).toBe('feature.face-ref.not-resolvable');
  });

  it('rejects a malformed ref string with a structured parse error', async () => {
    const code = `return box(10, 10, 10);`;
    const r = await resolveTopoRefTool({ code, ref: '@kc[1box/face/top]' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.error).toMatch(/owner|name/);
  });

  // Q8 — strings-as-sugar parity: the @kcq[...] Query DSL form also reaches
  // resolve_topo_ref. Internally dispatches through the same evaluator that
  // backs evaluate_query (expect: 'unique'); the agent sees a TopoResolveResult
  // shape so prior agents that hardcode the ok/entity envelope keep working.
  it('accepts @kcq[...] Query DSL ref via the evaluate-then-unique path', async () => {
    const code = `return box(10, 10, 10);`;
    const r = await resolveTopoRefTool({ code, ref: '@kcq[face(withLabel("top"))]' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(`expected ok; got: ${r.error}`);
    expect(r.entity?.kind).toBe('face');
  });

  it('surfaces query.over-determined when @kcq[...] matches multiple', async () => {
    const code = `return box(10, 10, 10);`;
    const r = await resolveTopoRefTool({ code, ref: '@kcq[face(everything(face))]' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.errorCode).toBe('query.over-determined');
  });
});
