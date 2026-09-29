// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A multi-part STL export fuses the parts, then meshes the fused solid. When
// that fused mesh is not watertight (union seams of parts that touch by a few
// hundredths of a mm) the export must not ship a torn STL: it falls back to
// per-part closed shells with a warning naming the seam, and when even a
// part is torn it fails naming the seams.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { verifyWatertight } from '../../../src/kernel/backends/occt/meshHeal';
import { encodeBinaryStl } from '../../../src/kernel/backends/occt/exportStlBinary';
import { crackSeams, describeCrackSeams, concatMeshes } from '../../../src/agent/script-runtime/sceneStlSeams';
import { stlStats } from '../../helpers/stlStats';

const SCENE = `
const a = assembly('seam');
a.part('plate', box(60, 40, 5));
a.part('boss', cylinder(20, 8).translate(20, 20, 5 - 0.03));
return a.model();
`;

/** Parse a binary STL into a position-welded mesh for the edge verify. */
function weldStl(bytes: Uint8Array): { vertices: number[]; triangles: number[] } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(80, true);
  const ids = new Map<string, number>();
  const vertices: number[] = [];
  const triangles: number[] = [];
  for (let t = 0; t < n; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const o = 84 + t * 50 + 12 + k * 12;
      const p = [0, 1, 2].map((c) => view.getFloat32(o + c * 4, true));
      const key = p.map((c) => c.toFixed(5)).join(',');
      let id = ids.get(key);
      if (id === undefined) {
        id = vertices.length / 3;
        vertices.push(...p);
        ids.set(key, id);
      }
      triangles.push(id);
    }
  }
  return { vertices, triangles };
}

/** Make the FUSED mesh come out torn (drop 12 triangles) while leaving the
 *  per-part meshing path (meshShapeForExport) untouched. */
function tearFusedMesh(): void {
  const real = OcctBackend.prototype.exportSTLWithReportAsync;
  vi.spyOn(OcctBackend.prototype, 'exportSTLWithReportAsync').mockImplementation(async function (this: OcctBackend) {
    const out = await real.call(this);
    const mesh = weldStl(out.bytes);
    mesh.triangles.splice(0, 36);
    return {
      bytes: Uint8Array.from(encodeBinaryStl(mesh)),
      report: verifyWatertight(mesh),
      triangleCount: mesh.triangles.length / 3,
    };
  });
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('multi-part STL: fused seam crack fallback', () => {
  it('untouched scene exports one fused watertight shell with no warning', async () => {
    const r = await runAndExport({ code: SCENE, fileName: 'seam.kcad.ts', format: 'stl' });
    expect(r.diagnostics.map((d) => d.code)).toEqual([]);
    expect(verifyWatertight(weldStl(r.bytes)).ok).toBe(true);
    expect(stlStats(r.bytes).components).toBe(1);
  }, 120_000);

  it('a torn fused mesh ships per-part closed shells with a warning naming the seam', async () => {
    tearFusedMesh();
    const r = await runAndExport({ code: SCENE, fileName: 'seam.kcad.ts', format: 'stl' });
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).not.toContain('export.mesh.not-watertight');
    const warn = r.diagnostics.find((d) => d.code === 'export.mesh.fused-seam-fallback');
    expect(warn?.severity).toBe('warn');
    expect(warn?.message).toMatch(/'plate'|'boss'/);
    // The shipped bytes are watertight: two closed shells, one per part.
    expect(verifyWatertight(weldStl(r.bytes)).ok).toBe(true);
    expect(stlStats(r.bytes).components).toBe(2);
  }, 120_000);
});

describe('sceneStlSeams helpers', () => {
  it('names the parts that meet at a crack cluster', () => {
    const report = {
      ok: false,
      openEdgeCount: 12,
      clusters: [
        { center: [20, 20, 5] as [number, number, number], edgeCount: 10 },
        { center: [1, 1, 1] as [number, number, number], edgeCount: 2 },
      ],
    };
    const parts = [
      { name: 'plate', bbox: { min: [0, 0, 0], max: [60, 40, 5] } },
      { name: 'boss', bbox: { min: [12, 12, 4.97], max: [28, 28, 24.97] } },
    ];
    const seams = crackSeams(report, parts);
    expect(seams.map((s) => s.parts)).toEqual([['plate', 'boss'], ['plate']]);
    expect(describeCrackSeams(seams)).toBe(
      "seam between 'plate' and 'boss' at (20.00, 20.00, 5.00)×10; inside part 'plate' at (1.00, 1.00, 1.00)×2",
    );
  });

  it('concatMeshes offsets indices so each shell stays closed', () => {
    const tet = { vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], triangles: [0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2] };
    const both = concatMeshes([tet, tet]);
    expect(both.triangles.slice(12)).toEqual(tet.triangles.map((i) => i + 4));
    expect(verifyWatertight(both).ok).toBe(true);
  });
});
