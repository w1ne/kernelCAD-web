// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/runFea.ts
//
// The linear-static FEA runner: built shape + study declaration -> evidence.
//
// Pipeline, one stage per external dependency, each with its own wall-clock
// budget so no agent session can be wedged by a runaway solve:
//
//   OCCT shape -> BREP -> gmsh (quadratic tets, per-surface node sets,
//   element quality) -> CalculiX .inp -> ccx -> .frd/.dat -> summary
//
// Every failure mode that could be mistaken for a pass is an explicit error:
// a missing toolchain, an unresolved fixed face, an unresolved load face, an
// empty node set. A structural gate that cannot run must say so, never return
// "no problems found".

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import { describeAllFaces, labelSurfaces, nodesForFaces, resolveSelector } from './faceBinding';
import { parseDat } from './datParser';
import { resolveFeaMaterial } from './feaMaterials';
import { parseFrd } from './frdParser';
import { LOW_QUALITY_SICN, meshStep } from './gmshDriver';
import { writeInp } from './inpWriter';
import { resolveStudyParams } from './studyParams';
import { detectFeaToolchain, runBounded, type FeaToolchain } from './toolchain';
import type { ParamTable } from '../../shared/runtime/paramTable';
import type {
  FeaFieldResult,
  FeaHotSpot,
  FeaJobSpec,
  FeaMesh,
  FeaResolvedLoad,
  FeaSummary,
  FeaSurface,
  FeaTrust,
} from './types';

/** Default budgets. Both are wall-clock kills, not soft warnings. */
export const DEFAULT_MESH_TIMEOUT_MS = 120_000;
export const DEFAULT_SOLVE_TIMEOUT_MS = 300_000;
/** Hard ceiling on mesh size — a deck past this is a workstation job, not an
 *  in-loop agent check, and the study should be coarsened instead. */
export const MAX_ELEMENTS = 400_000;
/** Above this nodal stress-error estimate the stress field is mesh-limited. */
export const STRESS_ERROR_WARN_PERCENT = 25;

export interface RunFeaOptions {
  /** Directory the .inp / .frd / mesh.json land in. Kept on success so an
   *  agent (or a human) can re-run the solve by hand. */
  outDir: string;
  meshTimeoutMs?: number;
  solveTimeoutMs?: number;
  /** Pre-probed toolchain; omit to probe. */
  toolchain?: FeaToolchain;
  /** Working directory for toolchain discovery (repo-local venv lookup). */
  cwd?: string;
  /** The model's param table, so `param()` references inside the study
   *  declaration resolve to their CURRENT values rather than the values they
   *  happened to hold at capture. */
  paramTable?: ParamTable;
}

export interface RunFeaResult {
  ok: boolean;
  summary?: FeaSummary;
  diagnostics: CompilerDiagnostic[];
  /** Absolute paths of the solver artifacts, for reproduction. */
  artifacts: { geometryPath?: string; inpPath?: string; frdPath?: string; meshPath?: string };
  /** Mesh + solved fields, for callers that render the field (the heatmap
   *  builder). Present only on a completed solve. */
  raw?: { mesh: FeaMesh; fields: FeaFieldResult };
}

function diag(
  code: DiagnosticCode,
  severity: CompilerDiagnostic['severity'],
  message: string,
  featureId?: string,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code,
    severity,
    message,
    hint: HINT_TEMPLATES[code].template,
    ...(featureId !== undefined ? { featureId } : {}),
  };
}

/** Bounding-box diagonal of the mesh, used to scale match tolerances and to
 *  derive a default element size. */
function boundsOf(shape: OcctBackend): { min: [number, number, number]; max: [number, number, number] } {
  const bb = shape.boundingBox();
  return { min: [bb.min[0], bb.min[1], bb.min[2]], max: [bb.max[0], bb.max[1], bb.max[2]] };
}

/** Default element size: a twentieth of the bounding-box diagonal. Coarse
 *  enough to solve in seconds, fine enough that the displacement field (which
 *  converges far faster than stress) is already accurate; the trust flags say
 *  when the stress field needs a finer run. */
export function defaultMeshSize(min: readonly number[], max: readonly number[]): number {
  const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  return Math.max(diagonal / 20, 1e-3);
}

