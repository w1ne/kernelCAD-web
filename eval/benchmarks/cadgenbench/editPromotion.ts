// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/editPromotion.ts
//
// Pure, request-aware promotion for CADGenBench editing candidates.
//
// A candidate can be a perfectly valid closed solid and still be the wrong
// answer: the model imports input.step and returns it unchanged, or it makes a
// change in the opposite direction, or it removes a feature the request never
// mentioned. The validity gate cannot see any of that. This module compares
// the input and candidate inspection reports (solid-only geometry) and turns
// the requested edit into an accept / reject verdict.
//
// It deliberately does NOT compare against ground truth. The only inputs are
// the request text and the two measured shapes, so the verdict can be fed back
// to the model as a repair reason without leaking the benchmark answer.

import type { StepInspectReport, StepSolidReport } from '../../../src/kernel/import/inspectStep';
import type { CylindricalHole } from '../../../src/kernel/backends/occt/holeDetection';

export type EditPromotionClass =
  | 'edited'
  | 'no-op'
  | 'wrong-direction'
  | 'wrong-magnitude'
  | 'wrong-topology'
  | 'move-check'
  | 'topology-unknown';

export type EditDirection = 'increase' | 'decrease' | 'neutral' | 'any';

export interface EditPromotionResult {
  /** `accepted` and `unknown` keep the candidate; `failed` sends it back to repair. */
  status: 'accepted' | 'failed' | 'unknown';
  classification: EditPromotionClass;
  /** Human-readable explanation used in the repair prompt. */
  reason: string;
  /** Material direction inferred from the request; `any` when ambiguous. */
  expectedDirection: EditDirection;
  volumeDeltaMm3: number;
  volumeToleranceMm3: number;
  faceDelta: number;
  bboxDeltaMm: number;
  holeCountBefore: number;
  holeCountAfter: number;
  holeChangeMm: number;
}

export interface EditPromotionInput {
  request: string;
  before: StepInspectReport;
  after: StepInspectReport;
}

export interface EditIntent {
  direction: EditDirection;
  moveOnly: boolean;
  mentionsHoles: boolean;
  mentionsTopology: boolean;
  expectsHoleDelta: 'more' | 'fewer' | 'same' | 'any';
  /** Exact hole-count change requested ("remove these three holes"). */
  targetHoleCountDelta?: number;
  /** Exact diameter requested for a named bore/hole ("to 310 mm"). */
  targetHoleDiameterMm?: number;
  /** Diameter the request says the feature starts from, when stated. */
  sourceHoleDiameterMm?: number;
  /** Which hole the request names, so a resize cannot be accepted on another. */
  targetHoleSelector?: 'central' | 'horizontal' | 'any';
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function readCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
  return Number.isFinite(value) ? value : undefined;
}

