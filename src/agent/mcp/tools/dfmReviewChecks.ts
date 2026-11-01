// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/dfmReviewChecks.ts
//
// dfm_review checklist rows for the sheet-metal and injection-molding
// processes (the engine reports live in modeling/runtime/dfm/sheetMetalCheck.ts
// and mouldingCheck.ts — the dfmSpec({ process: 'moulding' }) engine; the
// FDM / CNC rows stay in dfmReview.ts). Row status follows that engine's
// diagnostic severity: undercut, draft and thin wall are errors (fail),
// thick wall and sharp corners are warnings (warn).

import type { SheetMetalPartReport } from '../../../modeling/runtime/dfm/sheetMetalCheck';
import type { MouldingPartReport } from '../../../modeling/runtime/dfm/mouldingCheck';

export type DfmProcess = 'fdm' | 'cnc' | 'sheet-metal' | 'injection-molding';
export type DfmCheckStatus = 'pass' | 'fail' | 'warn';

export interface DfmReviewCheck {
  /** Stable check id, e.g. 'fdm.overhangs', 'cnc.undercuts', 'sheet.hole-to-bend', 'mold.draft'. */
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

const r1 = (n: number): number => Math.round(n * 10) / 10;
const r2 = (n: number): number => Math.round(n * 100) / 100;
const xy = (p: readonly number[]): string => `(${p.map(v => r1(v)).join(', ')})`;

type CheckFn = (id: string, status: DfmCheckStatus, summary: string, value?: number, limit?: number) => DfmReviewCheck;

function checkMaker(process: DfmProcess, part: string): CheckFn {
  return (id, status, summary, value, limit) => ({
    id, process, part, status, summary,
    ...(value !== undefined && Number.isFinite(value) ? { value: r2(value) } : {}),
    ...(limit !== undefined && Number.isFinite(limit) ? { limit: r2(limit) } : {}),
  });
}

/** The single row for a part that has no sheetMetal(...) chain. */
export function notSheetMetalCheck(part: string): DfmReviewCheck {
  return checkMaker('sheet-metal', part)(
    'sheet.not-sheet-metal', 'warn',
    'Not a sheet-metal part (its shape is not a sheetMetal(...) chain of bends, holes and cutouts), so the sheet-metal checks were not run. Build it with sheetMetal(profile, { thickness, kFactor }).bend(...) to review it.',
  );
}

function bendRadiusCheck(c: CheckFn, rep: SheetMetalPartReport): DfmReviewCheck {
  const t = rep.thicknessMm;
  const minR = rep.settings.minBendRadiusRatio * t;
  if (rep.bends.length === 0) return c('sheet.min-bend-radius', 'pass', 'No bends.', undefined, minR);
  const bad = rep.bends.filter(b => !b.ok);
  const tightest = Math.min(...rep.bends.map(b => b.radiusMm));
  if (bad.length === 0) {
    return c('sheet.min-bend-radius', 'pass', `All ${rep.bends.length} bend(s) have an inner radius ≥ R${r2(minR)} mm (${rep.settings.minBendRadiusRatio} × ${r2(t)} mm thickness).`, tightest, minR);
  }
  const names = bad.map(b => b.featureId ?? `bend #${b.ordinal}`).join(', ');
  return c('sheet.min-bend-radius', 'fail', `${bad.length} bend(s) tighter than R${r2(minR)} mm (${rep.settings.minBendRadiusRatio} × ${r2(t)} mm thickness): ${names}, as tight as R${r2(tightest)} mm; the outside of the bend can crack. Increase the bend radius.`, tightest, minR);
}

function holeToBendCheck(c: CheckFn, rep: SheetMetalPartReport): DfmReviewCheck {
  const s = rep.settings;
  const rule = `${s.holeToBendThicknesses} × t + R`;
  if (rep.holeToBend.length === 0) return c('sheet.hole-to-bend', 'pass', rep.bends.length === 0 ? 'No bends.' : 'No holes or cutouts.');
  const bad = rep.holeToBend.filter(h => !h.ok);
  const worst = [...rep.holeToBend].sort((a, b) => (a.distanceMm - a.limitMm) - (b.distanceMm - b.limitMm))[0];
  if (bad.length === 0) return c('sheet.hole-to-bend', 'pass', `Every hole is at least ${rule} from the nearest bend line.`, worst.distanceMm, worst.limitMm);
  return c('sheet.hole-to-bend', 'fail', `${bad.length} hole(s) closer to a bend than ${rule}: the closest edge is ${r2(worst.distanceMm)} mm from bend #${worst.bend} (needs ${r2(worst.limitMm)} mm) at flat ${xy(worst.location)}; it will distort when bent. Move it away or add bend relief.`, worst.distanceMm, worst.limitMm);
}

function holeToEdgeCheck(c: CheckFn, rep: SheetMetalPartReport): DfmReviewCheck {
  const limit = rep.settings.holeToEdgeThicknesses * rep.thicknessMm;
  if (rep.holeToEdge.length === 0) return c('sheet.hole-to-edge', 'pass', 'No holes or cutouts.', undefined, limit);
  const bad = rep.holeToEdge.filter(h => !h.ok);
  const worst = [...rep.holeToEdge].sort((a, b) => a.distanceMm - b.distanceMm)[0];
  if (bad.length === 0) return c('sheet.hole-to-edge', 'pass', `Every hole is at least ${r2(limit)} mm (${rep.settings.holeToEdgeThicknesses} × t) from the blank edge.`, worst.distanceMm, limit);
  return c('sheet.hole-to-edge', 'fail', `${bad.length} hole(s) closer than ${r2(limit)} mm (${rep.settings.holeToEdgeThicknesses} × t) to the blank edge, the closest ${r2(worst.distanceMm)} mm at flat ${xy(worst.location)}; the web can tear or bulge.`, worst.distanceMm, limit);
}

function flangeCheck(c: CheckFn, rep: SheetMetalPartReport): DfmReviewCheck {
  const limit = rep.settings.minFlangeThicknesses * rep.thicknessMm;
  if (rep.flanges.length === 0) return c('sheet.min-flange', 'pass', 'No bends.', undefined, limit);
  const bad = rep.flanges.filter(f => !f.ok);
  const shortest = [...rep.flanges].sort((a, b) => a.lengthMm - b.lengthMm)[0];
  if (bad.length === 0) return c('sheet.min-flange', 'pass', `Every flange is at least ${r2(limit)} mm (${rep.settings.minFlangeThicknesses} × t) from the outside of its bend.`, shortest.lengthMm, limit);
  return c('sheet.min-flange', 'fail', `${bad.length} flange(s) shorter than ${r2(limit)} mm (${rep.settings.minFlangeThicknesses} × t), the shortest ${r2(shortest.lengthMm)} mm on bend #${shortest.bend}; it will not sit on the press-brake die. Lengthen it.`, shortest.lengthMm, limit);
}

export function sheetMetalChecks(part: string, rep: SheetMetalPartReport): DfmReviewCheck[] {
  const c = checkMaker('sheet-metal', part);
  return [bendRadiusCheck(c, rep), holeToBendCheck(c, rep), holeToEdgeCheck(c, rep), flangeCheck(c, rep)];
}

function draftCheck(c: CheckFn, rep: MouldingPartReport): DfmReviewCheck {
  const min = rep.settings.minDraftDeg;
  const d = rep.draft;
  const measured = Number.isFinite(d.minDraftDeg) ? d.minDraftDeg : undefined;
  if (d.insufficient.length === 0) {
    return c('mold.draft', 'pass', `All ${d.checkedFaces} face(s) off the pull axis have at least ${min}° draft.`, measured, min);
  }
  const area = d.insufficient.reduce((a, f) => a + f.areaMm2, 0);
  const faces = d.insufficient.slice(0, 4).map(f => f.faceRef).join(', ');
  const more = d.insufficient.length > 4 ? ' and more' : '';
  return c('mold.draft', 'fail', `${d.insufficient.length} face(s) (${r1(area)} mm²) have less than ${min}° draft to the pull direction, as low as ${r2(d.minDraftDeg)}°: ${faces}${more}; the part will drag or stick on ejection. Add draft (Shape.draft).`, d.minDraftDeg, min);
}

function wallCheck(c: CheckFn, rep: MouldingPartReport, maxRatio: number): DfmReviewCheck {
  const s = rep.settings;
  const thin = rep.walls;
  const thinnest = thin.thinnestMm;
  const thickest = rep.thickest?.thicknessMm;
  const range = `${r2(s.minWallMm)}–${r2(s.maxWallMm)} mm`;
  if (thin.violations.length > 0) {
    return c('mold.wall-thickness', 'fail', `Walls as thin as ${r2(thinnest)} mm, below the ${r2(s.minWallMm)} mm minimum (worst at ${xy(thin.violations[0].location)}); the melt may not fill them.`, thinnest, s.minWallMm);
  }
  if (rep.thickest !== null && thickest !== undefined && thickest > s.maxWallMm + 1e-9) {
    return c('mold.wall-thickness', 'warn', `A ${r2(thickest)} mm thick section at ${xy(rep.thickest.location)} exceeds the ${r2(s.maxWallMm)} mm maximum; it will sink and void. Core it out to a uniform wall.`, thickest, s.maxWallMm);
  }
  const ratio = thickest !== undefined && Number.isFinite(thinnest) && thinnest > 0 ? thickest / thinnest : undefined;
  if (ratio !== undefined && ratio > maxRatio) {
    return c('mold.wall-thickness', 'warn', `Walls stay within ${range} but vary ${r2(ratio)}× (${r2(thinnest)} to ${r2(thickest!)} mm, limit ${maxRatio}×); uneven walls cool unevenly and warp or sink.`, ratio, maxRatio);
  }
  return c('mold.wall-thickness', 'pass', `Walls are within ${range}${ratio !== undefined ? ` and uniform to ${r2(ratio)}×` : ''}.`, thickest, s.maxWallMm);
}

function undercutCheck(c: CheckFn, rep: MouldingPartReport): DfmReviewCheck {
  const u = rep.undercut;
  if (u.faces.length === 0) return c('mold.undercuts', 'pass', 'No undercuts: every face releases into the mold half it faces.', 0);
  const f = u.faces[0];
  return c('mold.undercuts', 'fail', `${r1(u.areaMm2)} mm² on ${u.faces.length} face(s) cannot release toward either mold half (±pull direction), largest ${f.faceRef} at ${xy(f.location)}; it needs a side action / lifter or a redesign.`, u.areaMm2);
}

function cornerCheck(c: CheckFn, rep: MouldingPartReport): DfmReviewCheck {
  const corners = rep.sharpCorners;
  const minR = rep.settings.minRadiusMm;
  if (corners.length === 0) return c('mold.sharp-internal-corners', 'pass', `No internal corners below R${r2(minR)} mm.`, undefined, minR);
  const first = corners[0];
  const where = first.faceRefs !== undefined ? `between ${first.faceRefs[0]} and ${first.faceRefs[1]}` : `R${r2(first.radiusMm)} mm fillet`;
  return c('mold.sharp-internal-corners', 'warn', `${corners.length} internal corner(s) below R${r2(minR)} mm, e.g. ${where} at ${xy(first.location)}; they concentrate stress and hinder flow. Fillet them.`, Math.min(...corners.map(k => k.radiusMm)), minR);
}

/** A quantity the engine could not measure is unknown, not passed. */
function unmeasuredChecks(c: CheckFn, rep: MouldingPartReport): DfmReviewCheck[] {
  return rep.unmeasured.length === 0 ? [] : [
    c('mold.unmeasured', 'warn', `Not measured on this part (unknown, not passed): ${rep.unmeasured.join('; ')}.`),
  ];
}

export function moldChecks(part: string, rep: MouldingPartReport, maxWallRatio: number): DfmReviewCheck[] {
  const c = checkMaker('injection-molding', part);
  return [draftCheck(c, rep), wallCheck(c, rep, maxWallRatio), undercutCheck(c, rep), cornerCheck(c, rep), ...unmeasuredChecks(c, rep)];
}
