// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/oracle/museScorer.ts
//
// Node oracle that pushes a kernelCAD script through the MUSE text-to-CAD
// benchmark's own scoring stages (arXiv:2605.28579,
// https://github.com/dong7313/muse).
//
// Two-step pipeline:
//   1. `kernelcad export step <script> -o <runDir>/muse/sample.step`
//   2. `<muse venv python> museScorerWrapper.py --step ... --workdir ...`
//
// The wrapper writes a CadQuery shim that imports the STEP and runs MUSE's
// published stage functions on it (sandbox execution, OCCT validity where
// the external validator module is available, component-overlap check,
// VTK 3D render for the VLM-judge stage). All thresholds are MUSE's own.
//
// If the kernelCAD STEP export fails we still run the wrapper: the shim
// then raises inside MUSE's sandbox and the sample is recorded as a
// Stage 1 failure — exactly how the benchmark counts a candidate script
// that doesn't execute. No silent drops.
//
// Env overrides:
//   KERNELCAD_BIN — path to the kernelCAD CLI (defaults to ./dist/cli/index.js if present, else `kernelcad`).
//   MUSE_ROOT     — path to the MUSE benchmark checkout (default /home/andrii/projects/muse).
//   MUSE_PYTHON   — python interpreter with MUSE + cadquery + vtk installed
//                   (default <MUSE_ROOT>/.venv/bin/python).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_BUILD = './dist/cli/index.js';
const DEFAULT_MUSE_ROOT = '/home/andrii/projects/muse';
const __dirname = dirname(fileURLToPath(import.meta.url));
const WRAPPER_PY = resolve(__dirname, 'museScorerWrapper.py');

export interface MuseInterpenetration {
  interpenetration_free: boolean | null;
  n_solids?: number;
  max_overlap_ratio?: number;
  interpenetrating_pairs?: number;
  pairs_checked?: number;
  note?: string;
  error?: string;
}

export interface MuseScoreResult {
  /** Stage 1 — MUSE sandbox executed the submission shim cleanly. */
  sandboxOk: boolean;
  /** Stage 2 — MUSE component-overlap check passed (null = not reached/unavailable). */
  overlapFree: boolean | null;
  /** One-line summary for harness logs. */
  reason: string;

  stepPath: string;
  stepExists: boolean;
  shimCodePath: string;
  sandboxError: string;
  resultSolidCount: number;
  bbox: [number, number, number];

  /** MUSE's external validator module availability (OCCT validity stage). */
  validatorAvailable: boolean;
  /** Raw GeometryMetrics dict from MUSE's evaluate_geometry, when available. */
  geometry: Record<string, unknown> | null;
  geometryNote: string;

  interpenetration: MuseInterpenetration | null;

  renderOk: boolean;
  renderPngPath: string;
  renderMeshPath: string;
  renderStepPath: string;
  renderError: string;

  errors: string[];
  exportMs: number;
  scoreMs: number;
}

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function getKernelcadBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    if (override.endsWith('.js')) return { cmd: 'node', baseArgs: [override] };
    return { cmd: override, baseArgs: [] };
  }
  if (existsSync(LOCAL_BUILD)) return { cmd: 'node', baseArgs: [LOCAL_BUILD] };
  return { cmd: 'kernelcad', baseArgs: [] };
}

function runOnce(cmd: string, args: string[]): Promise<RunResult> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', rejectP);
    child.on('close', (code) => resolveP({ code: code ?? -1, stdout, stderr }));
  });
}

function emptyResult(stepPath: string): MuseScoreResult {
  return {
    sandboxOk: false,
    overlapFree: null,
    reason: '',
    stepPath,
    stepExists: false,
    shimCodePath: '',
    sandboxError: '',
    resultSolidCount: 0,
    bbox: [0, 0, 0],
    validatorAvailable: false,
    geometry: null,
    geometryNote: '',
    interpenetration: null,
    renderOk: false,
    renderPngPath: '',
    renderMeshPath: '',
    renderStepPath: '',
    renderError: '',
    errors: [],
    exportMs: 0,
    scoreMs: 0,
  };
}

/**
 * Pure helper: shape the wrapper's JSON payload into a MuseScoreResult.
 * Exported for unit tests.
 */
