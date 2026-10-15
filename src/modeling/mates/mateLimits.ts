// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/mateLimits.ts
//
// Which degrees of freedom a mate moves, and which of them carry a declared
// limit. One source for the validator's `assembly.mate.limit-missing` rule
// and the mechanism verdict's "range not checked" notes.

import type { MateLimitRange, MateRecord } from './mate';
import type { MateType } from './mateTypes';

/** A moving DOF: turning about the axis, or sliding along it. */
export type MateDof = 'rotation' | 'offset';

const DOFS: Partial<Record<MateType, readonly MateDof[]>> = {
  revolute: ['rotation'],
  prismatic: ['offset'],
  cylindrical: ['rotation', 'offset'],
  pin_slot: ['rotation', 'offset'],
};

/** The DOFs a mate type moves. Empty for fastened, planar and ball. */
export function movingDofs(type: MateType): readonly MateDof[] {
  return DOFS[type] ?? [];
}

/** The DOF a scalar mate pose drives: degrees for turning mates, mm for prismatic. */
export function posedDof(type: MateType): MateDof | undefined {
  if (type === 'prismatic') return 'offset';
  return movingDofs(type).includes('rotation') ? 'rotation' : undefined;
}

/** The declared limit on one DOF. Only prismatic mates take `limitsMm`, so a
 *  cylindrical or pin_slot offset has no limit today. */
export function dofLimit(mate: Pick<MateRecord, 'type' | 'limitsDeg' | 'limitsMm'>, dof: MateDof): MateLimitRange | undefined {
  if (dof === 'rotation') return mate.limitsDeg;
  return mate.type === 'prismatic' ? mate.limitsMm : undefined;
}

/** Moving DOFs of a mate that have no declared limit. */
export function unlimitedDofs(mate: Pick<MateRecord, 'type' | 'limitsDeg' | 'limitsMm'>): MateDof[] {
  return movingDofs(mate.type).filter((dof) => dofLimit(mate, dof) === undefined);
}
