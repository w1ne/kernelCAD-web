// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Steps each parameter once on a resident model and restores the original value.

import type { BuiltModel } from './buildModel';
import { updateModelParams } from './paramUpdate';
import type { ParamEntry, ParamResponse, ParamValue } from '../shared/runtime/paramTable';
import { classifyParamStep, legalParamStep } from './paramResponse';

/** Step each param once, restore it, and record the class. The model is left
 *  on its starting values. A step that throws is `heavy`. */
export async function measureParamResponses(
  model: BuiltModel,
): Promise<Record<string, ParamResponse>> {
  const responses: Record<string, ParamResponse> = {};
  for (const entry of model.session.paramTable.list()) {
    responses[entry.name] = await measureOne(model, entry);
  }
  return responses;
}

async function measureOne(model: BuiltModel, entry: ParamEntry): Promise<ParamResponse> {
  const next = legalParamStep(entry);
  if (next === null) return 'heavy';
  const original = entry.value;
  const started = Date.now();
  try {
    const updated = await updateModelParams(model, [{ name: entry.name, value: next }]);
    const elapsedMs = Date.now() - started;
    const kindById = new Map(updated.model.records.map((record) => [record.id, record.kind]));
    const relowered = updated.result.relowered.map((id) => ({ id, kind: kindById.get(id) ?? '' }));
    return classifyParamStep({ relowered, elapsedMs, shapeChanged: relowered.length > 0 });
  } catch {
    return 'heavy';
  } finally {
    await restoreParam(model, entry.name, original);
  }
}

async function restoreParam(model: BuiltModel, name: string, original: ParamValue): Promise<void> {
  if (model.session.paramTable.get(name).value === original) return;
  await updateModelParams(model, [{ name, value: original }]).catch(() => undefined);
}
