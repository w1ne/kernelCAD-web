// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/dfmReview.ts
//
// MCP `dfm_review` tool: one manufacturability report for FDM 3D printing,
// 3-axis CNC milling, sheet metal and/or injection molding, as a flat
// pass/fail checklist. Unlike
// verify({ check: 'dfm' }) it needs NO dfmSpec(...) in the script: it runs
// with sensible defaults (any FDM settings the script's dfmSpec declares are
// used as the base, then the call's own options win).
//
// FDM reuses the existing printability engine (checkFdmPrintability):
// overhangs, bridging, wall thickness vs nozzle, minimum hole / pin size,
// bed fit, bed contact and tip risk. CNC runs cncCheck.ts: undercuts and
// internal corner radius vs the end-mill radius. Sheet metal runs
// sheetMetalCheck.ts on the flat pattern of a sheetMetal(...) chain (bend
// radius, hole-to-bend, hole-to-edge, flange length); injection molding runs
// the dfmSpec({ process: 'moulding' }) engine (mouldingCheck.ts: draft,
// two-part-mould undercuts, thin / thick walls, sharp internal corners) and
// adds a wall-uniformity ratio. Defaults stay ['fdm', 'cnc'].

import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';
import type { BuiltModel } from '../../../modeling/buildModel';
import type { ResolvedPart } from '../../../modeling/runtime/dfm/runDfmChecks';
import type { CncSettings } from '../../../modeling/runtime/dfm/cncCheck';
import { FDM_DEFAULTS, type DfmFdmMetadata } from '../../../shared/intent/dfmSpecRecord';
import { findDfmSpec, resolveParts } from '../../../modeling/runtime/dfm/runDfmChecks';
import { checkFdmPrintability, type FdmPartReport } from '../../../modeling/runtime/dfm/fdmCheck';
import { axisVector, checkCncMachinability, type CncPartReport, type Vec3 } from '../../../modeling/runtime/dfm/cncCheck';
import { TriangleBvh } from '../../../modeling/runtime/dfm/meshBvh';
import { meshShapeForExport, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { PRINTER_PROFILE_IDS } from '../../../kernel/export/gcode/printerProfiles';
import {
  checkSheetMetal, SHEET_METAL_DEFAULTS, type SheetMetalPartReport, type SheetMetalSettings,
} from '../../../modeling/runtime/dfm/sheetMetalCheck';
import { checkMouldability, type MouldingPartReport } from '../../../modeling/runtime/dfm/mouldingCheck';
import { MOULDING_DEFAULTS, type DfmMouldingMetadata } from '../../../shared/intent/dfmSpecRecord';
import {
  moldChecks, notSheetMetalCheck, sheetMetalChecks,
  type DfmCheckStatus, type DfmProcess, type DfmReviewCheck,
} from './dfmReviewChecks';

export type { DfmCheckStatus, DfmProcess, DfmReviewCheck } from './dfmReviewChecks';

const PROCESSES: readonly DfmProcess[] = ['fdm', 'cnc', 'sheet-metal', 'injection-molding'];

export interface DfmReviewInput {
  file?: string;
  code?: string;
  /** Default ['fdm', 'cnc']. */
  processes?: DfmProcess[];
  /** FDM: nozzle diameter, mm (default 0.4). */
  nozzle_mm?: number;
  /** FDM: steepest printable overhang, degrees from vertical (default 45). */
  max_overhang_deg?: number;
  /** FDM: longest unsupported bridge, mm (default 10). */
  max_bridge_mm?: number;
  /** FDM: printer profile id for the bed-fit check (default 'generic-fdm'). */
  printer?: string;
  /** FDM: build direction axis token, '+z' default. */
  build_direction?: string;
  /** CNC: end-mill diameter, mm (default 6). */
  tool_diameter_mm?: number;
  /** CNC: tool approach axes (setups), default ['+z']. */
  approach_axes?: string[];
  /** CNC: unreachable area tolerated before cnc.undercuts fails, mm² (default 1). */
  max_undercut_area_mm2?: number;
  /** Sheet metal: inner bend radius >= this × thickness (default 1). */
  min_bend_radius_ratio?: number;
  /** Sheet metal: hole edge to bend line >= this × thickness + bend radius (default 2.5). */
  hole_to_bend_thicknesses?: number;
  /** Sheet metal: hole edge to blank edge >= this × thickness (default 2). */
  hole_to_edge_thicknesses?: number;
  /** Sheet metal: flange, from the outside of the bend, >= this × thickness (default 4). */
  min_flange_thicknesses?: number;
  /** Injection molding: mold-opening axis token (default '+z'). */
  pull_direction?: string;
  /** Injection molding: minimum draft, degrees (default 1). */
  min_draft_deg?: number;
  /** Injection molding: minimum wall, mm (default 1, MOULDING_DEFAULTS). */
  min_wall_mm?: number;
  /** Injection molding: maximum wall, mm (default 4). */
  max_wall_mm?: number;
  /** Injection molding: thickest / thinnest wall above this warns (default 2.5). */
  max_wall_ratio?: number;
  /** Injection molding: minimum internal corner radius, mm (default 0.5). */
  min_radius_mm?: number;
}

export interface DfmReviewOutput {
  ok: boolean;
  /** 'fail' when any check fails; warnings do not fail the review. */
  verdict: 'pass' | 'fail';
  processes: DfmProcess[];
  checks: DfmReviewCheck[];
  /** Raw per-part engine reports (part-local coordinates). */
  fdm?: { part: string; result: FdmPartReport }[];
  cnc?: { part: string; result: CncPartReport }[];
  /** Sheet-metal reports; locations are FLAT-PATTERN [x, y] mm. */
  sheetMetal?: { part: string; result: SheetMetalPartReport }[];
  /** Injection-molding reports (the dfmSpec moulding engine's report; part-local coordinates, `@kc` face refs). */
  injectionMolding?: { part: string; result: MouldingPartReport }[];
  diagnostics: CompilerDiagnostic[];
  error?: string;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;
const r2 = (n: number): number => Math.round(n * 100) / 100;

const API = 'dfm_review({ ... })';
const EXAMPLE = "dfm_review({ code, processes: ['fdm', 'cnc', 'sheet-metal', 'injection-molding'], nozzle_mm: 0.4, tool_diameter_mm: 6 })";

function invalid(path: string, got: unknown, requires: string): DfmReviewOutput {
  const { message, hint } = invalidArgsText({ api: API, path, got, requires, example: EXAMPLE });
  return {
    ok: false, verdict: 'fail', processes: [], checks: [],
    diagnostics: [{ target: 'export-occt', code: 'cli.invalid-args', severity: 'error', message, hint }],
  };
}

interface ReviewOptions {
  processes: DfmProcess[];
  buildDirection?: Vec3;
  cnc: CncSettings;
  sheet: SheetMetalSettings;
  /** Call-time pull direction (undefined: the script's dfmSpec or '+z'). */
  pullDirection?: Vec3;
  maxWallRatio: number;
}

/** Thickest / thinnest wall above this warns: guides keep ribs and bosses at
 *  40–60% of the nominal wall, i.e. the nominal ≤ ~2.5 × the thinnest. */
export const DEFAULT_MAX_WALL_RATIO = 2.5;

const POSITIVE_FIELDS = [
  'nozzle_mm', 'max_overhang_deg', 'max_bridge_mm', 'tool_diameter_mm', 'max_undercut_area_mm2',
  'min_bend_radius_ratio', 'hole_to_bend_thicknesses', 'hole_to_edge_thicknesses', 'min_flange_thicknesses',
  'min_draft_deg', 'min_wall_mm', 'max_wall_mm', 'max_wall_ratio', 'min_radius_mm',
] as const;

function isPositive(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function processesError(input: DfmReviewInput): DfmReviewOutput | undefined {
  const p = input.processes;
  if (p === undefined) return undefined;
  const ok = Array.isArray(p) && p.length > 0 && p.every(x => PROCESSES.includes(x));
  return ok ? undefined : invalid('processes', p, `a non-empty list of ${PROCESSES.map(x => `'${x}'`).join(' | ')}`);
}

function numberError(input: DfmReviewInput): DfmReviewOutput | undefined {
  const bad = POSITIVE_FIELDS.find(k => input[k] !== undefined && !isPositive(input[k]));
  if (bad !== undefined) return invalid(bad, input[bad], 'a positive number');
  if ((input.max_overhang_deg ?? 0) > 90) return invalid('max_overhang_deg', input.max_overhang_deg, 'a number in (0, 90]');
  if ((input.min_draft_deg ?? 0) >= 90) return invalid('min_draft_deg', input.min_draft_deg, 'a number in (0, 90)');
  const minWall = input.min_wall_mm ?? MOULDING_DEFAULTS.minWallMm;
  if ((input.max_wall_mm ?? Infinity) <= minWall) return invalid('max_wall_mm', input.max_wall_mm, `a number above min_wall_mm (${minWall})`);
  return undefined;
}

function printerError(input: DfmReviewInput): DfmReviewOutput | undefined {
  if (input.printer === undefined || PRINTER_PROFILE_IDS.includes(input.printer)) return undefined;
  return invalid('printer', input.printer, `one of ${PRINTER_PROFILE_IDS.join(', ')}`);
}

function parseBuildDirection(input: DfmReviewInput): Vec3 | undefined | DfmReviewOutput {
  if (input.build_direction === undefined) return undefined;
  const token: unknown = input.build_direction;
  if (typeof token !== 'string') return invalid('build_direction', token, "an axis token like '+z' or '-x'");
  return axisVector(token) ?? invalid('build_direction', input.build_direction, "an axis token like '+z' or '-x'");
}

function parsePullDirection(input: DfmReviewInput): Vec3 | undefined | DfmReviewOutput {
  if (input.pull_direction === undefined) return undefined;
  const token: unknown = input.pull_direction;
  const v = typeof token === 'string' ? axisVector(token) : undefined;
  return v ?? invalid('pull_direction', input.pull_direction, "an axis token like '+z' or '-x'");
}

function parseApproachAxes(input: DfmReviewInput): Vec3[] | DfmReviewOutput {
  const tokens: unknown = input.approach_axes ?? ['+z'];
  const axes = Array.isArray(tokens) ? tokens.map(t => (typeof t === 'string' ? axisVector(t) : undefined)) : [];
  if (axes.length === 0 || axes.some(a => a === undefined)) {
    return invalid('approach_axes', input.approach_axes, "a non-empty list of axis tokens like ['+z', '-z']");
  }
  return axes as Vec3[];
}

const isRejection = (v: unknown): v is DfmReviewOutput =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && 'verdict' in v;

/** Validate the call options; a DfmReviewOutput is a rejection. */
function parseOptions(input: DfmReviewInput): ReviewOptions | DfmReviewOutput {
  const early = processesError(input) ?? numberError(input) ?? printerError(input);
  if (early !== undefined) return early;
  const buildDirection = parseBuildDirection(input);
  if (isRejection(buildDirection)) return buildDirection;
  const approachAxes = parseApproachAxes(input);
  if (isRejection(approachAxes)) return approachAxes;
  const pullDirection = parsePullDirection(input);
  if (isRejection(pullDirection)) return pullDirection;
  return {
    processes: input.processes ?? ['fdm', 'cnc'],
    buildDirection,
    cnc: {
      toolDiameterMm: input.tool_diameter_mm ?? 6,
      approachAxes,
      maxUndercutAreaMm2: input.max_undercut_area_mm2 ?? 1,
    },
    sheet: sheetSettingsFor(input),
    pullDirection,
    maxWallRatio: input.max_wall_ratio ?? DEFAULT_MAX_WALL_RATIO,
  };
}

function sheetSettingsFor(input: DfmReviewInput): SheetMetalSettings {
  const d = SHEET_METAL_DEFAULTS;
  return {
    minBendRadiusRatio: input.min_bend_radius_ratio ?? d.minBendRadiusRatio,
    holeToBendThicknesses: input.hole_to_bend_thicknesses ?? d.holeToBendThicknesses,
    holeToEdgeThicknesses: input.hole_to_edge_thicknesses ?? d.holeToEdgeThicknesses,
    minFlangeThicknesses: input.min_flange_thicknesses ?? d.minFlangeThicknesses,
  };
}

/** Script dfmSpec moulding settings (or MOULDING_DEFAULTS) as the base, call options on top. */
function mouldSettingsFor(model: BuiltModel, input: DfmReviewInput, pullDirection: Vec3 | undefined): DfmMouldingMetadata {
  const base: DfmMouldingMetadata = findDfmSpec(model.records)?.moulding
    ?? { ...MOULDING_DEFAULTS, pullDirection: [...MOULDING_DEFAULTS.pullDirection] };
  return {
    pullDirection: pullDirection ?? base.pullDirection,
    minDraftDeg: input.min_draft_deg ?? base.minDraftDeg,
    minWallMm: input.min_wall_mm ?? base.minWallMm,
    maxWallMm: input.max_wall_mm ?? base.maxWallMm,
    minRadiusMm: input.min_radius_mm ?? base.minRadiusMm,
  };
}

/** Script dfmSpec FDM settings as the base, call options on top. */
function fdmSettingsFor(model: BuiltModel, input: DfmReviewInput, buildDirection: Vec3 | undefined): DfmFdmMetadata {
  const base: DfmFdmMetadata = findDfmSpec(model.records)?.fdm
    ?? { ...FDM_DEFAULTS, buildDirection: [...FDM_DEFAULTS.buildDirection], printer: 'generic-fdm' };
  return {
    buildDirection: buildDirection ?? base.buildDirection,
    nozzleMm: input.nozzle_mm ?? base.nozzleMm,
    maxOverhangDeg: input.max_overhang_deg ?? base.maxOverhangDeg,
    maxBridgeMm: input.max_bridge_mm ?? base.maxBridgeMm,
    printer: input.printer ?? base.printer,
  };
}

interface PartReview {
  checks: DfmReviewCheck[];
  diagnostics: CompilerDiagnostic[];
  fdm?: FdmPartReport;
  cnc?: CncPartReport;
  sheetMetal?: SheetMetalPartReport;
  injectionMolding?: MouldingPartReport;
  /** Processes whose analysis threw for this part. */
  failed: DfmProcess[];
}

interface PartGeometry {
  shape: OcctBackend;
  mesh: ReturnType<typeof meshShapeForExport>;
  bvh: TriangleBvh;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function recordFailure(out: PartReview, part: string, process: DfmProcess, e: unknown): void {
  out.failed.push(process);
  out.diagnostics.push({
    target: 'export-occt', code: 'feature.kernel-failed', severity: 'error',
    message: `dfm_review: the ${process} analysis of part '${part}' failed (${errorText(e)}); its checks were not run.`,
    hint: 'The OCCT kernel could not analyse this part; check it for degenerate geometry with evaluate_script.',
  });
  out.checks.push({
    id: `${process}.analysis`, process, part, status: 'fail',
    summary: `The ${process} analysis could not run on this part, so it is not reviewed.`,
  });
}

function runFdm(part: ResolvedPart, g: PartGeometry, settings: DfmFdmMetadata, out: PartReview): void {
  const r = checkFdmPrintability(g.shape, {
    settings, part: part.name, refOwner: part.refOwner, mesh: g.mesh, bvh: g.bvh,
    toWorld: p => part.worldTransform.point(p),
    // fdm.min-hole is a FAIL here, so its diagnostic is error-level too.
    smallHoleSeverity: 'error',
  });
  out.fdm = r.report;
  out.diagnostics.push(...r.diagnostics);
  out.checks.push(...fdmChecks(part.name, r.report));
}

function runCnc(part: ResolvedPart, g: PartGeometry, settings: CncSettings, out: PartReview): void {
  out.cnc = checkCncMachinability(g.shape, g.mesh, settings, g.bvh);
  out.checks.push(...cncChecks(part.name, out.cnc));
}

function runMold(part: ResolvedPart, g: PartGeometry, settings: DfmMouldingMetadata, maxWallRatio: number, out: PartReview): void {
  const r = checkMouldability(g.shape, {
    settings, part: part.name, refOwner: part.refOwner, mesh: g.mesh, bvh: g.bvh,
    toWorld: p => part.worldTransform.point(p),
  });
  out.injectionMolding = r.report;
  out.diagnostics.push(...r.diagnostics);
  out.checks.push(...moldChecks(part.name, r.report, maxWallRatio));
}

/** Feature id whose lowered shape is this part (the sheet-metal chain terminal, if any). */
function producerIdOf(model: BuiltModel, part: ResolvedPart): string | undefined {
  const byShape = [...model.records].reverse().find(r => model.shapes.get(r.id) === part.shape);
  if (byShape !== undefined) return byShape.id;
  return model.records.some(r => r.id === part.refOwner) ? part.refOwner : undefined;
}

async function runSheetMetal(part: ResolvedPart, model: BuiltModel, settings: SheetMetalSettings, out: PartReview): Promise<void> {
  const id = producerIdOf(model, part);
  const rep = id !== undefined ? await checkSheetMetal(model.records, id, settings, model.shapes) : undefined;
  if (rep === undefined) {
    out.checks.push(notSheetMetalCheck(part.name));
    return;
  }
  out.sheetMetal = rep;
  out.checks.push(...sheetMetalChecks(part.name, rep));
}

function partGeometry(part: ResolvedPart): PartGeometry {
  const shape = part.shape as OcctBackend;
  const mesh = meshShapeForExport(shape.getReplicadShape());
  return { shape, mesh, bvh: new TriangleBvh(mesh) };
}

/** Each requested process runs in its own try, so one failure never skips the other. */
export async function reviewPart(
  part: ResolvedPart, opts: ReviewOptions, settings: { fdm: DfmFdmMetadata; mould: DfmMouldingMetadata }, model: BuiltModel,
): Promise<PartReview> {
  const out: PartReview = { checks: [], diagnostics: [], failed: [] };
  let g: PartGeometry | undefined;
  // Mesh lazily, once: the sheet-metal review works on the flat pattern alone.
  const geom = (): PartGeometry => (g ??= partGeometry(part));
  const runners: Record<DfmProcess, () => void | Promise<void>> = {
    fdm: () => runFdm(part, geom(), settings.fdm, out),
    cnc: () => runCnc(part, geom(), opts.cnc, out),
    'sheet-metal': () => runSheetMetal(part, model, opts.sheet, out),
    'injection-molding': () => runMold(part, geom(), settings.mould, opts.maxWallRatio, out),
  };
  for (const p of opts.processes) {
    try {
      await runners[p]();
    } catch (e) {
      recordFailure(out, part.name, p, e);
    }
  }
  return out;
}

export async function dfmReviewTool(input: DfmReviewInput): Promise<DfmReviewOutput> {
  const opts = parseOptions(input);
  if (isRejection(opts)) return opts;
  const { processes } = opts;
  let built;
  try {
    // The review applies its own (call-time) settings, so the script's dfmSpec
    // gate must not veto or pollute it: build without that gate.
    built = await evaluateAndBuildScript({ file: input.file, code: input.code }, { skipDfmGate: true });
  } catch (e) {
    return { ok: false, verdict: 'fail', processes, checks: [], diagnostics: [kernelErrorToDiagnostic(e)] };
  }
  const { evaluation, model } = built;
  if (model === undefined || evaluation.exitCode !== 0) {
    return { ok: false, verdict: 'fail', processes, checks: [], diagnostics: evaluation.diagnostics };
  }
  const { parts } = resolveParts(model);
  if (parts.length === 0) return invalid('code', '(no solid)', 'a script that returns a solid or an assembly');

  const fdmSettings = fdmSettingsFor(model, input, opts.buildDirection);
  const reviews: { part: string; review: PartReview }[] = [];
  const settings = { fdm: fdmSettings, mould: mouldSettingsFor(model, input, opts.pullDirection) };
  for (const part of parts) reviews.push({ part: part.name, review: await reviewPart(part, opts, settings, model) });
  const checks = reviews.flatMap(r => r.review.checks);
  const fdm = perPart(reviews, r => r.fdm);
  const cnc = perPart(reviews, r => r.cnc);
  const sheetMetal = perPart(reviews, r => r.sheetMetal);
  const injectionMolding = perPart(reviews, r => r.injectionMolding);
  const incomplete = reviews.some(r => r.review.failed.length > 0);
  return {
    // An analysis that could not run is not a review: never ok, never pass.
    ok: !incomplete,
    verdict: incomplete || checks.some(c => c.status === 'fail') ? 'fail' : 'pass',
    ...(incomplete ? { error: 'Part of the analysis failed; see the *.analysis checks and diagnostics.' } : {}),
    processes,
    checks,
    ...(fdm.length > 0 ? { fdm } : {}),
    ...(cnc.length > 0 ? { cnc } : {}),
    ...(sheetMetal.length > 0 ? { sheetMetal } : {}),
    ...(injectionMolding.length > 0 ? { injectionMolding } : {}),
    diagnostics: [...evaluation.diagnostics, ...reviews.flatMap(r => r.review.diagnostics)],
  };
}

function perPart<T>(reviews: { part: string; review: PartReview }[], pick: (r: PartReview) => T | undefined): { part: string; result: T }[] {
  return reviews.flatMap(r => {
    const v = pick(r.review);
    return v !== undefined ? [{ part: r.part, result: v }] : [];
  });
}

type CheckFn = (id: string, status: DfmCheckStatus, summary: string, value?: number, limit?: number) => DfmReviewCheck;

function checkMaker(part: string): CheckFn {
  return (id, status, summary, value, limit) => ({
    id, process: 'fdm', part, status, summary,
    ...(value !== undefined && Number.isFinite(value) ? { value: r2(value) } : {}),
    ...(limit !== undefined ? { limit: r2(limit) } : {}),
  });
}

function overhangChecks(c: CheckFn, rep: FdmPartReport): DfmReviewCheck[] {
  const s = rep.settings;
  const unsupported = rep.orientation.overhangs.filter(r => r.status === 'unsupported');
  const longBridges = unsupported.filter(r => r.horizontal && r.spanMm !== undefined);
  const overhangs = unsupported.filter(r => !(r.horizontal && r.spanMm !== undefined));
  const area = overhangs.reduce((a, r) => a + r.areaMm2, 0);
  const longest = longBridges.reduce((m, r) => Math.max(m, r.spanMm ?? 0), 0);
  return [
    overhangs.length > 0
      ? c('fdm.overhangs', 'fail', `${r1(area)} mm² of unsupported overhang steeper than ${s.maxOverhangDeg}° in ${overhangs.length} region(s); add supports, reorient or chamfer.`, area, s.maxOverhangDeg)
      : c('fdm.overhangs', 'pass', `No unsupported overhang steeper than ${s.maxOverhangDeg}°.`, 0, s.maxOverhangDeg),
    longBridges.length > 0
      ? c('fdm.bridging', 'fail', `${longBridges.length} bridge(s) longer than ${s.maxBridgeMm} mm (longest ${r1(longest)} mm).`, longest, s.maxBridgeMm)
      : c('fdm.bridging', 'pass', `All bridges within ${s.maxBridgeMm} mm.`, undefined, s.maxBridgeMm),
  ];
}

function featureChecks(c: CheckFn, rep: FdmPartReport): DfmReviewCheck[] {
  const minWall = 2 * rep.settings.nozzleMm;
  const holes = rep.smallFeatures.filter(f => f.kind === 'hole');
  const pins = rep.smallFeatures.filter(f => f.kind === 'pin');
  const smallest = Math.min(...holes.map(h => h.diameterMm));
  return [
    rep.walls.violations.length > 0
      ? c('fdm.min-wall', 'fail', `Walls as thin as ${r2(rep.walls.thinnestMm)} mm, below 2 × nozzle (${r2(minWall)} mm).`, rep.walls.thinnestMm, minWall)
      : c('fdm.min-wall', 'pass', `Walls are at least 2 × nozzle (${r2(minWall)} mm).`, rep.walls.thinnestMm, minWall),
    holes.length > 0
      ? c('fdm.min-hole', 'fail', `${holes.length} hole(s) below the ${r2(holes[0].minDiameterMm)} mm minimum (smallest Ø${r2(smallest)} mm); they print undersized or close up.`, smallest, holes[0].minDiameterMm)
      : c('fdm.min-hole', 'pass', 'No holes below the printable minimum diameter.'),
    pins.length > 0
      ? c('fdm.min-pin', 'warn', `${pins.length} pin(s)/boss(es) below the ${r2(pins[0].minDiameterMm)} mm minimum; fragile.`)
      : c('fdm.min-pin', 'pass', 'No pins below the robust minimum diameter.'),
  ];
}

function bedChecks(c: CheckFn, rep: FdmPartReport): DfmReviewCheck[] {
  const o = rep.orientation;
  const size = `${r1(o.sizeMm.x)} x ${r1(o.sizeMm.y)} x ${r1(o.sizeMm.z)} mm`;
  let contact = c('fdm.bed-contact', 'pass', 'Bed contact is adequate.');
  if (o.bedContactLow) {
    contact = c('fdm.bed-contact', 'warn', `Low bed contact (${r1(100 * o.bedContact.ratio)}% of footprint); risk of poor adhesion.`);
  } else if (o.tipRisk) {
    contact = c('fdm.bed-contact', 'warn', 'Tall, narrow base; may tip or wobble while printing.');
  }
  return [
    o.fitsBed
      ? c('fdm.bed-fit', 'pass', `Fits the '${rep.settings.printer}' bed (${size}).`)
      : c('fdm.bed-fit', 'fail', `${size} does not fit the '${rep.settings.printer}' bed.`),
    contact,
  ];
}

export function fdmChecks(part: string, rep: FdmPartReport): DfmReviewCheck[] {
  const c = checkMaker(part);
  return [...overhangChecks(c, rep), ...featureChecks(c, rep), ...bedChecks(c, rep)];
}

export function cncChecks(part: string, rep: CncPartReport): DfmReviewCheck[] {
  const toolR = rep.settings.toolDiameterMm / 2;
  const u = rep.undercut;
  const undercutFail = u.areaMm2 > rep.settings.maxUndercutAreaMm2;
  const sharp = rep.sharpInternalCorners;
  const tight = rep.tightFillets;
  const minFillet = tight.length > 0 ? tight[0].radiusMm : undefined;
  const cornerFail = sharp.length > 0 || tight.length > 0;
  const found: string[] = [];
  if (sharp.length > 0) found.push(`${sharp.length} sharp internal corner(s) (radius 0)`);
  if (minFillet !== undefined) found.push(`${tight.length} internal fillet(s) as small as R${r2(minFillet)} mm`);
  const cornerValue = sharp.length > 0 ? 0 : minFillet;
  return [
    {
      id: 'cnc.undercuts', process: 'cnc', part,
      status: undercutFail ? 'fail' : 'pass',
      summary: undercutFail
        ? `${r1(u.areaMm2)} mm² of surface is unreachable from the allowed tool approach axes; needs another setup, a 4/5-axis machine or a redesign.`
        : 'No undercuts: every surface is reachable from the allowed approach axes.',
      value: r2(u.areaMm2), limit: r2(rep.settings.maxUndercutAreaMm2),
    },
    {
      id: 'cnc.internal-corner-radius', process: 'cnc', part,
      status: cornerFail ? 'fail' : 'pass',
      summary: cornerFail
        ? `${found.join(' and ')} below the R${r2(toolR)} mm tool radius (Ø${r2(rep.settings.toolDiameterMm)} mm end mill); add fillets ≥ R${r2(toolR)} mm or use a smaller tool.`
        : `All internal corners along the approach axes are ≥ R${r2(toolR)} mm.`,
      ...(cornerValue !== undefined ? { value: r2(cornerValue) } : {}),
      limit: r2(toolR),
    },
  ];
}
