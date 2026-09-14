// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/fdmCheck.ts
//
// FDM printability check for one part (dfmSpec({ process: 'fdm' })): the
// OCCT-facing half. Builds the face-tagged mesh from the kernel's own
// per-face triangulation, names faces as `@kc[...]` refs, and combines the
// orientation analysis (fdmOrientation.ts) with the orientation-independent
// checks that REUSE existing machinery:
//   - nozzle-relative walls: `checkMinWall` at 2 × nozzle,
//   - small holes / pins: `collectFullCylinders` (exact OCCT cylinder radii),
//   - bed fit: the printer profile data shared with the gcode export gate.
// Diagnostics are built here so the evaluate gate (runDfmChecks) and the
// gcode export pre-check emit identical findings.

import type { Face } from 'replicad';
import type { CompilerDiagnostic, DiagnosticCode } from '../../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import type { DfmFdmMetadata } from '../../../shared/intent/dfmSpecRecord';
import { meshShapeForExport, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { faceHashOf } from '../../../kernel/backends/occt/createdRefs';
import { collectFullCylinders } from '../../../kernel/backends/occt/holeDetection';
import { formatTopoRef } from '../../../kernel/naming/topoRef';
import { resolvePrinterProfile } from '../../../kernel/export/gcode/printerProfiles';
import { TriangleBvh, type DfmMesh } from './meshBvh';
import { checkMinWall, MAX_REPORTED_CLUSTERS, type MinWallResult } from './minWall';
import {
  analyzeBuildDirection,
  axisLabelOf,
  BED_CONTACT_MIN_RATIO,
  prepareFdmMesh,
  rankOrientations,
  sameAreaMm2,
  TIP_RATIO_MAX,
  type FaceTaggedMesh,
  type FdmOrientationResult,
  type FdmOverhangRegion,
  type FdmSettings,
  type Vec3,
} from './fdmOrientation';

/** Holes below this many nozzle widths close up or print undersized
 *  (2 mm at a 0.4 mm nozzle — the common FDM design-guide floor). */
export const MIN_HOLE_NOZZLES = 5;
/** Pins below this many nozzle widths are fragile and lose roundness
 *  (3 mm at a 0.4 mm nozzle). */
export const MIN_PIN_NOZZLES = 7.5;
/** Knife-edge cut-off for the nozzle wall check, degrees. Two faces opening
 *  at θ leave a tip thinner than 2 × nozzle for 2·nozzle / tan θ from their
 *  shared edge; at θ = atan(0.5) that tip is 4 line widths deep, which the
 *  slicer prints as a slightly blunted edge. Narrower tapers are thin walls. */
export const FDM_WALL_MAX_WEDGE_DEG = (Math.atan(0.5) * 180) / Math.PI;
/** Cap on per-part small-feature and over-long-bridge diagnostics. */
const MAX_REPORTED = 10;

export interface FdmSmallFeature {
  kind: 'hole' | 'pin';
  diameterMm: number;
  minDiameterMm: number;
  /** Part-local point on the feature axis (midpoint of its extent). */
  location: Vec3;
}

/** Compact per-orientation row of the ranking. */
export interface FdmOrientationSummary {
  label: string;
  buildDirection: Vec3;
  rotation: FdmOrientationResult['rotation'];
  sizeMm: FdmOrientationResult['sizeMm'];
  fitsBed: boolean;
  unsupportedAreaMm2: number;
  bedContactAreaMm2: number;
  bedContactRatio: number;
  heightMm: number;
  tipRisk: boolean;
}

export interface FdmPartReport {
  settings: DfmFdmMetadata;
  /** Full analysis for the declared build direction. */
  orientation: FdmOrientationResult;
  /** The six axis-aligned build directions, best first. */
  ranking: FdmOrientationSummary[];
  /** Min-wall sampling at 2 × nozzle (part-local locations). */
  walls: MinWallResult;
  smallFeatures: FdmSmallFeature[];
  /** 'fail' when any FDM finding for this part is error severity. */
  verdict: 'pass' | 'fail';
}

export interface FdmCheckOptions {
  settings: DfmFdmMetadata;
  /** Part name echoed in messages. */
  part: string;
  /** Owner segment for `@kc[<owner>/face/<name>]` refs. */
  refOwner: string;
  /** The export-grade mesh of `shape` when the caller already built it
   *  (meshShapeForExport stamps the per-face triangulation this check reads). */
  mesh?: DfmMesh;
  bvh?: TriangleBvh;
  /** Part-local → reported frame (world); identity when omitted. */
  toWorld?: ToWorld;
}

type ToWorld = (p: Vec3) => readonly [number, number, number];

export interface FdmCheckResult {
  report: FdmPartReport;
  diagnostics: CompilerDiagnostic[];
}

/** Run the FDM printability check on one part (part-local frame). */
export function checkFdmPrintability(shape: OcctBackend, opts: FdmCheckOptions): FdmCheckResult {
  const { settings } = opts;
  const mesh = opts.mesh ?? meshShapeForExport(shape.getReplicadShape());
  const bvh = opts.bvh ?? new TriangleBvh(mesh);
  const profile = resolvePrinterProfile(settings.printer);
  const analysisSettings: FdmSettings = {
    nozzleMm: settings.nozzleMm,
    maxOverhangDeg: settings.maxOverhangDeg,
    maxBridgeMm: settings.maxBridgeMm,
    bedSizeMm: profile.bedSizeMm,
  };

  const prep = prepareFdmMesh(faceTaggedMeshOf(shape, opts.refOwner));
  const ranked = rankOrientations(prep, analysisSettings);
  const declaredLabel = axisLabelOf(settings.buildDirection);
  const orientation = ranked.find(r => declaredLabel !== undefined && r.label === declaredLabel)
    ?? analyzeBuildDirection(prep, settings.buildDirection, analysisSettings);
  const ranking = ranked.map(summarize);
  const walls = checkMinWall(mesh, 2 * settings.nozzleMm, { bvh, maxWedgeDeg: FDM_WALL_MAX_WEDGE_DEG });
  const smallFeatures = findSmallFeatures(shape, settings.nozzleMm);

  const report: FdmPartReport = { settings, orientation, ranking, walls, smallFeatures, verdict: 'pass' };
  const diagnostics = fdmDiagnostics(report, opts.part, profile.name, profile.bedSizeMm, opts.toWorld ?? (p => p));
  if (diagnostics.some(d => d.severity === 'error')) report.verdict = 'fail';
  return { report, diagnostics };
}

/** Weld the kernel's per-face triangulation (stamped by meshShapeForExport)
 *  into one mesh whose triangles remember their BREP face. Face refs follow
 *  the list_faces convention: label, canonical name, else `f<index>`. */
export function faceTaggedMeshOf(shape: OcctBackend, owner: string): FaceTaggedMesh {
  const faces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;
  const history = shape.historyMap;
  const Q = 1e7;
  const canonical = new Map<string, number>();
  const vertices: number[] = [];
  const triangles: number[] = [];
  const faceOfTri: number[] = [];
  const faceRefs: string[] = [];
  faces.forEach((face, fi) => {
    const lineage = history?.get(faceHashOf(face));
    const name = lineage?.labelName ?? lineage?.canonicalName ?? `f${fi}`;
    faceRefs.push(formatTopoRef({ owner, kind: 'face', segments: [name] }));
    const tri = (face as unknown as {
      triangulation(i0: number): { vertices: number[]; trianglesIndexes: number[] } | null;
    }).triangulation(0);
    if (!tri) return;
    const remap: number[] = [];
    for (let i = 0; i < tri.vertices.length; i += 3) {
      const x = tri.vertices[i], y = tri.vertices[i + 1], z = tri.vertices[i + 2];
      const key = `${Math.round(x * Q)},${Math.round(y * Q)},${Math.round(z * Q)}`;
      let idx = canonical.get(key);
      if (idx === undefined) {
        idx = vertices.length / 3;
        vertices.push(x, y, z);
        canonical.set(key, idx);
      }
      remap.push(idx);
    }
    for (let i = 0; i < tri.trianglesIndexes.length; i += 3) {
      const a = remap[tri.trianglesIndexes[i]];
      const b = remap[tri.trianglesIndexes[i + 1]];
      const c = remap[tri.trianglesIndexes[i + 2]];
      if (a === b || b === c || a === c) continue;
      triangles.push(a, b, c);
      faceOfTri.push(fi);
    }
  });
  return { vertices, triangles, faceOfTri, faceRefs };
}

function findSmallFeatures(shape: OcctBackend, nozzleMm: number): FdmSmallFeature[] {
  const out: FdmSmallFeature[] = [];
  const kinds: Array<['hole' | 'pin', number]> = [
    ['hole', MIN_HOLE_NOZZLES * nozzleMm],
    ['pin', MIN_PIN_NOZZLES * nozzleMm],
  ];
  for (const [kind, minDiameterMm] of kinds) {
    for (const c of collectFullCylinders(shape, kind)) {
      const diameterMm = 2 * c.radiusMm;
      if (diameterMm >= minDiameterMm - 1e-9) continue;
      const t = (c.tMin + c.tMax) / 2;
      out.push({
        kind,
        diameterMm,
        minDiameterMm,
        location: [c.loc0[0] + c.dir0[0] * t, c.loc0[1] + c.dir0[1] * t, c.loc0[2] + c.dir0[2] * t],
      });
    }
  }
  return out.sort((a, b) => a.diameterMm - b.diameterMm);
}

function summarize(r: FdmOrientationResult): FdmOrientationSummary {
  return {
    label: r.label ?? vec(r.buildDirection),
    buildDirection: r.buildDirection,
    rotation: r.rotation,
    sizeMm: r.sizeMm,
    fitsBed: r.fitsBed,
    unsupportedAreaMm2: r.unsupportedAreaMm2,
    bedContactAreaMm2: r.bedContact.areaMm2,
    bedContactRatio: r.bedContact.ratio,
    heightMm: r.bedContact.heightMm,
    tipRisk: r.tipRisk,
  };
}

// --- Diagnostics ---------------------------------------------------------------

function fdmDiagnostics(
  report: FdmPartReport,
  part: string,
  printer: string,
  bed: { x: number; y: number; z: number },
  toWorld: ToWorld,
): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  const o = report.orientation;
  const { settings } = report;
  const up = `printing ${o.label !== undefined ? `'${o.label}'` : vec(o.buildDirection)} up`;
  const best = report.ranking[0];
  const isDeclared = (s: FdmOrientationSummary): boolean =>
    s.buildDirection.every((c, i) => Math.abs(c - o.buildDirection[i]) < 1e-9);

  // Bed fit.
  if (!o.fitsBed) {
    const fitting = report.ranking.find(s => s.fitsBed);
    const advice = fitting !== undefined
      ? ` ${orientationPhrase(fitting)} fits as ${size(fitting.sizeMm)} mm.`
      : ' No axis-aligned orientation fits this bed.';
    out.push(emit(
      'dfm.fdm.exceeds-bed',
      `dfm.fdm: part '${part}' is ${size(o.sizeMm)} mm ${up}, larger than the '${printer}' bed ` +
        `(${bed.x} x ${bed.y} x ${bed.z} mm).`,
      advice,
    ));
  }

  // Overhangs and bridges.
  const unsupported = o.overhangs.filter(r => r.status === 'unsupported');
  const longBridges = unsupported.filter(r => r.horizontal && r.spanMm !== undefined);
  const overhangs = unsupported.filter(r => !(r.horizontal && r.spanMm !== undefined));
  const areaAdvice = (): string => {
    if (isDeclared(best) || sameAreaMm2(best.unsupportedAreaMm2, o.unsupportedAreaMm2)) {
      return ' No axis-aligned orientation reduces the unsupported area; add supports (export options.supports: true), ' +
        'or redesign with chamfers of 45° or steeper.';
    }
    return ` ${capitalize(orientationPhrase(best))}: unsupported area drops from ` +
      `${a1(o.unsupportedAreaMm2)} to ${a1(best.unsupportedAreaMm2)} mm².`;
  };
  if (overhangs.length > 0) {
    const area = overhangs.reduce((s, r) => s + r.areaMm2, 0);
    const largest = overhangs[0];
    out.push(emit(
      'dfm.fdm.overhang-unsupported',
      `dfm.fdm: part '${part}' has ${a1(area)} mm² of unsupported overhang in ${overhangs.length} ` +
        `region(s) ${up} (limit ${settings.maxOverhangDeg}° from vertical); largest ${a1(largest.areaMm2)} mm² ` +
        `${locus(largest, toWorld)}, ${a1(largest.maxOverhangDeg)}° from vertical, ${reason(largest, settings)}.`,
      areaAdvice(),
    ));
  }
  for (const r of longBridges.slice(0, MAX_REPORTED)) {
    out.push(emit(
      'dfm.fdm.bridge-too-long',
      `dfm.fdm: part '${part}' bridges ${a1(r.spanMm!)} mm (> maxBridgeMm ${settings.maxBridgeMm} mm) across a ` +
        `${a1(r.areaMm2)} mm² flat ceiling ${locus(r, toWorld)} ${up}.`,
      areaAdvice(),
    ));
  }

  // Walls below 2 × nozzle.
  const minWall = 2 * settings.nozzleMm;
  report.walls.violations.forEach((v, i) => {
    const note = i === 0 && report.walls.truncated
      ? ` More thin clusters exist; first ${MAX_REPORTED_CLUSTERS} shown.`
      : '';
    out.push(emit(
      'dfm.fdm.wall-below-nozzle',
      `dfm.fdm: part '${part}' has a ${v.thicknessMm.toFixed(3)} mm wall at ${xyz(toWorld(v.location))} — below ` +
        `2 × nozzle (${mm2(minWall)} mm for a ${settings.nozzleMm} mm nozzle); cluster of ${v.sampleCount} sample(s).${note}`,
    ));
  });

  // Small holes and pins.
  for (const f of report.smallFeatures.slice(0, MAX_REPORTED)) {
    const nozzles = f.kind === 'hole' ? MIN_HOLE_NOZZLES : MIN_PIN_NOZZLES;
    const effect = f.kind === 'hole' ? 'it will print undersized or close up' : 'it will be fragile and lose roundness';
    out.push(emit(
      'dfm.fdm.feature-too-small',
      `dfm.fdm: part '${part}' has a Ø${mm2(f.diameterMm)} mm ${f.kind} at ${xyz(toWorld(f.location))} — below ` +
        `the ${mm2(f.minDiameterMm)} mm minimum (${nozzles} × ${settings.nozzleMm} mm nozzle); ${effect}.`,
    ));
  }

  // Bed contact and tip risk.
  const bc = o.bedContact;
  if (o.bedContactLow) {
    const better = report.ranking.find(s => s.fitsBed && s.bedContactRatio >= BED_CONTACT_MIN_RATIO);
    const advice = better !== undefined && !isDeclared(better)
      ? ` ${capitalize(orientationPhrase(better))}: bed contact rises from ${a1(bc.areaMm2)} to ${a1(better.bedContactAreaMm2)} mm².`
      : '';
    out.push(emit(
      'dfm.fdm.bed-contact-low',
      `dfm.fdm: part '${part}' touches the bed with ${a1(bc.areaMm2)} mm² (${a1(100 * bc.ratio)}% of its ` +
        `${a1(bc.footprintMm2)} mm² footprint; minimum ${100 * BED_CONTACT_MIN_RATIO}%) ${up}.`,
      advice,
    ));
  }
  if (o.tipRisk) {
    out.push(emit(
      'dfm.fdm.tip-risk',
      `dfm.fdm: part '${part}' is ${a1(bc.heightMm)} mm tall on a base ${a1(bc.minBaseMm)} mm wide ` +
        `(ratio ${a1(bc.tipRatio)} > ${TIP_RATIO_MAX}) ${up}; it may tip or wobble while printing.`,
    ));
  }
  return out;
}

