// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/composition/scriptLoader.ts
//
// Node script-loader entry point. Thin composition facade over modeling's
// `loadScriptFeatures` that supplies the composed API factory, so a script
// loaded for render or capture sees the full `kc.*` surface (`kinematic.*`
// included), the same as `buildModel` and `evaluate_script`.
import {
  loadScriptFeatures as loadScriptFeaturesPrimitive,
  type LoadedScript,
} from '../modeling/runtime/scriptLoader';
import { composedApiFactory } from './scriptEvaluation';

export type { LoadedScript } from '../modeling/runtime/scriptLoader';

export async function loadScriptFeatures(scriptPath: string): Promise<LoadedScript> {
  return loadScriptFeaturesPrimitive(scriptPath, { apiFactory: composedApiFactory });
}
