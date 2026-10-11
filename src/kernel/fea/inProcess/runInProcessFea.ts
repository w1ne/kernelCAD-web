// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/inProcess/runInProcessFea.ts
//
// The in-process linear-static solver: what a declared feaStudy runs on when
// the external CalculiX + gmsh toolchain is not installed (a hosted server, a
// fresh laptop). No binaries, no files beyond the summary JSON.
//
//   OCCT shape -> surface triangulation -> voxel grid (bricks whose centre is
//   inside) -> 8-node incompatible-mode bricks -> matrix-free PCG -> nodal
//   von Mises -> the same FeaSummary the CalculiX path returns.
//
// It is a real solve, not a closed-form guess: a prismatic cantilever matches
// beam theory to well under 1 % in deflection and bending stress. It is still
// an ESTIMATE, and says so: the voxel boundary is a staircase, so stress at
// curved faces, fillets and notches is approximate, and wall features thinner
// than two bricks are under-resolved. Every summary it produces is marked
// `solver: 'in-process-voxel'` with `trust.meshTrusted: false`, so a declared
// safety margin it meets reads as UNVERIFIED (never green) and a margin it
// violates still fails.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompilerDiagnostic, DiagnosticCode } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeaFaceSelector, FeaStudyMetadata } from '../../../shared/intent/feaStudyRecord';
import type { ParamTable } from '../../../shared/runtime/paramTable';
import type { OcctBackend } from '../../backends/occt/occtBackend';
import { describeAllFaces, resolveSelector, type FaceDescriptor } from '../faceBinding';
import { resolveFeaMaterial } from '../feaMaterials';
import { LOW_QUALITY_SICN } from '../gmshDriver';
import { resolveStudyParams } from '../studyParams';
import type { FeaHotSpot, FeaSummary } from '../types';
import { nearestFace, nodesNearFaces, triangulateFaces, type FaceTriangulation } from './faceNodes';
import { keepLargestFaceConnected, voxelize, type GridSpec } from './voxelize';
import { buildVoxelModel, solveVoxelModel, type VoxelModel, type VoxelSolveResult } from './voxelSolve';

/** Default solid-brick count when the study gives no meshSize: about 2-4 s
 *  of solve on a typical bracket. */
export const IN_PROCESS_TARGET_ELEMENTS = 6000;
/** Hard ceiling on solid bricks for one in-process solve. */
export const IN_PROCESS_MAX_ELEMENTS = 20_000;

export interface InProcessFeaOptions {
  outDir: string;
  paramTable?: ParamTable;
  /** Wall-clock budget for the CG iteration, ms. */
  solveTimeoutMs?: number;
}

export interface InProcessFeaResult {
  ok: boolean;
  summary?: FeaSummary;
  diagnostics: CompilerDiagnostic[];
  /** Always empty: there is no solver deck to keep (same shape as the
   *  CalculiX path's artifacts so callers need no branch). */
  artifacts: { geometryPath?: string; inpPath?: string; frdPath?: string; meshPath?: string };
}

function diag(code: DiagnosticCode, severity: CompilerDiagnostic['severity'], message: string, featureId: string): CompilerDiagnostic {
  return { target: 'export-occt', code, severity, message, hint: HINT_TEMPLATES[code].template, featureId };
}

/** Brick edge for this shape: the study's meshSize when given (clamped to the
 *  element ceiling), else the size that puts about IN_PROCESS_TARGET_ELEMENTS
 *  solid bricks in the part. */
export function inProcessBrickSize(
  min: readonly number[],
  max: readonly number[],
  solidVolume: number,
  meshSize: number | undefined,
): { size: number; clamped: boolean } {
  const ext = [0, 1, 2].map(a => Math.max(max[a] - min[a], 1e-6));
  const bboxVol = ext[0] * ext[1] * ext[2];
  const fill = Math.min(1, Math.max(0.02, solidVolume / bboxVol));
  const sizeFor = (count: number): number => Math.cbrt((bboxVol * fill) / count);
  const floor = sizeFor(IN_PROCESS_MAX_ELEMENTS);
  if (meshSize !== undefined) return { size: Math.max(meshSize, floor), clamped: meshSize < floor };
  // At least 2 bricks across the thinnest extent.
  return { size: Math.min(sizeFor(IN_PROCESS_TARGET_ELEMENTS), Math.min(...ext) / 2), clamped: false };
}

