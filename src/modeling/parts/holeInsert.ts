// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Hole-driven fastening: read the holes that already exist in a shape, size the
// fastener from the hole, cover every similar hole (patterns included), cut the
// seat the family needs, and return one placed stack per hole.
//
// The hole is the source of truth. The detector (inspectCylindricalHoles) walks
// the lowered BREP and reports every full circular bore with its axis, mouth
// end and diameter, so a hole that came from .hole(), .holes(), a pattern or an
// import behaves the same way. No hole feature id or face frame is required.
//
// The seat is cut as a boolean tool: a countersink for a flat head, an
// optional counterbore for a cap head. The fasteners are the table envelopes
// (lib.stack members), oriented along the detected axis.

import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import {
  inspectCylindricalHoles,
  type CylindricalHole,
} from '../../kernel/backends/occt/holeDetection';
import { buildCountersinkCone } from '../../kernel/backends/occt/holeLowerer';
import type { CaptureSession } from '../capture/captureSession';
import type { Shape } from '../capture/proxy';
import type { Vec3 } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import {
  BHCS_HEAD,
  BHCS_LENGTHS,
  FLATHEAD_HEAD,
  FLATHEAD_LENGTHS,
  SHCS_HEAD,
  SHCS_LENGTHS,
  planStackFor,
} from './familyTable';
import { placeStackFor } from './placePart';

export type InsertFamily =
  | 'socket-head-cap-screw'
  | 'button-head-cap-screw'
  | 'flat-head-countersunk';
export type InsertMode = 'screw' | 'bolt';
export type InsertSeat = 'auto' | 'none' | 'counterbore';

export interface InsertRequest {
  /** Select every usable bore within 0.15 mm of this diameter. */
  diameterMm?: number;
  /** Or select the bore whose axis passes nearest this point, then every
   *  similar bore (same diameter, parallel axis). */
  near?: Vec3;
  family: InsertFamily;
  /** 'bolt' (default) adds the washers and hex nut; 'screw' places the screw
   *  alone. 'bolt' needs a through bore. */
  mode?: InsertMode;
  /** The material the screw passes through. Defaults to the selected bore's
   *  wall length. */
  gripMm?: number;
  /** 'auto' (default) cuts the seat the family needs: a 90° countersink for
   *  flat-head, nothing for cap heads. 'counterbore' cuts a cylindrical seat
   *  for socket/button heads. 'none' leaves the hole untouched. */
  seat?: InsertSeat;
  /** Head-side hint: the bore end nearest this point takes the head. Defaults
   *  to the end nearest `near`, then the end with the larger Z. */
  headAt?: Vec3;
}

export interface InsertedHole {
  /** Head-side mouth center, world mm. */
  centerMm: Vec3;
  /** Unit vector from the head into the material. */
  direction: Vec3;
  diameterMm: number;
  depthMm: number;
  /** Stocked thread chosen from the hole diameter. */
  thread: string;
  /** Stocked screw length chosen for the grip. */
  lengthMm: number;
  /** Set when the bore diameter sits exactly on a larger thread's tap drill
   *  (ISO 2306): the bore may be a tapped pilot rather than clearance. */
  pilotFor?: string;
  /** Set when a coaxial larger bore already reaches this hole's mouth, so the
   *  automatic seat was left alone. Carries that bore's diameter, mm. */
  existingSeatMm?: number;
  screw: Shape;
  headWasher?: Shape;
  tailWasher?: Shape;
  nut?: Shape;
}

export interface InsertResult {
  /** The input shape with the seats cut (the same shape when seat is 'none'). */
  shape: Shape;
  holes: readonly InsertedHole[];
}

export interface InsertCtx {
  session: CaptureSession;
}

/** ISO 273 medium (normal) clearance bores for the stocked threads. */
export const CLEARANCE_MM: Readonly<Record<string, number>> = {
  M2: 2.4,
  'M2.5': 2.9,
  M3: 3.4,
  M4: 4.5,
  M5: 5.5,
  M6: 6.6,
};

/** Bore diameter tolerance for similar-hole matching, mm. */
export const SIMILAR_DIAMETER_TOL_MM = 0.1;
/** How far a bore diameter may sit from a stocked clearance bore, mm. */
export const CLEARANCE_MATCH_TOL_MM = 0.2;
/** Coarse-pitch ISO metric tap drills (ISO 2306), mm. A tapped pilot is not a
 *  clearance bore: the detector reports the modeled pilot diameter, so these
 *  are reported back as `pilotFor` rather than silently sized as clearance. */
