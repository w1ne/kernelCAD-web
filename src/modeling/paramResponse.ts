// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A parameter is a control only when one legal step can update the model
// while the drag is still in progress. Publish measures that step on a
// resident model and writes `rigid`, `local`, or `heavy` onto the param.

import type { ParamEntry, ParamResponse, ParamValue } from '../shared/runtime/paramTable';

/** A drag that cannot land inside this time is not a control. */
export const PARAM_RESPONSE_BUDGET_MS = 400;

/** A cold publish build slower than this is not probed parameter by parameter.
 *  Every param is `heavy` until a later publish can prove a step. */
export const PARAM_PUBLISH_COLD_MS = 2000;

const POSE_KINDS = new Set(['solvedAssembly', 'assemblyJoint']);

export function classifyParamStep(input: {
  relowered: readonly { id: string; kind: string }[];
  elapsedMs: number;
  shapeChanged: boolean;
}): ParamResponse {
  if (!input.shapeChanged || input.relowered.length === 0) return 'heavy';
  if (input.elapsedMs > PARAM_RESPONSE_BUDGET_MS) return 'heavy';
  const poseOnly = input.relowered.every((record) => POSE_KINDS.has(record.kind));
  return poseOnly ? 'rigid' : 'local';
}

/** One value inside the declared range, different from the current value. */
export function legalParamStep(entry: ParamEntry): ParamValue | null {
  if (entry.type === 'number') return numericStep(entry);
  if (entry.type === 'boolean') return entry.value !== true;
  if (entry.type === 'choice') {
    return entry.meta?.choices?.find((choice) => choice !== entry.value) ?? null;
  }
  if (entry.type === 'color') return entry.value === '#000000' ? '#ffffff' : '#000000';
  return null;
}

function numericStep(entry: ParamEntry): number | null {
  const value = entry.value as number;
  const step = entry.meta?.step && entry.meta.step > 0 ? entry.meta.step : 1;
  const max = entry.meta?.max;
  const min = entry.meta?.min;
  const up = value + step;
  if (max === undefined || up <= max) return up;
  const down = value - step;
  if (min === undefined || down >= min) return down;
  return null;
}

export function heavyParamResponses(names: readonly string[]): Record<string, ParamResponse> {
  return Object.fromEntries(names.map((name) => [name, 'heavy' as const]));
}
