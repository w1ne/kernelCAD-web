// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/dfmReview.ts
//
// MCP `dfm_review` tool: one manufacturability report for FDM 3D printing
// and/or 3-axis CNC milling, as a flat pass/fail checklist. Unlike
// verify({ check: 'dfm' }) it needs NO dfmSpec(...) in the script: it runs
// with sensible defaults (any FDM settings the script's dfmSpec declares are
// used as the base, then the call's own options win).
//
// FDM reuses the existing printability engine (checkFdmPrintability):
// overhangs, bridging, wall thickness vs nozzle, minimum hole / pin size,
// bed fit, bed contact and tip risk. CNC runs cncCheck.ts: undercuts and
// internal corner radius vs the end-mill radius.

import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import { FDM_DEFAULTS, type DfmFdmMetadata } from '../../../shared/intent/dfmSpecRecord';
import { findDfmSpec, resolveParts } from '../../../modeling/runtime/dfm/runDfmChecks';
import { checkFdmPrintability, type FdmPartReport } from '../../../modeling/runtime/dfm/fdmCheck';
import { axisVector, checkCncMachinability, type CncPartReport, type Vec3 } from '../../../modeling/runtime/dfm/cncCheck';
import { TriangleBvh } from '../../../modeling/runtime/dfm/meshBvh';
import { meshShapeForExport, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { PRINTER_PROFILE_IDS } from '../../../kernel/export/gcode/printerProfiles';

export type DfmProcess = 'fdm' | 'cnc';

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
  /** CNC: unreachable area tolerated before the undercut check fails, mm² (default 1). */
  max_undercut_area_mm2?: number;
}

export type DfmCheckStatus = 'pass' | 'fail' | 'warn';

export interface DfmReviewCheck {
  /** Stable check id, e.g. 'fdm.overhangs', 'cnc.undercuts'. */
  id: string;
  process: DfmProcess;
  part: string;
  status: DfmCheckStatus;
  /** One-line human-readable result. */
  summary: string;
  /** Measured value (mm / mm² / deg), when meaningful. */
  value?: number;
  /** The limit it was compared against. */
  limit?: number;
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
  diagnostics: CompilerDiagnostic[];
}

const r1 = (n: number): number => Math.round(n * 10) / 10;
const r2 = (n: number): number => Math.round(n * 100) / 100;

function invalid(message: string): DfmReviewOutput {
  return {
    ok: false,
    verdict: 'fail',
    processes: [],
    checks: [],
    diagnostics: [{
      target: 'export-occt',
      code: 'cli.invalid-args',
      severity: 'error',
      message: `dfm_review: ${message}`,
    } as CompilerDiagnostic],
  };
}

function positive(v: unknown, name: string): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? undefined : `${name} must be a positive number.`;
}

