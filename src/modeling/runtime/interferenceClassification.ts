// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { InterferencePair } from './detectInterferences';
import { jointContactCapMm3 } from './jointContactCap';

export type InterferenceClassification = 'contact-noise' | 'actionable';

export interface ClassifiedInterferencePair extends InterferencePair {
  readonly capMm3: number;
  readonly classification: InterferenceClassification;
  readonly actionable: boolean;
}

export interface InterferenceSummary {
  readonly rawCount: number;
  readonly contactNoiseCount: number;
  readonly actionableCount: number;
  readonly capMm3: number;
  readonly pairs: readonly ClassifiedInterferencePair[];
}

export function classifyInterferencePairs(
  pairs: readonly InterferencePair[],
  capMm3 = jointContactCapMm3(),
): ClassifiedInterferencePair[] {
  return pairs.map((pair) => {
    const actionable = pair.volumeMm3 > capMm3;
    return {
      ...pair,
      capMm3,
      classification: actionable ? 'actionable' : 'contact-noise',
      actionable,
    };
  });
}

export function summarizeInterferencePairs(
  pairs: readonly InterferencePair[],
  capMm3 = jointContactCapMm3(),
): InterferenceSummary {
  const classified = classifyInterferencePairs(pairs, capMm3);
  const actionableCount = classified.filter((pair) => pair.actionable).length;
  return {
    rawCount: classified.length,
    contactNoiseCount: classified.length - actionableCount,
    actionableCount,
    capMm3,
    pairs: classified,
  };
}
