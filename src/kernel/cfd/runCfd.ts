// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/runCfd.ts
//
// The CFD runner: model + study -> OpenFOAM case -> mesh -> solve -> evidence.
//
//   1. fluid volume + named patches from the model (fluidDomain.ts)
//   2. case spec: sizes, keep-point, BCs, Re and turbulence (caseSpec.ts)
//   3. dictionaries + multi-region STL, hashed for the job cache (job.ts)
//   4. blockMesh -> surfaceFeatureExtract -> snappyHexMesh -> checkMesh
//   5. simpleFoam (decomposePar + mpirun when cores > 1)
//   6. parse logs + function objects -> summary, verdict, diagnostics
//   7. velocity-magnitude preview of the mid-plane
//
// The result is never a bare pass: an unconverged solve is ok:false with
// its provisional numbers and `cfd.solve.not-converged`, and every summary
// carries a disclaimer that this is an engineering estimate.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { CfdStudyMetadata } from '../../shared/intent/cfdStudyRecord';
import { deriveCaseSpec, type CaseDerived } from './caseSpec';
import { buildFluidDomain, type FluidDomain } from './fluidDomain';
import { STL_NAME, writeFoamCase } from './foamDicts';
import { acquire, hashCase, joinRunning, progress, readFinished, release, RESULT_FILE, SUMMARY_FILE } from './job';
import { stlSolid } from './meshGeom';
import { parseCheckMesh, parseVtkPolyData } from './parsers';
import { renderPlanePng } from './preview';
import { assembleSummary } from './summary';
import { detectCfdToolchain, runFoam, type CfdToolchain } from './toolchain';
import type { CfdMeshReport, CfdSummary } from './types';

export { CFD_DISCLAIMER } from './summary';

/** Cache/output layout version: bump when the case or summary format changes. */
const CASE_FORMAT = 'cfd-case-v2';

export interface RunCfdOptions {
  /** Explicit run directory (the case goes in `<outDir>/case`). Default:
   *  `<tmp>/kernelcad-cfd/<hash>`, so an identical re-call finds the run. */
  outDir?: string;
  cores?: number;
  meshTimeoutMs?: number;
  solveTimeoutMs?: number;
  /** Write `foamToVTK` field output (default false). */
  exportVtk?: boolean;
  /** Render the mid-plane PNG (default true). */
  preview?: boolean;
  owner: string;
  records?: readonly FeatureRecord[];
  toolchain?: CfdToolchain;
}

export interface RunCfdResult {
  ok: boolean;
  summary?: CfdSummary;
  diagnostics: CompilerDiagnostic[];
  outDir?: string;
  artifacts: { caseDir?: string; stlPath?: string; previewPng?: string; vtkDir?: string; summaryPath?: string; logs?: string[] };
  /** Returned from a finished identical run (true) or by joining a live one ('joined'). */
  reused?: true | 'joined';
  inputHash?: string;
  toolchain?: { missing: readonly string[]; hint?: string };
}

const DEFAULT_MESH_TIMEOUT = 300_000;
const DEFAULT_SOLVE_TIMEOUT = 1_200_000;

export function maxCfdCores(): number {
  const env = Number(process.env.KERNELCAD_CFD_MAX_CORES);
  return Number.isInteger(env) && env > 0 ? env : 2;
}

function diag(code: DiagnosticCode, severity: CompilerDiagnostic['severity'], message: string, hint: string): CompilerDiagnostic {
  return { target: 'export-occt', code, severity, message, hint };
}

function fail(code: DiagnosticCode, message: string, hint: string, extra: Partial<RunCfdResult> = {}): RunCfdResult {
  return { ok: false, diagnostics: [diag(code, 'error', message, hint)], artifacts: {}, ...extra };
}

interface Prepared { domain: FluidDomain; derived: CaseDerived; files: Record<string, string>; stl: string; hash: string }

function prepare(shape: OcctBackend, meta: CfdStudyMetadata, opts: RunCfdOptions, tc: CfdToolchain): Prepared | RunCfdResult {
  // STL chordal tolerance: fine against the surface cells, capped for big parts.
  const sizeHint = typeof meta.meshSize === 'number' ? meta.meshSize : 0.5;
  const built = buildFluidDomain(shape, meta, { owner: opts.owner, ...(opts.records !== undefined ? { records: opts.records } : {}) }, Math.min(0.05, sizeHint / 10));
  if (!built.ok) {
    return fail(built.code, `run_cfd: ${built.message}`, built.code === 'cfd.domain.no-fluid'
      ? "Open the channel ends flush with the part's bounding box, or pass fluidVolume: 'solid' when the solid is the fluid."
      : 'Call inspect({ of: \'faces\' }) and pass an inlet/outlet FaceQuery that names the opening of the fluid volume.');
  }
  const cores = Math.max(1, Math.min(opts.cores ?? 1, maxCfdCores()));
  const derived = deriveCaseSpec(built.domain, meta, cores);
  if (typeof derived === 'string') return fail('cfd.mesh.failed', `run_cfd: ${derived}`, 'Lower meshSize so the narrowest channel spans several cells.');
  const files = writeFoamCase(derived.spec);
  const stl = built.domain.patches.map(p => stlSolid(p.name, p.soup, 1e-3)).join('');
  const hash = hashCase({ ...files, [`constant/triSurface/${STL_NAME}.stl`]: stl }, `${CASE_FORMAT}|${tc.mode}|${tc.image ?? tc.wrapper ?? ''}|vtk=${opts.exportVtk === true}`);
  return { domain: built.domain, derived, files, stl, hash };
}

