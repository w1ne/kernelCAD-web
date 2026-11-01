// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/lattice/latticeLower.ts
//
// Lowering for the 'lattice' record: host B-rep -> tessellation -> TPMS
// lattice solid (kernel/lattice) -> SolidMeshBackend.
//
// Grading sources:
//   surface  depth below the skin (distance transform of the body)
//   holes    distance to the host's concave cylindrical faces (hole walls)
//   fea      the declared feaStudy, solved in process (voxel FEA), its nodal
//            von Mises mapped through the stress-graded infill band table
//            (fraction of yield -> infill percent -> lattice solid fraction)
// Frames: 'part' composes the rigid transforms of the record chain back to
// the root primitive, so the cells follow a rotated box or cylinder;
// 'cylindrical' wraps the cells around that frame's Z axis (or opts.axis).

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { meshShapeForExport, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { buildLatticeSolid, type LatticeBuildResult, type LatticeGrade } from '../../kernel/lattice/buildLattice';
import type { BodyMesh } from '../../kernel/lattice/bodyDistance';
import type { LatticeFrame } from '../../kernel/lattice/latticeField';
import { sheetWallForFraction } from '../../kernel/lattice/tpms';
import { classifyStress, DEFAULT_INFILL_BANDS } from '../../kernel/fea/infillBands';
import { runInProcessFeaStudy, type InProcessStressField } from '../../kernel/fea/inProcess/runInProcessFea';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { LatticeMetadata, LatticeStressBand } from '../../shared/intent/latticeRecord';
import { Transform } from '../../shared/runtime/se3';
import type { Vec3 } from '../../shared/intent/types';
import { findFeaStudies } from '../runtime/fea/findFeaStudies';

export class LatticeGradeError extends Error {}

export interface LatticeLowerInput {
  record: FeatureRecord;
  base: OcctBackend;
  records: readonly FeatureRecord[];
}

const PRIMARY_INPUTS = ['base', 'target', 'shape', 'a'] as const;

/** Rigid placement of the record chain's root primitive (its local origin
 *  and axes), composed from every record's post-hoc transforms. */
export function partFrameTransform(records: readonly FeatureRecord[], startId: string): Transform {
  const byId = new Map(records.map((r) => [r.id, r]));
  const chain: FeatureRecord[] = [];
  let cur = byId.get(startId);
  while (cur && chain.length < 10_000) {
    chain.push(cur);
    const next = PRIMARY_INPUTS.map((k) => cur!.inputs[k]).find((ref) => ref?.kind === 'feature');
    cur = next && next.kind === 'feature' ? byId.get(next.id) : undefined;
  }
  let t = Transform.identity();
  for (let i = chain.length - 1; i >= 0; i--) {
    for (const op of chain[i].transforms) {
      if (op.op === 'translate') t = Transform.translation(op.vec.x.evaluated, op.vec.y.evaluated, op.vec.z.evaluated).compose(t);
      else if (op.op === 'rotateAxis') {
        const axis: Vec3 = [op.axis.x.evaluated, op.axis.y.evaluated, op.axis.z.evaluated];
        const pivot: Vec3 = op.pivot ? [op.pivot.x.evaluated, op.pivot.y.evaluated, op.pivot.z.evaluated] : [0, 0, 0];
        t = Transform.rotationAroundPivot(axis, op.degrees.evaluated, pivot).compose(t);
      }
    }
  }
  return t;
}

function unit(v: readonly number[]): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Orthonormal frame with `z` as its third axis. */
function frameAroundAxis(z: readonly number[]): LatticeFrame['axes'] {
  const w = unit(z);
  const ref: Vec3 = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const d = ref[0] * w[0] + ref[1] * w[1] + ref[2] * w[2];
  const x = unit([ref[0] - d * w[0], ref[1] - d * w[1], ref[2] - d * w[2]]);
  const y: Vec3 = [w[1] * x[2] - w[2] * x[1], w[2] * x[0] - w[0] * x[2], w[0] * x[1] - w[1] * x[0]];
  return [x, y, w];
}

function referenceRadius(body: BodyMesh, origin: readonly number[], z: readonly number[]): number {
  let rmax = 0;
  const V = body.vertices;
  for (let i = 0; i < V.length; i += 3) {
    const dx = V[i] - origin[0], dy = V[i + 1] - origin[1], dz = V[i + 2] - origin[2];
    const along = dx * z[0] + dy * z[1] + dz * z[2];
    rmax = Math.max(rmax, Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - along * along)));
  }
  return rmax;
}

