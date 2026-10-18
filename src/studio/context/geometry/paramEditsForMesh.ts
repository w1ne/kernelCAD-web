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
import { mergeMeshPayload, meshMergeStateFor } from './meshMergeStore';
import { MESH_MERGE_UNKNOWN_ID_PREFIX, type MeshMergeState } from './mergeFeatureMeshes';
import { createParamEditQueue, type ParamEditQueue } from './paramEditQueue';

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
 *  Only entries matching this are claimed through `have`; a value the server
 *  would not compute the same way must never be claimed. */
const FINGERPRINT_HEX16 = /^[0-9a-f]{16}$/;

/** The fingerprints to claim the client already holds: only the entries whose
 *  value is a hex16 fingerprint. Returns undefined to ask for a full payload
 *  (no state, nothing fingerprinted, or nothing in the expected format). */
function haveFingerprints(state: MeshMergeState | null): MeshHaveFingerprints | undefined {
  if (state === null) return undefined;
  const entries = [...state.fingerprints].filter(([, fingerprint]) => FINGERPRINT_HEX16.test(fingerprint));
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

/** The merge rejecting a patch whose `unchangedIds` the state does not hold. */
function isMeshMergeMismatch(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(MESH_MERGE_UNKNOWN_ID_PREFIX);
}

/** Mesh the code with the accumulated edits through the stateless endpoint:
 *  the server on the hosted app, the dev middleware on localhost. A rewritten
 *  source can't use the stored project body, so it is sent as source.
 *
 *  Sends the fingerprints the client holds as `have` so the server can answer
 *  with only the changed features (folded into the merge state by
 *  `mergeMeshPayload`). If the trailer names an unchanged id the state does
 *  not hold, the request is retried once without `have` for a full payload.
 *  The server schema strips unknown body fields, so sending `have` to an
 *  endpoint that predates the field is safe.
 *
 *  Internal: the one request `meshParamEdits`' queue runs per batch. The
 *  queue hands the returned payload to the submitter that rode this run. */
async function runParamEditRequest(
  code: string,
  edits: ParamEditValues,
  bakeAll: boolean,
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
    return mergeMeshPayload(code, await send(have), state);
  } catch (err) {
    if (have === undefined || !isMeshMergeMismatch(err)) throw err;
    return mergeMeshPayload(code, await send(undefined), state);
  }
}

/** The module-scoped coalescing queue for the active `(code, bakeAll)` pair.
 *  A submit with a different key disposes this queue and replaces it, so a
 *  code edit or a bakeAll flip never coalesces onto the wrong request shape.
 *  A disposed queue's late in-flight run still resolves its own submitters
 *  with its payload; the revision check upstream discards it as stale. A
 *  submit that was pending at dispose never runs and resolves null. */
let currentQueue: { code: string; bakeAll: boolean; queue: ParamEditQueue<BackendMeshPayload> } | null = null;

function paramEditQueueFor(code: string, bakeAll: boolean): ParamEditQueue<BackendMeshPayload> {
  const active = currentQueue;
  if (active !== null && active.code === code && active.bakeAll === bakeAll) return active.queue;
  active?.queue.dispose();
  const queue = createParamEditQueue<BackendMeshPayload>((edits) => runParamEditRequest(code, edits, bakeAll));
  currentQueue = { code, bakeAll, queue };
  return queue;
}

/** Mesh the code with the accumulated edits, coalesced with any request
 *  already in flight (one in-flight + one trailing per `(code, bakeAll)`;
 *  see `paramEditQueue`). Resolves with the merged payload of the run that
 *  carried these values (for a coalesced submit: the trailing run's), or
 *  `null` when the batch was dropped by a queue replacement; a failed run
 *  rejects its submits. */
export function meshParamEdits(code: string, edits: ParamEditValues, bakeAll = false): Promise<BackendMeshPayload | null> {
  return paramEditQueueFor(code, bakeAll).submit(edits);
}

/** Test-only: dispose the active queue and drop its pending batch. */
export function __resetParamEditQueueForTests(): void {
  currentQueue?.queue.dispose();
  currentQueue = null;
}
