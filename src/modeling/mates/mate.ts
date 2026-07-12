// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/mate.ts
//
// Mate record + capture-time connector-ref parser. A mate connects two named
// connectors with one of the 7 mate types from `mateTypes.ts`. Type-pair
// compatibility is checked at capture time (build123d-style early error), not
// at solve time — see `isCompatiblePair` in `mateTypes.ts`. The Assembly
// builder surfaces these records on `scene.mates` returned by
// `Assembly.model()` / `Assembly.solvedModel()`.

import type { Editable } from '../../shared/runtime/paramRef';
import type { ClevisStructuralModel } from '../joints/types';
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

export interface MateCapacityEnvelope {
  readonly maxResultantForceN: number;
  readonly maxResultantMomentNmm: number;
}

/** Declared mate ratings. An envelope comparison is not structural proof. */
export interface MateCapacity {
  readonly envelope?: MateCapacityEnvelope;
  readonly structure?: ClevisStructuralModel;
}

/**
 * @deprecated Legacy manual-load API. Use the unit-bearing
 * `MateCapacity.envelope` ratings for reaction comparisons.
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
  /** Declared resultant rating; comparison against it is not structural proof. */
  readonly capacity?: MateCapacity;
  /** @deprecated legacy manual-load API */
  readonly maxLoad?: MateLoadLimit;
  /** Visual-exposure declaration read by Gate 4 (`jointVisualExposure`).
   *  Default `'exposed'`: the joint must read as a hinge (fork daylight +
   *  pin stickout thresholds). Declare `'concealed'` for mechanisms that
   *  are enclosed BY DESIGN — valve rotors in bores, internal spindles,
   *  worm shafts — where fork daylight is structurally impossible and the
   *  hinge-visibility heuristic only emits false positives. An explicit
   *  per-mate declaration, not a threshold change: exposed hinges keep
   *  the full Gate 4 guard. */
  readonly exposure?: 'exposed' | 'concealed';
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
