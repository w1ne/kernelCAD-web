// SPDX-License-Identifier: MIT
// Small behavior replacements for former long-running geometry integrations.
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ hookTimeout: 60_000, testTimeout: 60_000 });
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';

const init = initOcct();

describe('fast geometry replacements', () => {
  it('flags the 3 mm sink between two boxes', async () => {
    await init;
    const code = `const a = assembly('contact'); a.part('base', box(10,10,10)); a.part('sink', box(10,10,10).translate(0,0,7)); return a.model();`;
    const result = await checkInterference({ code, fileName: 'sink.kcad.ts', epsilonMm3: 0.01 });
    expect(result.pairs.map((p) => p.volumeMm3)).toEqual([expect.closeTo(300, 5)]);
  }, 4_500);

  it('a single spur gear exports as one solid with no interference pairs', async () => {
    await init;
    const code = `const gear = spurGear({ module: 1, teeth: 12, faceWidth: 2 }); const a = assembly('gear'); a.part('gear', gear); return a.model();`;
    const built = await evaluateAndBuildScript({ code, file: 'gear.kcad.ts' });
    expect('model' in built).toBe(true);
    if (!('model' in built)) return;
    const model = built.model;
    const interference = await import('../../../src/modeling/runtime/detectInterferences').then(({ detectInterferences }) => {
      const scene = model.rootShape as { parts?: unknown };
      expect(scene.parts).toBeDefined();
      return detectInterferences(scene as never, 0.01, new Set());
    });
    expect(interference.pairs).toEqual([]);
    const { getOC } = await import('replicad');
    const scene = model.rootShape as { parts: Array<{ shape: { getReplicadShape: () => { wrapped: unknown } } }> };
    expect(scene.parts).toHaveLength(1);
    const raw = scene.parts[0].shape.getReplicadShape();
    const oc = getOC();
    const explorer = new oc.TopExp_Explorer_2(raw.wrapped, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    let solidCount = 0;
    try { while (explorer.More()) { solidCount++; explorer.Next(); } }
    finally { explorer.delete(); }
    expect(solidCount).toBe(1);
    const checker = new oc.BRepCheck_Analyzer(raw.wrapped, true, false);
    try { expect(checker.IsValid_2()).toBe(true); }
    finally { checker.delete(); }
    const { meshShapeForExport } = await import('../../../src/kernel/backends/occt/backendMesh');
    const mesh = meshShapeForExport(scene.parts[0].shape.getReplicadShape());
    const edgeUse = new Map<string, number>();
    const vertexKey = (index: number) => {
      const offset = index * 3;
      return `${mesh.vertices[offset].toFixed(6)},${mesh.vertices[offset + 1].toFixed(6)},${mesh.vertices[offset + 2].toFixed(6)}`;
    };
    for (let i = 0; i < mesh.triangles.length; i += 3) {
      const tri = [mesh.triangles[i], mesh.triangles[i + 1], mesh.triangles[i + 2]];
      for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]] as const) {
        const va = vertexKey(a), vb = vertexKey(b);
        const key = va < vb ? `${va}|${vb}` : `${vb}|${va}`;
        edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1);
      }
    }
    expect([...edgeUse.values()].every(count => count === 2)).toBe(true);
  }, 4_500);

  it('round trips an OCCT box STL through the registered mesh_to_features tool', async () => {
    await init;
    const { callMcpTool } = await import('../../../src/agent/mcp/toolRegistry');
    const exported = await runAndExport({ code: 'return box(10, 8, 2);', fileName: 'tiny-mesh-round-trip.kcad.ts', format: 'stl' });
    expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(exported.bytes.byteLength).toBeGreaterThan(0);
    const result = await callMcpTool('mesh_to_features', {
      data: Buffer.from(exported.bytes).toString('base64'),
      format: 'stl',
      maxPasses: 1,
    }) as { ok: boolean; fidelity?: { volumeIoU: number; maxDeviationMm: number; verdict: string }; error?: string };
    expect(result.ok, result.error).toBe(true);
    expect(result.fidelity?.volumeIoU).toBeGreaterThanOrEqual(0.98);
    expect(result.fidelity?.maxDeviationMm).toBeLessThanOrEqual(0.05);
    expect(result.fidelity?.verdict).toBe('faithful');
  }, 4_500);

});
