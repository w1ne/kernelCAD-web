// eval/oracle/cadQueryEvalScorer.ts
//
// Node oracle that runs cadqueryeval's Python geometry scorer on a
// kernelCAD-produced STL vs a reference STL.
//
// Two-step pipeline:
//   1. `kernelcad export stl <script> -o <runDir>/generated.stl`
//   2. `uv --project <cadqueryeval> run python <wrapper.py> --reference ... --generated ...`
//
// The wrapper emits the GeometryCheckResult dataclass as JSON; we parse
// it, add a `passed` + one-line `reason` for harness convenience, and
// return a typed object. Matches the style of interference.ts and
// render.ts in this directory (no async libraries, just node:child_process).
//
// Env overrides:
//   KERNELCAD_BIN              — path to the kernelCAD CLI (defaults to ./dist/cli/index.js if present, else `kernelcad`).
//   CADQUERYEVAL_UV_PROJECT    — path to the cadqueryeval project root (defaults to /home/andrii/projects/cadqueryeval).
//   CADQUERYEVAL_UV_BIN        — path to the `uv` binary (defaults to `uv` on PATH).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_BUILD = './dist/cli/index.js';
const DEFAULT_CADQUERYEVAL_PROJECT = '/home/andrii/projects/cadqueryeval';
const __dirname = dirname(fileURLToPath(import.meta.url));
const WRAPPER_PY = resolve(__dirname, 'cadqueryevalScorerWrapper.py');

export interface CadQueryEvalScorerOpts {
  /** Expected bounding box [L, W, H] in mm — currently forwarded to the wrapper but a no-op in the underlying scorer. */
  expectedBbox?: [number, number, number];
  /** Expected number of connected components (default 1). */
  expectedComponents?: number;
  /**
   * CADPrompt mode: use 5% of the reference bbox diagonal as the
   * chamfer/Hausdorff/bbox tolerance, rather than the cadqueryeval default
   * of 1 mm. Required for DeepCAD-normalised CADPrompt geometry whose
   * dimensions are usually < 1.0.
   */
  cadPromptMode?: boolean;
}

export interface CadQueryEvalScoreResult {
  /** True iff all six binary checks passed AND there are no errors. */
  passed: boolean;
  /** One-line human-readable summary, useful for harness debug logs. */
  reason: string;

  // Binary checks (null if not evaluated)
  is_watertight: boolean | null;
  is_single_component: boolean | null;
  bbox_accurate: boolean | null;
  volume_passed: boolean | null;
  chamfer_passed: boolean | null;
  hausdorff_passed: boolean | null;

  // Continuous metrics
  chamfer_distance: number | null;
  hausdorff_95p: number | null;
  hausdorff_99p: number | null;
  icp_fitness: number | null;
  volume_ratio: number | null;
  reference_volume: number | null;
  generated_volume: number | null;
  /**
   * Intersection-over-Ground-Truth: vol(intersection of gen+ref bboxes) /
   * vol(ref bbox). CADPrompt paper convention; not gated yet.
   */
  iogt: number | null;
  /** Reference bbox diagonal in model units (only set in cad-prompt mode). */
  reference_bbox_diagonal: number | null;
  /** Relative threshold used for chamfer/Hausdorff/bbox (only in cad-prompt mode). */
  relative_threshold: number | null;

