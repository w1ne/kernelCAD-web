// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The one rule for which part the mate solver holds still. solveMates walks
// its spanning tree from this part (identity world transform) and every
// other part is placed relative to it, so any review that needs "the
// grounded part" when the script declares no stable root must ask here
// instead of re-deriving it.

/** Name of the part the mate solver grounds: the first declared part. */
export function solverGroundedPart<P extends { readonly name: string }>(parts: readonly P[]): P | undefined {
  return parts[0];
}