export function resolveFrame(md: LatticeMetadata, input: LatticeLowerInput, body: BodyMesh, skin: number, cell: number): LatticeFrame {
  if (md.frame === 'world') return { origin: [0, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], map: 'cartesian' };
  const baseId = input.record.inputs.base?.kind === 'feature' ? input.record.inputs.base.id : input.record.id;
  const t = partFrameTransform(input.records, baseId);
  const p0 = t.point([0, 0, 0]);
  const origin: Vec3 = [p0[0], p0[1], p0[2]];
  const axes: LatticeFrame['axes'] = [unit(t.axisDir([1, 0, 0])), unit(t.axisDir([0, 1, 0])), unit(t.axisDir([0, 0, 1]))];
  if (md.frame === 'part') return { origin, axes, map: 'cartesian' };
  const o: Vec3 = md.axis ? md.axis.origin : origin;
  const z: Vec3 = unit(md.axis ? md.axis.direction : axes[2]);
  // Cells are exactly `cell` around at mid-depth of the lattice zone.
  const r = Math.max(cell, referenceRadius(body, o, z) - skin - cell / 2);
  return { origin: o, axes: frameAroundAxis(z), map: 'cylindrical', referenceRadius: r };
}

/** Triangles of the host's concave cylindrical faces (hole walls). */
export function holeWallMesh(base: OcctBackend): BodyMesh | undefined {
  const shape = base.getReplicadShape();
  const mesh = shape.mesh({ tolerance: 0.05, angularTolerance: 0.2 });
  const faces = shape.faces;
  const byHash = new Map(faces.map((f) => [f.hashCode, f]));
  const tris: number[] = [];
  for (const g of mesh.faceGroups) {
    const face = byHash.get(g.faceId);
    if (!face || face.geomType !== 'CYLINDRE') continue;
    if (isConcave(mesh, g.start, g.count)) {
      for (let i = g.start; i < g.start + g.count; i++) tris.push(mesh.triangles[i]);
    }
  }
  return tris.length > 0 ? { vertices: mesh.vertices, triangles: tris } : undefined;
}

/** Normals converge on a hole wall: (c_i - c_mean) . n_i < 0 on average. */
function isConcave(mesh: { vertices: number[]; normals: number[]; triangles: number[] }, start: number, count: number): boolean {
  const ids = mesh.triangles.slice(start, start + count);
  const c = [0, 0, 0];
  for (const v of ids) for (let a = 0; a < 3; a++) c[a] += mesh.vertices[3 * v + a] / ids.length;
  let s = 0;
  for (const v of ids) {
    for (let a = 0; a < 3; a++) s += (mesh.vertices[3 * v + a] - c[a]) * mesh.normals[3 * v + a];
  }
  return s < 0;
}

/** Stress field -> lattice parameter per point through the band table. */
export function stressSampler(
  field: InProcessStressField, bands: readonly LatticeStressBand[], toParam: (fraction: number) => number,
): (x: number, y: number, z: number) => number {
  const { grid, coords, vonMises } = field;
  const [nx, ny, nz] = grid.n;
  const node = new Int32Array((nx + 1) * (ny + 1) * (nz + 1)).fill(-1);
  for (let n = 0; n < coords.length / 3; n++) {
    const i = Math.round((coords[3 * n] - grid.origin[0]) / grid.h[0]);
    const j = Math.round((coords[3 * n + 1] - grid.origin[1]) / grid.h[1]);
    const k = Math.round((coords[3 * n + 2] - grid.origin[2]) / grid.h[2]);
    node[i + (nx + 1) * (j + (ny + 1) * k)] = n;
  }
  const values = bands.map((b) => toParam(b.densityPercent / 100));
  return (x, y, z) => {
    const vm = interpolateNodal(node, vonMises, grid, x, y, z);
    return values[classifyStress(vm, field.yieldMPa, bands)];
  };
}