/**
 * Decide whether the stress field deserves belief, and say why not when it
 * does not.
 *
 * Three signals, chosen so the flag keeps its meaning instead of firing on
 * every real part:
 *   - INVERTED elements (minSICN <= 0) invalidate the stiffness matrix
 *     outright, so they always break trust.
 *   - A single sliver does NOT. Every filleted part meshes with a few
 *     degenerate tets at tangency lines; that is reported in `quality` for
 *     inspection but only breaks trust once poor elements exceed 1% of the
 *     mesh, where they can plausibly govern.
 *   - CalculiX's own nodal stress-error estimate is the signal that actually
 *     tracks stress convergence, so a high peak breaks trust regardless of
 *     element shape.
 */
function trustFrom(
  quality: { minSICN: number; lowQualityCount: number },
  elementCount: number,
  maxErrorPercent: number | undefined,
): FeaTrust {
  const reasons: string[] = [];
  if (quality.minSICN <= 0) {
    reasons.push(`mesh contains inverted or degenerate elements (minSICN ${quality.minSICN.toFixed(3)})`);
  }
  if (quality.lowQualityCount > elementCount * 0.01) {
    reasons.push(
      `${quality.lowQualityCount} of ${elementCount} elements (${((quality.lowQualityCount / elementCount) * 100).toFixed(1)}%) are below the minSICN ${LOW_QUALITY_SICN} quality floor`,
    );
  }
  if (maxErrorPercent !== undefined && maxErrorPercent > STRESS_ERROR_WARN_PERCENT) {
    reasons.push(
      `the solver's own nodal stress-error estimate peaks at ${maxErrorPercent.toFixed(1)}% (above ${STRESS_ERROR_WARN_PERCENT}%), so the peak stress is mesh-limited`,
    );
  }
  return { meshTrusted: reasons.length === 0, reasons };
}

/** Nearest labelled surface for a node, by membership first and proximity
 *  second — a mid-volume peak still gets attributed to the surface it is
 *  under, which is what an agent needs in order to act. */
