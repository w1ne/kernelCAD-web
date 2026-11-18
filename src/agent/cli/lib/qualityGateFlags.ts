// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// CLI glue for the export geometry-quality gate (`--quality-gate`,
// `--tiny-face-area-mm2`, `--short-edge-length-mm`).
import type { Command } from 'commander';
import {
  QUALITY_GATE_MODES,
  qualityGateOptionsError,
  type ExportGeometryQualitySummary,
  type ExportQualityGateInput,
  type QualityGateMode,
} from '../../script-runtime/exportQualityGate';

export interface QualityGateCliOpts {
  qualityGate?: string;
  tinyFaceAreaMm2?: number;
  shortEdgeLengthMm?: number;
}

/** Register the gate flags on an export command. */
export function addQualityGateOptions(cmd: Command): Command {
  return cmd
    .option('--quality-gate <mode>', `geometry-quality gate for stl/step/3mf/obj/ply/gcode: ${QUALITY_GATE_MODES.join(' | ')} (default warn)`)
    .option('--tiny-face-area-mm2 <n>', 'quality gate: faces below this BREP area are tiny (default 0.01)', Number)
    .option('--short-edge-length-mm <n>', 'quality gate: edges below this length are short (default 0.1)', Number);
}

/** Parse the gate flags; `error` is a usage message (exit 2). */
export function parseQualityGateFlags(opts: QualityGateCliOpts): { ok: true; gate: ExportQualityGateInput } | { ok: false; error: string } {
  const gate: ExportQualityGateInput = {
    ...(opts.qualityGate === undefined ? {} : { mode: opts.qualityGate as QualityGateMode }),
    ...(opts.tinyFaceAreaMm2 === undefined ? {} : { tiny_face_area_mm2: opts.tinyFaceAreaMm2 }),
    ...(opts.shortEdgeLengthMm === undefined ? {} : { short_edge_length_mm: opts.shortEdgeLengthMm }),
  };
  const error = qualityGateOptionsError(gate);
  return error === undefined ? { ok: true, gate } : { ok: false, error: `--quality-gate: ${error}` };
}

/** One human-readable line summarising the gate result. */
export function formatQualityGateLine(q: ExportGeometryQualitySummary): string {
  const skipped = q.parts.filter(p => 'skipped' in p).length;
  const checked = q.parts.length - skipped;
  const verdict = q.ok ? 'ok' : `${q.tinyFaces} tiny face(s), ${q.shortEdges} short edge(s)`;
  return `geometry quality (${q.mode}): ${verdict} — ${checked} body(ies) checked${skipped > 0 ? `, ${skipped} skipped` : ''}, `
    + `thresholds ${q.thresholds.tinyFaceAreaMm2} mm² / ${q.thresholds.shortEdgeLengthMm} mm, ${q.elapsedMs} ms`;
}
