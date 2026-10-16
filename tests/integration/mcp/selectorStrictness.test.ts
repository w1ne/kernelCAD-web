// tests/integration/mcp/selectorStrictness.test.ts
//
// FIX-03 — "no silent selector failures", end to end through evaluate_script
// and inspect (list_faces / list_edges). Each case reproduces a hands-on
// finding against the hosted build:
//   1. EdgeQuery parallel: 'Z' silently matched 0 edges.
//   2. FaceQuery ofSurfaceType: 'CYLINDER' matched nothing (OCCT: 'CYLINDRE').
//   3. within: { min, max } on a fillet EdgeQuery was ignored — every z=10
//      edge was filleted and the run reported ok: true.
//   4. Zero-match selectors must be an ERROR, on every selector path.
//   5. inspect faces: CYLINDRE / area 0 / non-unit normals / deprecated: true.
//   6. '@kc[...]' ref strings passed to .fillet() were spread into an
//      EdgeQuery ("unknown keys: 0, 1, 2, …").
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { listFacesTool } from '../../../src/agent/mcp/tools/listFaces';
import { listEdgesTool } from '../../../src/agent/mcp/tools/listEdges';

const POCKETED = `box(40, 40, 10).cutout(
  path().moveTo(-5,-5).lineTo(5,-5).lineTo(5,5).lineTo(-5,5).close(),
  { face: 'top', depth: 3 },
)`;

interface Diag { code: string; severity: string; message: string; hint?: string }

async function run(code: string): Promise<{ ok: boolean; diags: Diag[]; errorCode?: string; error?: string }> {
  const r = (await evaluateScriptTool({ code } as never)) as unknown as {
    ok: boolean;
    diagnostics?: Diag[];
    errorCode?: string;
    error?: string;
  };
  return { ok: r.ok, diags: r.diagnostics ?? [], errorCode: r.errorCode, error: r.error };
}

function codes(r: { diags: Diag[]; errorCode?: string }): string[] {
  return [...r.diags.filter((d) => d.severity === 'error').map((d) => d.code), ...(r.errorCode ? [r.errorCode] : [])];
}

async function faceCount(code: string): Promise<number> {
  const r = await listFacesTool({ code });
  expect(r.ok, r.error).toBe(true);
  return r.faces!.length;
}