export function parseMuseWrapperPayload(
  parsed: Record<string, unknown>,
  stepPath: string,
  exportMs: number,
  scoreMs: number,
  exportErrors: string[],
): MuseScoreResult {
  const result = emptyResult(stepPath);
  result.exportMs = exportMs;
  result.scoreMs = scoreMs;
  result.errors = [...exportErrors];

  if (typeof parsed.infra_error === 'string') {
    result.reason = `muse wrapper infra error: ${parsed.infra_error}`;
    result.errors.push(parsed.infra_error);
    return result;
  }

  result.sandboxOk = parsed.sandbox_ok === true;
  result.sandboxError = String(parsed.sandbox_error ?? '');
  result.stepExists = parsed.step_exists === true;
  result.shimCodePath = String(parsed.shim_code_path ?? '');
  result.resultSolidCount = Number(parsed.result_solid_count ?? 0);
  if (Array.isArray(parsed.bbox) && parsed.bbox.length === 3) {
    result.bbox = [Number(parsed.bbox[0]), Number(parsed.bbox[1]), Number(parsed.bbox[2])];
  }
  result.validatorAvailable = parsed.validator_available === true;
  result.geometry = (parsed.geometry ?? null) as Record<string, unknown> | null;
  result.geometryNote = String(parsed.geometry_note ?? '');
  result.interpenetration = (parsed.interpenetration ?? null) as MuseInterpenetration | null;
  result.overlapFree =
    result.interpenetration === null
      ? null
      : result.interpenetration.interpenetration_free === null
        ? null
        : result.interpenetration.interpenetration_free === true;
  result.renderOk = parsed.render_ok === true;
  result.renderPngPath = String(parsed.render_png_path ?? '');
  result.renderMeshPath = String(parsed.render_mesh_path ?? '');
  result.renderStepPath = String(parsed.render_step_path ?? '');
  result.renderError = String(parsed.render_error ?? '');

  const stages: string[] = [];
  stages.push(`sandbox=${result.sandboxOk ? 'pass' : 'FAIL'}`);
  if (result.validatorAvailable && result.geometry) {
    stages.push(`occt-validity=${result.geometry.geometry_valid === true ? 'pass' : 'FAIL'}`);
  } else {
    stages.push('occt-validity=unavailable');
  }
  if (result.overlapFree === null) {
    stages.push('overlap=not-reached');
  } else {
    stages.push(`overlap=${result.overlapFree ? 'pass' : 'FAIL'}`);
  }
  stages.push(`render=${result.renderOk ? 'ok' : 'failed'}`);
  result.reason = stages.join(', ');
  if (!result.sandboxOk && result.sandboxError) {
    result.reason += ` (${result.sandboxError.slice(0, 160)})`;
  }
  return result;
}

export async function runMuseScorer(
  scriptPath: string,
  runDir: string,
  name = 'sample',
): Promise<MuseScoreResult> {
  const museDir = join(runDir, 'muse');
  mkdirSync(museDir, { recursive: true });
  const stepPath = join(museDir, 'sample.step');

  // Step 1: kernelCAD STEP export. On failure we continue — the wrapper's
  // shim will fail inside MUSE's sandbox, which is how the benchmark
  // records a non-executing candidate.
  const { cmd: kcadCmd, baseArgs: kcadBase } = getKernelcadBin();
  const t0 = Date.now();
  const exportRun = await runOnce(kcadCmd, [...kcadBase, 'export', 'step', scriptPath, '-o', stepPath]);
  const exportMs = Date.now() - t0;
  const exportErrors: string[] = [];
  if (exportRun.code !== 0 || !existsSync(stepPath)) {
    exportErrors.push(`kernelcad export step failed (exit ${exportRun.code}): ${exportRun.stderr.trim().slice(0, 500) || '(empty stderr)'}`);
  }

  // Step 2: MUSE scoring stages via the Python wrapper.
  const museRoot = process.env.MUSE_ROOT ?? DEFAULT_MUSE_ROOT;
  const musePython = process.env.MUSE_PYTHON ?? join(museRoot, '.venv', 'bin', 'python');
  const t1 = Date.now();
  const scoreRun = await runOnce(musePython, [
    WRAPPER_PY,
    '--muse-root', museRoot,
    '--step', stepPath,
    '--workdir', museDir,
    '--name', name,
  ]);
  const scoreMs = Date.now() - t1;

  if (scoreRun.code !== 0) {
    const result = emptyResult(stepPath);
    result.exportMs = exportMs;
    result.scoreMs = scoreMs;
    result.errors = [
      ...exportErrors,
      `muse wrapper exited ${scoreRun.code} (process error, not a check failure)`,
      `stderr: ${scoreRun.stderr.trim().slice(0, 1000) || '(empty)'}`,
    ];
    result.reason = `muse wrapper process error (exit ${scoreRun.code})`;
    return result;
  }

  const lines = scoreRun.stdout.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const jsonLine = [...lines].reverse().find((l) => l.startsWith('{')) ?? '';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonLine) as Record<string, unknown>;
  } catch (err) {
    const result = emptyResult(stepPath);
    result.exportMs = exportMs;
    result.scoreMs = scoreMs;
    result.errors = [
      ...exportErrors,
      `failed to parse muse wrapper JSON: ${(err as Error).message}`,
      `raw stdout: ${scoreRun.stdout.trim().slice(0, 1000)}`,
    ];
    result.reason = 'failed to parse muse wrapper output';
    return result;
  }

  return parseMuseWrapperPayload(parsed, stepPath, exportMs, scoreMs, exportErrors);
}
