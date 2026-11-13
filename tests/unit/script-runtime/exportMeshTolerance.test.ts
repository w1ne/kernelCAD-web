import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLValidator } from 'fast-xml-parser';
import * as replicad from 'replicad';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { loadSnippets } from '../../../src/agent/cookbook';
import { runAndExport, type ExportOptions } from '../../../src/agent/script-runtime/export';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { exportTool } from '../../../src/agent/mcp/tools/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshShapeForExport } from '../../../src/kernel/backends/occt/backendMesh';
import { measureBrepSurfaceDeviation } from '../../../src/agent/script-runtime/meshDeviation';

const FIXED_DATE = '2026-11-09T12:00:00.000Z';
const CYLINDER = 'return cylinder(20, 5);';
const TOLERANCE_CYLINDER = 'return cylinder(200, 100);';

describe('agent-controlled mesh tolerance', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('keeps default STL bytes unchanged for two small parts', async () => {
    const originalDate = Date;
    class FixedDate extends originalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length ? args : [FIXED_DATE]));
      }
      static now() { return new originalDate(FIXED_DATE).getTime(); }
    }
    globalThis.Date = FixedDate as DateConstructor;
    try {
      const hashes: string[] = [];
      for (const [name, code] of [
        ['box', 'return box(10, 10, 10);'],
        ['cylinder', CYLINDER],
      ] as const) {
        const result = await runAndExport({ code, fileName: `${name}.kcad.ts`, format: 'stl' });
        hashes.push(createHash('sha256').update(result.bytes).digest('hex'));
      }
      expect(hashes).toEqual([
        'f29ac00494098b29a05e3c97b6681474976d5dedd3d0c1e5d7949bd96616dc05',
        '1d8729a07ce252aacbb0a000812cefdefcc5c434797d1dcefe8747a6a61df530',
      ]);
    } finally {
      globalThis.Date = originalDate;
    }
  }, 60_000);

  it('meshes STL with the requested absolute tolerance and reports sampled deviation', async () => {
    const result = await runAndExport({
      code: TOLERANCE_CYLINDER,
      fileName: 'cylinder.kcad.ts',
      format: 'stl',
      options: { format: 'stl', tolerance: 0.001 } as ExportOptions,
    });
    const report = (result as typeof result & { mesh_deviation?: MeshDeviation }).mesh_deviation;
    expect(report).toMatchObject({ requested_mm: 0.001, samples: expect.any(Number), triangles: expect.any(Number) });
    expect(report!.samples).toBeGreaterThan(0);
    expect(report!.measured_p95_mm).toBeLessThanOrEqual(report!.measured_max_mm);
    expect(report!.measured_max_mm).toBeLessThanOrEqual(0.00105);
    expect(report!.triangles).toBe(new DataView(result.bytes.buffer, result.bytes.byteOffset).getUint32(80, true));
    const largeCylinderBaseline = await runAndExport({
      code: TOLERANCE_CYLINDER,
      fileName: 'cylinder.kcad.ts',
      format: 'stl',
    });
    expect(report!.triangles).toBeGreaterThan(new DataView(largeCylinderBaseline.bytes.buffer, largeCylinderBaseline.bytes.byteOffset).getUint32(80, true));
    expect(new TextDecoder().decode(result.bytes.subarray(0, 80))).toContain('requested-mesh-tolerance=0.001mm');
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  }, 60_000);

  it('measures each 3MF/OBJ part against its corresponding exported mesh', () => {
    const sourceA = replicad.makeBaseBox(2, 2, 2) as replicad.Shape3D;
    const sourceB = replicad.makeBaseBox(2, 2, 2).translate([20, 0, 0]) as replicad.Shape3D;
    // Populate source B-rep triangulations; these are the exact sampling faces.
    meshShapeForExport(sourceA);
    meshShapeForExport(sourceB);
    // Deliberately give part A a mesh 10 mm away and part B a mesh matching A.
    // A global nearest-triangle search would let B's mesh incorrectly mask A.
    const meshA = meshShapeForExport(replicad.makeBaseBox(2, 2, 2).translate([10, 0, 0]) as replicad.Shape3D);
    const meshB = meshShapeForExport(replicad.makeBaseBox(2, 2, 2) as replicad.Shape3D);
    const report = measureBrepSurfaceDeviation([sourceA, sourceB], [meshA, meshB], 0.01);
    expect(report.measured_max_mm).toBeGreaterThan(17.9);
    expect(report.triangles).toBe((meshA.triangles.length + meshB.triangles.length) / 3);
  });

  it('returns the file-level measurement in the written export receipt', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kernelcad-mesh-tolerance-receipt-'));
    const outputPath = join(dir, 'cylinder.stl');
    try {
      const result = await exportModelTool({
        code: TOLERANCE_CYLINDER,
        output_path: outputPath,
        format: 'stl',
        options: { format: 'stl', tolerance: 0.01 } as ExportOptions,
      });
      expect(result.ok).toBe(true);
      expect(result.mesh_deviation).toMatchObject({
        requested_mm: 0.01,
        triangles: expect.any(Number),
        samples: expect.any(Number),
        global_max_certified: false,
      });
      expect(existsSync(outputPath)).toBe(true);
      expect(new TextDecoder().decode(readFileSync(outputPath).subarray(0, 80)))
        .toContain('requested-mesh-tolerance=0.01mm');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('reports and enforces sampled tolerance through the public single-solid 3MF export path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kernelcad-mesh-tolerance-3mf-'));
    const outputPath = join(dir, 'sphere.3mf');
    try {
      const result = await exportTool({
        target: 'model',
        code: 'return sphere(50);',
        output_path: outputPath,
        format: '3mf',
        options: { format: '3mf', tolerance: 0.01 } as ExportOptions,
      }) as Awaited<ReturnType<typeof exportModelTool>>;
      const report = result.mesh_deviation;
      expect(report).toMatchObject({
        requested_mm: 0.01,
        measurement: 'sampled_brep_surface_to_export_triangles',
        samples: expect.any(Number),
        triangles: expect.any(Number),
        global_max_certified: false,
      });
      expect(report!.samples).toBeGreaterThan(0);
      expect(report!.measured_max_mm).toBeGreaterThan(0.0105);
      expect(result.ok).toBe(false);
      expect(result.diagnostics?.map(diagnostic => diagnostic.code)).toContain('export.mesh.tolerance-not-met');

      const model = strFromU8(unzipSync(readFileSync(outputPath))['3D/3dmodel.model']!);
      expect((model.match(/<triangle\b/g) ?? []).length).toBe(report!.triangles);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('keeps a file for inspection when sampled deviation exceeds the requested tolerance', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kernelcad-mesh-tolerance-fail-'));
    const outputPath = join(dir, 'sphere.stl');
    try {
      const result = await exportModelTool({
        code: 'return sphere(50);',
        output_path: outputPath,
        format: 'stl',
        options: { format: 'stl', tolerance: 0.01 } as ExportOptions,
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics?.map(d => d.code)).toContain('export.mesh.tolerance-not-met');
      expect(result.mesh_deviation?.measured_max_mm).toBeGreaterThan(0.0105);
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('applies the same controls to OBJ and stamps the OBJ member of the zip', async () => {
    const result = await runAndExport({
      code: TOLERANCE_CYLINDER,
      fileName: 'cylinder.kcad.ts',
      format: 'obj',
      options: { format: 'obj', tolerance: 0.01 } as ExportOptions,
    });
    const obj = strFromU8(unzipSync(result.bytes)['model.obj']!);
    const report = (result as typeof result & { mesh_deviation?: MeshDeviation }).mesh_deviation;
    expect(obj).toContain('# requested mesh tolerance 0.01 mm');
    expect(report?.requested_mm).toBe(0.01);
    expect(report?.triangles).toBeGreaterThan(0);
    expect(report?.global_max_certified).toBe(false);
  }, 60_000);

  it('rejects invalid tolerance values before writing a file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kernelcad-mesh-tolerance-'));
    try {
      for (const [i, tolerance] of [0.0005, -1, 'fine'].entries()) {
        const outputPath = join(dir, `invalid-${i}.stl`);
        const result = await exportModelTool({
          code: 'return box(10, 10, 10);',
          output_path: outputPath,
          format: 'stl',
          options: { format: 'stl', tolerance } as unknown as ExportOptions,
        });
        expect(result.ok).toBe(false);
        expect(result.diagnostics?.map(d => d.code)).toContain('export.mesh.tolerance-invalid');
        expect(existsSync(outputPath)).toBe(false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('keeps the slicer-ready 3MF package valid and stamps its requested tolerance', async () => {
    const snippet = loadSnippets().find(item => item.id === 'slicer-ready-3mf');
    expect(snippet).toBeDefined();
    const result = await runAndExport({
      code: snippet!.body,
      fileName: 'slicer-ready-3mf.kcad.ts',
      format: '3mf',
      options: {
        format: '3mf',
        tolerance: 0.01,
        arrange: 'assembled',
        printer: 'bambu-a1',
      } as ExportOptions,
    });
    const archive = unzipSync(result.bytes);
    const model = strFromU8(archive['3D/3dmodel.model']!);
    expect(XMLValidator.validate(model)).toBe(true);
    expect(model).toContain('requested mesh tolerance 0.01 mm');
    expect((model.match(/<object\b/g) ?? []).length).toBeGreaterThan(0);
    expect((result as typeof result & { mesh_deviation?: MeshDeviation }).mesh_deviation?.requested_mm).toBe(0.01);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  }, 60_000);
});

interface MeshDeviation {
  requested_mm: number;
  measured_max_mm: number;
  measured_p95_mm: number;
  samples: number;
  triangles: number;
}