async function writeCase(caseDir: string, p: Prepared): Promise<void> {
  await rm(caseDir, { recursive: true, force: true });
  for (const [rel, text] of Object.entries(p.files)) {
    await mkdir(join(caseDir, rel, '..'), { recursive: true });
    await writeFile(join(caseDir, rel), text, 'utf8');
  }
  await mkdir(join(caseDir, 'constant', 'triSurface'), { recursive: true });
  await writeFile(join(caseDir, 'constant', 'triSurface', `${STL_NAME}.stl`), p.stl, 'utf8');
}

const readLog = (caseDir: string, name: string): string => {
  const p = join(caseDir, `log.${name}`);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
};

const MESH_STAGES = ['blockMesh', 'surfaceFeatureExtract', 'snappyHexMesh'] as const;

/** Mesh in one container/session: the stages are cheap, the start-up is not. */
async function meshStage(tc: CfdToolchain, caseDir: string, timeoutMs: number): Promise<{ report: CfdMeshReport; ms: number } | RunCfdResult> {
  const t0 = Date.now();
  const cmd = `${MESH_STAGES.map(s => `${s}${s === 'snappyHexMesh' ? ' -overwrite' : ''} > log.${s} 2>&1`).join(' && ')} && checkMesh > log.checkMesh 2>&1; exit 0`;
  const r = await runFoam(tc, caseDir, cmd, timeoutMs);
  if (r.timedOut) return fail('cfd.solve.timeout', `run_cfd: meshing exceeded ${Math.round(timeoutMs / 1000)} s and was killed.`, 'Use a coarser meshSize or raise mesh_timeout_ms.');
  const broken = MESH_STAGES.find(s => !/^End\s*$/m.test(readLog(caseDir, s)));
  if (broken !== undefined) {
    const tail = (readLog(caseDir, broken) || r.out).trim().split('\n').slice(-6).join(' | ');
    return fail('cfd.mesh.failed', `run_cfd: ${broken} failed (log.${broken}): ${tail}`, 'Check the fluid volume is closed and lower meshSize so thin channels span several cells.');
  }
  const report = parseCheckMesh(readLog(caseDir, 'checkMesh'));
  if (report.cells === 0) return fail('cfd.mesh.failed', 'run_cfd: snappyHexMesh produced no cells.', 'Lower meshSize; the fluid region may be thinner than one cell.');
  if ((report.patchFaces.background ?? 0) > 0) {
    return fail('cfd.mesh.failed',
      `run_cfd: the fluid leaked into the background box (${report.patchFaces.background} faces on 'background'): the fluid surface is not closed at this resolution.`,
      'Lower meshSize so the inlet/outlet faces and narrow gaps are resolved, or check the fluid volume is watertight.');
  }
  return { report, ms: Date.now() - t0 };
}

async function solveStage(tc: CfdToolchain, caseDir: string, cores: number, exportVtk: boolean, timeoutMs: number): Promise<{ ms: number; timedOut: boolean }> {
  const t0 = Date.now();
  const solve = cores > 1
    ? `decomposePar -force > log.decomposePar 2>&1 && mpirun --bind-to none --mca mpi_yield_when_idle 1 -np ${cores} simpleFoam -parallel > log.simpleFoam 2>&1`
    : 'simpleFoam > log.simpleFoam 2>&1';
  const recon = cores > 1 && exportVtk ? '; reconstructPar -latestTime > log.reconstructPar 2>&1' : '';
  const vtk = exportVtk ? '; foamToVTK -latestTime -noZero > log.foamToVTK 2>&1' : '';
  const r = await runFoam(tc, caseDir, `${solve}${recon}${vtk}; exit 0`, timeoutMs, cores);
  return { ms: Date.now() - t0, timedOut: r.timedOut };
}

function latestPlane(caseDir: string): string | undefined {
  const dir = join(caseDir, 'postProcessing', 'midPlane');
  if (!existsSync(dir)) return undefined;
  const t = readdirSync(dir).sort((a, b) => Number(b) - Number(a))[0];
  const f = t !== undefined ? join(dir, t, 'plane.vtk') : undefined;
  return f !== undefined && existsSync(f) ? f : undefined;
}