/** Indices (in `shape.faces` order) of the faces a study selector names. */
function faceIndicesFor(all: readonly FaceDescriptor[], picked: readonly FaceDescriptor[], scale: number): number[] {
  const tol = Math.max(1e-6, scale * 1e-7);
  return all.flatMap((f, i) =>
    picked.some(p =>
      Math.hypot(p.centroid[0] - f.centroid[0], p.centroid[1] - f.centroid[1], p.centroid[2] - f.centroid[2]) <= tol &&
      Math.abs(p.area - f.area) <= 1e-6 * Math.max(1, f.area),
    ) ? [i] : [],
  );
}

interface BoundSelector { ok: true; nodes: number[]; refs: string[] }
type BindResult = BoundSelector | { ok: false; error: string };

/** Selector -> faces -> voxel nodes. Half a brick picks the node plane a
 *  grid-aligned face sits on; a curved face that catches no node at that
 *  distance retries at a full brick diagonal. */
function bindSelector(
  ctx: { shape: OcctBackend; owner: string; records?: readonly FeatureRecord[]; all: FaceDescriptor[]; scale: number },
  model: VoxelModel,
  tri: FaceTriangulation,
  selector: FeaFaceSelector,
): BindResult {
  const r = resolveSelector(ctx.shape, selector, { owner: ctx.owner, ...(ctx.records ? { records: ctx.records } : {}) });
  if (!r.ok) return { ok: false, error: r.error ?? 'selector did not resolve' };
  const faces = faceIndicesFor(ctx.all, r.faces, ctx.scale);
  const h = model.grid.h;
  let nodes = nodesNearFaces(model, tri, faces, 0.5 * Math.min(...h) * 1.0001);
  if (nodes.length === 0) nodes = nodesNearFaces(model, tri, faces, 0.87 * Math.max(...h));
  if (nodes.length === 0) {
    return { ok: false, error: `face(s) ${r.faces.map(f => f.ref).join(', ')} are thinner than the ${Math.max(...h).toFixed(2)} mm voxel grid and caught no node` };
  }
  return { ok: true, nodes, refs: r.faces.map(f => f.ref) };
}

interface Prepared {
  model: VoxelModel;
  tri: FaceTriangulation;
  fixed: BoundSelector;
  loads: Array<{ name: string; force: readonly [number, number, number]; nodes: number[] }>;
  meshMs: number;
  volumeRatio: number;
  clamped: boolean;
  /** Bricks dropped as edge/corner-only (hinged) islands. */
  dropped: number;
  /** Every face of the shape as a named descriptor (hot-spot regions). */
  faces: FaceDescriptor[];
}

function buildGrid(shape: OcctBackend, study: FeaStudyMetadata): Omit<Prepared, 'fixed' | 'loads' | 'faces'> {
  const started = Date.now();
  const bb = shape.boundingBox();
  const solidVolume = shape.volume();
  const { size, clamped } = inProcessBrickSize(bb.min, bb.max, solidVolume, study.meshSize);
  const tri = triangulateFaces(shape, Math.max(size / 10, 1e-3));
  const spec: GridSpec = { min: [bb.min[0], bb.min[1], bb.min[2]], max: [bb.max[0], bb.max[1], bb.max[2]], size };
  const grid = voxelize(tri.soup, spec);
  const dropped = keepLargestFaceConnected(grid);
  const model = buildVoxelModel(grid);
  const brickVolume = grid.h[0] * grid.h[1] * grid.h[2];
  return {
    model,
    tri,
    meshMs: Date.now() - started,
    volumeRatio: solidVolume > 0 ? (model.elementCount * brickVolume) / solidVolume : 0,
    clamped,
    dropped,
  };
}

