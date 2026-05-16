// src/lib/mates/mate.ts
//
// Mate record + capture-time connector-ref parser. A mate connects two named
// connectors with one of the 7 mate types from `mateTypes.ts`. Type-pair
// compatibility is checked at capture time (build123d-style early error), not
// at solve time — see `isCompatiblePair` in `mateTypes.ts`. The Assembly
// builder surfaces these records on `scene.mates` returned by
// `Assembly.model()` / `Assembly.solvedModel()`.

import type { Editable } from '../../shared/runtime/paramRef';
import type { MateType } from './mateTypes';

/**
 * Optional articulation value on a mate. v0.6 T-pose extension to Pattern A FK.
 *  - revolute / prismatic / cylindrical / pin_slot: `Editable<number>`
 *    (degrees for rotational types, mm for prismatic)
 *  - ball: `[Editable<number>, Editable<number>, Editable<number>]`
 *    (XYZ Euler degrees, extrinsic — matches the v0.5 ball-joint pose triple)
 *  - fastened / planar: pose is not accepted (validated at capture time).
 *
 * Resolved at solve time by `solveMates(arm, numericPoses?)` against either a
 * numeric override or the session's ParamTable.
 */
export type MatePose =
  | Editable<number>
  | [Editable<number>, Editable<number>, Editable<number>];

export type MateLimitRange = readonly [number, number];

/**
 * Optional declared load capacity for a mate. v0.7.4 adds this as a stable
 * agent-facing surface for Gate 3 (joint-load static check).
 *
 * Unit semantics per mate type (see spec
 * `2026-05-15-v0.7-kinematic-grounding-design.md` §Gate 3):
 *  - `revolute`: only `torque` is meaningful (N·m). `force` is ignored if set.
 *  - `prismatic`: only `force` is meaningful (N). `torque` is ignored if set.
 *  - `cylindrical`: both `force` (N) and `torque` (N·m) may be set.
 *  - `ball`: only `force` (N).
 *  - `fastened` / `planar` / `pin_slot`: `maxLoad` is permitted but **not
 *    gated** in v0.7.4 — the type accepts it so the agent surface is stable
 *    for the v0.7.x extension, but the validator does not run summation. This
 *    is silent acceptance per the spec's open-question 4 resolution (no
 *    warning at every script run).
 */
export interface MateLoadLimit {
  /** Maximum allowable applied force in Newtons. */
  readonly force?: number;
  /** Maximum allowable applied torque in Newton·metres. */
  readonly torque?: number;
}

export interface MateRecord {
  readonly name: string;
  /** "<partName>.<connectorName>" */
  readonly a: string;
  /** "<partName>.<connectorName>" */
  readonly b: string;
  readonly type: MateType;
  /** Optional capture-time pose (articulation value). May be a number, a
   *  ParamRef, or — for ball mates — an XYZ Euler triple of either. See
   *  `MatePose` for the per-type shape contract. */
  readonly pose?: MatePose;
  /** Rotational scalar pose limits in degrees for revolute/cylindrical/pin_slot mates. */
  readonly limitsDeg?: MateLimitRange;
  /** Linear scalar pose limits in mm for prismatic mates. */
  readonly limitsMm?: MateLimitRange;
  /** Optional static-load capacity. Read by the v0.7.4 Gate 3 stub
   *  (`validateJointLoadCapacity`). Per the field's unit semantics, see
   *  `MateLoadLimit` JSDoc. */
  readonly maxLoad?: MateLoadLimit;
}

export function parseConnectorRef(ref: string): { partName: string; connectorName: string } {
  const dot = ref.indexOf('.');
  if (dot < 1 || dot === ref.length - 1) {
    throw new Error(
      `assembly.mate.connector-not-found: '${ref}' is not a 'partName.connectorName' reference.`,
    );
  }
  return { partName: ref.slice(0, dot), connectorName: ref.slice(dot + 1) };
}