export async function dfmReviewTool(input: DfmReviewInput): Promise<DfmReviewOutput> {
  const processes: DfmProcess[] = input.processes ?? ['fdm', 'cnc'];
  if (!Array.isArray(processes) || processes.length === 0 || processes.some(p => p !== 'fdm' && p !== 'cnc')) {
    return invalid("processes must be a non-empty list of 'fdm' | 'cnc'.");
  }
  for (const [k, v] of [
    ['nozzle_mm', input.nozzle_mm], ['max_overhang_deg', input.max_overhang_deg],
    ['max_bridge_mm', input.max_bridge_mm], ['tool_diameter_mm', input.tool_diameter_mm],
    ['max_undercut_area_mm2', input.max_undercut_area_mm2],
  ] as const) {
    const err = positive(v, k);
    if (err !== undefined) return invalid(err);
  }
  if (input.max_overhang_deg !== undefined && input.max_overhang_deg > 90) {
    return invalid('max_overhang_deg must be in (0, 90].');
  }
  if (input.printer !== undefined && !PRINTER_PROFILE_IDS.includes(input.printer)) {
    return invalid(`unknown printer '${input.printer}'. Valid: ${PRINTER_PROFILE_IDS.join(', ')}.`);
  }
  let buildDirection: Vec3 | undefined;
  if (input.build_direction !== undefined) {
    buildDirection = axisVector(input.build_direction);
    if (buildDirection === undefined) return invalid("build_direction must be an axis token like '+z' or '-x'.");
  }
  const approachTokens = input.approach_axes ?? ['+z'];
  const approachAxes: Vec3[] = [];
  for (const t of approachTokens) {
    const v = typeof t === 'string' ? axisVector(t) : undefined;
    if (v === undefined) return invalid(`approach_axes entry '${String(t)}' must be an axis token like '+z'.`);
    approachAxes.push(v);
  }
  if (approachAxes.length === 0) return invalid('approach_axes must not be empty.');

  let built;
  try {
    built = await evaluateAndBuildScript({ file: input.file, code: input.code });
  } catch (e) {
    return { ok: false, verdict: 'fail', processes, checks: [], diagnostics: [kernelErrorToDiagnostic(e)] };
  }
  const { evaluation, model } = built;
  if (model === undefined || evaluation.exitCode !== 0) {
    return { ok: false, verdict: 'fail', processes, checks: [], diagnostics: evaluation.diagnostics };
  }

  const declared = findDfmSpec(model.records)?.fdm;
  const fdmSettings: DfmFdmMetadata = {
    buildDirection: buildDirection ?? declared?.buildDirection ?? [...FDM_DEFAULTS.buildDirection],
    nozzleMm: input.nozzle_mm ?? declared?.nozzleMm ?? FDM_DEFAULTS.nozzleMm,
    maxOverhangDeg: input.max_overhang_deg ?? declared?.maxOverhangDeg ?? FDM_DEFAULTS.maxOverhangDeg,
    maxBridgeMm: input.max_bridge_mm ?? declared?.maxBridgeMm ?? FDM_DEFAULTS.maxBridgeMm,
    printer: input.printer ?? declared?.printer ?? 'generic-fdm',
  };
  const toolDiameterMm = input.tool_diameter_mm ?? 6;
  const maxUndercutAreaMm2 = input.max_undercut_area_mm2 ?? 1;

  const checks: DfmReviewCheck[] = [];
  const diagnostics: CompilerDiagnostic[] = [...evaluation.diagnostics];
  const fdm: { part: string; result: FdmPartReport }[] = [];
  const cnc: { part: string; result: CncPartReport }[] = [];
  const { parts } = resolveParts(model);
  if (parts.length === 0) {
    return invalid('the script produced no solid to review.');
  }

  for (const part of parts) {
    try {
      const shape = part.shape as OcctBackend;
      const mesh = meshShapeForExport(shape.getReplicadShape());
      const bvh = new TriangleBvh(mesh);
      if (processes.includes('fdm')) {
        const r = checkFdmPrintability(shape, {
          settings: fdmSettings, part: part.name, refOwner: part.refOwner, mesh, bvh,
          toWorld: p => part.worldTransform.point(p),
        });
        fdm.push({ part: part.name, result: r.report });
        diagnostics.push(...r.diagnostics);
        checks.push(...fdmChecks(part.name, r.report));
      }
      if (processes.includes('cnc')) {
        const result = checkCncMachinability(shape, mesh, { toolDiameterMm, approachAxes, maxUndercutAreaMm2 }, bvh);
        cnc.push({ part: part.name, result });
        checks.push(...cncChecks(part.name, result));
      }
    } catch (e) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        severity: 'warn',
        message: `dfm_review: checking part '${part.name}' failed (${e instanceof Error ? e.message : String(e)}).`,
      } as CompilerDiagnostic);
      checks.push({
        id: 'review.kernel', process: processes[0], part: part.name, status: 'warn',
        summary: 'The kernel could not analyse this part; results are incomplete.',
      });
    }
  }

  const verdict = checks.some(c => c.status === 'fail') ? 'fail' : 'pass';
  return {
    ok: true,
    verdict,
    processes,
    checks,
    ...(fdm.length > 0 ? { fdm } : {}),
    ...(cnc.length > 0 ? { cnc } : {}),
    diagnostics,
  };
}