function prepare(
  shape: OcctBackend,
  study: FeaStudyMetadata,
  owner: string,
  records: readonly FeatureRecord[] | undefined,
  diagnostics: CompilerDiagnostic[],
): Prepared | undefined {
  const base = buildGrid(shape, study);
  if (base.model.elementCount === 0) {
    diagnostics.push(diag('fea.mesh.quality-low', 'error', `feaStudy '${study.name}': the in-process voxel grid caught no solid brick (open or non-solid shape).`, owner));
    return undefined;
  }
  const bb = shape.boundingBox();
  const scale = Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]);
  const ctx = { shape, owner, ...(records ? { records } : {}), all: describeAllFaces(shape, owner), scale };
  const fixed = bindSelector(ctx, base.model, base.tri, study.fixed);
  if (!fixed.ok) {
    diagnostics.push(diag('fea.study.fixed-unresolved', 'error', `feaStudy '${study.name}': ${fixed.error}`, owner));
    return undefined;
  }
  const loads: Prepared['loads'] = [];
  for (const load of study.loads) {
    const b = bindSelector(ctx, base.model, base.tri, load.faces);
    if (!b.ok) {
      diagnostics.push(diag('fea.study.load-unresolved', 'error', `feaStudy '${study.name}', load '${load.name}': ${b.error}`, owner));
      return undefined;
    }
    loads.push({ name: load.name, force: load.force, nodes: b.nodes });
  }
  return { ...base, fixed, loads, faces: ctx.all };
}

/** Total load spread evenly over each load's nodes (statically equivalent). */
function forceVector(model: VoxelModel, loads: Prepared['loads']): Float64Array {
  const f = new Float64Array(3 * model.nodeCount);
  for (const l of loads) {
    for (const n of l.nodes) for (let d = 0; d < 3; d++) f[3 * n + d] += l.force[d] / l.nodes.length;
  }
  return f;
}

/** Nodes of every brick that touches a fixed node: the clamp-edge zone whose
 *  stress is singular under a rigid support. */
function supportAdjacent(model: VoxelModel, fixed: ReadonlySet<number>): Set<number> {
  const out = new Set<number>();
  for (let e = 0; e < model.elementCount; e++) {
    const nodes = model.elemNodes.subarray(8 * e, 8 * e + 8);
    if (!nodes.some(n => fixed.has(n))) continue;
    for (const n of nodes) out.add(n);
  }
  return out;
}

const at = (model: VoxelModel, n: number): [number, number, number] =>
  [model.coords[3 * n], model.coords[3 * n + 1], model.coords[3 * n + 2]];

/** Per-region peaks (region = nearest face), top 5, from the 200 most
 *  stressed governing nodes. */
function hotSpots(
  prep: Prepared,
  vm: Float64Array,
  include: (n: number) => boolean,
  refs: readonly FaceDescriptor[],
  yieldMPa: number,
): FeaHotSpot[] {
  const order = Array.from({ length: prep.model.nodeCount }, (_, i) => i)
    .filter(include)
    .sort((a, b) => vm[b] - vm[a])
    .slice(0, 200);
  const perRegion = new Map<string, number>();
  for (const n of order) {
    const fi = nearestFace(prep.tri, at(prep.model, n));
    const region = refs[fi]?.ref ?? 'interior';
    if (!perRegion.has(region)) perRegion.set(region, n);
  }
  return [...perRegion.entries()].slice(0, 5).map(([region, n]) => ({
    region,
    maxVonMisesMPa: vm[n],
    nodeId: n,
    at: at(prep.model, n),
    safetyFactor: vm[n] > 0 ? yieldMPa / vm[n] : Infinity,
  }));
}