function emit(code: DiagnosticCode, message: string, advice = ''): CompilerDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    target: 'export-occt',
    code,
    severity: entry.defaultSeverity,
    message,
    hint: `${entry.hintTemplate}${advice}`,
    nextAction: entry.nextAction,
  };
}

/** "rotate 90° about X (.rotateX(90), or dfmSpec buildDirection: '+y')". */
export function orientationPhrase(s: FdmOrientationSummary): string {
  const r = s.rotation;
  if (r.deg === 0) return 'print as modeled';
  const axisName = r.axis[0] === 1 && r.axis[1] === 0 && r.axis[2] === 0 ? 'X'
    : r.axis[0] === 0 && r.axis[1] === 1 && r.axis[2] === 0 ? 'Y'
      : vec(r.axis);
  const deg = Math.round(r.deg * 1e3) / 1e3;
  const label = s.label.startsWith('[') ? s.label : `'${s.label}'`;
  return `rotate ${deg}° about ${axisName} (${r.apply}, or dfmSpec buildDirection: ${label})`;
}

function reason(r: FdmOverhangRegion, settings: DfmFdmMetadata): string {
  if (r.spanMm !== undefined) return `spanning ${a1(r.spanMm)} mm between supports (> maxBridgeMm ${settings.maxBridgeMm} mm)`;
  if (r.reachMm === undefined || !Number.isFinite(r.reachMm)) return 'with no supporting edge below it';
  return `reaching ${a1(r.reachMm)} mm past its nearest support`;
}

