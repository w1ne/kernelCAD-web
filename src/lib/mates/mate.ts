// src/lib/mates/mate.ts
//
// Mate record + capture-time connector-ref parser. A mate connects two named
// connectors with one of the 7 mate types from `mateTypes.ts`. Type-pair
// compatibility is checked at capture time (build123d-style early error), not
// at solve time — see `isCompatiblePair` in `mateTypes.ts`. The Assembly
// builder surfaces these records on `scene.mates` returned by
// `Assembly.model()` / `Assembly.solvedModel()`.

import type { Editable } from '../../runtime/paramRef';
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
