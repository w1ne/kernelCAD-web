// tests/unit/kernel/backends/occt/export3mf.test.ts
//
// Round-trip gate for the 3MF writer. Builds a SceneBackend, walks it
// through `sceneToWorldFrameParts`, encodes via `export3mfAsync`, then
// unzips the bytes and parses `3D/3dmodel.model` to verify the OPC layout +
// per-part identity (name, color, unit, embedded source).

import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import {
  initOcct,
  OcctBackend,
} from '../../../../../src/kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import {
  export3mfAsync,
  export3mfWithReportAsync,
  ThreeMfMeshDefectError,
} from '../../../../../src/kernel/backends/occt/export3mf';
import { MESH_DEFECT_MIN_EDGES } from '../../../../../src/kernel/backends/occt/meshHeal';
import {
  notWatertightDiagnostic,
  threeMfMeshDiagnostics,
} from '../../../../../src/agent/script-runtime/exportDiagnostics';
import { Transform } from '../../../../../src/shared/runtime/se3';
import type { SceneBackend } from '../../../../../src/kernel/backends/sceneBackend';

describe('export3mfAsync', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('writes a valid OPC zip containing [Content_Types].xml, _rels/.rels, 3D/3dmodel.model', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
          color: '#ff0000',
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
    });
    const entries = unzipSync(bytes);
    expect(Object.keys(entries)).toEqual(
      expect.arrayContaining([
        '[Content_Types].xml',
        '_rels/.rels',
        '3D/3dmodel.model',
      ]),
    );
    const model = strFromU8(entries['3D/3dmodel.model']);
    expect(model).toMatch(/<model[^>]*unit="millimeter"/);
    expect(model).toMatch(/<object id="1" type="model" name="cube"/);
    // basematerials carries the part color.
    expect(model).toMatch(/displaycolor="#FF0000FF"/i);
  });

  it('emits one <object> per scene part', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'left',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
        {
          name: 'right',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.translation(20, 0, 0),
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
    });
    const entries = unzipSync(bytes);
    const model = strFromU8(entries['3D/3dmodel.model']);
    const objects = model.match(/<object\b/g) ?? [];
    expect(objects).toHaveLength(2);
  });

  it('embeds the script source under Metadata/source.kcad.ts when embedSource: true', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const sourceText = '// kernelCAD source\nreturn box(10, 10, 10);';
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
      embedSource: true,
      scriptSource: sourceText,
    });
    const entries = unzipSync(bytes);
    expect(entries['Metadata/source.kcad.ts']).toBeDefined();
    expect(strFromU8(entries['Metadata/source.kcad.ts'])).toBe(sourceText);
  });

  it('writes unit="inch" when printUnit: "in"', async () => {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
      printUnit: 'in',
    });
    const model = strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
    expect(model).toMatch(/unit="inch"/);
  });

  it('round-trips vertex + triangle counts via the unpacked model.xml', async () => {
    // A unit box meshed via meshShapeForExport: 8 corner vertices + 12
    // triangles (6 faces × 2 triangles each). The writer must emit exactly
    // those counts so the file is independently parseable.
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [
        {
          name: 'cube',
          shape: OcctBackend.box(10, 10, 10),
          worldTransform: Transform.identity(),
        },
      ],
    };
    const bytes = await export3mfAsync(sceneToWorldFrameParts(scene), {
      format: '3mf',
    });
    const model = strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
    const vertexNodes = model.match(/<vertex\b/g) ?? [];
    const triangleNodes = model.match(/<triangle\b/g) ?? [];
    expect(vertexNodes.length).toBe(8);
    expect(triangleNodes.length).toBe(12);
  });

  /** A world-frame part carrying an injected mesh (meshed-part overload). */
  function meshedPart(mesh: { vertices: number[]; triangles: number[] }) {
    const scene: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'demo',
      _kind: 'scene',
      parts: [{ name: 'cube', shape: OcctBackend.box(10, 10, 10), worldTransform: Transform.identity() }],
    };
    const [first] = sceneToWorldFrameParts(scene);
    return { ...first, mesh };
  }

  /** Closed 10 mm cube, 8 vertices / 12 triangles. */
  function cubeMesh(): { vertices: number[]; triangles: number[] } {
    return {
      vertices: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 10, 10],
      triangles: [
        0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4,
        1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
      ],
    };
  }

  /** Flat n×n quad grid: an open sheet with 4n boundary edges. */
  function sheetMesh(n: number): { vertices: number[]; triangles: number[] } {
    const vertices: number[] = [];
    const triangles: number[] = [];
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) vertices.push(x, y, 0);
    const id = (x: number, y: number) => y * (n + 1) + x;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        triangles.push(id(x, y), id(x + 1, y), id(x + 1, y + 1), id(x, y), id(x + 1, y + 1), id(x, y + 1));
      }
    }
    return { vertices, triangles };
  }

  it('writes a watertight part with no mesh warning', async () => {
    const { meshWarnings } = await export3mfWithReportAsync([meshedPart(cubeMesh())], { format: '3mf' });
    expect(meshWarnings).toEqual([]);
  });

  it('ships a mesh with a couple of open edges and reports them as a mesh warning', async () => {
    // Drop one triangle of the cube: 3 open edges, well within the budget.
    const mesh = cubeMesh();
    mesh.triangles.splice(0, 3);
    const { bytes, meshWarnings } = await export3mfWithReportAsync([meshedPart(mesh)], { format: '3mf' });
    const model = strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
    expect(model.match(/<triangle /g)?.length).toBe(11);
    expect(meshWarnings).toEqual([
      { part: 'cube', openEdges: 3, nonManifoldEdges: 0, triangles: 11, budget: MESH_DEFECT_MIN_EDGES },
    ]);
  });

  it('repairs a T-junction crack before judging the mesh', async () => {
    // Split one cube side into two triangles at a mid-edge vertex (index 8)
    // while the neighbour keeps the long edge: a T-junction crack the heal
    // pass stitches closed.
    const mesh = cubeMesh();
    mesh.vertices.push(5, 0, 0);
    // Front face triangle (0,1,5) becomes (0,8,5) + (8,1,5).
    mesh.triangles.splice(12, 3, 0, 8, 5, 8, 1, 5);
    const { meshWarnings } = await export3mfWithReportAsync([meshedPart(mesh)], { format: '3mf' });
    expect(meshWarnings).toEqual([]);
  });

  it('refuses a torn mesh past the defect budget and names the counts', async () => {
    // A 10x10 open sheet: 40 open edges > the 24-edge floor.
    const err = await export3mfAsync([meshedPart(sheetMesh(10))], { format: '3mf' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ThreeMfMeshDefectError);
    const defect = err as ThreeMfMeshDefectError;
    expect(defect.message).toMatch(/not watertight/);
    expect(defect.message).toContain("part 'cube' has 40 open and 0 non-manifold edge(s)");
    expect({ open: defect.openEdges, budget: defect.budget, triangles: defect.triangles })
      .toEqual({ open: 40, budget: MESH_DEFECT_MIN_EDGES, triangles: 200 });

    const translated = notWatertightDiagnostic(err, [], 1, 'root');
    const diag = translated?.diagnostics[0];
    expect(diag?.code).toBe('export.3mf.not-watertight');
    expect(diag?.severity).toBe('error');
    expect(diag?.message).toContain('40 open and 0 non-manifold edge(s)');
    expect(diag?.message).toContain(`at most ${MESH_DEFECT_MIN_EDGES}`);
    expect(diag?.hint).toMatch(/STEP/);
    expect(diag?.hint).toMatch(/mesh deflection/);
  });

  it('translates mesh warnings into export.3mf.not-watertight warn diagnostics', () => {
    const [diag] = threeMfMeshDiagnostics(
      [{ part: 'shell', openEdges: 2, nonManifoldEdges: 1, triangles: 900, budget: 24 }],
      'root',
    );
    expect(diag.code).toBe('export.3mf.not-watertight');
    expect(diag.severity).toBe('warn');
    expect(diag.message).toContain("part 'shell' has 2 open and 1 non-manifold edge(s)");
  });
});