function interpolateNodal(node: Int32Array, vm: Float64Array, grid: InProcessStressField['grid'], x: number, y: number, z: number): number {
  const [nx, ny, nz] = grid.n;
  const fx = Math.min(Math.max((x - grid.origin[0]) / grid.h[0], 0), nx);
  const fy = Math.min(Math.max((y - grid.origin[1]) / grid.h[1], 0), ny);
  const fz = Math.min(Math.max((z - grid.origin[2]) / grid.h[2], 0), nz);
  const i0 = Math.min(Math.floor(fx), nx - 1), j0 = Math.min(Math.floor(fy), ny - 1), k0 = Math.min(Math.floor(fz), nz - 1);
  let sum = 0, wsum = 0;
  for (let c = 0; c < 8; c++) {
    const i = i0 + (c & 1), j = j0 + ((c >> 1) & 1), k = k0 + ((c >> 2) & 1);
    const n = node[i + (nx + 1) * (j + (ny + 1) * k)];
    if (n < 0) continue;
    const w = (c & 1 ? fx - i0 : 1 - (fx - i0)) * ((c >> 1) & 1 ? fy - j0 : 1 - (fy - j0)) * ((c >> 2) & 1 ? fz - k0 : 1 - (fz - k0));
    sum += w * vm[n]; wsum += w;
  }
  return wsum > 0 ? sum / wsum : 0;
}

async function feaGrade(input: LatticeLowerInput, md: LatticeMetadata, toParam: (f: number) => number): Promise<LatticeGrade> {
  const baseId = input.record.inputs.base?.kind === 'feature' ? input.record.inputs.base.id : '';
  const studies = findFeaStudies(input.records);
  const wanted = md.grade?.study;
  const found = wanted !== undefined
    ? studies.find((s) => s.metadata.name === wanted)
    : [...studies].reverse().find((s) => s.shapeId === baseId) ?? studies.at(-1);
  if (!found) throw new LatticeGradeError(wanted ? `no feaStudy named '${wanted}'` : 'no feaStudy is declared');
  const outDir = await mkdtemp(join(tmpdir(), 'kcad-lattice-fea-'));
  try {
    const res = await runInProcessFeaStudy(input.base, found.metadata, input.record.id, input.records, { outDir, targetElements: 4000, solveTimeoutMs: 60_000 });
    if (!res.ok || !res.field) {
      const why = res.diagnostics.find((d) => d.severity === 'error')?.message ?? 'the solve did not finish';
      throw new LatticeGradeError(`feaStudy '${found.metadata.name}' could not be solved in process: ${why}`);
    }
    const bands = md.grade?.bands ?? DEFAULT_INFILL_BANDS.map((b) => ({ ...b }));
    const sample = stressSampler(res.field, bands, toParam);
    const near = Math.min(...bands.map((b) => toParam(b.densityPercent / 100)));
    return { kind: 'sampled', near, value: sample };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

async function resolveGrade(
  input: LatticeLowerInput, md: LatticeMetadata, base: number, cell: number,
): Promise<LatticeGrade | undefined> {
  const g = md.grade;
  if (!g) return undefined;
  const sheetFromFraction = (f: number): number => sheetWallForFraction(md.type, cell, f);
  const toParam = md.variant === 'sheet' ? sheetFromFraction : (f: number): number => f;
  if (g.from === 'fea') return feaGrade(input, md, toParam);
  const near = g.near ?? base, far = g.far ?? base, over = g.over ?? 2 * cell;
  if (g.from === 'surface') return { kind: 'distance', source: 'surface', near, far, over };
  const holes = holeWallMesh(input.base);
  if (!holes) throw new LatticeGradeError('the body has no hole walls (concave cylindrical faces) to grade from');
  return { kind: 'distance', source: holes, near, far, over };
}

/** Build the lattice solid for one record. */
export async function lowerLatticeRecord(input: LatticeLowerInput): Promise<LatticeBuildResult> {
  const r = input.record;
  const md = r.metadata?.lattice as LatticeMetadata;
  const cell = r.params.cell.evaluated;
  const skin = r.params.skin.evaluated;
  const welded = meshShapeForExport(input.base.getReplicadShape());
  const body: BodyMesh = { vertices: welded.vertices, triangles: welded.triangles };
  // Sheet wall from a density request goes through the measured fraction map.
  const value = md.valueKind === 'wall'
    ? r.params.wall.evaluated
    : md.variant === 'sheet' ? sheetWallForFraction(md.type, cell, r.params.density.evaluated) : r.params.density.evaluated;
  const grade = await resolveGrade(input, md, value, cell);
  return buildLatticeSolid(body, {
    type: md.type,
    variant: md.variant,
    cell,
    value,
    skin,
    frame: resolveFrame(md, input, body, skin, cell),
    ...(grade ? { grade } : {}),
    ...(md.resolution !== undefined ? { resolution: md.resolution } : {}),
    ...(md.tolerance !== undefined ? { tolerance: md.tolerance } : {}),
  });
}
