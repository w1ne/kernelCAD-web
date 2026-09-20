// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/buildModel.ts
//
// Node model-build entry point. Thin composition facade over modeling's
// `buildModel`/`buildModelFromFile`/`rebuildModelIncremental` that supplies the
// composed API factory, so scripts evaluated on any of these paths see the
// full `kc.*` surface (`kinematic.sweepTolerance` included).
//
// Modeling's own exports remain as low-level primitives (kernelCAD-server's
// vendored copy imports them); new in-repo callers should import here.
import {
  buildModel as buildModelPrimitive,
  buildModelFromFile as buildModelFromFilePrimitive,
  rebuildModelIncremental as rebuildModelIncrementalPrimitive,
  type BuildModelFromFileInput,
  type BuildModelInput,
  type BuiltModel,
} from '../modeling/buildModel';
import { composedApiFactory } from './scriptEvaluation';

export type {
  BuildModelFromFileInput,
  BuildModelInput,
  BuiltModel,
  BuiltModelParamUpdate,
  BuiltModelParamUpdateResult,
  ParamUpdateEdit,
  UpdateModelParamsOptions,
} from '../modeling/buildModel';
export {
  populateCache,
  resolveRootId,
  updateModelParams,
} from '../modeling/buildModel';

export async function buildModel(input: BuildModelInput): Promise<BuiltModel> {
  return buildModelPrimitive(input, { apiFactory: composedApiFactory });
}

export async function buildModelFromFile(input: BuildModelFromFileInput): Promise<BuiltModel> {
  return buildModelFromFilePrimitive(input, { apiFactory: composedApiFactory });
}

export async function rebuildModelIncremental(
  prevModel: BuiltModel,
  input: BuildModelInput,
): Promise<BuiltModel> {
  return rebuildModelIncrementalPrimitive(prevModel, input, { apiFactory: composedApiFactory });
}