function readMm(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

interface ShapeSummary {
  solids: number;
  volume: number;
  faces: number;
  bbox: { min: [number, number, number]; max: [number, number, number] } | null;
  holes: CylindricalHole[];
}

const HOLE_TOL = 0.05;
const BBOX_TOL = 0.05;
const MIN_VOLUME_TOL = 2.0;
const VOLUME_TOL_FRACTION = 0.0002; // 0.02 %

/** Infer what the request asks for without looking at the candidate. */
export function parseEditIntent(request: string): EditIntent {
  const text = request.toLowerCase();
  const mentionsHoles = /\b(hole|holes|bore|bores|drill|drilled|counterbore|countersink|ream|tapped|thread)\b/.test(text);
  const moveOnly =
    /\b(move|moves|shift|shifts|translate|reposition|relocate|relocated|offset|offsets|space|spacing)\b/.test(text) &&
    !/\b(add|remove|delete|fill|cut|drill|bore|enlarge|increase|decrease|reduce|resize|pattern|array)\b/.test(text);
  const mentionsTopology =
    mentionsHoles ||
    /\b(fillet|chamfer|slot|pocket|rib|ribs|boss|bosses|pad|pads|pattern|array|hole|holes)\b/.test(text);

  let expectsHoleDelta: EditIntent['expectsHoleDelta'] = 'any';
  if (mentionsHoles) {
    if (/\b(fill|plug|close|remove|delete)\b/.test(text) && /\b(hole|holes|bore|bores)\b/.test(text)) {
      expectsHoleDelta = 'fewer';
    } else if (/\b(add|drill|create|make|cut)\b/.test(text) && /\b(hole|holes|bore|bores)\b/.test(text)) {
      // "make the hole bigger" is a resize, not a new hole. A count word or
      // "a/an <size> hole" makes the additive reading much more likely.
      expectsHoleDelta = /\b(a|an|one|two|three|four|five|six|\d+)\b[^.]*\b(hole|holes|bore|bores)\b/.test(text)
        ? 'more'
        : 'same';
    } else if (/\b(pattern|array)\b/.test(text) && /\b(hole|holes)\b/.test(text)) {
      expectsHoleDelta = 'more';
    } else if (/\b(replace|swap|convert|substitute)\b/.test(text)) {
      // Replacing one feature set with another is explicitly a topology
      // change; the count can go either way.
      expectsHoleDelta = 'any';
    } else {
      expectsHoleDelta = 'same';
    }
  }

  const growVerb = /\b(increase|enlarge|widen|expand|grow)\b/;
  const shrinkVerb = /\b(decrease|reduce|shrink|lower|shorten|narrow|thin)\b/;
  let direction: EditDirection = 'any';
  if (moveOnly) {
    direction = 'neutral';
  } else if (/\b(fill|plug|close)\b/.test(text)) {
    direction = 'increase';
  } else if (/\b(remove|delete)\b/.test(text) && /\b(hole|holes|bore|bores)\b/.test(text)) {
    direction = 'increase';
  } else if (/\b(remove|delete)\b/.test(text) && /\b(fillets?|rounds?|chamfers?)\b/.test(text)) {
    // Removing a concave fillet removes material, a convex one adds it; a
    // feature noun such as "boss" in the request does not say which.
    direction = 'any';
  } else if (growVerb.test(text)) {
    // Enlarging an internal void removes material; enlarging an outer
    // dimension adds it. `diameter` alone is not enough: a boss and a bore
    // both have one.
    direction = resizesVoid(text, growVerb) ? 'decrease' : 'increase';
  } else if (shrinkVerb.test(text)) {
    direction = resizesVoid(text, shrinkVerb) ? 'increase' : 'decrease';
  } else if (
    /\b(walls?|faces?|sides?)\b/.test(text) &&
    /\b(inward|inwards|outward|outwards)\b/.test(text)
  ) {
    // "bring the pocket walls inward" moves faces; whether that adds or
    // removes material depends on which side of the wall is solid.
    direction = 'any';
  } else if (/\b(drill|bore|ream|tap|thread|cut|pocket|slot|chamfer)\b/.test(text)) {
    direction = 'decrease';
  } else if (/\b(add|create|extrude|raise|thicken|boss|rib|pad|lengthen|extend)\b/.test(text)) {
    direction = 'increase';
  } else if (/\b(fillet|round|blend)\b/.test(text)) {
    // A fillet adds material on a concave edge and removes it on a convex
    // edge; the request alone cannot tell which.
    direction = 'any';
  }

  let targetHoleCountDelta: number | undefined;
  if (mentionsHoles) {
    const removal = text.match(
      /\b(?:remove|delete|fill|plug|close)\b[^.]*?\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b(?!\s*mm\b)[^.]*?\b(?:holes?|bores?)\b/,
    );
    const addition = text.match(
      /\b(?:add|drill|create|make)\b[^.]*?\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b(?!\s*mm\b)[^.]*?\b(?:holes?|bores?)\b/,
    );
    const count = readCount(removal?.[1] ?? addition?.[1]);
    if (count !== undefined) {
      targetHoleCountDelta = removal ? -count : count;
    }
  }

  let targetHoleDiameterMm: number | undefined;
  let sourceHoleDiameterMm: number | undefined;
  let targetHoleSelector: EditIntent['targetHoleSelector'];
  if (mentionsHoles && !moveOnly && expectsHoleDelta === 'same') {
    const fromTo = text.match(
      /\bfrom\s*(\d+(?:\.\d+)?)\s*mm\s*(?:to|->|→)\s*(\d+(?:\.\d+)?)\s*mm\b/,
    );
    const to = fromTo
      ? undefined
      : text.match(/\bto\s*(\d+(?:\.\d+)?)\s*mm\b/);
    sourceHoleDiameterMm = readMm(fromTo?.[1]);
    targetHoleDiameterMm = readMm(fromTo?.[2] ?? to?.[1]);
    if (targetHoleDiameterMm !== undefined) {
      targetHoleSelector = /\b(?:central|center)\b/.test(text)
        ? 'central'
        : /\bhorizontal\b/.test(text)
          ? 'horizontal'
          : 'any';
    }
  }

  return {
    direction,
    moveOnly,
    mentionsHoles,
    mentionsTopology,
    expectsHoleDelta,
    ...(targetHoleCountDelta !== undefined ? { targetHoleCountDelta } : {}),
    ...(targetHoleDiameterMm !== undefined ? { targetHoleDiameterMm } : {}),
    ...(sourceHoleDiameterMm !== undefined ? { sourceHoleDiameterMm } : {}),
    ...(targetHoleSelector !== undefined ? { targetHoleSelector } : {}),
  };
}

const VOID_NOUN = /^(bore|bores|hole|holes|slot|slots|pocket|pockets|opening|openings|cutout|cutouts|groove|grooves|recess|recesses|counterbore|counterbores)$/;
const SOLID_NOUN = /^(boss|bosses|rib|ribs|pad|pads|flange|flanges|wall|walls|plate|plates|shaft|shafts|pin|pins|tab|tabs|block|blocks|extension|extensions|lip|lips|leg|legs|arm|arms|post|posts|stud|studs|spigot|spigots|ring|rings|disc|discs|disk|disks|body|part)$/;

/**
 * Does the resize act on a void? The edit's object is the first feature noun
 * after the verb: "the length of the boss with a central bore" resizes the
 * boss, "the diameter of the central bore" the bore. A possessive ("the
 * boss's bore") is not the object. Without a recognised noun after the verb,
 * any void noun in the request decides, as before.
 */
function resizesVoid(text: string, verb: RegExp): boolean {
  const match = verb.exec(text);
  const tail = match ? text.slice(match.index + match[0].length) : text;
  for (const token of tail.split(/[^a-z']+/)) {
    if (token.endsWith("'s")) continue;
    if (VOID_NOUN.test(token)) return true;
    if (SOLID_NOUN.test(token)) return false;
  }
  return /\b(bore|bores|hole|holes|slot|pocket|opening|cutout)\b/.test(text);
}

function summarize(report: StepInspectReport): ShapeSummary {
  const solids = Array.isArray(report.solids) ? report.solids : [];
  const holeList: CylindricalHole[] = [];
  for (const solid of solids) holeList.push(...(solid.holes ?? []));
  return {
    solids: report.solidCount ?? solids.length,
    volume: solids.reduce((sum, s: StepSolidReport) => sum + (s.volumeMm3 ?? 0), 0),
    faces: solids.reduce((sum, s: StepSolidReport) => sum + (s.faceCount ?? 0), 0),
    bbox: unionBbox(solids),
    holes: holeList,
  };
}

function unionBbox(solids: StepSolidReport[]): ShapeSummary['bbox'] {
  if (solids.length === 0) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const solid of solids) {
    const box = solid.bboxExact;
    if (!box) continue;
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], box.min[i]);
      max[i] = Math.max(max[i], box.max[i]);
    }
  }
  return Number.isFinite(min[0]) ? { min, max } : null;
}