export function fdmChecks(part: string, rep: FdmPartReport): DfmReviewCheck[] {
  const o = rep.orientation;
  const s = rep.settings;
  const unsupported = o.overhangs.filter(r => r.status === 'unsupported');
  const longBridges = unsupported.filter(r => r.horizontal && r.spanMm !== undefined);
  const overhangs = unsupported.filter(r => !(r.horizontal && r.spanMm !== undefined));
  const overhangArea = overhangs.reduce((a, r) => a + r.areaMm2, 0);
  const longestBridge = longBridges.reduce((m, r) => Math.max(m, r.spanMm ?? 0), 0);
  const minWall = 2 * s.nozzleMm;
  const holes = rep.smallFeatures.filter(f => f.kind === 'hole');
  const pins = rep.smallFeatures.filter(f => f.kind === 'pin');
  const c = (id: string, status: DfmCheckStatus, summary: string, value?: number, limit?: number): DfmReviewCheck => ({
    id, process: 'fdm', part, status, summary,
    ...(value !== undefined && Number.isFinite(value) ? { value: r2(value) } : {}),
    ...(limit !== undefined ? { limit: r2(limit) } : {}),
  });
  return [
    c('fdm.overhangs', overhangs.length > 0 ? 'fail' : 'pass',
      overhangs.length > 0
        ? `${r1(overhangArea)} mm² of unsupported overhang steeper than ${s.maxOverhangDeg}° in ${overhangs.length} region(s); add supports, reorient or chamfer.`
        : `No unsupported overhang steeper than ${s.maxOverhangDeg}°.`,
      overhangArea, s.maxOverhangDeg),
    c('fdm.bridging', longBridges.length > 0 ? 'fail' : 'pass',
      longBridges.length > 0
        ? `${longBridges.length} bridge(s) longer than ${s.maxBridgeMm} mm (longest ${r1(longestBridge)} mm).`
        : `All bridges within ${s.maxBridgeMm} mm.`,
      longBridges.length > 0 ? longestBridge : undefined, s.maxBridgeMm),
    c('fdm.min-wall', rep.walls.violations.length > 0 ? 'fail' : 'pass',
      rep.walls.violations.length > 0
        ? `Walls as thin as ${r2(rep.walls.thinnestMm)} mm, below 2 × nozzle (${r2(minWall)} mm).`
        : `Walls are at least 2 × nozzle (${r2(minWall)} mm).`,
      rep.walls.thinnestMm, minWall),
    c('fdm.min-hole', holes.length > 0 ? 'fail' : 'pass',
      holes.length > 0
        ? `${holes.length} hole(s) below the ${r2(holes[0].minDiameterMm)} mm minimum (smallest Ø${r2(Math.min(...holes.map(h => h.diameterMm)))} mm); they print undersized or close up.`
        : 'No holes below the printable minimum diameter.',
      holes.length > 0 ? Math.min(...holes.map(h => h.diameterMm)) : undefined,
      holes.length > 0 ? holes[0].minDiameterMm : undefined),
    c('fdm.min-pin', pins.length > 0 ? 'warn' : 'pass',
      pins.length > 0
        ? `${pins.length} pin(s)/boss(es) below the ${r2(pins[0].minDiameterMm)} mm minimum; fragile.`
        : 'No pins below the robust minimum diameter.'),
    c('fdm.bed-fit', o.fitsBed ? 'pass' : 'fail',
      o.fitsBed
        ? `Fits the '${s.printer}' bed (${r1(o.sizeMm.x)} x ${r1(o.sizeMm.y)} x ${r1(o.sizeMm.z)} mm).`
        : `${r1(o.sizeMm.x)} x ${r1(o.sizeMm.y)} x ${r1(o.sizeMm.z)} mm does not fit the '${s.printer}' bed.`),
    c('fdm.bed-contact', o.bedContactLow || o.tipRisk ? 'warn' : 'pass',
      o.bedContactLow
        ? `Low bed contact (${r1(100 * o.bedContact.ratio)}% of footprint); risk of poor adhesion.`
        : o.tipRisk ? 'Tall, narrow base; may tip or wobble while printing.' : 'Bed contact is adequate.'),
  ];
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
