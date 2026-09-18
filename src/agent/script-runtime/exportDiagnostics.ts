// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { type WatertightReport } from '../../kernel/backends/occt/meshHeal';
import { sliceStlToGcode, withTempStl } from '../../kernel/export/gcode/slicerCli';
import { parseGcodeHeader } from '../../kernel/export/gcode/gcodeHeaderParser';
import { resolvePrinterProfile, exceedsBed } from '../../kernel/export/gcode/profiles';
import { buildFrameFor, type Vec3 as FdmVec3 } from '../../modeling/runtime/dfm/fdmOrientation';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS, HINT_TEMPLATES } from '../../shared/diagnostics/registry';

import type { ExportOptions, ExportResult } from './export';

/**
 * Structured `export.mesh.not-watertight` diagnostic from a failing
 * watertight report — open-edge count plus up to 5 crack-cluster xyz spots.
 */
export function stlNotWatertightDiagnostic(
  report: WatertightReport,
  targetId: string | undefined,
  partName?: string,
): CompilerDiagnostic {
  const spots = report.clusters
    .map(c => `(${c.center.map(n => n.toFixed(2)).join(', ')})×${c.edgeCount}`)
    .join('; ');
  const subject = partName !== undefined ? `Part '${partName}' STL mesh` : 'STL mesh';
  return {
    target: 'export-occt',
    code: 'export.mesh.not-watertight',
    featureId: targetId,
    severity: 'error',
    message: `${subject} is not watertight: ${report.openEdgeCount} open edge(s) in ${report.clusters.length} crack cluster(s) at ${spots}.`,
    hint: HINT_TEMPLATES['export.mesh.not-watertight'].template,
    nextAction: NEXT_ACTIONS['export.mesh.not-watertight'],
  };
}

export type GcodeOptions = Extract<ExportOptions, { format: 'gcode' }>;

/**
 * `format: 'gcode'` shared dispatch: place `shape` in the build orientation
 * declared by `dfmSpec({ process: 'fdm', buildDirection })` (as modeled when
 * none is declared), bbox-gate it against the selected printer profile's bed
 * size *before* invoking the slicer (cheap, no process spawn), then shell out
 * to the detected slicer CLI. Shared by the Scene-fused and single-shape
 * dispatch paths — both end up with one `OcctBackend` to mesh. The rotation
 * is the one the FDM printability check analyzed, so a declared orientation
 * is the orientation that gets sliced.
 */
export async function sliceShapeToGcode(
  modeled: OcctBackend,
  opts: GcodeOptions | undefined,
  diagnostics: readonly CompilerDiagnostic[],
  featureCount: number,
  targetId: string | undefined,
  buildDirection?: FdmVec3,
): Promise<ExportResult> {
  const printerProfile = resolvePrinterProfile(opts?.printer);
  const rotation = buildDirection !== undefined ? buildFrameFor(buildDirection).rotation : undefined;
  // Clone first: replicad's rotate consumes the source OCCT handle.
  const shape = rotation !== undefined && rotation.deg !== 0
    ? modeled.clone().rotate(rotation.axis, rotation.deg)
    : modeled;
  const bbox = shape.boundingBox();
  const size = {
    x: bbox.max[0] - bbox.min[0],
    y: bbox.max[1] - bbox.min[1],
    z: bbox.max[2] - bbox.min[2],
  };
  if (exceedsBed(size, printerProfile)) {
    const placed = rotation !== undefined && rotation.deg !== 0
      ? ` in its dfmSpec build orientation (${rotation.apply})`
      : '';
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...diagnostics, {
        target: 'export-occt',
        code: 'export.gcode.exceeds-bed',
        featureId: targetId,
        severity: 'error',
        message: `Model bounding box ${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}mm${placed} exceeds the '${printerProfile.name}' bed (${printerProfile.bedSizeMm.x}x${printerProfile.bedSizeMm.y}x${printerProfile.bedSizeMm.z}mm).`,
        hint: HINT_TEMPLATES['export.gcode.exceeds-bed'].template,
        nextAction: NEXT_ACTIONS['export.gcode.exceeds-bed'],
      }],
    };
  }

  const { bytes: stlBytes } = await shape.exportSTLWithReportAsync();
  const sliceResult = await withTempStl(stlBytes, (path) => sliceStlToGcode(path, {
    printer: opts?.printer,
    layerHeight: opts?.layerHeight,
    infill: opts?.infill,
    supports: opts?.supports,
    material: opts?.material,
  }));

  if (!sliceResult.ok || sliceResult.gcode === undefined) {
    if (sliceResult.error === 'slicer-unavailable') {
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...diagnostics, {
          target: 'export-occt',
          code: 'export.gcode.slicer-unavailable',
          featureId: targetId,
          severity: 'error',
          message: 'No slicer CLI was found (KERNELCAD_SLICER env var unset/invalid, and none of orca-slicer/prusa-slicer/PrusaSlicer are on PATH).',
          hint: HINT_TEMPLATES['export.gcode.slicer-unavailable'].template,
          nextAction: NEXT_ACTIONS['export.gcode.slicer-unavailable'],
        }],
      };
    }
    throw new Error(`gcode export failed: ${sliceResult.error ?? 'unknown slicer error'}`);
  }

  const gcodeStats = parseGcodeHeader(sliceResult.gcode);
  return {
    bytes: new TextEncoder().encode(sliceResult.gcode),
    featureCount,
    diagnostics: [...diagnostics],
    gcodeStats,
  };
}

/**
 * Translate an `assertWatertight` Error into the structured
 * `export.3mf.not-watertight` diagnostic. Returns `undefined` when the
 * error doesn't look like a watertight failure so callers can rethrow.
 */
export function notWatertightDiagnostic(
  e: unknown,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  targetId: string | undefined,
): ExportResult | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  if (!/watertight/i.test(msg)) return undefined;
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.3mf.not-watertight',
      featureId: targetId,
      severity: 'error',
      message: '3MF export requires a watertight mesh; the exported triangulation has non-manifold edges.',
      hint: 'The mesh has open or non-manifold edges. Inspect the source geometry (typically a self-intersecting cone or non-closed shell) and re-author the offending surface via nurbsSurfaceLowerer, raise OCCT mesh deflection, or re-mesh via Manifold; see the K1 mesher gap.',
      nextAction: NEXT_ACTIONS['export.3mf.not-watertight'],
    }],
  };
}

/**
 * Translate an `exportGlbAsync` Draco-conflict Error into the structured
 * `export.glb.draco-glass-conflict` diagnostic. Returns `undefined` when the
 * error doesn't look like a Draco gate failure so callers can rethrow.
 */
export function dracoConflictDiagnostic(
  e: unknown,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  targetId: string | undefined,
): ExportResult | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  if (!/draco/i.test(msg)) return undefined;
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.glb.draco-glass-conflict',
      featureId: targetId,
      severity: 'error',
      message: 'Draco compression is reserved but not yet implemented. Pass options.draco: false or omit.',
      hint: 'Set options.draco to false or omit it; Draco encoding ships in a follow-up slice.',
      nextAction: NEXT_ACTIONS['export.glb.draco-glass-conflict'],
    }],
  };
}