  /** Underlying scorer errors (file-not-found, watertight failure, etc.). */
  errors: string[];
  /** Path to the generated STL produced by `kernelcad export stl`. */
  generatedStlPath: string;
  /** Path to the reference STL the scorer compared against. */
  referenceStlPath: string;
  /** Wall-clock ms spent in the kernelCAD export step. */
  exportMs: number;
  /** Wall-clock ms spent in the Python scorer step. */
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

function buildFailure(
  reason: string,
  errors: string[],
  generatedStlPath: string,
  referenceStlPath: string,
  exportMs: number,
  scoreMs: number,
): CadQueryEvalScoreResult {
  return {
    passed: false,
    reason,
    is_watertight: null,
    is_single_component: null,
    bbox_accurate: null,
    volume_passed: null,
    chamfer_passed: null,
    hausdorff_passed: null,
    chamfer_distance: null,
    hausdorff_95p: null,
    hausdorff_99p: null,
    icp_fitness: null,
    volume_ratio: null,
    reference_volume: null,
    generated_volume: null,
    iogt: null,
    reference_bbox_diagonal: null,
    relative_threshold: null,
    errors,
    generatedStlPath,
    referenceStlPath,
    exportMs,
    scoreMs,
  };
}

function summarize(
  parsed: Record<string, unknown>,
  passed: boolean,
  errors: string[],
): string {
  if (errors.length > 0) {
    return `failed: ${errors[0]}`;
  }
  const checks: Array<[string, unknown]> = [
    ['watertight', parsed.is_watertight],
    ['single-component', parsed.is_single_component],
    ['bbox', parsed.bbox_accurate],
    ['volume', parsed.volume_passed],
    ['chamfer', parsed.chamfer_passed],
    ['hausdorff', parsed.hausdorff_passed],
  ];
  const failed = checks.filter(([, v]) => v !== true).map(([k]) => k);
  if (passed) {
    return `passed all 6 checks (chamfer=${parsed.chamfer_distance ?? 'n/a'}, h95=${parsed.hausdorff_95p ?? 'n/a'})`;
  }
  return `failed checks: [${failed.join(', ')}] (chamfer=${parsed.chamfer_distance ?? 'n/a'}, h95=${parsed.hausdorff_95p ?? 'n/a'})`;
}

export async function runCadQueryEvalScorer(
  scriptPath: string,
  referenceStlPath: string,
  runDir: string,
  opts: CadQueryEvalScorerOpts = {},
): Promise<CadQueryEvalScoreResult> {
  const generatedStlPath = join(runDir, 'generated.stl');

  // Step 1: kernelCAD STL export
  const { cmd: kcadCmd, baseArgs: kcadBase } = getKernelcadBin();
  const exportArgs = [...kcadBase, 'export', 'stl', scriptPath, '-o', generatedStlPath];
  const t0 = Date.now();
  const exportRun = await runOnce(kcadCmd, exportArgs);
  const exportMs = Date.now() - t0;

  if (exportRun.code !== 0 || !existsSync(generatedStlPath)) {
    return buildFailure(
      `kernelcad export stl failed (exit ${exportRun.code})`,
      [
        `kernelcad export stderr: ${exportRun.stderr.trim() || '(empty)'}`,
        `kernelcad export stdout: ${exportRun.stdout.trim() || '(empty)'}`,
      ],
      generatedStlPath,
      referenceStlPath,
      exportMs,
      0,
    );
  }

  // Step 2: Python scorer
  const uvBin = process.env.CADQUERYEVAL_UV_BIN ?? 'uv';
  const uvProject = process.env.CADQUERYEVAL_UV_PROJECT ?? DEFAULT_CADQUERYEVAL_PROJECT;
  const pyArgs = [
    '--project', uvProject,
    'run', 'python', WRAPPER_PY,
    '--reference', referenceStlPath,
    '--generated', generatedStlPath,
  ];
  if (opts.expectedBbox) {
    pyArgs.push('--expected-bbox', opts.expectedBbox.join(','));
  }
  if (typeof opts.expectedComponents === 'number') {
    pyArgs.push('--expected-components', String(opts.expectedComponents));
  }
  if (opts.cadPromptMode) {
    pyArgs.push('--cad-prompt-mode');
  }

  const t1 = Date.now();
  const scoreRun = await runOnce(uvBin, pyArgs);
  const scoreMs = Date.now() - t1;

  if (scoreRun.code !== 0) {
    return buildFailure(
      `python scorer exited ${scoreRun.code} (process error, not a check failure)`,
      [
        `python stderr: ${scoreRun.stderr.trim() || '(empty)'}`,
        `python stdout: ${scoreRun.stdout.trim() || '(empty)'}`,
      ],
      generatedStlPath,
      referenceStlPath,
      exportMs,
      scoreMs,
    );
  }

  // The wrapper prints one JSON line on stdout. uv may print
  // resolution/activation chatter on stderr — we ignore it and parse
  // only the last non-empty stdout line as JSON.
  const lines = scoreRun.stdout.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const jsonLine = [...lines].reverse().find((l) => l.startsWith('{')) ?? '';

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonLine) as Record<string, unknown>;
  } catch (err) {
    return buildFailure(
      'failed to parse python scorer JSON output',
      [
        `parse error: ${(err as Error).message}`,
        `raw stdout: ${scoreRun.stdout.trim().slice(0, 2000)}`,
        `raw stderr: ${scoreRun.stderr.trim().slice(0, 2000)}`,
      ],
      generatedStlPath,
      referenceStlPath,
      exportMs,
      scoreMs,
    );
  }

  const errors = Array.isArray(parsed.errors) ? (parsed.errors as string[]) : [];
  const binaryChecks = [
    parsed.is_watertight,
    parsed.is_single_component,
    parsed.bbox_accurate,
    parsed.volume_passed,
    parsed.chamfer_passed,
    parsed.hausdorff_passed,
  ];
  const allBinariesPassed = binaryChecks.every((v) => v === true);
  const passed = allBinariesPassed && errors.length === 0;

  return {
    passed,
    reason: summarize(parsed, passed, errors),
    is_watertight: (parsed.is_watertight ?? null) as boolean | null,
    is_single_component: (parsed.is_single_component ?? null) as boolean | null,
    bbox_accurate: (parsed.bbox_accurate ?? null) as boolean | null,
    volume_passed: (parsed.volume_passed ?? null) as boolean | null,
    chamfer_passed: (parsed.chamfer_passed ?? null) as boolean | null,
    hausdorff_passed: (parsed.hausdorff_passed ?? null) as boolean | null,
    chamfer_distance: (parsed.chamfer_distance ?? null) as number | null,
    hausdorff_95p: (parsed.hausdorff_95p ?? null) as number | null,
    hausdorff_99p: (parsed.hausdorff_99p ?? null) as number | null,
    icp_fitness: (parsed.icp_fitness ?? null) as number | null,
    volume_ratio: (parsed.volume_ratio ?? null) as number | null,
    reference_volume: (parsed.reference_volume ?? null) as number | null,
    generated_volume: (parsed.generated_volume ?? null) as number | null,
    iogt: (parsed.iogt ?? null) as number | null,
    reference_bbox_diagonal: (parsed.reference_bbox_diagonal ?? null) as number | null,
    relative_threshold: (parsed.relative_threshold ?? null) as number | null,
    errors,
    generatedStlPath,
    referenceStlPath,
    exportMs,
    scoreMs,
  };
}
