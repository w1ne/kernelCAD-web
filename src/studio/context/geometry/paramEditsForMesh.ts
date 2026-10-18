// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { setParamValue } from '../../../modeling/edits/setParamValue';
import {
  meshSourceDev,
  meshSourceHosted,
  shouldUseHostedMesh,
  type BackendMeshPayload,
  type MeshHaveFingerprints,
  type ParamOverrides,
} from '../../scriptSource';
import { mergeHostedMeshPayload, meshMergeStateFor } from './useMeshFetch';
import type { MeshMergeState } from './mergeFeatureMeshes';

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

/** Matches the codec's per-feature fingerprints (two FNV-1a lanes, hex16).
 *  Anything else must not be claimed through `have`. */
const FINGERPRINT_HEX16 = /^[0-9a-f]{16}$/;

/** The fingerprints to claim the client already holds, or undefined to ask
 *  for a full payload (no state, nothing fingerprinted, or a format the
 *  server would not understand). */
function haveFingerprints(state: MeshMergeState | null): MeshHaveFingerprints | undefined {
  if (state === null || state.fingerprints.size === 0) return undefined;
  const entries = [...state.fingerprints];
  if (!entries.some(([, fingerprint]) => FINGERPRINT_HEX16.test(fingerprint))) return undefined;
  return Object.fromEntries(entries);
}

/** The merge rejecting a patch whose `unchangedIds` the state does not hold. */
function isMeshMergeMismatch(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('mesh merge: unknown unchanged id ');
}

/** Mesh the code with the accumulated edits through the stateless endpoint:
 *  the server on the hosted app, the dev middleware on localhost. A rewritten
 *  source can't use the stored project body, so it is sent as source.
 *
 *  Sends the fingerprints the client holds as `have` so the server can answer
 *  with only the changed features (folded into the merge state by
 *  `mergeHostedMeshPayload`). If the trailer names an unchanged id the state
 *  does not hold, the request is retried once without `have` for a full
 *  payload. */
export async function meshParamEdits(
  code: string,
  edits: ParamEditValues,
  bakeAll = false,
): Promise<BackendMeshPayload> {
  const { source, params } = paramEditsForMesh(code, edits, bakeAll);
  const state = meshMergeStateFor(code);
  const have = haveFingerprints(state);
  const send = (nextHave: MeshHaveFingerprints | undefined): Promise<BackendMeshPayload> =>
    shouldUseHostedMesh()
      ? meshSourceHosted(source, params, {
          preferSource: source !== code,
          ...(nextHave !== undefined ? { have: nextHave } : {}),
        })
      : meshSourceDev(source, params, nextHave);
  try {
    return mergeHostedMeshPayload(code, await send(have), state);
  } catch (err) {
    if (have === undefined || !isMeshMergeMismatch(err)) throw err;
    return mergeHostedMeshPayload(code, await send(undefined), state);
  }
}