function peaks(model: VoxelModel, solved: VoxelSolveResult, include: (n: number) => boolean) {
  let vmNode = 0, dNode = 0, vmMax = 0, dMax = 0;
  for (let n = 0; n < model.nodeCount; n++) {
    const d = Math.hypot(solved.u[3 * n], solved.u[3 * n + 1], solved.u[3 * n + 2]);
    if (d > dMax) { dMax = d; dNode = n; }
    if (include(n) && solved.vonMises[n] > vmMax) { vmMax = solved.vonMises[n]; vmNode = n; }
  }
  return { vmMax, vmNode, dMax, dNode };
}

function trustReasons(prep: Prepared): string[] {
  const h = prep.model.grid.h.map(v => v.toFixed(2)).join(' x ');
  const reasons = [
    `solved in-process on a ${prep.model.elementCount}-brick voxel mesh (${h} mm bricks) because the CalculiX + gmsh toolchain is not installed here: ` +
      'the boundary is a staircase, so stress at curved faces, fillets and notches is approximate (displacement and bending stress of prismatic sections are accurate)',
  ];
  if (Math.abs(prep.volumeRatio - 1) > 0.1) {
    reasons.push(`the voxel model holds ${(prep.volumeRatio * 100).toFixed(0)}% of the solid's volume, so features thinner than about two bricks are under-resolved (pass a smaller mesh_size)`);
  }
  if (prep.dropped > 0) {
    reasons.push(`${prep.dropped} voxel brick(s) joined to the part only along an edge or corner were dropped (they would hinge); thin curved walls need a smaller mesh_size`);
  }
  if (prep.clamped) reasons.push(`the requested mesh size was coarsened to stay under ${IN_PROCESS_MAX_ELEMENTS} bricks`);
  return reasons;
}

function summarize(
  study: FeaStudyMetadata,
  material: Extract<ReturnType<typeof resolveFeaMaterial>, { ok: true }>,
  prep: Prepared,
  solved: VoxelSolveResult,
): FeaSummary {
  const { model } = prep;
  const fixedSet = new Set(prep.fixed.nodes);
  const zone = supportAdjacent(model, fixedSet);
  const awayFromSupports = zone.size <= model.nodeCount * 0.5;
  const include = awayFromSupports ? (n: number) => !zone.has(n) : () => true;
  const { vmMax, vmNode, dMax, dNode } = peaks(model, solved, include);
  const raw = peaks(model, solved, () => true);
  const yieldMPa = material.props.yield;
  const applied: [number, number, number] = [0, 0, 0];
  for (const l of prep.loads) for (let d = 0; d < 3; d++) applied[d] += l.force[d];
  const appliedMag = Math.hypot(...applied);
  return {
    study: study.name,
    solver: 'in-process-voxel',
    material: { name: material.name, ...material.props },
    maxVonMisesMPa: vmMax,
    maxVonMisesAt: at(model, vmNode),
    maxDisplacementMm: dMax,
    maxDisplacementAt: at(model, dNode),
    minSafetyFactor: vmMax > 0 ? yieldMPa / vmMax : Infinity,
    ...(study.minSafetyFactor !== undefined ? { minSafetyFactorRequired: study.minSafetyFactor } : {}),
    nodeCount: model.nodeCount,
    elementCount: model.elementCount,
    meshSizeMm: Math.max(...model.grid.h),
    quality: { minSICN: 1, meanSICN: 1, lowQualityCount: 0, lowQualityThreshold: LOW_QUALITY_SICN },
    trust: { meshTrusted: false, reasons: trustReasons(prep) },
    hotSpots: hotSpots(prep, solved.vonMises, include, prep.faces, yieldMPa),
    ...(awayFromSupports && raw.vmMax > vmMax
      ? { governingField: 'away-from-supports' as const, supportAdjacentNodeCount: zone.size, peakAtSupportMPa: raw.vmMax, peakAtSupportAt: at(model, raw.vmNode) }
      : {}),
    appliedForceN: applied,
    reactionForceN: solved.reaction,
    ...(appliedMag > 0
      ? { equilibriumResidual: Math.hypot(solved.reaction[0] + applied[0], solved.reaction[1] + applied[1], solved.reaction[2] + applied[2]) / appliedMag }
      : {}),
    solveMs: solved.solveMs,
    meshMs: prep.meshMs,
  };
}