async function writePreview(caseDir: string, outDir: string, s: CfdSummary, d: CaseDerived, diagnostics: CompilerDiagnostic[]): Promise<string | undefined> {
  const vtk = latestPlane(caseDir);
  if (vtk === undefined) return undefined;
  const out = join(outDir, 'velocity-midplane.png');
  const headline = s.flow === 'internal'
    ? `${s.study}: dp ${s.pressureDropPa?.toPrecision(3)} Pa, ${s.fluid.name}, Re ${s.reynolds.value.toFixed(0)}, ${s.convergence.verdict}`
    : `${s.study}: Cd ${s.forces?.cd.toPrecision(3)}, drag ${s.forces?.dragN.toPrecision(3)} N, Re ${s.reynolds.value.toFixed(0)}, ${s.convergence.verdict}`;
  try {
    await renderPlanePng(parseVtkPolyData(readFileSync(vtk, 'utf8')), { title: headline, normal: d.spec.plane.normal }, out);
    return out;
  } catch (e) {
    diagnostics.push(diag('cli.export-exception', 'warn', `run_cfd: the mid-plane preview did not render (${(e as Error).message}); the numbers are unaffected.`, 'Pass preview: false to skip it.'));
    return undefined;
  }
}

function runDirFor(opts: RunCfdOptions, hash: string): string {
  return opts.outDir ?? join(tmpdir(), 'kernelcad-cfd', hash.slice(0, 16));
}

/** Run one CFD study on a lowered shape. */
export async function runCfdStudy(shape: OcctBackend, meta: CfdStudyMetadata, opts: RunCfdOptions): Promise<RunCfdResult> {
  const tc = opts.toolchain ?? (await detectCfdToolchain());
  if (!tc.ok) {
    return fail('cfd.solver.unavailable', `run_cfd: no OpenFOAM install found (${tc.missing.join(', ')}). ${tc.hint ?? ''}`, tc.hint ?? '',
      { toolchain: { missing: tc.missing, ...(tc.hint !== undefined ? { hint: tc.hint } : {}) } });
  }
  const p = prepare(shape, meta, opts, tc);
  if ('ok' in p) return p;
  const outDir = runDirFor(opts, p.hash);
  const budget = (opts.meshTimeoutMs ?? DEFAULT_MESH_TIMEOUT) + (opts.solveTimeoutMs ?? DEFAULT_SOLVE_TIMEOUT);
  const finished = readFinished<RunCfdResult>(outDir, p.hash);
  if (finished !== undefined) return { ...finished, reused: true };
  const joined = await joinRunning<RunCfdResult>(outDir, p.hash, budget);
  if (joined !== undefined) return { ...joined, reused: 'joined' };
  await acquire(outDir, p.hash);
  try {
    return await execute(tc, p, meta, opts, outDir);
  } finally {
    await release(outDir);
  }
}

async function execute(tc: CfdToolchain, p: Prepared, meta: CfdStudyMetadata, opts: RunCfdOptions, outDir: string): Promise<RunCfdResult> {
  const caseDir = join(outDir, 'case');
  await writeCase(caseDir, p);
  await progress(outDir, 'meshing', { cells: p.derived.spec.block.cells });
  const mesh = await meshStage(tc, caseDir, opts.meshTimeoutMs ?? DEFAULT_MESH_TIMEOUT);
  if ('ok' in mesh) return { ...mesh, outDir, artifacts: { caseDir }, inputHash: p.hash };
  await progress(outDir, 'solving', { cells: mesh.report.cells, iterations: meta.iterations });
  const solve = await solveStage(tc, caseDir, p.derived.spec.cores, opts.exportVtk === true, opts.solveTimeoutMs ?? DEFAULT_SOLVE_TIMEOUT);
  if (solve.timedOut) {
    return { ...fail('cfd.solve.timeout', `run_cfd: simpleFoam exceeded ${Math.round((opts.solveTimeoutMs ?? DEFAULT_SOLVE_TIMEOUT) / 1000)} s and was killed.`, 'Use fewer iterations or a coarser meshSize, or raise solve_timeout_ms.'), outDir, artifacts: { caseDir }, inputHash: p.hash };
  }
  const { summary, diagnostics } = assembleSummary({ caseDir, derived: p.derived, meta, tc, mesh: mesh.report, meshMs: mesh.ms, solveMs: solve.ms, hash: p.hash, note: p.domain.note });
  await progress(outDir, 'post-processing');
  const previewPng = opts.preview === false ? undefined : await writePreview(caseDir, outDir, summary, p.derived, diagnostics);
  const summaryPath = join(outDir, SUMMARY_FILE);
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  const vtkDir = join(caseDir, 'VTK');
  const result: RunCfdResult = {
    ok: summary.convergence.verdict === 'converged',
    summary,
    diagnostics,
    outDir,
    artifacts: {
      caseDir, stlPath: join(caseDir, 'constant', 'triSurface', `${STL_NAME}.stl`), summaryPath,
      ...(previewPng !== undefined ? { previewPng } : {}),
      ...(opts.exportVtk === true && existsSync(vtkDir) ? { vtkDir } : {}),
      logs: ['blockMesh', 'snappyHexMesh', 'checkMesh', 'simpleFoam'].map(l => join(caseDir, `log.${l}`)),
    },
    inputHash: p.hash,
  };
  await writeFile(join(outDir, RESULT_FILE), JSON.stringify(result, null, 2), 'utf8');
  await progress(outDir, 'done', { verdict: summary.convergence.verdict });
  return result;
}
