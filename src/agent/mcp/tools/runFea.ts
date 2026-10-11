// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/runFea.ts
//
// MCP `run_fea` tool — the answer to "will this part hold this load?".
//
// Takes a script that declares `shape.feaStudy({...})`, meshes the solid,
// solves a linear static step with CalculiX, and returns EVIDENCE: peak von
// Mises stress, peak displacement, minimum safety factor against the
// material's yield, mesh-trust flags, per-region hot spots, an equilibrium
// residual, and (by default) stress heatmap PNGs rendered through the same
// offline pipeline as `render_preview`.
//
// What it deliberately does not do is return a bare pass/fail. A structural
// verdict without the field it came from is un-actionable: the agent needs to
// know WHERE the part is overloaded to change the right dimension, and it
// needs the trust flags to know whether the stress number deserves belief.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { runMcpScript } from '../runMcpScript';
import type { RunScriptResult } from '../../../composition/runScript';
import {
  findFeaStudies,
  selectFeaStudy,
  type FoundFeaStudy,
} from '../../../modeling/runtime/fea/findFeaStudies';
import { buildHeatmap, type HeatmapBand } from '../../../kernel/fea/heatmap';
import type { RunFeaResult } from '../../../kernel/fea/runFea';
import { runFeaStudyRefined, type FeaSolverChoice } from '../../../kernel/fea/autoRefine';
import { detectFeaToolchain } from '../../../kernel/fea/toolchain';
import type { FeaSummary } from '../../../kernel/fea/types';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { loadMeshScene, renderMeshViews } from '../../render/meshScenesRender';
import { resolveRootId } from '../../../composition/buildModel';
import type { FeaStudyMetadata } from '../../../shared/intent/feaStudyRecord';
import { inlineFeaStudy, RUN_FEA_EXAMPLE } from './runFeaArgs';

export interface RunFeaInput {
  /** Path to a `.kcad.ts` script declaring at least one `feaStudy`. */
  file?: string;
  /** Inline kernelCAD script source. Mutually exclusive with `file`. */
  code?: string;
  /** Study name to run; defaults to the LAST declared study. An object is
   *  read as an inline study ({ material, fixed, loads, ... }). */
  study?: string | Record<string, unknown>;
  /** Directory the solver deck, result files, summary JSON and heatmap PNGs
   *  are written to. Default: a fresh temp session dir. */
  output_dir?: string;
  /** Override the study's meshSize (mm) for this run only. With refinement
   *  on, it sets the FIRST pass's element size. */
  mesh_size?: number;
  /** Automatic mesh refinement (default true): when the stress field is
   *  untrusted only because the solver's error estimate is high, re-solve
   *  once at 0.75x the element size inside the element budget, and report the
   *  finer pass with `summary.refinement`. false: one solve at mesh_size. */
  refine?: boolean;
  /** Render stress heatmap PNGs (default true). Turn off for a fast
   *  numbers-only run. */
  heatmaps?: boolean;
  /** Wall-clock budget for the meshing stage, ms. */
  mesh_timeout_ms?: number;
  /** Wall-clock budget for the solve stage, ms. */
  solve_timeout_ms?: number;
  /** 'auto' (default): CalculiX + gmsh when installed, else the in-process
   *  voxel solver. 'calculix': require the external toolchain (fails up
   *  front with `fea.solver.unavailable` when absent). 'in-process': always
   *  the in-process solver. */
  solver?: FeaSolverChoice;
  /** Inline study, for a script that declares no feaStudy (or to override
   *  it): bound to the shape the script returns. Same fields as feaStudy(). */
  material?: unknown;
  fixed?: unknown;
  loads?: unknown;
  min_safety_factor?: number;
}

export interface RunFeaOutput {
  ok: boolean;
  summary?: FeaSummary;
  /** Absolute PNG paths of the rendered stress heatmap, one per view. */
  images?: string[];
  /** Band table for the heatmap colour scale — a heatmap whose scale is
   *  unstated is decoration, not evidence. */
  legend?: Array<{ color: string; fromMPa: number; toMPa: number }>;
  out_dir?: string;
  artifacts?: { geometryPath?: string; inpPath?: string; frdPath?: string; meshPath?: string };
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
  /** Present when the external toolchain was required and is missing. */
  toolchain?: { missing: readonly string[]; hint?: string };
}

type FeaStudyResolution =
  | { ok: false; output: RunFeaOutput }
  | { ok: true; run: RunScriptResult; study: FoundFeaStudy };

