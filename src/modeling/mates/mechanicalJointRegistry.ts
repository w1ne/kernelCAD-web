// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly, MechanicalJointIntentRecord } from '../capture/assembly';
import type { MateRecord } from './mate';

/**
 * Registry-complete `mechanicalJoint` intent — same bar as mechanism
 * validation (`collectActivelyDrivenMates` in mechanismTruth). Declared
 * mate/actuator/shaft/supports/output must exist and the mate must be
 * revolute. Fastened-graph connectivity is NOT required here: that is
 * checked by `reviewMechanicalIntent` / support geometry, not by the
 * unsupported-axis gate. Keeping one definition stops `review_cad` from
 * rejecting hinges that already evaluate as `mechanism=real`.
 */
export function isRegistryCompleteMechanicalJointIntent(
  intent: MechanicalJointIntentRecord,
  matesByName: ReadonlyMap<string, MateRecord>,
  partsByName: ReadonlyMap<string, unknown>,
): boolean {
  if (!partsByName.has(intent.actuator)) return false;
  if (!partsByName.has(intent.shaft) || !partsByName.has(intent.output)) return false;
  if (intent.supports.length === 0 || intent.supports.some((support) => !partsByName.has(support))) {
    return false;
  }
  const mate = matesByName.get(intent.mate);
  return mate !== undefined && mate.type === 'revolute';
}

/** Mates covered by a registry-complete mechanicalJoint intent. */
export function collectRegistryDrivenMates(arm: Assembly): Set<string> {
  const driven = new Set<string>();
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  for (const intent of arm.__mechanicalJointIntents()) {
    if (!isRegistryCompleteMechanicalJointIntent(intent, matesByName, partsByName)) continue;
    driven.add(intent.mate);
  }
  return driven;
}
