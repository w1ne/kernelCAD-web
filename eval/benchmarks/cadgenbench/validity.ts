// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/validity.ts
//
// Local validity pre-check for a candidate STEP, run before the harness
// accepts an output. It mirrors the three checks of the benchmark's
// validity gate (docs/metrics/cad_validity.md in the benchmark repo):
//
//   1. well-formed BREP   — BRepCheck_Analyzer.IsValid() over the whole shape
//   2. watertight         — every shell is closed: each non-degenerate edge is
//                           used exactly twice, once per orientation (a seam
//                           edge is used twice by its one face, which also
//                           counts as closed)
//   3. closed manifold    — the export-grade tessellation has every edge in
//                           exactly two triangles, traversed in opposite
//                           directions
//
// This is a pre-check, not the grader: the tessellation here is kernelCAD's
// export mesher, not the grader's. The authoritative gate is the benchmark's
// own `analyze_step`, which the harness runs as `--official-check`
// (officialGate.py) when a Python env with the benchmark package is present.

import { readFile } from 'node:fs/promises';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshShapeForExport, type ExportMeshDeflection } from '../../../src/kernel/backends/occt/backendMesh';
import { verifyWatertight, type EditableMesh } from '../../../src/kernel/backends/occt/meshHeal';
import { describeOcctThrow } from '../../../src/kernel/backends/occt/occtException';

export interface StepValidity {
  valid: boolean;
  solidCount: number;
  shellCount: number;
  faceCount: number;
  /** BRepCheck_Analyzer verdict. */
  brepValid: boolean;
  /** Every shell closed with consistent edge orientation. */
  watertight: boolean;
  /** Export tessellation is a closed, orientation-consistent 2-manifold. */
  meshManifold: boolean;
  triangleCount: number;
  /** Human-readable reasons, empty when valid. Fed verbatim into repair prompts. */
  errors: string[];
}

/**
 * Mesh-level manifold check: every undirected edge in exactly two triangles
 * (via the export verifier) and every directed edge at most once, i.e. the
 * two triangles on an edge traverse it in opposite directions.
 */
