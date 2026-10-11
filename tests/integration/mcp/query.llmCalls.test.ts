// tests/integration/mcp/query.llmCalls.test.ts
//
// LLM-style calls to `query`, made through the public registry the way a
// ChatGPT / Claude client sends them after reading the tool description: every
// documented Query form, the argument-name slips models make (`ref` in
// evaluate mode, `query` in resolve mode, no feature_id for lineage), and the
// genuinely-invalid calls, which must return a coded diagnostic instead of
// throwing.
import { describe, it, expect, beforeAll } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const BOX = `const b = box(20, 10, 5);\nreturn b;`;
const PLATE = `return box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through' });`;

type Out = {
  ok: boolean;
  entities?: Array<{ ref: string; snapshot?: { centroid?: number[] } }>;
  ref?: string;
  chain?: Array<{ featureId: string; slot?: string }>;
  error?: string;
  errorCode?: string;
  interpretedAs?: string;
};

async function q(args: Record<string, unknown>): Promise<Out> {
  return (await callMcpTool('query', args)) as Out;
}

const refs = (o: Out): string[] => (o.entities ?? []).map((e) => e.ref);

describe('query — LLM-style calls', () => {
  beforeAll(async () => { await initOcct(); });

  it('a bare face label resolves to that face', async () => {
    const r = await q({ code: BOX, query: 'top' });
    expect(r.ok).toBe(true);
    expect(refs(r)).toEqual(['@kc[box_1/face/top]']);
    expect(r.interpretedAs).toBe('@kcq[face(withLabel("top"))]');
  });

  it('the documented @kc ref form resolves', async () => {
    const r = await q({ code: BOX, query: '@kc[box_1/face/top]' });
    expect(refs(r)).toEqual(['@kc[box_1/face/top]']);
    expect(r.entities?.[0].snapshot?.centroid).toEqual([10, 5, 5]);
  });

  it('geometryType(PLANE) matches every planar face of a primitive', async () => {
    const r = await q({ code: BOX, query: '@kcq[face(geometryType(PLANE))]' });
    expect(r.ok).toBe(true);
    expect(refs(r)).toHaveLength(6);
  });

  it('closestTo([x,y,z]) picks the face nearest the point', async () => {
    const r = await q({ code: BOX, query: '@kcq[face(closestTo([10, 5, 5]))]' });
    expect(refs(r)).toEqual(['@kc[box_1/face/top]']);
  });

  it('the description example (geometryType + closestTo) finds a hole wall', async () => {
    const r = await q({ code: PLATE, query: '@kcq[face(geometryType(CYLINDER), closestTo([20, 20, 5]))]' });
    expect(r.ok).toBe(true);
    expect(refs(r)).toEqual(['@kc[hole_1/face/wall]']);
  });

  it('createdBy("<feature-id>") and union(...) compose', async () => {
    const r = await q({ code: PLATE, query: '@kcq[union(face(createdBy("hole_1")), face(withLabel("bottom")))]' });
    expect(r.ok).toBe(true);
    expect(refs(r)).toEqual(expect.arrayContaining(['@kc[hole_1/face/wall]', '@kc[box_1/face/bottom]']));
  });

  it('evaluate accepts the ref under `ref` as well as `query`', async () => {
    const r = await q({ code: BOX, ref: '@kc[box_1/face/top]' });
    expect(refs(r)).toEqual(['@kc[box_1/face/top]']);
  });

  it("mode 'resolve' resolves a primitive face ref (and accepts it under `query`)", async () => {
    for (const args of [{ ref: '@kc[box_1/face/top]' }, { query: '@kc[box_1/face/top]' }]) {
      const r = await q({ mode: 'resolve', code: BOX, ...args });
      expect(r.ok).toBe(true);
      expect(r.ref).toBe('@kc[box_1/face/top]');
    }
  });

  it("mode 'lineage' traces an @kc ref or a <feature-id>.<label> selector with no feature_id", async () => {
    for (const ref of ['@kc[box_1/face/top]', 'box_1.top', '@kc[hole_1/face/wall]']) {
      const r = await q({ mode: 'lineage', code: PLATE, ref });
      expect(r.ok, `${ref}: ${r.error}`).toBe(true);
      expect(r.chain!.length).toBeGreaterThan(0);
    }
  });

  it('a missing Query is a coded diagnostic naming the argument, with examples', async () => {
    const r = await q({ code: BOX });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toContain('needs `query`');
    expect(r.error).toContain("query({ code, query: '@kcq[face(geometryType(PLANE))]' })");
  });

  it('an unknown mode is a coded diagnostic, not a thrown exception', async () => {
    const r = await q({ mode: 'faces', code: BOX });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.error).toContain('"faces"');
  });

  it('an unknown Query constructor names the bad token', async () => {
    const r = await q({ code: BOX, query: '@kcq[face(normal("+Z"))]' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('query.invalid-syntax');
    expect(r.error).toContain("unknown Query constructor 'normal'");
  });
});
