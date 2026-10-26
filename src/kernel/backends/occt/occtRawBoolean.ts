// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// OCCT booleans without replicad's SimplifyResult (UnifySameDomain) pass. On
// operands carrying helical thread faces that pass runs for minutes, while the
// unsimplified result is the same solid. Used by the fastener builder.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from './occtBackend';

export interface RawBooleanOptions {
  /** The operands only touch on coincident faces (OCCT GlueFull), which skips
   *  face/face intersection. Wrong results when they genuinely intersect. */
  glue?: boolean;
}

/**
 * `op` of `shape` with `other` (one tool or several in ONE boolean), without
 * face unification. Neither operand is consumed.
 *
 * @throws {Error} when OCCT reports the boolean failed.
 */
export function booleanUnsimplified(
  shape: OcctBackend,
  op: 'fuse' | 'cut' | 'common',
  other: OcctBackend | readonly OcctBackend[],
  opts: RawBooleanOptions = {},
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const progress = new oc.Message_ProgressRange_1();
  const builder =
    op === 'fuse' ? new oc.BRepAlgoAPI_Fuse_1() : op === 'cut' ? new oc.BRepAlgoAPI_Cut_1() : new oc.BRepAlgoAPI_Common_1();
  const args = new oc.TopTools_ListOfShape_1();
  const tools = new oc.TopTools_ListOfShape_1();
  args.Append_1(shape.getReplicadShape().wrapped);
  for (const tool of Array.isArray(other) ? other : [other]) tools.Append_1(tool.getReplicadShape().wrapped);
  builder.SetArguments(args);
  builder.SetTools(tools);
  builder.SetUseOBB(true);
  if (opts.glue) builder.SetGlue(oc.BOPAlgo_GlueEnum.BOPAlgo_GlueFull);
  builder.Build(progress);
  try {
    if (!builder.IsDone() || builder.HasErrors()) {
      throw new Error(`booleanUnsimplified: ${op} did not complete.`);
    }
    return new OcctBackend(replicad.cast(builder.Shape()) as ConstructorParameters<typeof OcctBackend>[0]);
  } finally {
    builder.delete();
    args.delete();
    tools.delete();
    progress.delete();
  }
}