export function meshManifoldErrors(mesh: EditableMesh): string[] {
  const errors: string[] = [];
  const report = verifyWatertight(mesh);
  if (!report.ok) {
    const at = report.clusters
      .slice(0, 3)
      .map((c) => `(${c.center.map((v) => v.toFixed(1)).join(', ')})`)
      .join(', ');
    errors.push(`mesh not closed: ${report.openEdgeCount} edge(s) not shared by exactly two triangles, near ${at}`);
  }
  const directed = new Set<string>();
  let flipped = 0;
  const t = mesh.triangles;
  for (let i = 0; i + 2 < t.length; i += 3) {
    for (const [u, v] of [[t[i], t[i + 1]], [t[i + 1], t[i + 2]], [t[i + 2], t[i]]]) {
      const key = `${u}>${v}`;
      if (directed.has(key)) flipped++;
      else directed.add(key);
    }
  }
  if (flipped > 0) {
    errors.push(`mesh orientation inconsistent: ${flipped} edge(s) traversed in the same direction by both triangles`);
  }
  return errors;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT wasm bindings are untyped */

/** Count shells whose edges are not each used exactly twice with opposite orientation. */
function openShellCount(oc: any, wrapped: any): { shells: number; open: number } {
  const TopAbs = oc.TopAbs_ShapeEnum;
  let shells = 0;
  let open = 0;
  const shellExp = new oc.TopExp_Explorer_2(wrapped, TopAbs.TopAbs_SHELL, TopAbs.TopAbs_SHAPE);
  try {
    while (shellExp.More()) {
      shells++;
      const shell = shellExp.Current();
      // Edge uses bucketed by OCCT hash, disambiguated with IsSame. The
      // explorer composes orientation down from the shell, so a correctly
      // oriented closed shell uses each edge once FORWARD and once REVERSED.
      const buckets = new Map<number, Array<{ edge: any; fwd: number; rev: number }>>();
      const edgeExp = new oc.TopExp_Explorer_2(shell, TopAbs.TopAbs_EDGE, TopAbs.TopAbs_SHAPE);
      try {
        while (edgeExp.More()) {
          const edge = oc.TopoDS.Edge_1(edgeExp.Current());
          if (!oc.BRep_Tool.Degenerated(edge)) {
            const h = edge.HashCode(2147483647) as number;
            const list = buckets.get(h) ?? [];
            let entry = list.find((e) => e.edge.IsSame(edge));
            if (!entry) {
              entry = { edge, fwd: 0, rev: 0 };
              list.push(entry);
              buckets.set(h, list);
            }
            if (edge.Orientation_1() === oc.TopAbs_Orientation.TopAbs_REVERSED) entry.rev++;
            else entry.fwd++;
          }
          edgeExp.Next();
        }
      } finally {
        edgeExp.delete();
      }
      let closed = true;
      for (const list of buckets.values()) {
        for (const e of list) if (e.fwd !== 1 || e.rev !== 1) closed = false;
      }
      if (!closed) open++;
      shellExp.Next();
    }
  } finally {
    shellExp.delete();
  }
  return { shells, open };
}

function countSubShapes(oc: any, wrapped: any, kind: string): number {
  const exp = new oc.TopExp_Explorer_2(wrapped, oc.TopAbs_ShapeEnum[kind], oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let n = 0;
  try {
    while (exp.More()) {
      n++;
      exp.Next();
    }
  } finally {
    exp.delete();
  }
  return n;
}

/**
 * The grader's tessellation policy: absolute chord deflection of 0.1 % of the
 * bbox diagonal clamped to [0.005, 0.5] mm, 0.5 rad angular. Matching it keeps
 * the mesh check at the grader's resolution (and fast) instead of the much
 * finer export default.
 */
export function deflectionForDiagonal(diagonalMm: number): number {
  return Math.min(0.5, Math.max(0.005, 0.001 * diagonalMm));
}

function gateDeflection(shape: replicad.Shape3D): ExportMeshDeflection {
  const [[x0, y0, z0], [x1, y1, z1]] = shape.boundingBox.bounds;
  const diagonal = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  return { linear: deflectionForDiagonal(diagonal), relative: false, angularRad: 0.5 };
}

// OCCT runs in one wasm instance per process; checks run one at a time so a
// concurrent task pool cannot interleave two imports on the shared heap.
let queue: Promise<unknown> = Promise.resolve();
export function withOcctLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

/** Run the validity pre-check on a STEP file. Never throws; a load failure is an invalid result. */
export function checkStepValidity(path: string): Promise<StepValidity> {
  return withOcctLock(async () => {
    const result: StepValidity = {
      valid: false,
      solidCount: 0,
      shellCount: 0,
      faceCount: 0,
      brepValid: false,
      watertight: false,
      meshManifold: false,
      triangleCount: 0,
      errors: [],
    };
    let shape: replicad.AnyShape | undefined;
    try {
      await initOcct();
      const bytes = await readFile(path);
      shape = await replicad.importSTEP(new Blob([new Uint8Array(bytes)]));
      const oc = getOC() as any;
      const wrapped = (shape as any).wrapped;

      result.solidCount = countSubShapes(oc, wrapped, 'TopAbs_SOLID');
      result.faceCount = countSubShapes(oc, wrapped, 'TopAbs_FACE');
      if (result.solidCount === 0) result.errors.push('no solid body in the STEP (only shells, faces or wires)');

      const analyzer = new oc.BRepCheck_Analyzer(wrapped, true, false);
      result.brepValid = analyzer.IsValid_2() as boolean;
      analyzer.delete();
      if (!result.brepValid) {
        result.errors.push('BRepCheck_Analyzer reports topology errors (self-intersecting wire, edge off its surface, or similar)');
      }

      const shells = openShellCount(oc, wrapped);
      result.shellCount = shells.shells;
      result.watertight = shells.shells > 0 && shells.open === 0 && result.brepValid;
      if (shells.shells === 0) result.errors.push('no shell in the STEP');
      if (shells.open > 0) {
        result.errors.push(`BREP not watertight: ${shells.open} of ${shells.shells} shell(s) open (naked or badly oriented edges)`);
      }

      if (typeof (shape as { meshShape?: unknown }).meshShape === 'function') {
        const mesh = meshShapeForExport(shape as replicad.Shape3D, gateDeflection(shape as replicad.Shape3D));
        result.triangleCount = mesh.triangles.length / 3;
        const meshErrors = result.triangleCount === 0 ? ['tessellation produced no triangles'] : meshManifoldErrors(mesh);
        result.meshManifold = meshErrors.length === 0;
        result.errors.push(...meshErrors);
      } else {
        result.errors.push('STEP did not import as a 3D shape');
      }
    } catch (e) {
      result.errors.push(`STEP load failed: ${describeOcctThrow(e)}`);
    } finally {
      try {
        (shape as { delete?: () => void } | undefined)?.delete?.();
      } catch {
        // already freed
      }
    }
    result.valid = result.errors.length === 0 && result.brepValid && result.watertight && result.meshManifold;
    return result;
  });
}