export const TAP_DRILL_MM: Readonly<Record<string, number>> = {
  M3: 2.5,
  M4: 3.3,
  M5: 4.2,
  M6: 5,
  M8: 6.8,
  M10: 8.5,
};
/** How close a bore must sit to a tap drill to be called out, mm. */
export const TAP_DRILL_MATCH_TOL_MM = 0.02;
/** Seat tools run this far past the mouth so the boolean has no coplanar face. */
const SEAT_OVERSHOOT_MM = 0.2;
/** How close a coaxial larger bore must sit to count as an existing seat. */
export const EXISTING_SEAT_TOL_MM = 0.5;

const INSERT_EXAMPLE =
  "lib.insert(plate, { diameterMm: 5.5, family: 'socket-head-cap-screw', mode: 'bolt', gripMm: 6 })";

function len(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function mul(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function unit(v: Vec3): Vec3 {
  const l = len(v);
  return l < 1e-12 ? [0, 0, 1] : mul(v, 1 / l);
}

/** The threaded family a detected bore can take, or undefined. */
export function threadForHoleDiameter(diameterMm: number): string | undefined {
  let best: string | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const [thread, clearance] of Object.entries(CLEARANCE_MM)) {
    const delta = Math.abs(clearance - diameterMm);
    if (delta < bestDelta && delta <= CLEARANCE_MATCH_TOL_MM + 1e-9) {
      best = thread;
      bestDelta = delta;
    }
  }
  return best;
}

function nominalOf(thread: string): number {
  return Number.parseFloat(thread.slice(1));
}

/** The larger stock thread whose tap drill this bore matches, if any. A bore
 *  that sits exactly on a tap drill cannot be told from a tapped pilot, so the
 *  caller gets the ambiguity instead of silence. Smaller-thread pilots are not
 *  reported: the bore would then size to that thread's clearance anyway. */
export function pilotForThread(diameterMm: number, sizedThread: string): string | undefined {
  const sized = nominalOf(sizedThread);
  return Object.entries(TAP_DRILL_MM)
    .filter(
      ([thread, drill]) =>
        nominalOf(thread) > sized + 1e-9 &&
        Math.abs(drill - diameterMm) <= TAP_DRILL_MATCH_TOL_MM + 1e-9,
    )
    .sort(([a], [b]) => nominalOf(a) - nominalOf(b))
    .map(([thread]) => thread)[0];
}

/** A bore this API can put a fastener into: full, open, not an internal duct. */
export function isUsableBore(bore: CylindricalHole): boolean {
  return bore.bothEndsClosed !== true && bore.partial !== true;
}

function distanceToAxisLine(bore: CylindricalHole, p: Vec3): number {
  const w = sub(p, bore.axisOrigin);
  return len(sub(w, mul(bore.axisDirection, dot(w, bore.axisDirection))));
}

/** Bores similar to the seed: same diameter, parallel axis. A patterned hole
 *  set is exactly this, so patterns are covered without extra work. */
export function selectSimilarBores(
  bores: readonly CylindricalHole[],
  seed: CylindricalHole,
): CylindricalHole[] {
  return bores.filter(
    (b) =>
      isUsableBore(b) &&
      Math.abs(b.diameterMm - seed.diameterMm) <= SIMILAR_DIAMETER_TOL_MM + 1e-9 &&
      Math.abs(dot(b.axisDirection, seed.axisDirection)) >= 0.999,
  );
}

/** The requested diameter, the seeded similar set, or an invalid-args error. */
export function selectInsertBores(
  bores: readonly CylindricalHole[],
  request: Pick<InsertRequest, 'diameterMm' | 'near'>,
): CylindricalHole[] {
  const usable = bores.filter(isUsableBore);
  const found = usable.map((b) => `Ø${b.diameterMm}`).join(', ') || 'none';
  if (request.diameterMm !== undefined) {
    const selected = usable.filter(
      (b) => Math.abs(b.diameterMm - request.diameterMm!) <= SIMILAR_DIAMETER_TOL_MM + 1e-9,
    );
    if (selected.length === 0) {
      invalidArgs({
        api: 'lib.insert(shape, { diameterMm, family, ... })',
        path: 'diameterMm',
        got: request.diameterMm,
        requires: `a bore diameter the shape has; usable bores found: ${found}`,
        unit: 'mm',
        example: INSERT_EXAMPLE,
      });
    }
    return selected;
  }
  if (request.near !== undefined) {
    const seed = [...usable].sort(
      (a, b) => distanceToAxisLine(a, request.near!) - distanceToAxisLine(b, request.near!),
    )[0];
    if (seed === undefined) {
      invalidArgs({
        api: 'lib.insert(shape, { near, family, ... })',
        path: 'near',
        got: request.near,
        requires: 'a shape with at least one usable bore (full, open, not an internal duct)',
        example: INSERT_EXAMPLE,
      });
    }
    return selectSimilarBores(usable, seed);
  }
  invalidArgs({
    api: 'lib.insert(shape, { near | diameterMm, family, mode?, gripMm?, seat? })',
    path: 'near',
    gotText: 'both omitted',
    requires: 'near: <point> to seed from one hole, or diameterMm to select across the shape',
    example: INSERT_EXAMPLE,
  });
}

/** End frame of one bore: the head-side mouth and the direction into the
 *  material from it. Blind holes seat at their mouth; through holes pick the
 *  end nearest the hint, else the end with the larger Z. */
export function headFrameFor(
  bore: CylindricalHole,
  request: Pick<InsertRequest, 'near' | 'headAt'>,
): { center: Vec3; direction: Vec3 } {
  const into = unit(bore.axisDirection);
  if (bore.kind === 'blind') return { center: bore.axisOrigin, direction: into };
  const a = bore.axisOrigin;
  const b = add(a, mul(into, bore.depthMm));
  const hint = request.headAt ?? request.near;
  if (hint !== undefined) {
    return len(sub(a, hint)) <= len(sub(b, hint))
      ? { center: a, direction: into }
      : { center: b, direction: mul(into, -1) };
  }
  const aWins = a[2] > b[2] + 1e-9 || (Math.abs(a[2] - b[2]) <= 1e-9 && a[0] >= b[0]);
  return aWins ? { center: a, direction: into } : { center: b, direction: mul(into, -1) };
}

export interface ResolvedInsert {
  family: InsertFamily;
  mode: InsertMode;
  seat: 'none' | 'countersink' | 'counterbore';
  gripMm?: number;
}

/** Defaults and refusals for an insert request. */
export function resolveInsert(request: InsertRequest): ResolvedInsert {
  const families: readonly InsertFamily[] = [
    'socket-head-cap-screw',
    'button-head-cap-screw',
    'flat-head-countersunk',
  ];
  if (!families.includes(request.family)) {
    invalidArgs({
      api: 'lib.insert(shape, { family, ... })',
      path: 'family',
      got: request.family,
      requires: `one of: ${families.join(', ')}`,
      example: INSERT_EXAMPLE,
    });
  }
  const mode = request.mode ?? 'bolt';
  if (mode !== 'screw' && mode !== 'bolt') {
    invalidArgs({
      api: 'lib.insert(shape, { mode, ... })',
      path: 'mode',
      got: request.mode,
      requires: '"screw" or "bolt"',
      example: INSERT_EXAMPLE,
    });
  }
  const requested = request.seat ?? 'auto';
  if (requested !== 'auto' && requested !== 'none' && requested !== 'counterbore') {
    invalidArgs({
      api: 'lib.insert(shape, { seat, ... })',
      path: 'seat',
      got: request.seat,
      requires: '"auto", "none" or "counterbore"',
      example: INSERT_EXAMPLE,
    });
  }
  const cylindrical = request.family !== 'flat-head-countersunk';
  if (requested === 'counterbore' && !cylindrical) {
    invalidArgs({
      api: 'lib.insert(shape, { seat: "counterbore", family })',
      path: 'seat',
      got: requested,
      requires:
        'a cap-head family (socket-head-cap-screw, button-head-cap-screw); flat heads take a countersink',
      example: INSERT_EXAMPLE,
    });
  }
  const seat: ResolvedInsert['seat'] =
    requested === 'counterbore'
      ? 'counterbore'
      : requested === 'auto' && !cylindrical
        ? 'countersink'
        : 'none';
  return {
    family: request.family,
    mode,
    seat,
    ...(request.gripMm !== undefined ? { gripMm: request.gripMm } : {}),
  };
}

export interface PlannedInsert {
  bore: CylindricalHole;
  centerMm: Vec3;
  direction: Vec3;
  thread: string;
  family: InsertFamily;
  gripMm: number;
  lengthMm: number;
  seat: ResolvedInsert['seat'];
  /** See {@link InsertedHole.pilotFor}. */
  pilotFor?: string;
  /** See {@link InsertedHole.existingSeatMm}; a seat already at the mouth. */
  existingSeatMm?: number;
}

/** Does the bore's wall span the given point (within tolerance)? */
function boreCoversPoint(bore: CylindricalHole, point: Vec3): boolean {
  const t = dot(sub(point, bore.axisOrigin), bore.axisDirection);
  return t >= -EXISTING_SEAT_TOL_MM && t <= bore.depthMm + EXISTING_SEAT_TOL_MM;
}

/** A coaxial larger bore already at this hole's head end: a counterbore (or a
 *  spotface). Cutting the automatic seat into it would be wrong, so the seat
 *  is skipped and the existing one reported. */
export function existingSeatBoreFor(
  bores: readonly CylindricalHole[],
  bore: CylindricalHole,
  centerMm: Vec3,
): CylindricalHole | undefined {
  return bores.find(
    (candidate) =>
      isUsableBore(candidate) &&
      candidate.diameterMm >= bore.diameterMm + EXISTING_SEAT_TOL_MM &&
      Math.abs(dot(candidate.axisDirection, bore.axisDirection)) >= 0.999 &&
      distanceToAxisLine(candidate, centerMm) <= 0.05 &&
      boreCoversPoint(candidate, centerMm),
  );
}

function byCenter(a: PlannedInsert, b: PlannedInsert): number {
  return (
    a.centerMm[0] - b.centerMm[0] ||
    a.centerMm[1] - b.centerMm[1] ||
    a.centerMm[2] - b.centerMm[2]
  );
}

/** Screw lengths stocked for one insert family. */
function stockedLengths(family: InsertFamily): readonly number[] {
  if (family === 'button-head-cap-screw') return BHCS_LENGTHS;
  if (family === 'flat-head-countersunk') return FLATHEAD_LENGTHS;
  return SHCS_LENGTHS;
}

/** A screw alone in a blind hole must fit: the longest stocked length that
 *  reaches no deeper than the grip (the hole's wall length). */
function blindScrewLength(family: InsertFamily, gripMm: number): number {
  const lengths = stockedLengths(family);
  const fit = lengths.filter((length) => length <= gripMm + 1e-9).pop();
  if (fit === undefined) {
    invalidArgs({
      api: 'lib.insert(shape, { diameterMm, family, mode: "screw" })',
      path: 'diameterMm',
      got: gripMm,
      requires: `a blind hole at least ${lengths[0]} mm deep for the shortest ${family}`,
      unit: 'mm',
      example: INSERT_EXAMPLE,
    });
  }
  return fit;
}

/** Pure plan: one entry per selected bore, sized and seated. */
export function planInserts(
  bores: readonly CylindricalHole[],
  request: InsertRequest,
): PlannedInsert[] {
  const resolved = resolveInsert(request);
  return selectInsertBores(bores, request)
    .map((bore) => {
      const thread = threadForHoleDiameter(bore.diameterMm);
      if (thread === undefined) {
        invalidArgs({
          api: 'lib.insert(shape, { diameterMm, family, ... })',
          path: 'diameterMm',
          got: bore.diameterMm,
          requires: `a clearance bore matching a stocked thread: ${Object.entries(CLEARANCE_MM)
            .map(([t, c]) => `Ø${c} (${t})`)
            .join(', ')}`,
          unit: 'mm',
          example: INSERT_EXAMPLE,
        });
      }
      if (resolved.mode === 'bolt' && bore.kind === 'blind') {
        invalidArgs({
          api: 'lib.insert(shape, { mode: "bolt", ... })',
          path: 'mode',
          got: 'bolt',
          requires: `a through bore for a nut; the Ø${bore.diameterMm} hole is blind, so use mode: "screw"`,
          example: INSERT_EXAMPLE,
        });
      }
      const frame = headFrameFor(bore, request);
      const gripMm = resolved.gripMm ?? bore.depthMm;
      const lengthMm =
        resolved.mode === 'screw' && bore.kind === 'blind'
          ? blindScrewLength(resolved.family, gripMm)
          : planStackFor(resolved.family, {
              thread,
              gripMm,
              mode: resolved.mode,
            }).lengthMm;
      const pilotFor = pilotForThread(bore.diameterMm, thread);
      const existing =
        (request.seat ?? 'auto') === 'auto' && resolved.seat !== 'none'
          ? existingSeatBoreFor(bores, bore, frame.center)
          : undefined;
      return {
        bore,
        centerMm: frame.center,
        direction: frame.direction,
        thread,
        family: resolved.family,
        gripMm,
        lengthMm,
        seat: existing === undefined ? resolved.seat : ('none' as const),
        ...(pilotFor !== undefined ? { pilotFor } : {}),
        ...(existing !== undefined ? { existingSeatMm: existing.diameterMm } : {}),
      };
    })
    .sort(byCenter);
}

/** Seat tool for one planned hole, in canonical orientation: +Z points out of
 *  the material and the tool is centered on the origin. Subtract it from the
 *  mouth to cut the seat. */
export function seatToolBackend(plan: PlannedInsert): OcctBackend | undefined {
  if (plan.seat === 'none') return undefined;
  if (plan.seat === 'counterbore') {
    const head = plan.family === 'button-head-cap-screw' ? BHCS_HEAD[plan.thread] : SHCS_HEAD[plan.thread];
    if (head === undefined) return undefined;
    return OcctBackend.cylinder(head.K + SEAT_OVERSHOOT_MM, head.D / 2).translate(
      0,
      0,
      -head.K,
    );
  }
  const head = FLATHEAD_HEAD[plan.thread];
  if (head === undefined) return undefined;
  const cone = buildCountersinkCone(
    [0, 0, 0],
    [0, 0, -1],
    [1, 0, 0],
    head.D / 2,
    90,
    SEAT_OVERSHOOT_MM,
  );
  return new OcctBackend(cone);
}

function captureTool(ctx: InsertCtx, backend: OcctBackend, label: string): Shape {
  const tool = ctx.session.createShape({
    kind: 'importedStep',
    params: {},
    inputs: {},
    metadata: { sourcePath: `insert-seat:${label}` },
  });
  ctx.session.importedGeometry.set(tool.id, backend);
  return tool;
}

/** Place one stack member at a hole frame: local +Z (head side) along -direction. */
function placeMember(member: Shape, plan: PlannedInsert): Shape {
  const up: Vec3 = mul(plan.direction, -1);
  return member
    .alongAxis(up)
    .translate(plan.centerMm[0], plan.centerMm[1], plan.centerMm[2]);
}

/** Read the holes, size the fasteners, cut the seats, place one stack per hole. */
export async function insertFasteners(
  ctx: InsertCtx,
  shape: Shape,
  request: InsertRequest,
): Promise<InsertResult> {
  const resolved = resolveInsert(request);
  const backend = await shape.lower();
  const detection = inspectCylindricalHoles(backend);
  const plans = planInserts(detection.holes, request);

  const tools = plans
    .map((plan) => ({ plan, backend: seatToolBackend(plan) }))
    .filter((entry): entry is { plan: PlannedInsert; backend: OcctBackend } => entry.backend !== undefined)
    .map((entry) => placeMember(captureTool(ctx, entry.backend, entry.plan.thread), entry.plan));
  const seated = tools.length > 0 ? shape.subtract(...tools) : shape;

  const holes: InsertedHole[] = [];
  for (const plan of plans) {
    // A blind 'screw' plan picks the longest stocked length that fits; feed
    // that length back as the grip so the placed screw matches the plan.
    const stackGrip =
      resolved.mode === 'screw' && plan.bore.kind === 'blind' ? plan.lengthMm : plan.gripMm;
    const placed = await placeStackFor(ctx, resolved.family, {
      thread: plan.thread,
      gripMm: stackGrip,
      mode: resolved.mode,
    });
    holes.push({
      centerMm: plan.centerMm,
      direction: plan.direction,
      diameterMm: plan.bore.diameterMm,
      depthMm: plan.bore.depthMm,
      thread: plan.thread,
      lengthMm: placed.lengthMm,
      ...(plan.pilotFor !== undefined ? { pilotFor: plan.pilotFor } : {}),
      ...(plan.existingSeatMm !== undefined ? { existingSeatMm: plan.existingSeatMm } : {}),
      screw: placeMember(placed.screw, plan),
      ...(placed.headWasher !== undefined ? { headWasher: placeMember(placed.headWasher, plan) } : {}),
      ...(placed.tailWasher !== undefined ? { tailWasher: placeMember(placed.tailWasher, plan) } : {}),
      ...(placed.nut !== undefined ? { nut: placeMember(placed.nut, plan) } : {}),
    });
  }
  return { shape: seated, holes };
}
