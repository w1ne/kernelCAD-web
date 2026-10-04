// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Practical body-likeness gate for organic / automotive envelopes.
 *
 * Two layers:
 *  1. Cheap automated AABB vs wheel checks (no CV).
 *  2. Agent-supplied still verdicts after render_preview / open_in_studio ortho
 *     views — silhouette cues that need a vision-capable agent.
 *
 * Honest contract: silhouette-weak evidence alone must not claim publish
 * success. Call via `verify({ check: 'body-likeness', ... })` before
 * open_in_studio for cars / organic bodies.
 */

export type Vec3 = readonly [number, number, number];

export interface BBox {
  min: Vec3;
  max: Vec3;
}

export interface WheelSpec {
  /** Wheel centre in model mm (Z-up). */
  center: Vec3;
  /** Tire outer radius in mm. Required for ground-clearance / body-over-wheels-z. */
  radius: number;
}

export interface StillVerdict {
  /** Checklist code — see REQUIRED_AUTOMOTIVE_STILL_CODES. */
  code: string;
  passed: boolean;
  /** Concrete observation from an ortho still (not a restatement of the code). */
  finding: string;
  /** Which view the finding came from. */
  view?: 'side' | 'rear' | 'front' | 'top' | 'iso';
}

export type LengthAxis = 'x' | 'y';

/** Still codes agents must supply for automotive / organic body publish claims. */
export const REQUIRED_AUTOMOTIVE_STILL_CODES = [
  'side-body-over-wheels',
  'side-cabin-aft',
  'rear-haunch',
  'ortho-proportions-vs-reference',
] as const;

export type AutomotiveStillCode = (typeof REQUIRED_AUTOMOTIVE_STILL_CODES)[number];

export interface BodyLikenessInput {
  body: BBox;
  /** Wheel centres + radii. Prefer 2–4 wheels. Empty → skip wheel-relative auto checks. */
  wheels?: readonly WheelSpec[];
  /** Optional cabin / greenhouse AABB for automated cabin-aft. */
  cabin?: BBox;
  /** Model length axis (wheelbase direction). Default 'x'. */
  lengthAxis?: LengthAxis;
  /**
   * Agent-supplied still verdicts after inspecting ortho PNGs / Studio.
   * Required when requireStills is true (default).
   */
  stillVerdicts?: readonly StillVerdict[];
  /** When true (default), missing/failed stills fail the gate. */
  requireStills?: boolean;
  /** XY footprint margin: wheel centre may sit this far outside body AABB (mm). Default 0.15 * body width. */
  footprintMarginMm?: number;
  /** Max body rocker height above tire top before "floating body" fails (mm). Default 0.35 * body height. */
  maxBodyAboveWheelTopMm?: number;
  /** Min body overhang past front/rear wheel centres along length (mm). Default 0.05 * body length. */
  minOverhangMm?: number;
}

export interface LikenessCheckResult {
  code: string;
  passed: boolean;
  automated: boolean;
  message: string;
  hint?: string;
}

export interface BodyLikenessResult {
  ok: boolean;
  /** True only when every required check passed (auto + stills). */
  publishReady: boolean;
  checks: LikenessCheckResult[];
  diagnostics: Array<{
    code: string;
    severity: 'error' | 'warn';
    message: string;
    hint?: string;
  }>;
  summary: string;
}

function axisIndex(axis: LengthAxis): 0 | 1 {
  return axis === 'x' ? 0 : 1;
}

function extent(b: BBox, i: 0 | 1 | 2): number {
  return b.max[i] - b.min[i];
}

function centerOf(b: BBox): Vec3 {
  return [
    (b.min[0] + b.max[0]) / 2,
    (b.min[1] + b.max[1]) / 2,
    (b.min[2] + b.max[2]) / 2,
  ];
}

function isFiniteBBox(b: BBox): boolean {
  return [...b.min, ...b.max].every((n) => Number.isFinite(n)) &&
    b.max[0] > b.min[0] && b.max[1] > b.min[1] && b.max[2] > b.min[2];
}

