// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { VirtualJointRecord } from '../capture/assemblyTypes';

/** Only an explicit fixed link to world grounds a part. Other parent frames
 * are relative links; floating and planar virtual joints retain motion. */
export function fixedWorldParts<P extends { readonly name: string }>(
  parts: readonly P[], virtualJoints: readonly VirtualJointRecord[],
): P[] {
  const names = new Set(virtualJoints.filter(joint => joint.type === 'fixed' && joint.parentFrame === 'world')
    .map(joint => joint.childLink));
  return parts.filter(part => names.has(part.name));
}

/** Compatibility fallback when the assembly declares no fixed world root. */
export function solverGroundedPart<P extends { readonly name: string }>(parts: readonly P[]): P | undefined {
  return parts[0];
}

/** Shared by capture solving and pure geometry FK; all declared roots stay
 * fixed. Edges between fixed roots are checked as closure constraints. */
export function solverGroundedParts<P extends { readonly name: string }>(
  parts: readonly P[], virtualJoints: readonly VirtualJointRecord[] = [],
): P[] {
  const fixed = fixedWorldParts(parts, virtualJoints);
  const assumed = solverGroundedPart(parts);
  return fixed.length ? fixed : assumed ? [assumed] : [];
}
