// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/meshToFeatures.ts
//
// MCP `mesh_to_features` — turn an STL / OBJ / 3MF of a mostly prismatic
// mechanical part into an editable `.kcad.ts` feature tree, and PROVE how well
// it matches: the emitted script is evaluated in-process, tessellated, and
// compared against the mesh (volume IoU + symmetric surface deviation).
//
// The deterministic pipeline lives in `src/agent/reconstruct/` (pure, no OCCT);
// this file supplies the file IO and the OCCT evaluator it is parameterised
// with, and writes `<out>.kcad.ts` plus a `<out>.ledger.json` that
// `resolve_assumptions` can confirm or override.

import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend, meshShapeForExport } from '../../../kernel/backends/occt/occtBackend';
import { detectCylindricalHoles } from '../../../kernel/backends/occt/holeDetection';
import { isSameEdge, toEdgeSegment } from '../../../kernel/backends/occt/edgeQueries';
import type { Edge, Face } from 'replicad';
import type { SharpEdge } from '../../reconstruct/blends';
import { resolveRootId } from '../../../composition/buildModel';
import { withNextActions, type CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';
import { FILE_READ_CODE, fileReadErrorMessage } from '../../../shared/diagnostics/fileReadError';
import { runMcpScript } from '../runMcpScript';
import { detectMeshFormat, MeshParseError, parseMeshBytes, type MeshFormat } from '../../reconstruct/meshIO';
import {
  reconstructFromSoup,
  type ReconstructEvaluator,
  type ReconstructResult,
} from '../../reconstruct/reconstruct';

export interface MeshToFeaturesInput {
  /** Path to a .stl, .obj or .3mf file. One of file / data is required. */
  file?: string;
  /** Inline mesh bytes, base64 — for hosted servers that cannot see local files. */
  data?: string;
  /** Format override; default from the file extension or content. */
  format?: MeshFormat;
  /** Write the script here (and the ledger to the sibling `.ledger.json`). */
  out?: string;
  /** Minimum volume IoU for a `faithful` verdict (default 0.98). */
  minIoU?: number;
  /** Maximum surface deviation in mm for `faithful` (default max(0.25, 0.1 % of the bbox diagonal)). */
  maxDeviationMm?: number;
  /** Refinement passes, 1–4 (default 4). */
  maxPasses?: number;
  /** Vertex weld distance in mm (default max(1e-4, 1e-6 × diagonal)). */
  weldToleranceMm?: number;
  /** Refuse meshes above this triangle count (default 300000) instead of stalling. */
  maxTriangles?: number;
}

/** Surface deviation is point-to-triangle per sample, so cost grows with the
 *  triangle count; past this budget the call fails fast with a decimation hint. */
export const DEFAULT_MAX_MESH_TRIANGLES = 300_000;

export type MeshToFeaturesOutput = ReconstructResult & { written?: { script: string; ledger: string } };

function fail(error: string, errorCode: CompilerDiagnostic['code']): MeshToFeaturesOutput {
  return {
    ok: false,
    error,
    errorCode,
    diagnostics: withNextActions([
      {
        target: 'export-occt',
        code: errorCode,
        severity: 'error',
        message: error,
        hint:
          errorCode === FILE_READ_CODE
            ? 'Check the mesh path, or pass the file inline as base64 `data` when the server cannot see your filesystem.'
            : 'Pass a readable .stl (binary or ASCII), .obj or .3mf mesh via `file` or base64 `data`.',
        nextAction: NEXT_ACTIONS[errorCode],
      },
    ]),
  };
}

type V3 = [number, number, number];

/** Every edge of the evaluated shape with normals of its two faces sampled
 *  along it — the geometry blend detection measures a mesh against. Seam
 *  edges (one face on both sides) come back with no samples. */
function sharpEdgesOf(shape: OcctBackend): SharpEdge[] {
  const rs = shape.getReplicadShape() as unknown as { edges: Edge[]; faces: Face[] };
  const faces = rs.faces;
  const faceEdges = faces.map((f) => (f as unknown as { edges: Edge[] }).edges);
  const out: SharpEdge[] = [];
  rs.edges.forEach((edge, index) => {
    const seg = toEdgeSegment(edge, index, rs);
    const adjacent = faces.filter((_, fi) => faceEdges[fi].some((fe) => isSameEdge(fe, edge)));
    const sp = edge.startPoint;
    const ep = edge.endPoint;
    const samples: SharpEdge['samples'] = [];
    if (adjacent.length >= 2) {
      const n = seg.curveType === 'LINE' ? 9 : 65;
      for (let k = 0; k < n; k++) {
        try {
          const p = edge.pointAt(k / (n - 1));
          const a = adjacent[0].normalAt(p);
          const b = adjacent[1].normalAt(p);
          const la = Math.hypot(a.x, a.y, a.z) || 1;
          const lb = Math.hypot(b.x, b.y, b.z) || 1;
          samples.push({
            p: [p.x, p.y, p.z],
            nA: [a.x / la, a.y / la, a.z / la],
            nB: [b.x / lb, b.y / lb, b.z / lb],
          });
        } catch {
          // A sample on a periodic face's seam can make normalAt throw; the
          // neighbouring samples still describe the edge.
        }
      }
    }
    out.push({
      curveType: seg.curveType,
      start: [sp.x, sp.y, sp.z] as V3,
      end: [ep.x, ep.y, ep.z] as V3,
      kernelConvex: seg.convex,
      kernelDihedralDeg: seg.dihedralAngleDeg,
      samples: samples.length >= 2 ? samples : [],
    });
  });
  return out;
}

/** Evaluate a reconstruction script and tessellate it with the STL exporter's mesher. */
export const occtReconstructionEvaluator: ReconstructEvaluator = async (script, opts) => {
  const s = await runMcpScript({ code: script });
  if (!s.ok) return { ok: false, error: s.error, ...(s.errorCode ? { errorCode: s.errorCode } : {}) };
  const engine = new RecomputeEngine(createOcctLowerer(s.run.session));
  const r = await engine.run(s.run.records, { paramTable: s.run.paramTable });
  const fatal = r.diagnostics.find((d) => d.severity === 'error');
  if (fatal) return { ok: false, error: `${fatal.code}: ${fatal.message}`, errorCode: fatal.code };
  const tail = s.run.records.length > 0 ? s.run.records[s.run.records.length - 1].id : undefined;
  const rootId = resolveRootId(s.run.returnValue, tail);
  const shape = rootId !== undefined ? r.shapes.get(rootId) : undefined;
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'the reconstruction script did not return a solid Shape.', errorCode: 'export.no-shape' };
  }
  const mesh = meshShapeForExport(shape.getReplicadShape());
  let holes: Array<{ diameterMm: number; depthMm: number; kind: 'blind' | 'through' }> | undefined;
  if (opts?.withHoles) {
    try {
      holes = detectCylindricalHoles(shape).map((h) => ({
        diameterMm: Math.round(h.diameterMm * 1000) / 1000,
        depthMm: Math.round(h.depthMm * 1000) / 1000,
        kind: h.kind,
      }));
    } catch {
      holes = undefined;
    }
  }
  let edges: SharpEdge[] | undefined;
  if (opts?.withEdges) {
    try {
      edges = sharpEdgesOf(shape);
    } catch {
      edges = undefined;
    }
  }
  return {
    ok: true,
    mesh: { positions: mesh.vertices, indices: mesh.triangles },
    ...(holes ? { holes } : {}),
    ...(edges ? { edges } : {}),
  };
};