interface BodyMetrics {
  lengthAxis: LengthAxis;
  li: 0 | 1;
  wi: 0 | 1;
  bodyLen: number;
  bodyWidth: number;
  bodyHeight: number;
  footprintMargin: number;
  maxAboveTop: number;
  minOverhang: number;
}

function bodyMetrics(input: BodyLikenessInput): BodyMetrics {
  const lengthAxis = input.lengthAxis ?? 'x';
  const li = axisIndex(lengthAxis);
  const wi: 0 | 1 = li === 0 ? 1 : 0;
  const bodyLen = extent(input.body, li);
  const bodyWidth = extent(input.body, wi);
  const bodyHeight = extent(input.body, 2);
  return {
    lengthAxis,
    li,
    wi,
    bodyLen,
    bodyWidth,
    bodyHeight,
    footprintMargin: input.footprintMarginMm ?? Math.max(5, 0.15 * bodyWidth),
    maxAboveTop: input.maxBodyAboveWheelTopMm ?? Math.max(10, 0.35 * bodyHeight),
    minOverhang: input.minOverhangMm ?? Math.max(5, 0.05 * bodyLen),
  };
}

function checkWheelFootprint(
  body: BBox,
  wheels: readonly WheelSpec[],
  m: BodyMetrics,
): LikenessCheckResult {
  const outside: string[] = [];
  for (const [i, w] of wheels.entries()) {
    const dx = w.center[m.li] < body.min[m.li] - m.footprintMargin
      || w.center[m.li] > body.max[m.li] + m.footprintMargin;
    const dy = w.center[m.wi] < body.min[m.wi] - m.footprintMargin
      || w.center[m.wi] > body.max[m.wi] + m.footprintMargin;
    if (dx || dy) outside.push(`#${i} @ [${w.center.join(', ')}]`);
  }
  return {
    code: 'wheels-under-body-footprint',
    passed: outside.length === 0,
    automated: true,
    message: outside.length === 0
      ? `All ${wheels.length} wheel centres lie inside the body XY footprint (±${m.footprintMargin.toFixed(1)} mm).`
      : `Wheel centres outside body footprint (±${m.footprintMargin.toFixed(1)} mm): ${outside.join('; ')}.`,
    hint: outside.length === 0
      ? undefined
      : 'Move wheels under the body or widen/lengthen the envelope so the wheelbase sits inside the body AABB.',
  };
}

function checkBodyOverWheelsZ(
  body: BBox,
  wheels: readonly WheelSpec[],
  m: BodyMetrics,
): LikenessCheckResult {
  const maxTireTop = Math.max(...wheels.map((w) => w.center[2] + w.radius));
  const rocker = body.min[2];
  const floatGap = rocker - maxTireTop;
  const floating = floatGap > m.maxAboveTop;
  const minAxle = Math.min(...wheels.map((w) => w.center[2]));
  const buried = rocker > minAxle + m.bodyHeight * 0.85;
  return {
    code: 'body-over-wheels-z',
    passed: !floating && !buried,
    automated: true,
    message: floating
      ? `Body rocker (z=${rocker.toFixed(1)}) sits ${floatGap.toFixed(1)} mm above tire top (max ${maxTireTop.toFixed(1)}); threshold ${m.maxAboveTop.toFixed(1)} mm — floating shell.`
      : buried
        ? `Body rocker (z=${rocker.toFixed(1)}) is near/above wheel axles with body height ${m.bodyHeight.toFixed(1)} — wheels likely buried in the solid.`
        : `Body rocker z=${rocker.toFixed(1)} vs tire top ${maxTireTop.toFixed(1)} (gap ${floatGap.toFixed(1)} mm) looks seated.`,
    hint: floating || buried
      ? 'Drop the body onto the wheels (rocker near tire top) or raise wheel centres; do not publish a loft floating above the chassis.'
      : undefined,
  };
}

