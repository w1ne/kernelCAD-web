// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pick at most one DFM auto-fix. The three fixes are numeric bumps of an
// existing feature argument, each capped at the limit the check already
// named:
//   - fillet / filletIntersection radius → the check limit (named maximum)
//   - shell() thickness → the minimum wall, plus DFM_MIN_WALL_CLEARANCE_MM
//   - draft() angle → the minimum draft
// Anything else is a suggestion. A measured value with no matching feature
// (a sharp corner, a thin box dimension, an undrafted face) is not edited.

import type { NextAction } from '../../../shared/diagnostics/nextAction';
import { NEXT_ACTIONS, type DiagnosticCode } from '../../../shared/diagnostics/registry';
import type { DfmReviewCheck } from './dfmReviewChecks';

/** One source edit per dfm_fix_recheck call. */
export const DFM_FIX_RECHECK_MAX_APPLIES = 1;

/** dfm_review rounds checklist numbers to 0.01; wall rays can sit slightly off the shell. */
const MATCH_TOLERANCE = 0.05;

/**
 * The wall sampler fails `t < minWall`. A shell whose thickness equals that
 * limit still measures a hair under it (an open box at 0.8 mm reports 0.8
 * and fails; 0.81 mm passes). One reporting step above the named minimum
 * is enough for that undershoot and stays on the minimum the check named.
 */
export const DFM_MIN_WALL_CLEARANCE_MM = 0.01;

export interface DfmFixParam {
  evaluated: number;
  paramRef?: unknown;
}

/** The feature fields the planner reads. FeatureRecord satisfies this. */
export interface DfmFixFeature {
  id: string;
  kind: string;
  params: Record<string, DfmFixParam>;
}

export type DfmAutoFixKind = 'increase-fillet-radius' | 'thicken-wall' | 'increase-draft';

export interface DfmAutoFixPlan {
  kind: DfmAutoFixKind;
  checkId: string;
  part: string;
  feature: string;
  param: 'radius' | 'thickness' | 'angle';
  before: number;
  after: number;
  /** The process limit. Fillet radius and draft stop here. Wall thickness is this plus DFM_MIN_WALL_CLEARANCE_MM. */
  namedLimit: number;
  unit: 'mm' | 'deg';
  summary: string;
}

export interface DfmFixSuggestion {
  id: string;
  part: string;
  status: 'fail' | 'warn';
  summary: string;
  guidance: string;
}

export interface DfmAutoFixSelection {
  plan?: DfmAutoFixPlan;
  suggestions: DfmFixSuggestion[];
  refusal?: string;
}

const FIX_ORDER = [
  'fdm.min-wall',
  'mold.wall-thickness',
  'cnc.internal-corner-radius',
  'mold.draft',
  'mold.sharp-internal-corners',
] as const;

const FILLET_KINDS = new Set(['fillet', 'filletIntersection']);

const DIAGNOSTIC_TO_CHECK: Partial<Record<DiagnosticCode, string>> = {
  'dfm.wall.too-thin': 'fdm.min-wall',
  'dfm.fdm.wall-below-nozzle': 'fdm.min-wall',
  'dfm.fdm.overhang-unsupported': 'fdm.overhangs',
  'dfm.fdm.bridge-too-long': 'fdm.bridging',
  'dfm.fdm.feature-too-small': 'fdm.min-hole',
  'dfm.fdm.bed-contact-low': 'fdm.bed-contact',
  'dfm.fdm.tip-risk': 'fdm.bed-contact',
  'dfm.fdm.exceeds-bed': 'fdm.bed-fit',
  'dfm.moulding.thin-wall': 'mold.wall-thickness',
  'dfm.moulding.thick-wall': 'mold.wall-thickness',
  'dfm.moulding.draft-insufficient': 'mold.draft',
  'dfm.moulding.sharp-corner': 'mold.sharp-internal-corners',
  'dfm.moulding.undercut': 'mold.undercuts',
};

