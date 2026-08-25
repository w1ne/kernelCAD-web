// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/jointConventionMix.ts
//
// kernelCAD has TWO conventions for what a joint's `origin` means, and both
// are correct within their own path:
//
//   .revolute() / .prismatic() / .ball()  — URDF semantics. `origin` is the
//     parent->child FRAME OFFSET, and the child link's geometry is authored
//     about its OWN origin. forwardKinematics composes T(o) . M.
//
//   .mate() + partRef.connector(...)      — in-place assembly. `origin` is a
//     PIVOT POINT and parts are modeled where they sit. composeChildTransform
//     conjugates: T(parentOrigin) . M . T(-childOrigin), so pose 0 preserves
//     the modeled position.
//
// Mixing them is silent and expensive. Model a part in place —
// `box(50, 10, 8).translate(5, 15, 12)`, the obvious thing to write — then
// drive it with `.revolute()`, and the engine correctly applies link-frame
// semantics to in-place geometry: the part ships displaced by the joint
// origin, at EVERY pose including 0. Nothing warns, `evaluate` returns
// ok: true, and the downstream gates then score the displaced solids — a
// swept-collision sweep reports clean on a mechanism that self-collides.
//
// This gate catches the mix at its only unambiguous signal: a joint-primitive
// child that the script also placed in assembly space.

import type { Assembly, AssemblyJointStored, AssemblyPartStored } from '../capture/assembly';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ValidatorDiagnostic } from './validator';

/** Placement transforms an author uses to put a part somewhere. A shape built
 *  from translated primitives is NOT placement — only a transform applied to
 *  the part's own top-level shape is, and that is what `record.transforms`
 *  holds for `box(...).translate(...)`. */
const PLACEMENT_OPS = new Set(['translate', 'rotateAxis']);

function isNonZeroVec3(v: readonly number[] | undefined): boolean {
  if (!v || v.length < 3) return false;
  return v.some((n) => typeof n === 'number' && Number.isFinite(n) && n !== 0);
}

/** `part.at` is a `Vec3Param` — `{ x, y, z }`, each a `Param` that is either a
 *  literal (`evaluated` number) or a symbolic ref (`paramRef`). A symbolic
 *  placement is still a placement, so it counts even though its captured
 *  `evaluated` is 0 until the param table resolves. */
function partIsPlacedVia_at(part: AssemblyPartStored): boolean {
  const at = part.at as unknown as
    | Record<'x' | 'y' | 'z', { evaluated?: unknown; paramRef?: unknown } | undefined>
    | undefined;
  if (at === null || typeof at !== 'object') return false;
  for (const axis of ['x', 'y', 'z'] as const) {
    const p = at[axis];
    if (p === undefined || p === null) continue;
    if (p.paramRef !== undefined) return true;
    if (typeof p.evaluated === 'number' && p.evaluated !== 0) return true;
  }
  return false;
}

/** True when the part's own top-level shape carries a placement transform. */
function shapeCarriesPlacement(part: AssemblyPartStored, records: readonly FeatureRecord[]): boolean {
  const shapeId = part.originalShape?.id;
  if (shapeId === undefined) return false;
  const rec = records.find((r) => r.id === shapeId);
  const transforms = (rec as { transforms?: ReadonlyArray<{ op?: string }> } | undefined)?.transforms;
  if (!Array.isArray(transforms)) return false;
  return transforms.some((t) => typeof t?.op === 'string' && PLACEMENT_OPS.has(t.op));
}

function describePlacement(viaAt: boolean, viaShape: boolean): string {
  if (viaAt && viaShape) return `part(..., { at }) and a transform on its shape`;
  if (viaAt) return `part(..., { at })`;
  return `a transform on its shape (e.g. .translate(...))`;
}

/**
 * Gate: a joint primitive whose child was also placed in assembly space.
 *
 * Fires only when BOTH hold, which is what keeps false positives down:
 *   1. the joint origin is non-zero — at a zero origin the two conventions
 *      agree exactly, so nothing can be displaced and there is nothing to say;
 *   2. the child part was positioned by the script, via `{ at }` or a
 *      placement transform on its own shape.
 *
 * A correctly-authored URDF-style link is modeled about its own origin and
 * placed by the joint alone, so it trips neither condition.
 */
export function validateJointConventionMix(arm: Assembly): ValidatorDiagnostic[] {
  const out: ValidatorDiagnostic[] = [];
  const parts = arm.__parts();
  const records = arm.__session().getRecords();
  const partById = new Map<string, AssemblyPartStored>(parts.map((p) => [p.id, p]));

  for (const joint of arm.__joints() as readonly AssemblyJointStored[]) {
    if (!isNonZeroVec3(joint.origin)) continue;

    const child = partById.get(joint.childPartId);
    if (!child) continue;

    const viaAt = partIsPlacedVia_at(child);
    const viaShape = shapeCarriesPlacement(child, records);
    if (!viaAt && !viaShape) continue;

    const o = joint.origin;
    out.push({
      code: 'assembly.joint.child-modeled-in-place',
      severity: 'warning',
      partName: child.name,
      message:
        `Joint '${joint.name}' (${joint.kind}) drives part '${child.name}', which the script also placed via ` +
        `${describePlacement(viaAt, viaShape)}. Joint primitives use URDF semantics — origin ` +
        `[${o[0]}, ${o[1]}, ${o[2]}] is the parent->child frame offset, not a pivot — so '${child.name}' is ` +
        `displaced by that offset at every pose, including 0.`,
      hint:
        `invalid-args.assembly.joint-convention-mix — pick ONE convention. ` +
        `(a) Keep '${joint.name}': model '${child.name}' about its own origin and let the joint place it. ` +
        `(b) Keep the placement: declare connectors on both parts and use ` +
        `arm.mate('${joint.name}', '<parent>.<connector>', '${child.name}.<connector>', '${joint.kind}'), ` +
        `which treats the origin as a pivot and preserves the modeled position at pose 0.`,
    });
  }

  return out;
}