function checkBodySpansWheelbase(
  body: BBox,
  wheels: readonly WheelSpec[],
  m: BodyMetrics,
): LikenessCheckResult {
  const wheelLen = wheels.map((w) => w.center[m.li]);
  const frontWheel = Math.min(...wheelLen);
  const rearWheel = Math.max(...wheelLen);
  const frontOverhang = frontWheel - body.min[m.li];
  const rearOverhang = body.max[m.li] - rearWheel;
  const spans = frontOverhang >= m.minOverhang && rearOverhang >= m.minOverhang && rearWheel > frontWheel;
  return {
    code: 'body-spans-wheelbase',
    passed: spans,
    automated: true,
    message: spans
      ? `Body spans wheelbase on ${m.lengthAxis}: front overhang ${frontOverhang.toFixed(1)} mm, rear ${rearOverhang.toFixed(1)} mm.`
      : `Body does not span wheelbase on ${m.lengthAxis} with ≥${m.minOverhang.toFixed(1)} mm overhang (front ${frontOverhang.toFixed(1)}, rear ${rearOverhang.toFixed(1)}, wheels ${frontWheel.toFixed(1)}→${rearWheel.toFixed(1)}).`,
    hint: spans
      ? undefined
      : 'Extend the body past the front and rear axles, or move wheels inside the envelope.',
  };
}

function checkCabinAft(
  cabin: BBox,
  wheels: readonly WheelSpec[],
  m: BodyMetrics,
): LikenessCheckResult {
  const wheelLen = wheels.map((w) => w.center[m.li]);
  const midWheelbase = (Math.min(...wheelLen) + Math.max(...wheelLen)) / 2;
  const cabinCenter = centerOf(cabin)[m.li];
  const aft = cabinCenter >= midWheelbase - m.bodyLen * 0.02;
  return {
    code: 'cabin-aft-auto',
    passed: aft,
    automated: true,
    message: aft
      ? `Cabin centre on ${m.lengthAxis} (${cabinCenter.toFixed(1)}) is at/aft of mid-wheelbase (${midWheelbase.toFixed(1)}).`
      : `Cabin centre on ${m.lengthAxis} (${cabinCenter.toFixed(1)}) is forward of mid-wheelbase (${midWheelbase.toFixed(1)}) — cabin-aft cue missed.`,
    hint: aft
      ? undefined
      : 'Shift the greenhouse / cabin volume aft of mid-wheelbase for sports-car / berlinetta proportions.',
  };
}

function runAutomatedChecks(input: BodyLikenessInput, m: BodyMetrics): LikenessCheckResult[] {
  const wheels = input.wheels ?? [];
  if (wheels.length === 0) {
    return [{
      code: 'wheels-declared',
      passed: false,
      automated: true,
      message: 'No wheels[] supplied — skipped footprint / body-over-wheels-z / wheelbase auto checks.',
      hint: 'Pass wheels: [{ center: [x,y,z], radius }] (2–4) from inspect/assembly bboxes so automated gates can run.',
    }];
  }
  const bad = wheels.find((w) => !(w.radius > 0) || !w.center.every(Number.isFinite));
  if (bad) {
    return [{
      code: 'wheels-declared',
      passed: false,
      automated: true,
      message: 'Each wheel needs a finite center [x,y,z] and radius > 0 (mm).',
    }];
  }
  const checks = [
    checkWheelFootprint(input.body, wheels, m),
    checkBodyOverWheelsZ(input.body, wheels, m),
    checkBodySpansWheelbase(input.body, wheels, m),
  ];
  if (input.cabin && isFiniteBBox(input.cabin) && wheels.length >= 2) {
    checks.push(checkCabinAft(input.cabin, wheels, m));
  }
  return checks;
}