const CHECK_TO_DIAGNOSTIC: Partial<Record<string, DiagnosticCode>> = {
  'fdm.min-wall': 'dfm.fdm.wall-below-nozzle',
  'fdm.overhangs': 'dfm.fdm.overhang-unsupported',
  'fdm.bridging': 'dfm.fdm.bridge-too-long',
  'fdm.min-hole': 'dfm.fdm.feature-too-small',
  'fdm.min-pin': 'dfm.fdm.feature-too-small',
  'fdm.bed-contact': 'dfm.fdm.bed-contact-low',
  'fdm.bed-fit': 'dfm.fdm.exceeds-bed',
  'mold.draft': 'dfm.moulding.draft-insufficient',
  'mold.undercuts': 'dfm.moulding.undercut',
  'mold.sharp-internal-corners': 'dfm.moulding.sharp-corner',
};

const LOCAL_GUIDANCE: Record<string, string> = {
  'cnc.internal-corner-radius':
    'Increase an existing internal fillet to the end-mill radius (the named maximum this tool will apply), or add fillets at least that large. A radius-0 corner is not auto-fixed.',
  'cnc.undercuts': 'Open the face to an approach axis or add a setup. No bounded auto-fix.',
  'sheet.min-bend-radius': 'Increase the bend radius to at least the stated minimum. Not auto-applied in this loop.',
  'sheet.hole-to-bend': 'Move the hole away from the bend or add bend relief. Not auto-applied.',
  'sheet.hole-to-edge': 'Move the hole in from the blank edge. Not auto-applied.',
  'sheet.min-flange': 'Lengthen the flange. Not auto-applied.',
  'sheet.not-sheet-metal': 'Build the part with sheetMetal(...).bend(...) before sheet checks apply.',
  'mold.undercuts': 'Open the face to the pull direction or move it onto a side action. Not auto-applied.',
  'mold.unmeasured': 'Inspect the part for open or degenerate geometry and re-run. Not auto-applied.',
};

const KNOWN_CHECK_IDS = new Set<string>([
  ...FIX_ORDER,
  ...Object.keys(CHECK_TO_DIAGNOSTIC),
  ...Object.keys(LOCAL_GUIDANCE),
  'mold.wall-thickness',
]);

function num(n: number): string {
  return String(Number(n.toPrecision(12)));
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= MATCH_TOLERANCE;
}

function guidanceText(action: NextAction): string {
  switch (action.kind) {
    case 'rewrite-feature':
    case 'reorder-pipeline':
    case 'rename':
      return action.guidance;
    case 'retry-with-smaller-param':
      return `retry with a smaller ${action.param} (×${action.factor}); not applied by this tool`;
    case 'inspect-message':
      return 'inspect the diagnostic message; no bounded auto-fix';
    default:
      return 'No bounded auto-fix for this finding.';
  }
}

export function guidanceForCheck(check: DfmReviewCheck): string {
  if (check.id === 'mold.wall-thickness' && check.status !== 'fail') {
    const thick = check.value !== undefined && check.limit !== undefined && check.value > check.limit;
    return thick
      ? guidanceText(NEXT_ACTIONS['dfm.moulding.thick-wall'])
      : check.summary;
  }
  const code = check.id === 'mold.wall-thickness' && check.status === 'fail'
    ? 'dfm.moulding.thin-wall'
    : CHECK_TO_DIAGNOSTIC[check.id];
  if (code !== undefined) return guidanceText(NEXT_ACTIONS[code]);
  return LOCAL_GUIDANCE[check.id] ?? check.summary;
}

function isFailOrWarn(c: DfmReviewCheck): c is DfmReviewCheck & { status: 'fail' | 'warn' } {
  return c.status === 'fail' || c.status === 'warn';
}

function suggestionsFor(checks: readonly DfmReviewCheck[]): DfmFixSuggestion[] {
  return checks
    .filter(isFailOrWarn)
    .map(c => ({
      id: c.id,
      part: c.part,
      status: c.status,
      summary: c.summary,
      guidance: guidanceForCheck(c),
    }));
}

