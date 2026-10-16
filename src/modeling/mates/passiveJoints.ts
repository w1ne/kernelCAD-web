// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Free passive joints — the policy that keeps evaluate_script and review_cad
// from disagreeing about a plain hinge.
//
// A revolute or prismatic mate with no actuator intent and no load is a
// valid passive mechanism: a door hinge, a swinging lid, a free slider.
// Gravity swinging it is its function, not a defect — and declared travel
// limits do not change that: `limitsDeg` / `limitsMm` are end stops (a lid
// that opens 0–110°), not a promise to hold a pose. Unless the script
// declares that something must HOLD (a mechanicalJoint actuator, a tendon,
// a physical use case with loads, a mate capacity), review treats such a
// joint's gravity drift, missing limits and missing support intent as
// informational instead of a 'broken' / topology-redesign verdict.

import type { Assembly } from '../capture/assembly';

const PASSIVE_TYPES = new Set(['revolute', 'prismatic']);

/**
 * True when the assembly declares a static-hold or load requirement that
 * applies to every joint: a tendon (gravity balance), or a physical use case
 * carrying loads.
 */
export function assemblyDeclaresHoldRequirement(arm: Assembly): boolean {
  return arm.__tendons().length > 0
    || arm.__physicalUseCases().some((useCase) => useCase.loads.length > 0);
}

/**
 * Names of the free passive mates: revolute / prismatic, no
 * mechanicalJoint (actuator) intent, no declared capacity / maxLoad, in an
 * assembly that declares no hold requirement. Empty when the assembly does.
 * Declared limits do not matter (end stops are not a hold requirement).
 */
export function collectFreePassiveMates(arm: Assembly): ReadonlySet<string> {
  if (assemblyDeclaresHoldRequirement(arm)) return new Set();
  const actuated = new Set(arm.__mechanicalJointIntents().map((intent) => intent.mate));
  const out = new Set<string>();
  for (const mate of arm.__mates()) {
    if (!PASSIVE_TYPES.has(mate.type)) continue;
    if (actuated.has(mate.name)) continue;
    if (mate.capacity !== undefined || mate.maxLoad !== undefined) continue;
    out.add(mate.name);
  }
  return out;
}
