// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Export-time geometry-quality gate: warn / block / off across the MCP tool,
// the CLI and the per-part exporter, plus multi-body, non-solid and budget
// handling on synthetic shapes.
import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeBox, makeCompound, makePolygon, type Shape3D } from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport, runAndExportParts } from '../../../src/agent/script-runtime/export';
import { runExportQualityGate } from '../../../src/agent/script-runtime/exportQualityGate';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { exportPartTool } from '../../../src/agent/mcp/tools/exportPart';
import { exportScript } from '../../../src/agent/cli/commands/export';
import { parseQualityGateFlags } from '../../../src/agent/cli/lib/qualityGateFlags';

// A 1.5 mm rib unioned onto a plate, 0.005 mm too tall: the rib's exposed
// end face is 1.5 x 0.005 = 0.0075 mm² (< 0.01) and its step edges are 0.005 mm.
const SLIVER = 'return box(20, 10, 5).union(box(10, 1.5, 5.005).translate(10, 4, 0));';
const FIXED = 'return box(20, 10, 5).union(box(10, 1.5, 5).translate(10, 4, 0));';
const CLEAN = 'return box(20, 10, 5);';
const ASM = `return assembly()
  .part('plate', box(20, 10, 5).union(box(10, 1.5, 5.005).translate(10, 4, 0)), { at: [100, 0, 0] })
  .part('cover', box(20, 10, 2), { at: [0, 0, 30] })
  .model();`;

const codes = (r: { diagnostics?: Array<{ code: string }> }) => (r.diagnostics ?? []).map(d => d.code);
let dir: string;