function resolveTarget(findingId?: string, diagnosticCode?: string): { id?: string; refusal?: string } {
  const fromCode = diagnosticCode === undefined ? undefined : (
    (DIAGNOSTIC_TO_CHECK as Record<string, string | undefined>)[diagnosticCode]
    ?? (KNOWN_CHECK_IDS.has(diagnosticCode) ? diagnosticCode : undefined)
  );
  if (diagnosticCode !== undefined && fromCode === undefined) {
    return { refusal: `Unknown diagnostic_code '${diagnosticCode}'.` };
  }
  if (findingId !== undefined && fromCode !== undefined && findingId !== fromCode) {
    return { refusal: `finding_id '${findingId}' and diagnostic_code '${diagnosticCode}' name different checks.` };
  }
  return { id: findingId ?? fromCode };
}

interface ParamReading {
  value: number;
  driven: boolean;
  paramRef?: string;
}

function readParam(feature: DfmFixFeature, name: string): ParamReading | undefined {
  const param = feature.params[name];
  if (param === undefined || typeof param.evaluated !== 'number' || !Number.isFinite(param.evaluated)) return undefined;
  const paramRef = typeof param.paramRef === 'string' ? param.paramRef : undefined;
  return { value: param.evaluated, driven: param.paramRef !== undefined, ...(paramRef !== undefined ? { paramRef } : {}) };
}

type Attempt = { plan: DfmAutoFixPlan } | { reason: string };

function drivenReason(checkId: string, feature: DfmFixFeature, param: string, reading: ParamReading): string {
  const ref = reading.paramRef !== undefined ? `param('${reading.paramRef}')` : 'a param() expression';
  return `No safe auto-fix for ${checkId}: ${feature.id}.${param} is driven by ${ref}. Use set_param; this tool does not detach it.`;
}

function matchFeatures(
  records: readonly DfmFixFeature[],
  kinds: ReadonlySet<string> | string,
  param: string,
  measured: number,
  limit: number,
): { matches: Array<{ feature: DfmFixFeature; reading: ParamReading }>; driven: Array<{ feature: DfmFixFeature; reading: ParamReading }> } {
  const kindSet = typeof kinds === 'string' ? new Set([kinds]) : kinds;
  const matches: Array<{ feature: DfmFixFeature; reading: ParamReading }> = [];
  const driven: Array<{ feature: DfmFixFeature; reading: ParamReading }> = [];
  for (const feature of records) {
    if (!kindSet.has(feature.kind)) continue;
    const reading = readParam(feature, param);
    if (reading === undefined || !near(reading.value, measured) || !(reading.value < limit - 1e-9)) continue;
    if (reading.driven) driven.push({ feature, reading });
    else matches.push({ feature, reading });
  }
  return { matches, driven };
}

function filletPlan(check: DfmReviewCheck, feature: DfmFixFeature, before: number): DfmAutoFixPlan {
  const after = check.limit!;
  return {
    kind: 'increase-fillet-radius',
    checkId: check.id,
    part: check.part,
    feature: feature.id,
    param: 'radius',
    before,
    after,
    namedLimit: after,
    unit: 'mm',
    summary: `Increased ${feature.id} radius from ${num(before)} mm to ${num(after)} mm, the named maximum for ${check.id}.`,
  };
}