function stillHint(code: string): string {
  switch (code) {
    case 'side-body-over-wheels':
      return 'render_preview views:["right"] (or open_in_studio): confirm the body rocker sits on/over the wheels, not floating above or burying them; record what you see.';
    case 'side-cabin-aft':
      return 'Side still: cabin / greenhouse mass should sit aft of mid-wheelbase for berlinetta proportions; note A-pillar vs axle positions.';
    case 'rear-haunch':
      return 'Rear/3/4 still: confirm a rear fender haunch / shoulder (not a flat extruded slab); describe the cue.';
    case 'ortho-proportions-vs-reference':
      return 'Compare front/side/top stills to the reference image: length/height/wheelbase proportions must match; cite the mismatch if any.';
    default:
      return 'Inspect ortho stills from render_preview or open_in_studio and record a concrete finding before claiming success.';
  }
}

function runStillChecks(
  stills: readonly StillVerdict[],
  requireStills: boolean,
): LikenessCheckResult[] {
  if (requireStills) {
    return REQUIRED_AUTOMOTIVE_STILL_CODES.map((code) => {
      const hit = stills.find((s) => s.code === code);
      if (!hit) {
        return {
          code,
          passed: false,
          automated: false,
          message: `Missing still verdict for '${code}'.`,
          hint: stillHint(code),
        };
      }
      const finding = (hit.finding ?? '').trim();
      const weak = finding.length < 12;
      const passed = hit.passed === true && !weak;
      return {
        code,
        passed,
        automated: false,
        message: !hit.passed
          ? `Still '${code}' failed: ${finding || '(empty finding)'}`
          : weak
            ? `Still '${code}' passed but finding is too thin ("${finding}") — need a concrete ortho observation.`
            : `Still '${code}' passed (${hit.view ?? 'view?'}): ${finding}`,
        hint: passed ? undefined : stillHint(code),
      };
    });
  }
  return stills.map((s) => ({
    code: s.code,
    passed: s.passed === true && (s.finding ?? '').trim().length >= 12,
    automated: false,
    message: s.passed
      ? `Still '${s.code}': ${s.finding}`
      : `Still '${s.code}' failed: ${s.finding}`,
  }));
}

function toDiagnostics(checks: LikenessCheckResult[]): BodyLikenessResult['diagnostics'] {
  return checks
    .filter((c) => !c.passed)
    .map((c) => ({
      code: c.automated
        ? 'reference.likeness.auto-failed'
        : c.message.startsWith('Missing')
          ? 'reference.likeness.stills-incomplete'
          : 'reference.likeness.still-failed',
      severity: 'error' as const,
      message: c.message,
      hint: c.hint,
    }));
}

function failClosed(message: string): BodyLikenessResult {
  return {
    ok: false,
    publishReady: false,
    checks: [{ code: 'input', passed: false, automated: true, message }],
    diagnostics: [{
      code: 'reference.likeness.auto-failed',
      severity: 'error',
      message,
      hint: 'Pass a valid body bbox (from inspect({ of: "shape" }) / get_shape_info) and optional wheels[].',
    }],
    summary: `Body likeness gate FAILED: ${message}`,
  };
}

/**
 * Run the body-likeness gate. Pure — no OCCT, no filesystem.
 */
export function evaluateBodyLikeness(input: BodyLikenessInput): BodyLikenessResult {
  if (!isFiniteBBox(input.body)) {
    return failClosed('Body AABB is missing or degenerate (need finite min < max on all axes).');
  }
  const m = bodyMetrics(input);
  const requireStills = input.requireStills !== false;
  const checks = [
    ...runAutomatedChecks(input, m),
    ...runStillChecks(input.stillVerdicts ?? [], requireStills),
  ];
  const diagnostics = toDiagnostics(checks);
  const ok = diagnostics.length === 0;
  return {
    ok,
    publishReady: ok,
    checks,
    diagnostics,
    summary: ok
      ? `Body likeness gate passed (${checks.length} checks). Safe to claim success / open_in_studio for this envelope.`
      : `Body likeness gate FAILED (${diagnostics.length} blocking). Do NOT publish as success on silhouette-weak evidence. Fix geometry or supply failing stills, then re-run verify({ check: 'body-likeness' }).`,
  };
}
