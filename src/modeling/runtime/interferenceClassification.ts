// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { InterferencePair } from './detectInterferences';
import { CONTACT_THICKNESS_MM, INTERPENETRATION_EPSILON_MM3, isActionableOverlap } from './jointContactCap';

export type InterferenceClassification = 'contact-noise' | 'actionable';

export interface ClassifiedInterferencePair extends InterferencePair {
  /** Volume floor (mm³) of the rule; see `isActionableOverlap`. */
  readonly capMm3: number;
  /** Mean-thickness limit (mm) at or below which an overlap is face contact. */
  readonly contactThicknessMm: number;
  readonly classification: InterferenceClassification;
  readonly actionable: boolean;
}

export interface InterferenceSummary {
  readonly rawCount: number;
  readonly contactNoiseCount: number;
  readonly actionableCount: number;
  readonly capMm3: number;
  readonly contactThicknessMm: number;
  /** Every measured pair with its volume, touching ones included. */
  readonly pairs: readonly ClassifiedInterferencePair[];
}

export function classifyInterferencePairs(
  pairs: readonly InterferencePair[],
): ClassifiedInterferencePair[] {
  return pairs.map((pair) => {
    const actionable = isActionableOverlap(pair);
    return {
      ...pair,
      capMm3: INTERPENETRATION_EPSILON_MM3,
      contactThicknessMm: CONTACT_THICKNESS_MM,
      classification: actionable ? 'actionable' : 'contact-noise',
      actionable,
    };
  });
}

export function summarizeInterferencePairs(
  pairs: readonly InterferencePair[],
): InterferenceSummary {
  const classified = classifyInterferencePairs(pairs);
  const actionableCount = classified.filter((pair) => pair.actionable).length;
  return {
    rawCount: classified.length,
    contactNoiseCount: classified.length - actionableCount,
    actionableCount,
    capMm3: INTERPENETRATION_EPSILON_MM3,
    contactThicknessMm: CONTACT_THICKNESS_MM,
    pairs: classified,
  };
}