/** The inline study bound to the shape the script returns. */
function inlineStudyOn(run: RunScriptResult, metadata: FeaStudyMetadata): FeaStudyResolution {
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const shapeId = resolveRootId(run.returnValue, tailId);
  if (shapeId === undefined) {
    return {
      ok: false,
      output: { ok: false, error: `run_fea: the script returns no shape to analyse. Example: ${RUN_FEA_EXAMPLE}.`, errorCode: 'export.no-shape' },
    };
  }
  return { ok: true, run, study: { recordId: '__inline__', shapeId, metadata } };
}

async function resolveFeaStudy(input: RunFeaInput): Promise<FeaStudyResolution> {
  const inline = inlineFeaStudy(input as unknown as Record<string, unknown>);
  if (inline.kind === 'error') return { ok: false, output: { ok: false, error: inline.error, errorCode: inline.errorCode } };
  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, output: script };
  const { run } = script;
  if (inline.kind === 'ok') return inlineStudyOn(run, inline.metadata);

  const studies = findFeaStudies(run.records);
  if (studies.length === 0) {
    return {
      ok: false,
      output: {
        ok: false,
        error:
          'The script declares no feaStudy. Either add shape.feaStudy({ material, fixed, loads }) to the part you want analysed, ' +
          `or pass the study on the call: ${RUN_FEA_EXAMPLE}.`,
        errorCode: 'feature.invalid-args',
      },
    };
  }
  const study = selectFeaStudy(studies, typeof input.study === 'string' ? input.study : undefined);
  if (study === undefined) {
    return {
      ok: false,
      output: {
        ok: false,
        error: `No feaStudy named '${input.study}'. Declared studies: ${studies.map(s => s.metadata.name).join(', ')}.`,
        errorCode: 'feature.invalid-args',
      },
    };
  }

  return { ok: true, run, study };
}

type LoweredStudyShape = { ok: false; output: RunFeaOutput } | { ok: true; shape: OcctBackend };

async function lowerStudyShape(
  run: RunScriptResult,
  study: FoundFeaStudy,
): Promise<LoweredStudyShape> {
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = r.shapes.get(study.shapeId);
  if (!(shape instanceof OcctBackend)) {
    const fatal = r.diagnostics.find(d => d.featureId === study.shapeId && d.severity === 'error');
    return {
      ok: false,
      output: {
        ok: false,
        error: fatal
          ? `The shape the study is bound to did not lower: ${fatal.message}`
          : `The shape the study is bound to ('${study.shapeId}') produced no lowered geometry.`,
        ...(fatal?.code !== undefined ? { errorCode: fatal.code } : {}),
      },
    };
  }

  return { ok: true, shape };
}

/** iso + front heatmap tiles drawn straight from the band meshes (no script
 *  evaluation, no STL->B-rep import). Throws with the reason on failure. */
async function renderHeatmapTiles(scriptPath: string, dir: string): Promise<string[]> {
  const scene = await loadMeshScene('heatmap', scriptPath);
  if (scene === undefined) throw new Error('the heatmap band list (render-bodies.json) is missing');
  const views = ['iso', 'front'] as const;
  const tiles = (await renderMeshViews([scene], { views, width: 768, height: 768 })).heatmap;
  await mkdir(dir, { recursive: true });
  const paths: string[] = [];
  for (const v of views) {
    const png = tiles?.[v];
    if (png === undefined) throw new Error(`the ${v} view did not render`);
    const path = join(dir, `${v}.png`);
    await writeFile(path, png);
    paths.push(path);
  }
  return paths;
}

async function renderStudyHeatmap(
  result: RunFeaResult,
  heatmaps: boolean | undefined,
  outDir: string,
  diagnostics: CompilerDiagnostic[],
): Promise<{ images: string[] | undefined; legend: HeatmapBand[] | undefined }> {
  if (result.raw === undefined || heatmaps === false) return { images: undefined, legend: undefined };
  const built = await buildHeatmap(result.raw.mesh, result.raw.fields, outDir);
  // A render failure (no chromium) must not invalidate the numbers, so it
  // degrades to "no images" as a warning, with the reason: an agent silently
  // receiving no pictures would assume the feature is missing.
  try {
    return { images: await renderHeatmapTiles(built.scriptPath, join(outDir, 'heatmap')), legend: built.bands };
  } catch (e) {
    diagnostics.push({
      target: 'export-occt',
      code: 'cli.export-exception',
      severity: 'warn',
      message: `run_fea: the stress heatmap did not render (${(e as Error).message}). The solved numbers above are unaffected.`,
      hint: 'Ensure playwright chromium is installed (npx playwright install chromium), or pass heatmaps: false to skip rendering.',
    });
    return { images: undefined, legend: built.bands };
  }
}

