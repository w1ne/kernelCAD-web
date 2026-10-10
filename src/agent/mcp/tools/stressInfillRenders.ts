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

export interface StressInfillImages {
  heatmap?: string;
  bands?: string;
  cutaway?: string;
}

type RenderJob = { key: keyof StressInfillImages; file: string };

/** The band bodies of each render script, read from the sidecar next to it. */
async function loadScenes(jobs: readonly RenderJob[]): Promise<MeshScene[]> {
  return Promise.all(jobs.map(async (j) => {
    const scene = await loadMeshScene(j.key, j.file);
    if (scene === undefined) throw new Error(`the ${j.key} band list (render-bodies.json) is missing`);
    return scene;
  }));
}

/** Draw all three views as display-only meshes from one browser page, in the
 *  publish look. A failure never invalidates the export: it comes back as a
 *  warning with the reason, and the 3MF and band table stand. */
export async function renderStressInfill(
  report: StressInfillReport,
  diagnostics: CompilerDiagnostic[],
): Promise<StressInfillImages> {
  const jobs: RenderJob[] = [
    { key: 'heatmap', file: report.renderScripts.heatmap },
    { key: 'bands', file: report.renderScripts.bands },
    { key: 'cutaway', file: report.renderScripts.cutaway },
  ];
  const images: StressInfillImages = {};
  try {
    const look = resolvePublishLook({ preset: 'publish', background: 'white' }, 'publish');
    if (!look.ok || look.publish === undefined) throw new Error('the publish look did not resolve');
    const pngs = await renderMeshScenes(await loadScenes(jobs), { publish: look.publish });
    for (const job of jobs) {
      const png = pngs[job.key];
      if (png === undefined) throw new Error(`the ${job.key} view did not render`);
      const dir = join(report.outDir, 'renders', job.key);
      await mkdir(dir, { recursive: true });
      images[job.key] = join(dir, 'hero.png');
      await writeFile(images[job.key]!, png);
    }
  } catch (e) {
    diagnostics.push({
      target: 'export-occt',
      code: 'cli.export-exception',
      severity: 'warn',
      message: `stress-graded infill: the renders failed (${(e as Error).message}). The 3MF and the band table are unaffected.`,
      hint: 'Ensure playwright chromium is installed (npx playwright install chromium), or pass infill.renders: false.',
    });
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