export async function meshToFeaturesTool(input: MeshToFeaturesInput): Promise<MeshToFeaturesOutput> {
  if ((input.file === undefined) === (input.data === undefined)) {
    return fail('mesh_to_features: pass exactly one of { file } (a mesh path) or { data } (base64 mesh bytes).', 'cli.invalid-args');
  }
  let bytes: Uint8Array;
  let name: string | undefined;
  if (input.file !== undefined) {
    try {
      bytes = new Uint8Array(await readFile(resolve(input.file)));
      name = basename(input.file);
    } catch (e) {
      return fail(fileReadErrorMessage(e), FILE_READ_CODE);
    }
  } else {
    bytes = new Uint8Array(Buffer.from(input.data!, 'base64'));
  }
  let soup;
  try {
    const format = input.format ?? detectMeshFormat(name, bytes);
    soup = parseMeshBytes(bytes, format);
  } catch (e) {
    if (e instanceof MeshParseError) return fail(`mesh_to_features: ${e.message}`, 'cli.invalid-args');
    throw e;
  }
  const budget = input.maxTriangles ?? DEFAULT_MAX_MESH_TRIANGLES;
  const triangles = soup.positions.length / 9;
  if (triangles > budget) {
    return fail(
      `mesh_to_features: the mesh has ${triangles} triangles, over the ${budget} budget. Decimate it (a prismatic part rarely needs more than a few tens of thousands) or raise maxTriangles.`,
      'cli.invalid-args',
    );
  }
  const result = await reconstructFromSoup(soup, occtReconstructionEvaluator, {
    sourceName: name ?? `inline ${soup.format.toUpperCase()} data`,
    minIoU: input.minIoU,
    maxDeviationMm: input.maxDeviationMm,
    maxPasses: input.maxPasses,
    weldToleranceMm: input.weldToleranceMm,
  });
  if (!result.ok) return { ...result, diagnostics: withNextActions(result.diagnostics) };
  const out: MeshToFeaturesOutput = { ...result, diagnostics: withNextActions(result.diagnostics) };
  if (input.out !== undefined) {
    const scriptPath = resolve(input.out);
    const ledgerPath = scriptPath.replace(/(\.kcad)?\.ts$/, '') + '.ledger.json';
    try {
      await writeFile(scriptPath, result.script, 'utf8');
      await writeFile(ledgerPath, JSON.stringify(result.ledger, null, 2) + '\n', 'utf8');
    } catch (e) {
      return fail(`mesh_to_features: could not write ${scriptPath}: ${e instanceof Error ? e.message : String(e)}`, 'cli.file-write');
    }
    out.written = { script: scriptPath, ledger: ledgerPath };
  }
  return out;
}