/**
 * `run_fea` MCP tool. Runs one declared `feaStudy` and returns the solved
 * evidence plus heatmap PNGs.
 *
 * `ok` is false when the study violated its own declared `minSafetyFactor`,
 * when a selector did not resolve, or when the solver toolchain is absent —
 * the last of which is reported as `fea.solver.unavailable` with the install
 * command, never as a silent pass.
 */
function refineOptions(input: RunFeaInput, run: RunScriptResult, outDir: string): Parameters<typeof runFeaStudyRefined>[4] {
  return {
    outDir,
    ...(input.refine === false ? { refine: false } : {}),
    ...(input.solver !== undefined ? { solver: input.solver } : {}),
    paramTable: run.session.paramTable,
    cwd: input.file !== undefined ? dirname(resolve(input.file)) : process.cwd(),
    ...(input.mesh_timeout_ms !== undefined ? { meshTimeoutMs: input.mesh_timeout_ms } : {}),
    ...(input.solve_timeout_ms !== undefined ? { solveTimeoutMs: input.solve_timeout_ms } : {}),
  };
}

/** `solver: 'calculix'` with no toolchain fails BEFORE the script runs,
 *  with the missing pieces and the install command. */
async function requireToolchain(input: RunFeaInput): Promise<RunFeaOutput | undefined> {
  if (input.solver !== 'calculix') return undefined;
  const tc = await detectFeaToolchain(input.file !== undefined ? dirname(resolve(input.file)) : process.cwd());
  if (tc.ok) return undefined;
  return {
    ok: false,
    error:
      `run_fea: solver 'calculix' needs ${tc.missing.join(' and ')}, which this machine does not have. ${tc.hint ?? ''} ` +
      "Omit `solver` (or pass 'in-process') to solve with the built-in voxel solver instead.",
    errorCode: 'fea.solver.unavailable',
    toolchain: { missing: tc.missing, ...(tc.hint !== undefined ? { hint: tc.hint } : {}) },
  };
}

function badSolverArg(solver: unknown): RunFeaOutput | undefined {
  if (solver === undefined || solver === 'auto' || solver === 'calculix' || solver === 'in-process') return undefined;
  return {
    ok: false,
    error: `run_fea: solver must be 'auto', 'calculix' or 'in-process'; got ${JSON.stringify(solver)}. Example: ${RUN_FEA_EXAMPLE}.`,
    errorCode: 'feature.invalid-args',
  };
}

export async function runFeaTool(input: RunFeaInput): Promise<RunFeaOutput> {
  const upFront = badSolverArg(input.solver) ?? (await requireToolchain(input));
  if (upFront !== undefined) return upFront;
  const resolved = await resolveFeaStudy(input);
  if (!resolved.ok) return resolved.output;
  const { run, study } = resolved;

  const lowered = await lowerStudyShape(run, study);
  if (!lowered.ok) return lowered.output;
  const { shape } = lowered;

  const outDir = input.output_dir !== undefined
    ? (isAbsolute(input.output_dir) ? input.output_dir : resolve(input.output_dir))
    : await mkdtemp(join(tmpdir(), 'kernelcad-fea-'));
  await mkdir(outDir, { recursive: true });

  const metadata = input.mesh_size !== undefined
    ? { ...study.metadata, meshSize: input.mesh_size }
    : study.metadata;

  const result = await runFeaStudyRefined(shape, metadata, study.shapeId, run.records, refineOptions(input, run, outDir));

  const diagnostics = [...result.diagnostics];
  const { images, legend } = await renderStudyHeatmap(result, input.heatmaps, outDir, diagnostics);

  return {
    ok: result.ok,
    ...(result.summary !== undefined ? { summary: result.summary } : {}),
    ...(images !== undefined ? { images } : {}),
    ...(legend !== undefined
      ? { legend: legend.map(b => ({ color: b.color, fromMPa: b.fromMPa, toMPa: b.toMPa })) }
      : {}),
    out_dir: outDir,
    artifacts: result.artifacts,
    diagnostics,
  };
}

/** Re-exported so `fea_summary` and the evaluate gate share one probe. */
export { detectFeaToolchain };
