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

import { join } from 'node:path';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { StressInfillReport } from '../../script-runtime/stressInfillExport';
import { renderPreviewTool } from './renderPreview';

export interface StressInfillImages {
  heatmap?: string;
  bands?: string;
  cutaway?: string;
}

export async function renderStressInfill(
  report: StressInfillReport,
  diagnostics: CompilerDiagnostic[],
): Promise<StressInfillImages> {
  const { min, max } = report.boundsMm;
  // Cut along Y (the part's width in the recipe) through the middle so the
  // dense core around the load path shows.
  const midY = (min[1] + max[1]) / 2;
  const jobs: Array<{ key: keyof StressInfillImages; file: string; section?: { axis: 'y'; position: number } }> = [
    { key: 'heatmap', file: report.renderScripts.heatmap },
    { key: 'bands', file: report.renderScripts.bands },
    { key: 'cutaway', file: report.renderScripts.bands, section: { axis: 'y', position: midY } },
  ];
  const images: StressInfillImages = {};
  for (const job of jobs) {
    try {
      const out = await renderPreviewTool({
        file: job.file,
        out_dir: join(report.outDir, 'renders', job.key),
        preset: 'publish',
        background: 'white',
        no_mechanism_check: true,
        ...(job.section !== undefined ? { section: job.section } : {}),
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
