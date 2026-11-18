// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A part's `at` moves its source shape and its connectors into the assembly.
// Two transforms say where a mated part is, and they differ by that `at`:
//
//   placement     where the part's own frame sits. Apply it to the part's
//                 source shape (`originalShape`) and to connector origins as
//                 declared. `solveMates` returns placements.
//   scene motion  what a scene part's `worldTransform` holds. The scene part's
//                 shape already carries `at` (`lowerAssemblyPart` moves it),
//                 so the motion is the placement with `at` taken back out:
//                 motion = placement · T(-at).
//
// A point fixed to a part is `motion.point(at + local)` = `placement.point(local)`.
// Parts in no mate and no connect chain keep their transform. Connected
// descendants of a mated part inherit its scene motion.

import type { FeatureId, Vec3Param } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { resolveParams } from '../../shared/runtime/resolveParams';
import { Transform, type Vec3 } from '../../shared/runtime/se3';
import { parseConnectorRef, type MateRecord } from './mate';

/** A part's `at` as numbers. A captured Param that references a script
 *  parameter reads `evaluated: 0` until it is resolved, so resolve it against
 *  the param table when there is one. Zero when the part has no `at`. */
export function resolvedPartAt(at: Vec3Param | undefined, table: ParamTable | undefined): Vec3 {
  if (at === undefined) return [0, 0, 0];
  const v = table === undefined ? at : resolveParams(at, table);
  return [v.x.evaluated, v.y.evaluated, v.z.evaluated];
}

/** Names of the parts a mate names, on either side. */
export function matedPartNames(mates: readonly Pick<MateRecord, 'a' | 'b'>[]): Set<string> {
  const names = new Set<string>();
  for (const m of mates) {
    names.add(parseConnectorRef(m.a).partName);
    names.add(parseConnectorRef(m.b).partName);
  }
  return names;
}

/** Look up, by part name, the `at` to convert by: the resolved `at` of a
 *  mated part, a legacy-joint participant, or a connected descendant of one.
 *  Parts without a solver placement keep their authored transform. Use it
 *  wherever a placement and a scene motion meet. */
export function partAtFor(
  mates: readonly Pick<MateRecord, 'a' | 'b'>[],
  parts: readonly {
    readonly id?: FeatureId;
    readonly name: string;
    readonly at?: Vec3Param;
    readonly connectParentId?: FeatureId;
  }[],
  table: ParamTable | undefined,
  joints: readonly { readonly parentPartId: string; readonly childPartId: string }[] = [],
): (partName: string) => Vec3 | undefined {
  const mated = matedPartNames(mates);
  const partById = new Map(parts.flatMap((part) => part.id === undefined ? [] : [[part.id, part] as const]));
  for (const id of joints.flatMap(({ parentPartId, childPartId }) => [parentPartId, childPartId])) {
    const part = partById.get(id);
    if (part !== undefined) mated.add(part.name);
  }
  for (const part of parts) {
    if (part.connectParentId === undefined) continue;
    const parent = partById.get(part.connectParentId);
    if (parent !== undefined && mated.has(parent.name)) mated.add(part.name);
  }
  const atByName = new Map(parts.map((p) => [p.name, p.at]));
  return (partName) => (mated.has(partName) ? resolvedPartAt(atByName.get(partName), table) : undefined);
}

/** Placement of a part that no mate moves: where its `at` puts it. */
export function atPlacement(at: Vec3): Transform {
  return Transform.translation(at[0], at[1], at[2]);
}

/** Scene motion of a part placed at `placement` whose scene shape carries `at`. */
export function sceneMotion(placement: Transform, at: Vec3): Transform {
  return placement.compose(Transform.translation(-at[0], -at[1], -at[2]));
}

/** Placement of a part whose scene shape (carrying `at`) moves by `motion`. */
export function placementFromSceneMotion(motion: Transform, at: Vec3): Transform {
  return motion.compose(atPlacement(at));
}