function attemptFillet(check: DfmReviewCheck, records: readonly DfmFixFeature[]): Attempt {
  const limit = check.limit;
  const measured = check.value;
  if (limit === undefined || measured === undefined || !Number.isFinite(limit) || !Number.isFinite(measured)) {
    return { reason: `No safe auto-fix for ${check.id}: the check has no measured radius to raise.` };
  }
  if (!(measured > MATCH_TOLERANCE)) {
    return {
      reason: `No safe auto-fix for ${check.id}: sharp corners (radius 0) need a new fillet. This tool only raises an existing fillet radius up to the named maximum (${num(limit)} mm).`,
    };
  }
  const { matches, driven } = matchFeatures(records, FILLET_KINDS, 'radius', measured, limit);
  if (matches.length === 1) return { plan: filletPlan(check, matches[0].feature, matches[0].reading.value) };
  if (matches.length > 1) return { reason: `No safe auto-fix for ${check.id}: more than one fillet matches the measured radius.` };
  if (driven.length === 1) return { reason: drivenReason(check.id, driven[0].feature, 'radius', driven[0].reading) };
  return {
    reason: `No safe auto-fix for ${check.id}: no fillet() or filletIntersection() radius matches the measured R${num(measured)} mm.`,
  };
}

function attemptWall(check: DfmReviewCheck, records: readonly DfmFixFeature[]): Attempt {
  if (check.status !== 'fail') {
    return { reason: `No safe auto-fix for ${check.id}: a thick section or uneven ratio is not thinned or cored automatically.` };
  }
  const limit = check.limit;
  const measured = check.value;
  if (limit === undefined || measured === undefined || !Number.isFinite(limit) || !Number.isFinite(measured)) {
    return { reason: `No safe auto-fix for ${check.id}: the check has no measured wall to thicken.` };
  }
  const { matches, driven } = matchFeatures(records, 'shell', 'thickness', measured, limit);
  if (matches.length === 1) {
    const before = matches[0].reading.value;
    return {
      plan: {
        kind: 'thicken-wall',
        checkId: check.id,
        part: check.part,
        feature: matches[0].feature.id,
        param: 'thickness',
        before,
        after: Number(num(limit + DFM_MIN_WALL_CLEARANCE_MM)),
        namedLimit: limit,
        unit: 'mm',
        summary: `Increased ${matches[0].feature.id} thickness from ${num(before)} mm to ${num(limit + DFM_MIN_WALL_CLEARANCE_MM)} mm, ${DFM_MIN_WALL_CLEARANCE_MM} mm above the ${num(limit)} mm minimum wall.`,
      },
    };
  }
  if (matches.length > 1) return { reason: `No safe auto-fix for ${check.id}: more than one shell() matches the measured wall.` };
  if (driven.length === 1) return { reason: drivenReason(check.id, driven[0].feature, 'thickness', driven[0].reading) };
  return {
    reason: `No safe auto-fix for ${check.id}: no shell() thickness matches the measured ${num(measured)} mm wall. This tool does not resize unrelated dimensions.`,
  };
}

function attemptDraft(check: DfmReviewCheck, records: readonly DfmFixFeature[]): Attempt {
  if (check.status !== 'fail') return { reason: `No safe auto-fix for ${check.id}.` };
  const limit = check.limit;
  const measured = check.value;
  if (limit === undefined || measured === undefined || !Number.isFinite(limit) || !Number.isFinite(measured)) {
    return { reason: `No safe auto-fix for ${check.id}: the check has no measured draft to increase.` };
  }
  const { matches, driven } = matchFeatures(records, 'draft', 'angle', measured, limit);
  if (matches.length === 1) {
    const before = matches[0].reading.value;
    return {
      plan: {
        kind: 'increase-draft',
        checkId: check.id,
        part: check.part,
        feature: matches[0].feature.id,
        param: 'angle',
        before,
        after: limit,
        namedLimit: limit,
        unit: 'deg',
        summary: `Increased ${matches[0].feature.id} angle from ${num(before)} deg to ${num(limit)} deg, the named minimum draft.`,
      },
    };
  }
  if (matches.length > 1) return { reason: `No safe auto-fix for ${check.id}: more than one draft() matches the measured angle.` };
  if (driven.length === 1) return { reason: drivenReason(check.id, driven[0].feature, 'angle', driven[0].reading) };
  return {
    reason: `No safe auto-fix for ${check.id}: no draft() angle matches the measured ${num(measured)}°. This tool does not add draft to undrafted faces.`,
  };
}

