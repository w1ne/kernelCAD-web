// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/stressInfillRenders.ts
//
// Renders for a stress-graded infill export: the von Mises heatmap, the part
// split into its printed infill bands, and the same bands cut open at the
// part's mid-width. All three use the 'publish' preset with no explicit view,
// so they share one camera (3/4 front-right hero), one lighting rig and one
// backdrop — they line up frame for frame in a video.
//
// A render failure (no chromium) never invalidates the export: it comes back
// as a warn diagnostic naming the cause.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { ExportOptions } from '../../script-runtime/export';
import type { StressInfillReport } from '../../script-runtime/stressInfillExport';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { resolvePublishLook } from '../../../shared/render/publishPreset';
import { loadMeshScene, renderMeshScenes, type MeshScene } from '../../render/meshScenesRender';
import { renderPreviewTool } from './renderPreview';

export interface StressInfillImages {
  heatmap?: string;
  bands?: string;
  cutaway?: string;
}

type RenderJob = { key: keyof StressInfillImages; file: string };

/** The band bodies of each render script, read from the sidecar next to it. */
async function loadScenes(jobs: readonly RenderJob[]): Promise<MeshScene[] | undefined> {
  const scenes = await Promise.all(jobs.map((j) => loadMeshScene(j.key, j.file)));
  return scenes.every((sc) => sc !== undefined) ? (scenes as MeshScene[]) : undefined;
}

/** Draw all three views as display-only meshes from one browser page, in the
 *  same publish look the per-script path used. Undefined when the bodies are
 *  not available (the caller then renders the scripts). */
async function renderScenesFast(
  report: StressInfillReport,
  jobs: readonly RenderJob[],
): Promise<StressInfillImages | undefined> {
  const scenes = await loadScenes(jobs);
  if (scenes === undefined) return undefined;
  const look = resolvePublishLook({ preset: 'publish', background: 'white' }, 'publish');
  if (!look.ok || look.publish === undefined) return undefined;
  const pngs = await renderMeshScenes(scenes, { publish: look.publish });
  const images: StressInfillImages = {};
  for (const job of jobs) {
    const png = pngs[job.key];
    if (png === undefined) continue;
    const dir = join(report.outDir, 'renders', job.key);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'hero.png');
    await writeFile(path, png);
    images[job.key] = path;
  }
  return images;
}

export async function renderStressInfill(
  report: StressInfillReport,
  diagnostics: CompilerDiagnostic[],
): Promise<StressInfillImages> {
  const jobs: RenderJob[] = [
    { key: 'heatmap', file: report.renderScripts.heatmap },
    { key: 'bands', file: report.renderScripts.bands },
    { key: 'cutaway', file: report.renderScripts.cutaway },
  ];
  try {
    const fast = await renderScenesFast(report, jobs);
    if (fast !== undefined && Object.keys(fast).length === jobs.length) return fast;
  } catch {
    // Fall through to the per-script path, which reports its own failure.
  }
  const images: StressInfillImages = {};
  for (const job of jobs) {
    try {
      const out = await renderPreviewTool({
        file: job.file,
        out_dir: join(report.outDir, 'renders', job.key),
        preset: 'publish',
        background: 'white',
        no_mechanism_check: true,
      });
      if (out.ok && out.images.length > 0) {
        images[job.key] = out.images[0].path;
      } else {
        diagnostics.push(...out.diagnostics.map((d) => ({
          ...d,
          severity: 'warn' as const,
          message: `stress-graded infill ${job.key} render: ${d.message} The 3MF and the band table are unaffected.`,
        })));
      }
    } catch (e) {
      diagnostics.push({
        target: 'export-occt',
        code: 'cli.export-exception',
        severity: 'warn',
        message: `stress-graded infill: the ${job.key} render failed (${(e as Error).message}). The 3MF and the band table are unaffected.`,
        hint: 'Ensure playwright chromium is installed (npx playwright install chromium).',
      });
    }
  }
  return images;
}

type InfillOpt = { outDir?: string; renders?: boolean };

function infillOptOf(options: unknown): InfillOpt | undefined {
  return (options as { format?: string; infill?: InfillOpt } | undefined)?.infill;
}

/** Put the FEA job, band STLs and renders next to the 3MF
 *  (`<name>-infill/`) unless the caller named a directory. */
export function withInfillOutDir(
  format: string,
  options: ExportOptions | undefined,
  outputPath: unknown,
): ExportOptions | undefined {
  const infill = infillOptOf(options);
  if (format !== '3mf' || infill === undefined || infill.outDir !== undefined || typeof outputPath !== 'string') return options;
  const out = validateOutputPath(outputPath);
  if (!out.ok) return options;
  return { ...(options as object), infill: { ...infill, outDir: `${out.resolved!.replace(/\.3mf$/i, '')}-infill` } } as ExportOptions;
}

/** The `infill` output field: the report plus its renders (skipped with
 *  `infill.renders: false`). Empty when the export had no infill. */
export async function infillOutput(
  report: StressInfillReport | undefined,
  options: unknown,
  diagnostics: CompilerDiagnostic[],
): Promise<{ infill?: StressInfillReport & { images: StressInfillImages } }> {
  if (report === undefined) return {};
  const images = infillOptOf(options)?.renders === false ? {} : await renderStressInfill(report, diagnostics);
  return { infill: { ...report, images } };
}