describe('FIX-03 selector strictness (evaluate_script)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it("EdgeQuery parallel: 'Z' fillets the vertical edges", async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, { parallel: 'Z' });`);
    expect(r.ok).toBe(true);
    expect(await faceCount(`return box(10, 10, 10).fillet(1, { parallel: 'Z' });`)).toBe(10);
  });

  it('EdgeQuery with an invalid direction is a coded error, not a silent no-match', async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, { parallel: 'up' });`);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('feature.invalid-args');
    const d = r.diags.find((x) => x.code === 'feature.invalid-args')!;
    expect(d.message).toContain('EdgeQuery: parallel');
    expect(d.hint).toContain('invalid-args.selector.bad-direction');
  });

  it("FaceQuery ofSurfaceType: 'CYLINDER' resolves the cylinder's lateral face", async () => {
    const r = await run(`return cylinder(10, 20).fillet(1, { face: { ofSurfaceType: 'CYLINDER' } });`);
    expect(r.ok).toBe(true);
  });

  it('within: { min, max } restricts a fillet to the pocket rim', async () => {
    const rimOnly = `return ${POCKETED}.fillet(0.5, { atZ: 10, within: { min: [14, 14, 9], max: [26, 26, 11] } });`;
    const allTop = `return ${POCKETED}.fillet(0.5, { atZ: 10 });`;
    expect((await run(rimOnly)).ok).toBe(true);
    const rimFaces = await faceCount(rimOnly);
    const allFaces = await faceCount(allTop);
    // 11 faces before filleting. Rim-only adds the 4 rim blends; filleting
    // all 8 top edges adds the 4 perimeter blends too.
    expect(rimFaces).toBe(15);
    expect(allFaces).toBe(19);
  });

  it('a misspelt within region is rejected (it used to select everything)', async () => {
    const r = await run(`return ${POCKETED}.fillet(0.5, { atZ: 10, within: { lo: [14, 14, 9], hi: [26, 26, 11] } });`);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('feature.invalid-args');
  });

  it('unknown EdgeQuery keys are rejected with the valid key list', async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, { atz: 10 });`);
    expect(r.ok).toBe(false);
    const d = r.diags.find((x) => x.code === 'feature.invalid-args')!;
    expect(d.message).toContain('atz');
    expect(d.message).toContain('atZ');
  });

  it.each([
    ['EdgeQuery', `return box(10, 10, 10).fillet(1, { atZ: 999 });`],
    ['FaceQuery wrapper', `return box(10, 10, 10).fillet(1, { face: { atZ: 999 } });`],
    ['empty segment list', `return box(10, 10, 10).fillet(1, []);`],
    ['chamfer', `return box(10, 10, 10).chamfer(1, { atZ: 999 });`],
    ['variable fillet group', `return box(10, 10, 10).fillet([{ edges: { atZ: 999 }, radius: 1 }]);`],
    ['shell face', `return box(10, 10, 10).shell(1, { face: { atZ: 999 } });`],
  ])('a zero-match selector is an error diagnostic (%s)', async (_label, code) => {
    const r = await run(code);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('feature.selection.no-match');
  });

  it('a zero-match Query DSL selector is an error diagnostic', async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, { face: q.face(q.geometryType('CYLINDER')) });`);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('query.empty');
  });
});

describe('FIX-03 string selectors on .fillet() / .chamfer()', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it("a canonical face name string fillets that face's edges (.fillet(1, 'top'))", async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, 'top');`);
    expect(r.ok).toBe(true);
    expect(await faceCount(`return box(10, 10, 10).fillet(1, 'top');`)).toBe(10);
  });

  it('an @kc edge ref from inspect resolves to that edge', async () => {
    const listed = await listEdgesTool({ code: `return box(10, 10, 10);`, query: { atZ: 10 } } as never);
    expect(listed.ok).toBe(true);
    const refs = listed.edges!.map((e) => e.ref);
    expect(refs[0]).toMatch(/^@kc\[box_1\/edge\/e\d+\]$/);
    const one = `return box(10, 10, 10).fillet(1, '${refs[0]}');`;
    expect((await run(one)).ok).toBe(true);
    expect(await faceCount(one)).toBe(7);
    const two = `return box(10, 10, 10).chamfer(1, ${JSON.stringify(refs.slice(0, 2))});`;
    expect((await run(two)).ok).toBe(true);
  });

  it('an @kc edge ref listed on a different shape is a clear error', async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, '@kc[other_1/edge/e1]');`);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('feature.invalid-args');
    expect(`${r.error ?? ''} ${r.diags.map((d) => d.message).join(' ')}`).toContain('positional');
  });

  it('an @kc face ref selects all edges of that face, bare or wrapped', async () => {
    expect((await run(`return box(10, 10, 10).fillet(1, '@kc[box_1/face/top]');`)).ok).toBe(true);
    expect((await run(`return box(10, 10, 10).chamfer(1, { face: '@kc[box_1/face/top]' });`)).ok).toBe(true);
    // Lineage-aware: the owner may be an upstream feature.
    expect((await run(`return box(20, 20, 10).subtract(cylinder(3, 30)).fillet(1, '@kc[box_1/face/top]');`)).ok).toBe(true);
  });

  it('a positional face ref is rejected with guidance', async () => {
    const r = await run(`return box(10, 10, 10).fillet(1, '@kc[box_1/face/f3]');`);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('feature.invalid-args');
  });
});

describe('FIX-03 inspect face / edge data', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('faces report public type names, real areas, unit normals, no deprecated flag', async () => {
    // cylinder(height=10, radius=20) per the script API
    const r = await listFacesTool({ code: `return cylinder(10, 20);` });
    expect(r.ok).toBe(true);
    const lateral = r.faces!.find((f) => f.surfaceType === 'CYLINDER');
    expect(lateral).toBeDefined();
    expect(r.faces!.some((f) => f.surfaceType === 'CYLINDRE')).toBe(false);
    expect(lateral!.area).toBeCloseTo(2 * Math.PI * 20 * 10, 6);
    for (const f of r.faces!) {
      expect(Math.hypot(...f.normal)).toBeCloseTo(1, 9);
      expect(f.area).toBeGreaterThan(0);
      expect('deprecated' in f).toBe(false);
    }
  });

  it('pocket rim edges are convex; circle edges carry centre / radius / axis', async () => {
    const rim = await listEdgesTool({
      code: `return ${POCKETED};`,
      query: { atZ: 10, within: { min: [14, 14, 9], max: [26, 26, 11] } },
    } as never);
    expect(rim.ok).toBe(true);
    expect(rim.edges).toHaveLength(4);
    for (const e of rim.edges!) expect(e.convex).toBe(true);

    const circ = await listEdgesTool({ code: `return cylinder(10, 20);`, query: { ofCurveType: 'CIRCLE' } } as never);
    expect(circ.ok).toBe(true);
    expect(circ.edges).toHaveLength(2);
    for (const e of circ.edges!) {
      expect(e.radius).toBeCloseTo(20, 6);
      expect(e.center).toBeDefined();
      expect(Math.abs(e.axis![2])).toBeCloseTo(1, 9);
      expect(e.direction).toEqual(e.axis);
    }
  });
});