function regionForNode(
  nodeId: number,
  at: readonly [number, number, number],
  surfaces: readonly FeaSurface[],
): string {
  for (const s of surfaces) {
    if (s.nodes.includes(nodeId)) return s.ref ?? `surface#${s.tag}`;
  }
  let best: FeaSurface | undefined;
  let bestD = Infinity;
  for (const s of surfaces) {
    const d = Math.hypot(s.centroid[0] - at[0], s.centroid[1] - at[1], s.centroid[2] - at[2]);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best !== undefined ? (best.ref ?? `surface#${best.tag}`) : 'interior';
}

interface FeaRunContext {
  shape: OcctBackend;
  study: FeaStudyMetadata;
  owner: string;
  records: readonly FeatureRecord[] | undefined;
  opts: RunFeaOptions;
  diagnostics: CompilerDiagnostic[];
  artifacts: RunFeaResult['artifacts'];
}

type ResolvedFeaMaterial = Extract<ReturnType<typeof resolveFeaMaterial>, { ok: true }>;

/** Material resolution + toolchain probe, before any file work. Pushes the
 *  failing diagnostic and returns undefined when either cannot proceed. */
async function resolveStudyInputs(
  ctx: FeaRunContext,
): Promise<{ material: ResolvedFeaMaterial; toolchain: FeaToolchain } | undefined> {
  const { study, owner, opts, diagnostics } = ctx;
  const material = resolveFeaMaterial(study.material);
  if (!material.ok) {
    diagnostics.push(diag('feature.invalid-args', 'error', material.message, owner));
    return undefined;
  }

  const toolchain = opts.toolchain ?? (await detectFeaToolchain(opts.cwd));
  if (!toolchain.ok) {
    diagnostics.push(
      diag(
        'fea.solver.unavailable',
        'error',
        `feaStudy '${study.name}' could not run: missing ${toolchain.missing.join(' and ')}. No structural evidence was produced — this is not a pass.`,
        owner,
      ),
    );
    return undefined;
  }
  return { material, toolchain };
}

/** BREP handoff + face-selector resolution. Returns undefined after pushing
 *  the failing diagnostic. */
async function writeBrepAndResolveFaces(
  ctx: FeaRunContext,
  jobDir: string,
): Promise<{
  brepPath: string;
  fixedFaces: ReturnType<typeof resolveSelector>;
  loadFaces: Array<{ name: string; force: readonly [number, number, number]; faces: ReturnType<typeof resolveSelector>['faces'] }>;
} | undefined> {
  const { shape, study, owner, records, diagnostics, artifacts } = ctx;
  // 1. Geometry handoff as OCCT-native BREP. gmsh's geometry kernel IS OCC,
  //    so BREP crosses over with exact surfaces and topology and no schema
  //    translation — and, unlike the STEP writer, it prints no translator
  //    banner to stdout, which would corrupt `evaluate --json` output and the
  //    MCP stdio channel. A mesh handoff would discard the faces the study's
  //    selectors name.
  const brepPath = join(jobDir, 'part.brep');
  await writeFile(brepPath, shape.exportBREP());
  artifacts.geometryPath = brepPath;

  // 2. Face resolution, BEFORE meshing, so an unresolvable selector fails
  //    fast rather than after a two-minute mesh.
  const fixedFaces = resolveSelector(shape, study.fixed, { owner, ...(records ? { records } : {}) });
  if (!fixedFaces.ok) {
    diagnostics.push(
      diag('fea.study.fixed-unresolved', 'error', `feaStudy '${study.name}': ${fixedFaces.error}`, owner),
    );
    return undefined;
  }
  const loadFaces: Array<{ name: string; force: readonly [number, number, number]; faces: ReturnType<typeof resolveSelector>['faces'] }> = [];
  for (const load of study.loads) {
    const r = resolveSelector(shape, load.faces, { owner, ...(records ? { records } : {}) });
    if (!r.ok) {
      diagnostics.push(
        diag('fea.study.load-unresolved', 'error', `feaStudy '${study.name}', load '${load.name}': ${r.error}`, owner),
      );
      return undefined;
    }
    loadFaces.push({ name: load.name, force: load.force, faces: r.faces });
  }
  return { brepPath, fixedFaces, loadFaces };
}

/** Mesh the BREP, enforce the element ceiling, and bind fixed/load faces to
 *  meshed surfaces. Returns undefined after pushing the failing diagnostic. */
async function meshAndBindFaces(
  ctx: FeaRunContext,
  toolchain: FeaToolchain,
  jobDir: string,
  resolved: {
    brepPath: string;
    fixedFaces: ReturnType<typeof resolveSelector>;
    loadFaces: Array<{ name: string; force: readonly [number, number, number]; faces: ReturnType<typeof resolveSelector>['faces'] }>;
  },
): Promise<{
  meshed: Awaited<ReturnType<typeof meshStep>>;
  labelled: ReturnType<typeof labelSurfaces>;
  fixedBind: ReturnType<typeof nodesForFaces>;
  loads: FeaResolvedLoad[];
  meshSize: number;
} | undefined> {
  const { shape, study, owner, opts, diagnostics, artifacts } = ctx;
  const { brepPath, fixedFaces, loadFaces } = resolved;

  // 3. Mesh.
  const { min, max } = boundsOf(shape);
  const scaleMm = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const meshSize = study.meshSize ?? defaultMeshSize(min, max);
  let meshed;
  try {
    meshed = await meshStep({
      python: toolchain.python!,
      geometryPath: brepPath,
      jobDir,
      meshSize,
      timeoutMs: opts.meshTimeoutMs ?? DEFAULT_MESH_TIMEOUT_MS,
    });
  } catch (e) {
    diagnostics.push(
      diag('fea.mesh.quality-low', 'error', `feaStudy '${study.name}': ${(e as Error).message}`, owner),
    );
    return undefined;
  }
  artifacts.meshPath = join(jobDir, 'mesh.json');
  if (meshed.mesh.elements.length > MAX_ELEMENTS) {
    diagnostics.push(
      diag(
        'fea.mesh.quality-low',
        'error',
        `feaStudy '${study.name}': the mesh has ${meshed.mesh.elements.length} elements, past the ${MAX_ELEMENTS}-element in-loop ceiling. Raise meshSize (currently ${meshSize.toFixed(3)} mm).`,
        owner,
      ),
    );
    return undefined;
  }

  // 4. Bind the resolved faces to meshed surfaces.
  const allFaces = describeAllFaces(shape, owner);
  const labelled = labelSurfaces(meshed.mesh.surfaces, allFaces, scaleMm);
  const fixedBind = nodesForFaces(labelled, fixedFaces.faces, scaleMm);
  if (fixedBind.nodes.length === 0) {
    diagnostics.push(
      diag(
        'fea.study.fixed-unresolved',
        'error',
        `feaStudy '${study.name}': the fixed face(s) ${fixedFaces.faces.map(f => f.ref).join(', ')} matched no meshed surface, so the part would be unconstrained.`,
        owner,
      ),
    );
    return undefined;
  }
  const loads: FeaResolvedLoad[] = [];
  for (const [i, l] of loadFaces.entries()) {
    const bind = nodesForFaces(labelled, l.faces, scaleMm);
    if (bind.nodes.length === 0) {
      diagnostics.push(
        diag(
          'fea.study.load-unresolved',
          'error',
          `feaStudy '${study.name}', load '${l.name}': face(s) ${l.faces.map(f => f.ref).join(', ')} matched no meshed surface, so the force would be applied to no node.`,
          owner,
        ),
      );
      return undefined;
    }
    loads.push({ name: l.name, force: l.force, set: { name: `NLOAD${i}`, nodes: bind.nodes } });
  }

  return { meshed, labelled, fixedBind, loads, meshSize };
}

/** Write the CalculiX deck and run the bounded solve. Returns undefined after
 *  pushing the failing diagnostic. */
async function solveFeaDeck(
  ctx: FeaRunContext,
  toolchain: FeaToolchain,
  jobDir: string,
  meshed: Awaited<ReturnType<typeof meshStep>>,
  material: ResolvedFeaMaterial,
  fixedBind: ReturnType<typeof nodesForFaces>,
  loads: readonly FeaResolvedLoad[],
): Promise<{ solveMs: number; frdPath: string } | undefined> {
  const { study, owner, opts, diagnostics, artifacts } = ctx;
  // 5. Deck + solve.
  const job: FeaJobSpec = {
    mesh: meshed.mesh,
    material: material.props,
    fixed: { name: 'NFIXED', nodes: fixedBind.nodes },
    loads,
  };
  const inpPath = join(jobDir, 'job.inp');
  await writeFile(inpPath, writeInp(job), 'utf8');
  artifacts.inpPath = inpPath;

  const solveStarted = Date.now();
  const run = await runBounded(toolchain.ccx!, ['job'], {
    cwd: jobDir,
    timeoutMs: opts.solveTimeoutMs ?? DEFAULT_SOLVE_TIMEOUT_MS,
  });
  const solveMs = Date.now() - solveStarted;
  const frdPath = join(jobDir, 'job.frd');
  if (run.timedOut) {
    diagnostics.push(
      diag(
        'fea.mesh.quality-low',
        'error',
        `feaStudy '${study.name}': CalculiX exceeded its ${opts.solveTimeoutMs ?? DEFAULT_SOLVE_TIMEOUT_MS} ms budget on a ${meshed.mesh.elements.length}-element mesh. Raise meshSize.`,
        owner,
      ),
    );
    return undefined;
  }
  if (!existsSync(frdPath)) {
    diagnostics.push(
      diag(
        'fea.solver.unavailable',
        'error',
        `feaStudy '${study.name}': CalculiX produced no result file (exit ${run.code}). Solver output: ${run.out.trim().split('\n').slice(-5).join(' | ')}`,
        owner,
      ),
    );
    return undefined;
  }
  artifacts.frdPath = frdPath;
  return { solveMs, frdPath };
}

/** Read the .frd fields and the optional .dat reaction table back. */
async function readFeaFields(
  jobDir: string,
  frdPath: string,
): Promise<{ fields: ReturnType<typeof parseFrd>; dat: ReturnType<typeof parseDat> }> {
  // 6. Read the fields back.
  const fields = parseFrd(await readFile(frdPath, 'utf8'));
  const datPath = join(jobDir, 'job.dat');
  const dat = existsSync(datPath) ? parseDat(await readFile(datPath, 'utf8')) : {};
  return { fields, dat };
}

interface FeaSummaryComputation {
  summary: FeaSummary;
  trust: FeaTrust;
  maxVm: number;
  maxDisp: number;
  minSafetyFactor: number;
  yieldMPa: number;
  hotSpots: FeaHotSpot[];
}

/** Global + per-region peaks, equilibrium residual and trust flags, folded
 *  into the summary object. No I/O and no diagnostics. */
function computeFeaSummary(
  ctx: FeaRunContext,
  material: ResolvedFeaMaterial,
  meshed: Awaited<ReturnType<typeof meshStep>>,
  labelled: ReturnType<typeof labelSurfaces>,
  fields: ReturnType<typeof parseFrd>,
  dat: ReturnType<typeof parseDat>,
  loads: readonly FeaResolvedLoad[],
  meshSize: number,
  solveMs: number,
): FeaSummaryComputation {
  const { study } = ctx;
  let maxVm = 0;
  let maxVmNode = fields.nodeIds[0] ?? 0;
  let maxDisp = 0;
  let maxDispNode = fields.nodeIds[0] ?? 0;
  for (let i = 0; i < fields.nodeIds.length; i++) {
    if (fields.vonMises[i] > maxVm) { maxVm = fields.vonMises[i]; maxVmNode = fields.nodeIds[i]; }
    const d = Math.hypot(...fields.displacement[i]);
    if (d > maxDisp) { maxDisp = d; maxDispNode = fields.nodeIds[i]; }
  }
  const coordOf = (id: number): [number, number, number] => {
    const c = meshed.mesh.nodes.get(id);
    return c !== undefined ? [c[0], c[1], c[2]] : [0, 0, 0];
  };

  // Per-region peaks. A single global maximum hides the case where the
  // declared load face is fine and an unrelated fillet is the real problem.
  const perRegion = new Map<string, { vm: number; node: number }>();
  for (let i = 0; i < fields.nodeIds.length; i++) {
    const id = fields.nodeIds[i];
    const region = regionForNode(id, coordOf(id), labelled);
    const prev = perRegion.get(region);
    if (prev === undefined || fields.vonMises[i] > prev.vm) {
      perRegion.set(region, { vm: fields.vonMises[i], node: id });
    }
  }
  const yieldMPa = material.props.yield;
  const hotSpots: FeaHotSpot[] = [...perRegion.entries()]
    .map(([region, v]) => ({
      region,
      maxVonMisesMPa: v.vm,
      nodeId: v.node,
      at: coordOf(v.node),
      safetyFactor: v.vm > 0 ? yieldMPa / v.vm : Infinity,
    }))
    .sort((a, b) => b.maxVonMisesMPa - a.maxVonMisesMPa)
    .slice(0, 5);

  const applied: [number, number, number] = [0, 0, 0];
  for (const l of loads) for (let k = 0; k < 3; k++) applied[k] += l.force[k];
  const appliedMag = Math.hypot(...applied);
  const reaction = dat.totalReactionForce;
  const equilibriumResidual =
    reaction !== undefined && appliedMag > 0
      ? Math.hypot(reaction[0] + applied[0], reaction[1] + applied[1], reaction[2] + applied[2]) / appliedMag
      : undefined;

  const maxErr = fields.stressErrorPercent.length > 0 ? Math.max(...fields.stressErrorPercent) : undefined;
  const trust = trustFrom(meshed.mesh.quality, meshed.mesh.elements.length, maxErr);
  const minSafetyFactor = maxVm > 0 ? yieldMPa / maxVm : Infinity;

  const summary: FeaSummary = {
    study: study.name,
    material: { name: material.name, ...material.props },
    maxVonMisesMPa: maxVm,
    maxVonMisesAt: coordOf(maxVmNode),
    maxDisplacementMm: maxDisp,
    maxDisplacementAt: coordOf(maxDispNode),
    minSafetyFactor,
    ...(study.minSafetyFactor !== undefined ? { minSafetyFactorRequired: study.minSafetyFactor } : {}),
    nodeCount: meshed.mesh.nodes.size,
    elementCount: meshed.mesh.elements.length,
    meshSizeMm: meshSize,
    quality: meshed.mesh.quality,
    ...(maxErr !== undefined ? { maxStressErrorPercent: maxErr } : {}),
    trust,
    hotSpots,
    appliedForceN: applied,
    ...(reaction !== undefined ? { reactionForceN: [reaction[0], reaction[1], reaction[2]] } : {}),
    ...(equilibriumResidual !== undefined ? { equilibriumResidual } : {}),
    solveMs,
    meshMs: meshed.meshMs,
  };

  return { summary, trust, maxVm, maxDisp, minSafetyFactor, yieldMPa, hotSpots };
}

/** Push the mesh-trust warning and the declared safety-factor error, in the
 *  same order as the original single-pass flow. */
function appendFeaSummaryDiagnostics(
  ctx: FeaRunContext,
  material: ResolvedFeaMaterial,
  computed: FeaSummaryComputation,
): void {
  const { study, owner, diagnostics } = ctx;
  const { trust, maxVm, maxDisp, minSafetyFactor, yieldMPa, hotSpots } = computed;
  if (!trust.meshTrusted) {
    diagnostics.push(
      diag(
        'fea.mesh.quality-low',
        'warn',
        `feaStudy '${study.name}': ${trust.reasons.join('; ')}. Displacement (${maxDisp.toFixed(4)} mm) is far less mesh-sensitive than the reported peak stress (${maxVm.toFixed(1)} MPa).`,
        owner,
      ),
    );
  }
  if (study.minSafetyFactor !== undefined && minSafetyFactor < study.minSafetyFactor) {
    const worst = hotSpots[0];
    diagnostics.push(
      diag(
        'fea.safety-factor.below-min',
        'error',
        `feaStudy '${study.name}': minimum safety factor ${minSafetyFactor.toFixed(2)} is below the declared ${study.minSafetyFactor} ` +
          `(peak von Mises ${maxVm.toFixed(1)} MPa vs ${yieldMPa} MPa yield for ${material.name}` +
          (worst !== undefined ? `, governing region ${worst.region}` : '') +
          `). Max displacement ${maxDisp.toFixed(4)} mm.`,
        owner,
      ),
    );
  }
}

/**
 * Run one declared study against a built shape.
 *
 * `shape` must already be lowered (the caller owns building the model);
 * `study` is the normalized record metadata; `owner` is the feature id the
 * study is bound to, used for `@kc[...]` ref formatting and diagnostics.
 */
export async function runFeaStudy(
  shape: OcctBackend,
  declared: FeaStudyMetadata,
  owner: string,
  records: readonly FeatureRecord[] | undefined,
  opts: RunFeaOptions,
): Promise<RunFeaResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const artifacts: RunFeaResult['artifacts'] = {};
  // Selectors, forces and meshSize stay symbolic on the record so the study
  // tracks its params; they become numbers here, once, for this run.
  const study =
    opts.paramTable !== undefined ? resolveStudyParams(declared, opts.paramTable) : declared;

  const ctx: FeaRunContext = { shape, study, owner, records, opts, diagnostics, artifacts };

  const inputs = await resolveStudyInputs(ctx);
  if (inputs === undefined) {
    return { ok: false, diagnostics: withNextActions(diagnostics), artifacts };
  }
  const { material, toolchain } = inputs;

  await mkdir(opts.outDir, { recursive: true });
  const jobDir = join(opts.outDir, 'solver');
  await mkdir(jobDir, { recursive: true });

  const resolved = await writeBrepAndResolveFaces(ctx, jobDir);
  if (resolved === undefined) {
    return { ok: false, diagnostics: withNextActions(diagnostics), artifacts };
  }

  const meshedPhase = await meshAndBindFaces(ctx, toolchain, jobDir, resolved);
  if (meshedPhase === undefined) {
    return { ok: false, diagnostics: withNextActions(diagnostics), artifacts };
  }
  const { meshed, labelled, fixedBind, loads, meshSize } = meshedPhase;

  const solved = await solveFeaDeck(ctx, toolchain, jobDir, meshed, material, fixedBind, loads);
  if (solved === undefined) {
    return { ok: false, diagnostics: withNextActions(diagnostics), artifacts };
  }
  const { solveMs, frdPath } = solved;

  const { fields, dat } = await readFeaFields(jobDir, frdPath);
  const computed = computeFeaSummary(ctx, material, meshed, labelled, fields, dat, loads, meshSize, solveMs);
  appendFeaSummaryDiagnostics(ctx, material, computed);

  await writeFile(join(opts.outDir, 'fea-summary.json'), JSON.stringify(computed.summary, null, 2), 'utf8');
  return {
    ok: !diagnostics.some(d => d.severity === 'error'),
    summary: computed.summary,
    diagnostics: withNextActions(diagnostics),
    artifacts,
    raw: { mesh: { ...meshed.mesh, surfaces: labelled }, fields },
  };
}

/** Remove a job directory. Used by callers that only wanted the numbers. */
export async function cleanupJobDir(outDir: string): Promise<void> {
  await rm(outDir, { recursive: true, force: true });
}