describe('export geometry-quality gate', () => {
  beforeAll(async () => {
    await initOcct();
    dir = await mkdtemp(join(tmpdir(), 'kcad-qgate-'));
  });

  it("warn (default): a sliver model exports, carrying counts, worst list and warn diagnostics", async () => {
    const out = join(dir, 'sliver.step');
    const r = await exportModelTool({ code: SLIVER, format: 'step', output_path: out });
    expect(r.ok).toBe(true);
    expect(existsSync(out)).toBe(true);
    const q = r.geometryQuality!;
    expect(q.ok).toBe(false);
    expect(q.mode).toBe('warn');
    expect(q.tinyFaces).toBeGreaterThanOrEqual(1);
    expect(q.shortEdges).toBeGreaterThanOrEqual(1);
    expect(q.thresholds).toEqual({ tinyFaceAreaMm2: 0.01, shortEdgeLengthMm: 0.1 });
    expect(q.worst.length).toBeGreaterThan(0);
    expect(q.worst.length).toBeLessThanOrEqual(5);
    expect(q.worst.some(w => w.kind === 'tiny-face' && Math.abs(w.size - 0.0075) < 1e-6)).toBe(true);
    expect(q.worst.some(w => w.kind === 'short-edge' && Math.abs(w.size - 0.005) < 1e-6)).toBe(true);
    for (const w of q.worst) expect(w.location.every(Number.isFinite)).toBe(true);
    const gateDiags = r.diagnostics!.filter(d => d.code.startsWith('export.geometry-quality.'));
    expect(gateDiags.map(d => d.code).sort()).toEqual(['export.geometry-quality.short-edges', 'export.geometry-quality.tiny-faces']);
    expect(gateDiags.every(d => d.severity === 'warn')).toBe(true);
  }, 120_000);

  it("block: the same model fails without writing the file", async () => {
    const out = join(dir, 'sliver-blocked.stl');
    const r = await exportModelTool({ code: SLIVER, format: 'stl', output_path: out, qualityGate: 'block' });
    expect(r.ok).toBe(false);
    expect(existsSync(out)).toBe(false);
    expect(r.geometryQuality?.ok).toBe(false);
    const tiny = r.diagnostics!.find(d => d.code === 'export.geometry-quality.tiny-faces');
    expect(tiny?.severity).toBe('error');
    expect(tiny?.message).toMatch(/blocked/);
  }, 120_000);

  it("off: no summary and no gate diagnostics", async () => {
    const r = await exportModelTool({ code: SLIVER, format: 'stl', output_path: join(dir, 'off.stl'), qualityGate: 'off' });
    expect(r.ok).toBe(true);
    expect(r.geometryQuality).toBeUndefined();
    expect(codes(r).filter(c => c.startsWith('export.geometry-quality.'))).toEqual([]);
  }, 120_000);

  it('a clean box and the fixed model pass (block mode still exports)', async () => {
    for (const code of [CLEAN, FIXED]) {
      const r = await exportModelTool({ code, format: '3mf', output_path: join(dir, 'clean.3mf'), qualityGate: 'block' });
      expect(r.ok).toBe(true);
      expect(r.geometryQuality).toMatchObject({ ok: true, tinyFaces: 0, shortEdges: 0, worst: [] });
    }
  }, 120_000);

  it('threshold overrides use the verify option names', async () => {
    const r = await runAndExport({ code: SLIVER, fileName: 's.kcad.ts', format: 'obj', qualityGate: { tiny_face_area_mm2: 0.001, short_edge_length_mm: 0.001 } });
    expect(r.geometryQuality).toMatchObject({ ok: true, tinyFaces: 0, shortEdges: 0, thresholds: { tinyFaceAreaMm2: 0.001, shortEdgeLengthMm: 0.001 } });
    await expect(runAndExport({ code: CLEAN, fileName: 'c.kcad.ts', format: 'stl', qualityGate: { short_edge_length_mm: -1 } })).rejects.toThrow(/short_edge_length_mm/);
    await expect(runAndExport({ code: CLEAN, fileName: 'c.kcad.ts', format: 'stl', qualityGate: { mode: 'loud' as never } })).rejects.toThrow(/qualityGate must be one of/);
  }, 120_000);

  it('non-fabrication formats are not gated', async () => {
    const r = await runAndExport({ code: SLIVER, fileName: 's.kcad.ts', format: 'glb' });
    expect(r.geometryQuality).toBeUndefined();
  }, 120_000);

  it('assemblies are checked per part, in world coordinates', async () => {
    const r = await runAndExport({ code: ASM, fileName: 'asm.kcad.ts', format: 'step', options: { format: 'step', verify: false } });
    const q = r.geometryQuality!;
    expect(q.parts.map(p => p.part)).toEqual(['plate', 'cover']);
    expect(q.parts.find(p => p.part === 'cover')).toMatchObject({ ok: true, tinyFaces: 0 });
    expect(q.parts.find(p => p.part === 'plate')).toMatchObject({ ok: false });
    expect(q.worst.every(w => w.part === 'plate' && w.location[0] >= 100)).toBe(true);
    const tiny = r.diagnostics.find(d => d.code === 'export.geometry-quality.tiny-faces');
    expect(tiny?.message).toMatch(/plate/);
  }, 120_000);

  it("target:'part' gates each part STL; block writes nothing", async () => {
    const warn = await exportPartTool({ code: ASM, output_dir: join(dir, 'parts') });
    expect(warn.ok).toBe(true);
    expect(warn.written).toHaveLength(2);
    expect(warn.geometryQuality?.tinyFaces).toBeGreaterThan(0);
    const blocked = await runAndExportParts({ code: ASM, fileName: 'asm.kcad.ts', qualityGate: { mode: 'block' } });
    expect(blocked.parts).toEqual([]);
    expect(blocked.diagnostics.some(d => d.code === 'export.geometry-quality.tiny-faces' && d.severity === 'error')).toBe(true);
  }, 120_000);

  it('CLI: --quality-gate flag parsing and exit codes', async () => {
    expect(parseQualityGateFlags({ qualityGate: 'nope' })).toMatchObject({ ok: false });
    expect(parseQualityGateFlags({ qualityGate: 'block', tinyFaceAreaMm2: 0.02 })).toEqual({ ok: true, gate: { mode: 'block', tiny_face_area_mm2: 0.02 } });
    const file = join(dir, 'sliver.kcad.ts');
    await writeFile(file, SLIVER);
    const warn = await exportScript({ file, format: 'stl', out: join(dir, 'cli.stl') });
    expect(warn.exitCode).toBe(0);
    expect(warn.geometryQuality?.ok).toBe(false);
    const block = await exportScript({ file, format: 'stl', out: join(dir, 'cli-block.stl'), qualityGate: { mode: 'block' } });
    expect(block.exitCode).toBe(1);
    expect(existsSync(join(dir, 'cli-block.stl'))).toBe(false);
  }, 120_000);

  it('skips non-solid bodies with an info diagnostic and checks each solid of a multi-solid compound', () => {
    const face = new OcctBackend(makeCompound([makePolygon([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]])]) as Shape3D);
    const twoSolids = new OcctBackend(makeCompound([makeBox([0, 0, 0], [10, 10, 10]), makeBox([20, 0, 0], [30, 10, 10])]) as Shape3D);
    try {
      const skipped = runExportQualityGate('stl', face, 'sheet', undefined);
      expect(skipped.blocked).toBe(false);
      expect(skipped.summary?.parts).toEqual([{ part: 'sheet', skipped: expect.stringMatching(/no solid/) }]);
      expect(skipped.diagnostics).toEqual([expect.objectContaining({ code: 'export.geometry-quality.skipped', severity: 'info' })]);
      const blockSkipped = runExportQualityGate('stl', face, 'sheet', { mode: 'block' });
      expect(blockSkipped.blocked).toBe(false);
      const multi = runExportQualityGate('step', twoSolids, 'pair', undefined);
      expect(multi.summary?.parts).toEqual([expect.objectContaining({ part: 'pair', ok: true, faces: 12 })]);
    } finally {
      face.dispose();
      twoSolids.dispose();
    }
  });

  it('a body over the face budget is skipped with an info diagnostic, not measured', () => {
    const solid = new OcctBackend(makeBox([0, 0, 0], [10, 10, 10]));
    try {
      const r = runExportQualityGate('stl', solid, 'big', { max_faces: 3 });
      expect(r.summary?.budget).toEqual({ maxFaces: 3, facesChecked: 0 });
      expect(r.summary?.parts).toEqual([{ part: 'big', skipped: expect.stringMatching(/face budget/) }]);
      expect(r.diagnostics[0]).toMatchObject({ code: 'export.geometry-quality.skipped', severity: 'info' });
    } finally {
      solid.dispose();
    }
  });
});
