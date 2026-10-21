// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * A mesh becomes a kernelCAD script only when it is one extruded or revolved
 * profile, with no leftover boolean and no region the features missed.
 * Anything else stays a labeled imported solid. A volume match is not enough.
 */
export function dishonestImportReason(input: {
  body: 'extrude' | 'revolve';
  /** Extrude blocks only. A revolve's diameter steps are still one profile. */
  extrudeBlocks: number;
  booleanRemainders: number;
  unmatched: number;
}): string | null {
  if (input.body === 'extrude' && input.extrudeBlocks !== 1) {
    return 'the solid is more than one extruded profile';
  }
  if (input.booleanRemainders > 0) {
    return 'the feature tree uses a boolean subtract instead of a hole or a cutout';
  }
  if (input.unmatched > 0) return 'part of the solid has no feature';
  return null;
}