function verdictDiagnostics(study: FeaStudyMetadata, summary: FeaSummary, owner: string): CompilerDiagnostic[] {
  const out = [
    diag(
      'fea.mesh.quality-low',
      'warn',
      `feaStudy '${study.name}': ${summary.trust.reasons.join('; ')}. Peak von Mises ${summary.maxVonMisesMPa.toFixed(1)} MPa, ` +
        `max displacement ${summary.maxDisplacementMm.toFixed(4)} mm. For a verified result install CalculiX + gmsh (see fea_summary) and re-run.`,
      owner,
    ),
  ];
  if (study.minSafetyFactor !== undefined && summary.minSafetyFactor < study.minSafetyFactor) {
    const worst = summary.hotSpots[0];
    out.push(diag(
      'fea.safety-factor.below-min',
      'error',
      `feaStudy '${study.name}': minimum safety factor ${summary.minSafetyFactor.toFixed(2)} is below the declared ${study.minSafetyFactor} ` +
        `(peak von Mises ${summary.maxVonMisesMPa.toFixed(1)} MPa vs ${summary.material.yield} MPa yield for ${summary.material.name}` +
        (worst !== undefined ? `, governing region ${worst.region}` : '') + `; in-process voxel estimate).`,
      owner,
    ));
  }
  return out;
}

/**
 * Solve one declared study in-process. Same contract as `runFeaStudy`:
 * `ok` is false on an unresolved selector, a solve that did not converge, or
 * a violated `minSafetyFactor`; the summary is written to
 * `<outDir>/fea-summary.json` so `fea_summary` can read it back.
 */
export async function runInProcessFeaStudy(
  shape: OcctBackend,
  declared: FeaStudyMetadata,
  owner: string,
  records: readonly FeatureRecord[] | undefined,
  opts: InProcessFeaOptions,
): Promise<InProcessFeaResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const study = opts.paramTable !== undefined ? resolveStudyParams(declared, opts.paramTable) : declared;
  const material = resolveFeaMaterial(study.material);
  if (!material.ok) {
    diagnostics.push(diag('feature.invalid-args', 'error', material.message, owner));
    return { ok: false, diagnostics: withNextActions(diagnostics), artifacts: {} };
  }
  const prep = prepare(shape, study, owner, records, diagnostics);
  if (prep === undefined) return { ok: false, diagnostics: withNextActions(diagnostics), artifacts: {} };

  const solved = solveVoxelModel({
    model: prep.model,
    E: material.props.E,
    nu: material.props.nu,
    fixedNodes: new Set(prep.fixed.nodes),
    force: forceVector(prep.model, prep.loads),
    ...(opts.solveTimeoutMs !== undefined ? { timeoutMs: opts.solveTimeoutMs } : {}),
  });
  if (!solved.converged) {
    diagnostics.push(diag(
      'fea.mesh.too-large',
      'error',
      `feaStudy '${study.name}': the in-process solver did not converge on ${prep.model.elementCount} bricks ` +
        `(${solved.iterations} iterations, residual ${solved.relResidual.toExponential(2)}). Raise meshSize, or check that the fixed faces actually hold the part.`,
      owner,
    ));
    return { ok: false, diagnostics: withNextActions(diagnostics), artifacts: {} };
  }
  const summary = summarize(study, material, prep, solved);
  diagnostics.push(...verdictDiagnostics(study, summary, owner));
  await mkdir(opts.outDir, { recursive: true });
  await writeFile(join(opts.outDir, 'fea-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  return {
    ok: !diagnostics.some(d => d.severity === 'error'),
    summary,
    diagnostics: withNextActions(diagnostics),
    artifacts: {},
  };
}