function locus(r: FdmOverhangRegion, toWorld: ToWorld): string {
  const corners: (readonly [number, number, number])[] = [];
  for (const x of [r.bboxMin[0], r.bboxMax[0]]) {
    for (const y of [r.bboxMin[1], r.bboxMax[1]]) {
      for (const z of [r.bboxMin[2], r.bboxMax[2]]) corners.push(toWorld([x, y, z]));
    }
  }
  const lo: Vec3 = [0, 1, 2].map(i => Math.min(...corners.map(c => c[i]))) as Vec3;
  const hi: Vec3 = [0, 1, 2].map(i => Math.max(...corners.map(c => c[i]))) as Vec3;
  return `${r.faceRef !== undefined ? `at ${r.faceRef} ` : ''}(bbox ${xyz(lo)}–${xyz(hi)})`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function a1(v: number): string {
  return v.toFixed(1);
}

function mm2(v: number): string {
  return v.toFixed(2);
}

function size(s: { x: number; y: number; z: number }): string {
  return `${a1(s.x)} x ${a1(s.y)} x ${a1(s.z)}`;
}

function xyz(p: readonly number[]): string {
  return `(${p.map(c => (Math.abs(c) < 5e-2 ? 0 : c).toFixed(1)).join(', ')})`;
}

function vec(p: readonly number[]): string {
  return `[${p.map(c => Math.round(c * 1000) / 1000 + 0).join(', ')}]`;
}
