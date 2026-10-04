// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { setParamValue } from '../../../modeling/edits/setParamValue';
import {
  meshSourceDev,
  meshSourceHosted,
  shouldUseHostedMesh,
  type BackendMeshPayload,
  type ParamOverrides,
} from '../../scriptSource';

export type ParamEditValues = Record<string, number | boolean | string>;

/**
 * Split accumulated param edits into what the stateless mesh endpoints take.
 * Their `params` override channel carries numbers and booleans only, so a
 * choice or text value is written into its `param()` default in the source
 * instead. `source === code` when no value changed the source.
 *
 * `bakeAll` writes every value into the source. An override only re-lowers
 * the recorded features; script code that branches on `param.value` (an
 * `if (hasLid.value)`) runs once with the declared default. A baked source
 * re-runs the whole script, so the result matches an export of that source.
 */
export function paramEditsForMesh(
  code: string,
  edits: ParamEditValues,
  bakeAll = false,
): { source: string; params: ParamOverrides } {
  let source = code;
  const params: ParamOverrides = {};
  for (const [name, value] of Object.entries(edits)) {
    if (typeof value !== 'string' && !bakeAll) {
      params[name] = value;
      continue;
    }
    const edit = setParamValue(source, name, value);
    if (!edit.ok || edit.new_code === undefined) {
      throw new Error(edit.error ?? `param '${name}' could not be set`);
    }
    source = edit.new_code;
  }
  return { source, params };
}

/** Mesh the code with the accumulated edits through the stateless endpoint:
 *  the server on the hosted app, the dev middleware on localhost. A rewritten
 *  source can't use the stored project body, so it is sent as source. */
export function meshParamEdits(
  code: string,
  edits: ParamEditValues,
  bakeAll = false,
): Promise<BackendMeshPayload> {
  const { source, params } = paramEditsForMesh(code, edits, bakeAll);
  return shouldUseHostedMesh()
    ? meshSourceHosted(source, params, { preferSource: source !== code })
    : meshSourceDev(source, params);
}