function bboxChange(a: ShapeSummary['bbox'], b: ShapeSummary['bbox']): number {
  if (!a || !b) return 0;
  let delta = 0;
  for (let i = 0; i < 3; i++) {
    delta = Math.max(delta, Math.abs(a.min[i] - b.min[i]), Math.abs(a.max[i] - b.max[i]));
  }
  return delta;
}

/** Stable order so a reordered hole list is not mistaken for a geometry change. */
function sortHoles(holes: CylindricalHole[]): CylindricalHole[] {
  return [...holes].sort((a, b) => {
    const d = b.diameterMm - a.diameterMm;
    if (Math.abs(d) > 1e-9) return d;
    const z = a.axisOrigin[2] - b.axisOrigin[2];
    if (Math.abs(z) > 1e-9) return z;
    const x = a.axisOrigin[0] - b.axisOrigin[0];
    if (Math.abs(x) > 1e-9) return x;
    return a.axisOrigin[1] - b.axisOrigin[1];
  });
}

function holeChange(a: CylindricalHole[], b: CylindricalHole[]): number {
  if (a.length !== b.length) return Infinity;
  const left = sortHoles(a);
  const right = sortHoles(b);
  let delta = 0;
  for (let i = 0; i < left.length; i++) {
    const p = left[i];
    const q = right[i];
    delta = Math.max(
      delta,
      Math.abs(p.diameterMm - q.diameterMm),
      Math.abs(p.depthMm - q.depthMm),
      Math.abs(p.axisOrigin[0] - q.axisOrigin[0]),
      Math.abs(p.axisOrigin[1] - q.axisOrigin[1]),
      Math.abs(p.axisOrigin[2] - q.axisOrigin[2]),
    );
  }
  return delta;
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Distance from a point to the infinite line through `origin`/`direction`. */
function distanceToAxis(
  point: [number, number, number],
  origin: [number, number, number],
  direction: [number, number, number],
): number {
  const v: [number, number, number] = [
    point[0] - origin[0],
    point[1] - origin[1],
    point[2] - origin[2],
  ];
  const along = dot(v, direction);
  const perp: [number, number, number] = [
    v[0] - along * direction[0],
    v[1] - along * direction[1],
    v[2] - along * direction[2],
  ];
  return Math.hypot(perp[0], perp[1], perp[2]);
}

function sameAxisLine(a: CylindricalHole, b: CylindricalHole): boolean {
  const alignment = Math.abs(dot(a.axisDirection, b.axisDirection));
  if (alignment < 0.9998) return false;
  return distanceToAxis(b.axisOrigin, a.axisOrigin, a.axisDirection) <= 0.1;
}

/** Is every hole in `small` present in `big`, allowing a through hole's axis
 *  origin to sit at either end of the same bore? */
function holeSubset(small: CylindricalHole[], big: CylindricalHole[]): boolean {
  const remaining = [...big];
  for (const wanted of small) {
    const index = remaining.findIndex(
      (candidate) =>
        sameAxisLine(wanted, candidate) &&
        Math.abs(wanted.diameterMm - candidate.diameterMm) <= HOLE_TOL &&
        Math.abs(wanted.depthMm - candidate.depthMm) <= HOLE_TOL &&
        wanted.kind === candidate.kind,
    );
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}

/**
 * Pick the hole the request names. A central bore is the largest coaxial
 * void; a horizontal bore is the one whose axis lies in the XY plane. When
 * the request gives a source diameter, it is the tie-breaker.
 */
function selectTargetHole(
  holes: CylindricalHole[],
  selector: EditIntent['targetHoleSelector'],
  sourceDiameter: number | undefined,
  targetDiameter: number,
): number {
  if (holes.length === 0) return -1;
  const bySource = (a: CylindricalHole, b: CylindricalHole): number => {
    if (sourceDiameter !== undefined) {
      const da = Math.abs(a.diameterMm - sourceDiameter);
      const db = Math.abs(b.diameterMm - sourceDiameter);
      if (Math.abs(da - db) > 1e-9) return da - db;
    }
    const ta = Math.abs(a.diameterMm - targetDiameter);
    const tb = Math.abs(b.diameterMm - targetDiameter);
    if (Math.abs(ta - tb) > 1e-9) return ta - tb;
    return b.diameterMm - a.diameterMm;
  };

  let candidates = holes.map((hole, index) => ({ hole, index }));
  if (selector === 'horizontal') {
    candidates = candidates.filter(({ hole }) => Math.abs(hole.axisDirection[2]) < 0.2);
    if (candidates.length === 0) return -1;
  }
  if (selector === 'central' || selector === 'any') {
    // Largest first; a central bore is always the largest coaxial void.
    candidates.sort(
      (a, b) =>
        (sourceDiameter !== undefined ? bySource(a.hole, b.hole) : b.hole.diameterMm - a.hole.diameterMm) ||
        bySource(a.hole, b.hole),
    );
  } else {
    candidates.sort((a, b) => bySource(a.hole, b.hole));
  }
  return candidates[0]?.index ?? -1;
}

/** Diameter/depth change only; a move must not resize the feature. */
function holeSizeChange(a: CylindricalHole[], b: CylindricalHole[]): number {
  if (a.length !== b.length) return Infinity;
  const left = sortHoles(a);
  const right = sortHoles(b);
  let delta = 0;
  for (let i = 0; i < left.length; i++) {
    delta = Math.max(
      delta,
      Math.abs(left[i].diameterMm - right[i].diameterMm),
      Math.abs(left[i].depthMm - right[i].depthMm),
    );
  }
  return delta;
}

/**
 * Classify one editing candidate against its input.
 *
 * The volume tolerance is the larger of 2 mm³ and 0.02 % of the input
 * volume. A face-count or hole change still counts as real geometry below
 * that tolerance: the request may have been a local topology change with
 * almost no volume. When the request names an exact hole count or diameter,
 * the candidate must reach it; a smaller real edit is still the wrong answer.
 */
export function classifyEditPromotion(input: EditPromotionInput): EditPromotionResult {
  const before = summarize(input.before);
  const after = summarize(input.after);
  const intent = parseEditIntent(input.request);
  const tolerance = Math.max(MIN_VOLUME_TOL, before.volume * VOLUME_TOL_FRACTION);
  const volumeDelta = after.volume - before.volume;
  const faceDelta = after.faces - before.faces;
  const bboxDelta = bboxChange(before.bbox, after.bbox);
  const holes = holeChange(before.holes, after.holes);
  const holeSize = holeSizeChange(before.holes, after.holes);

  const base = {
    expectedDirection: intent.direction,
    volumeDeltaMm3: volumeDelta,
    volumeToleranceMm3: tolerance,
    faceDelta,
    bboxDeltaMm: bboxDelta,
    holeCountBefore: before.holes.length,
    holeCountAfter: after.holes.length,
    holeChangeMm: holes,
  };

  if (after.solids !== 1 || before.solids !== 1) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-topology',
      reason: `expected one closed solid before and after; got ${before.solids} then ${after.solids}`,
    };
  }

  const realChange =
    Math.abs(volumeDelta) > tolerance ||
    faceDelta !== 0 ||
    holes > HOLE_TOL ||
    bboxDelta > BBOX_TOL;

  if (!realChange) {
    return {
      ...base,
      status: 'failed',
      classification: 'no-op',
      reason: 'the exported solid matches the input within 0.02 % volume, with the same face and hole topology',
    };
  }

  if (intent.moveOnly) {
    if (before.holes.length !== after.holes.length) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: `a move must keep every feature, but the hole count changed (${before.holes.length} → ${after.holes.length})`,
      };
    }
    if (holeSize > HOLE_TOL) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: 'a move must keep the feature size, but a hole diameter or depth changed',
      };
    }
    const moved = bboxDelta > BBOX_TOL || holes > HOLE_TOL;
    if (!moved) {
      return {
        ...base,
        status: 'failed',
        classification: 'no-op',
        reason: 'move request produced no measurable change in the solid bounds or hole positions',
      };
    }
    if (Math.abs(volumeDelta) > tolerance || faceDelta !== 0) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: 'a move must preserve volume and face count; the candidate changed the material or topology',
      };
    }
    return {
      ...base,
      status: 'accepted',
      classification: 'move-check',
      reason: `the feature moved ${Math.max(bboxDelta, holes).toFixed(3)} mm with the solid volume preserved`,
    };
  }

  if (intent.expectsHoleDelta === 'more' && after.holes.length <= before.holes.length) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-topology',
      reason: `request adds or patterns holes, but the hole count did not increase (${before.holes.length} → ${after.holes.length})`,
    };
  }
  if (intent.expectsHoleDelta === 'fewer' && after.holes.length >= before.holes.length) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-topology',
      reason: `request removes or fills holes, but the hole count did not decrease (${before.holes.length} → ${after.holes.length})`,
    };
  }
  if (intent.expectsHoleDelta === 'same' && after.holes.length !== before.holes.length) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-topology',
      reason: `request edits existing holes, but the hole count changed (${before.holes.length} → ${after.holes.length})`,
    };
  }
  if (!intent.mentionsTopology && after.holes.length !== before.holes.length) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-topology',
      reason: `the request does not mention holes, but the hole count changed (${before.holes.length} → ${after.holes.length})`,
    };
  }

  if (intent.targetHoleCountDelta !== undefined) {
    const delta = after.holes.length - before.holes.length;
    if (delta !== intent.targetHoleCountDelta) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: `the request asks to ${intent.targetHoleCountDelta < 0 ? 'remove' : 'add'} ${Math.abs(intent.targetHoleCountDelta)} hole(s), but the hole count changed by ${delta} (${before.holes.length} → ${after.holes.length})`,
      };
    }
    const surviving = intent.targetHoleCountDelta < 0 ? after.holes : before.holes;
    const original = intent.targetHoleCountDelta < 0 ? before.holes : after.holes;
    if (!holeSubset(surviving, original)) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason:
          intent.targetHoleCountDelta < 0
            ? 'a hole that the request did not name was removed or moved'
            : 'a new hole was added somewhere other than the requested location',
      };
    }
  }

  if (intent.targetHoleDiameterMm !== undefined) {
    const target = intent.targetHoleDiameterMm;
    const diameterTolerance = Math.max(0.1, target * 0.002);
    const selector = intent.targetHoleSelector ?? 'any';
    const beforeIndex = selectTargetHole(
      before.holes,
      selector,
      intent.sourceHoleDiameterMm,
      target,
    );
    const afterIndex = selectTargetHole(
      after.holes,
      selector,
      beforeIndex >= 0 ? before.holes[beforeIndex].diameterMm : intent.sourceHoleDiameterMm,
      target,
    );
    if (beforeIndex < 0 || afterIndex < 0) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: `could not find the ${selector === 'any' ? 'requested' : selector} hole before and after the edit`,
      };
    }
    const beforeHole = before.holes[beforeIndex];
    const afterHole = after.holes[afterIndex];
    if (!sameAxisLine(beforeHole, afterHole)) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: `the ${selector === 'any' ? 'requested' : selector} bore moved instead of being resized in place`,
      };
    }
    if (Math.abs(afterHole.diameterMm - target) > diameterTolerance) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-magnitude',
        reason: `the ${selector === 'any' ? 'requested' : selector} bore is ${afterHole.diameterMm.toFixed(3)} mm, but the request asks for ${target} mm (±${diameterTolerance.toFixed(3)} mm)`,
      };
    }
    const residual = holeChange(
      before.holes.filter((_, index) => index !== beforeIndex),
      after.holes.filter((_, index) => index !== afterIndex),
    );
    if (residual > HOLE_TOL) {
      return {
        ...base,
        status: 'failed',
        classification: 'wrong-topology',
        reason: 'the requested bore reached its target, but another hole was changed at the same time',
      };
    }
  }

  if (intent.direction === 'increase' && volumeDelta < -tolerance) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-direction',
      reason: `request asks for more material, but volume decreased by ${(-volumeDelta).toFixed(2)} mm³`,
    };
  }
  if (intent.direction === 'decrease' && volumeDelta > tolerance) {
    return {
      ...base,
      status: 'failed',
      classification: 'wrong-direction',
      reason: `request asks for less material, but volume increased by ${volumeDelta.toFixed(2)} mm³`,
    };
  }

  return {
    ...base,
    status: 'accepted',
    classification: 'edited',
    reason:
      intent.direction === 'neutral'
        ? 'the solid changed without a requested material direction'
        : `real ${intent.direction === 'any' ? '' : `${intent.direction} `}change: volume ${volumeDelta >= 0 ? '+' : ''}${volumeDelta.toFixed(2)} mm³, faces ${faceDelta >= 0 ? '+' : ''}${faceDelta}`,
  };
}

/** Safe wrapper for callers that could not inspect one of the two shapes. */
export function unknownEditPromotion(reason: string): EditPromotionResult {
  return {
    status: 'unknown',
    classification: 'topology-unknown',
    reason,
    expectedDirection: 'any',
    volumeDeltaMm3: 0,
    volumeToleranceMm3: MIN_VOLUME_TOL,
    faceDelta: 0,
    bboxDeltaMm: 0,
    holeCountBefore: 0,
    holeCountAfter: 0,
    holeChangeMm: 0,
  };
}
