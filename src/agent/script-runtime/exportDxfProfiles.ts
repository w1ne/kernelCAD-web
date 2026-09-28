// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportDxfProfiles.ts
//
// DXF export of ordinary 3D parts (not sheet metal, not a returned Region):
//   - a flat part (plate, panel, extruded profile) exports its cut outline
//     and holes in its own plane, with true arcs and circles;
//   - `options.section: { axis, at }` exports the cross-section of any part
//     at that plane, in world coordinates;
//   - a multi-part Scene (a CNC cut list) exports every part: a combined
//     sheet with the parts side by side, one layer per part, plus one DXF
//     per part (`parts/<part>.dxf`, default) unless `layout: 'sheet'`.
// Anything else keeps the catalogued `export.dxf.non-planar` refusal.

import { exportDxf, type DxfWriterOptions } from '../../kernel/backends/occt/exportDxf';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import {
  extractFlatProfile,
  extractSectionProfile,
  loopsBoundingBox,
  translateLoops,
  type PlanarProfileResult,
  type SectionSpec,
} from '../../kernel/backends/occt/planarProfile';
import type { ProjectedSegment } from '../../kernel/backends/occt/sketchFromShape';
import { sceneToWorldFrameParts } from '../../kernel/backends/occt/sceneToWorldFrame';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { CompanionMeshFile, ExportInput, ExportResult } from './export';
import { fileSafePartName } from './safeOutputPath';

/** DXF export options beyond the writer's own (unit / tolerance / layers). */
export interface DxfProfileOptions extends DxfWriterOptions {
  /** Export the cross-section at this plane instead of a flat part's outline. */
  section?: SectionSpec;
  /** Multi-part models: `'per-part'` (default) also writes one DXF per part;
   *  `'sheet'` writes only the combined sheet. */
  layout?: 'per-part' | 'sheet';
}

/** Gap between parts laid out side by side on a combined sheet (mm). */
const SHEET_GAP_MM = 10;

const DXF_NON_PLANAR_HINT = HINT_TEMPLATES['export.dxf.non-planar'].template;

function nonPlanar(
  targetId: string,
  message: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.dxf.non-planar',
      featureId: targetId,
      severity: 'error',
      message,
      hint: DXF_NON_PLANAR_HINT,
      nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
    }],
  };
}

function readSection(opts: DxfProfileOptions): SectionSpec | undefined {
  const s = opts.section;
  if (s === undefined) return undefined;
  if (typeof s !== 'object' || s === null || !['x', 'y', 'z'].includes(s.axis) || !Number.isFinite(s.at)) {
    throw new Error("options.section must be { axis: 'x' | 'y' | 'z', at: <mm> }.");
  }
  return { axis: s.axis, at: s.at };
}

function extract(shape: OcctBackend, opts: DxfProfileOptions, section: SectionSpec | undefined): PlanarProfileResult {
  const curveTolerance = opts.tolerance ?? 0.05;
  return section
    ? extractSectionProfile(shape, section, { curveTolerance })
    : extractFlatProfile(shape, { curveTolerance });
}

/** One part: its flat outline, or its section when `options.section` is set. */
export function exportShapeDxfProfile(
  shape: OcctBackend,
  targetId: string,
  exportOptions: ExportInput['options'],
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const opts = (exportOptions as DxfProfileOptions | undefined) ?? { format: 'dxf' };
  const section = readSection(opts);
  const r = extract(shape, opts, section);
  if (!r.ok) {
    const what = section ? 'DXF section failed' : 'DXF export needs a flat part';
    return nonPlanar(targetId, `${what}: ${r.reason}.`, diagnostics, featureCount);
  }
  const bytes = exportDxf({ kind: 'profiles', layers: [{ loops: r.profile.loops }] }, opts);
  return { bytes, featureCount, diagnostics };
}

/** DXF layer names cannot hold `<>/\":;?*|=,` or a backtick. */
function dxfLayerName(name: string): string {
  return name.replace(/[<>/\\":;?*|=,`]/g, '_') || 'part';
}

/**
 * Multi-part Scene. Section mode: one DXF in world coordinates, one layer
 * per part, parts the plane misses left out. Flat mode: every part must be
 * flat; the primary DXF lays them side by side on one layer each, and
 * `layout: 'per-part'` (default) adds `parts/<part>.dxf` companions.
 */
export function exportSceneDxf(
  scene: SceneBackend,
  targetId: string,
  exportOptions: ExportInput['options'],
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const opts = (exportOptions as DxfProfileOptions | undefined) ?? { format: 'dxf' };
  const section = readSection(opts);
  const parts = sceneToWorldFrameParts(scene);
  const profiles: Array<{ name: string; loops: ProjectedSegment[][] }> = [];
  const failed: string[] = [];
  for (const p of parts) {
    const r = extract(p.shape, opts, section);
    if (r.ok) profiles.push({ name: p.name, loops: r.profile.loops });
    else failed.push(`${p.name} (${r.reason})`);
  }

  if (section) {
    if (profiles.length === 0) {
      return nonPlanar(targetId, `DXF section failed: the plane ${section.axis} = ${section.at} cuts no part.`, diagnostics, featureCount);
    }
    const layers = profiles.map((p) => ({ name: dxfLayerName(p.name), loops: p.loops }));
    return { bytes: exportDxf({ kind: 'profiles', layers }, opts), featureCount, diagnostics };
  }

  if (failed.length > 0) {
    return nonPlanar(
      targetId,
      `DXF export needs every part to be flat; not flat: ${failed.join('; ')}.`,
      diagnostics,
      featureCount,
    );
  }

  // Combined sheet: each part's profile starts at (0, 0) — place them left to
  // right with a fixed gap, bottoms aligned on y = 0.
  const sheet: Array<{ name: string; loops: ProjectedSegment[][] }> = [];
  let cursor = 0;
  for (const p of profiles) {
    const bb = loopsBoundingBox(p.loops);
    sheet.push({ name: dxfLayerName(p.name), loops: translateLoops(p.loops, cursor - bb.min[0], -bb.min[1]) });
    cursor += bb.max[0] - bb.min[0] + SHEET_GAP_MM;
  }
  const bytes = exportDxf({ kind: 'profiles', layers: sheet }, opts);
  if (profiles.length < 2 || opts.layout === 'sheet') return { bytes, featureCount, diagnostics };

  const seen = new Map<string, number>();
  const meshes: CompanionMeshFile[] = profiles.map((p) => {
    const base = fileSafePartName(p.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      relPath: `parts/${n === 1 ? base : `${base}-${n}`}.dxf`,
      bytes: exportDxf({ kind: 'profiles', layers: [{ loops: p.loops }] }, opts),
    };
  });
  return { bytes, featureCount, diagnostics, meshes };
}
