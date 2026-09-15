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

import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { runMcpScript } from '../runMcpScript';
import {
  findFeaStudies,
  selectFeaStudy,
} from '../../../modeling/runtime/fea/findFeaStudies';
import { buildHeatmap, type HeatmapBand } from '../../../kernel/fea/heatmap';
import { runFeaStudy } from '../../../kernel/fea/runFea';
import { detectFeaToolchain } from '../../../kernel/fea/toolchain';
import type { FeaSummary } from '../../../kernel/fea/types';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { renderPreviewTool } from './renderPreview';

export interface RunFeaInput {
  /** Path to a `.kcad.ts` script declaring at least one `feaStudy`. */
  file?: string;
  /** Inline kernelCAD script source. Mutually exclusive with `file`. */
  code?: string;
  /** Study name to run; defaults to the LAST declared study. */
  study?: string;
  /** Directory the solver deck, result files, summary JSON and heatmap PNGs
   *  are written to. Default: a fresh temp session dir. */
  output_dir?: string;
  /** Override the study's meshSize (mm) for this run only — the cheap way to
   *  re-run at higher fidelity after a `fea.mesh.quality-low` warning. */
  mesh_size?: number;
  /** Render stress heatmap PNGs (default true). Turn off for a fast
   *  numbers-only run. */
  heatmaps?: boolean;
  /** Wall-clock budget for the meshing stage, ms. */
  mesh_timeout_ms?: number;
  /** Wall-clock budget for the solve stage, ms. */
  solve_timeout_ms?: number;
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
export async function runFeaTool(input: RunFeaInput): Promise<RunFeaOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  const studies = findFeaStudies(run.records);
  if (studies.length === 0) {
    return {
      ok: false,
      error:
        'The script declares no feaStudy. Add shape.feaStudy({ material, fixed, loads }) to the part you want analysed.',
      errorCode: 'feature.invalid-args',
    };
  }
  const study = selectFeaStudy(studies, input.study);
  if (study === undefined) {
    return {
      ok: false,
      error: `No feaStudy named '${input.study}'. Declared studies: ${studies.map(s => s.metadata.name).join(', ')}.`,
      errorCode: 'feature.invalid-args',
    };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = r.shapes.get(study.shapeId);
  if (!(shape instanceof OcctBackend)) {
    const fatal = r.diagnostics.find(d => d.featureId === study.shapeId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `The shape the study is bound to did not lower: ${fatal.message}`
        : `The shape the study is bound to ('${study.shapeId}') produced no lowered geometry.`,
      ...(fatal?.code !== undefined ? { errorCode: fatal.code } : {}),
    };
  }

  const outDir = input.output_dir !== undefined
    ? (isAbsolute(input.output_dir) ? input.output_dir : resolve(input.output_dir))
    : await mkdtemp(join(tmpdir(), 'kernelcad-fea-'));
  await mkdir(outDir, { recursive: true });

  const metadata = input.mesh_size !== undefined
    ? { ...study.metadata, meshSize: input.mesh_size }
    : study.metadata;

  const result = await runFeaStudy(shape, metadata, study.shapeId, run.records, {
    outDir,
    paramTable: run.session.paramTable,
    cwd: input.file !== undefined ? dirname(resolve(input.file)) : process.cwd(),
    ...(input.mesh_timeout_ms !== undefined ? { meshTimeoutMs: input.mesh_timeout_ms } : {}),
    ...(input.solve_timeout_ms !== undefined ? { solveTimeoutMs: input.solve_timeout_ms } : {}),
  });

  let images: string[] | undefined;
  let legend: HeatmapBand[] | undefined;
  const diagnostics = [...result.diagnostics];
  if (result.raw !== undefined && input.heatmaps !== false) {
    const built = await buildHeatmap(result.raw.mesh, result.raw.fields, outDir);
    legend = built.bands;
    // Reuse the existing offline render pipeline verbatim — same camera set,
    // lighting, and watermark as every other kernelCAD visual artifact. A
    // render failure (no chromium, no player bundle) must not invalidate the
    // numbers, so it degrades to "no images" — but the REASON is passed
    // through, because an agent silently receiving no pictures would assume
    // the feature is missing rather than that its browser is.
    try {
      const preview = await renderPreviewTool({
        file: built.scriptPath,
        out_dir: join(outDir, 'heatmap'),
        views: ['iso', 'front'],
        no_mechanism_check: true,
      });
      if (preview.ok && preview.images.length > 0) {
        images = preview.images.map(i => i.path);
      } else {
        // Demoted to warn on the way through: a missing browser is a
        // reporting problem, not a structural one, and must not turn a
        // solved study into a failure.
        diagnostics.push(
          ...preview.diagnostics.map(d => ({
            ...d,
            severity: 'warn' as const,
            message: `run_fea heatmap render: ${d.message} The solved numbers are unaffected.`,
          })),
        );
      }
    } catch (e) {
      diagnostics.push({
        target: 'export-occt',
        code: 'cli.export-exception',
        severity: 'warn',
        message: `run_fea: the stress heatmap did not render (${(e as Error).message}). The solved numbers above are unaffected.`,
        hint: 'Ensure playwright chromium is installed (npx playwright install chromium), or pass heatmaps: false to skip rendering.',
      });
    }
  }

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
