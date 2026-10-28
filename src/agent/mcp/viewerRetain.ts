// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { BuiltModel } from '../../composition/buildModel';

/** Model the local MCP viewer is still serving.
 *  Held here so `activeSession` and `liveViewer` do not import each other. */
let retainedModel: BuiltModel | undefined;

export function retainedMcpViewerModel(): BuiltModel | undefined {
  return retainedModel;
}

export function setRetainedMcpViewerModel(model: BuiltModel | undefined): void {
  retainedModel = model;
}