function attemptKnown(check: DfmReviewCheck, records: readonly DfmFixFeature[]): Attempt | undefined {
  switch (check.id) {
    case 'cnc.internal-corner-radius':
    case 'mold.sharp-internal-corners':
      return attemptFillet(check, records);
    case 'fdm.min-wall':
    case 'mold.wall-thickness':
      return attemptWall(check, records);
    case 'mold.draft':
      return attemptDraft(check, records);
    default:
      return undefined;
  }
}

function orderedOpen(checks: readonly DfmReviewCheck[], status: 'fail' | 'warn'): DfmReviewCheck[] {
  const open = checks.filter(c => c.status === status);
  const out: DfmReviewCheck[] = [];
  for (const id of FIX_ORDER) {
    for (const check of open) if (check.id === id) out.push(check);
  }
  return out;
}

/**
 * Choose the single safe edit for this review, or explain why none was chosen.
 * `findingId` is a dfm_review check id. `diagnosticCode` is a `dfm.*` code or
 * the same check id. A target that is not safe does not fall through to a
 * different finding.
 */
function planTargeted(
  checkId: string,
  checks: readonly DfmReviewCheck[],
  records: readonly DfmFixFeature[],
  suggestions: DfmFixSuggestion[],
): DfmAutoFixSelection {
  const group = checks.filter(c => c.id === checkId);
  const open = group.filter(c => c.status !== 'pass');
  if (group.length === 0) return { suggestions, refusal: `No check '${checkId}' in this review.` };
  if (open.length === 0) return { suggestions, refusal: `Check '${checkId}' already passes.` };
  if (open.length > 1) {
    return { suggestions, refusal: `No safe auto-fix for ${checkId}: more than one part has this check.` };
  }
  const attempt = attemptKnown(open[0], records);
  if (attempt === undefined) return { suggestions, refusal: `No safe auto-fix for ${checkId}.` };
  if ('reason' in attempt) return { suggestions, refusal: attempt.reason };
  return { plan: attempt.plan, suggestions };
}

function planFirstOpen(
  checks: readonly DfmReviewCheck[],
  records: readonly DfmFixFeature[],
  suggestions: DfmFixSuggestion[],
): DfmAutoFixSelection {
  if (suggestions.length === 0) {
    const incomplete = checks.some(check => check.status === 'not-checked');
    return {
      suggestions,
      refusal: incomplete
        ? 'DFM review incomplete; one or more requested checks were not run.'
        : 'DFM review passed; nothing to fix.',
    };
  }
  const considered: string[] = [];
  for (const check of [...orderedOpen(checks, 'fail'), ...orderedOpen(checks, 'warn')]) {
    if (checks.filter(c => c.id === check.id && c.status === check.status).length > 1) continue;
    const attempt = attemptKnown(check, records);
    if (attempt !== undefined && 'plan' in attempt) return { plan: attempt.plan, suggestions };
    if (attempt !== undefined && 'reason' in attempt) considered.push(attempt.reason);
  }
  if (suggestions.length === 1 && considered.length === 1) return { suggestions, refusal: considered[0] };
  return {
    suggestions,
    refusal: 'No safe auto-fix for this review. Suggested fixes are listed and were not applied.',
  };
}

export function planDfmAutoFix(input: {
  checks: readonly DfmReviewCheck[];
  records: readonly DfmFixFeature[];
  findingId?: string;
  diagnosticCode?: string;
}): DfmAutoFixSelection {
  const suggestions = suggestionsFor(input.checks);
  const target = resolveTarget(input.findingId, input.diagnosticCode);
  if (target.refusal !== undefined) return { suggestions, refusal: target.refusal };
  if (target.id !== undefined) return planTargeted(target.id, input.checks, input.records, suggestions);
  return planFirstOpen(input.checks, input.records, suggestions);
}
