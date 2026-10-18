// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/kernelWorkerCore.ts
//
// The kernel worker's message logic with every kernel dependency injected.
// The worker entry (studioKernelWorker.ts) wires the real OCCT runtime; the
// tests drive fake deps. Keeping the logic here — not in the worker module —
// is what makes the protocol behaviors unit-testable in node, where a Web
// Worker does not exist.
//
// The core holds ONE piece of state: the model produced by the last successful
// `build` / `params` (records + param table + capture session). `params` edits
// it through `updateParams` and re-meshes the result; `dispose` drops it.
//
// Geometry answers are bin1 (modeling/capture/featureMeshBinary): a full
// payload on `build` and on `params` without `have`, and a changed-only patch
// under a trailer when the client sent the fingerprints it already holds.
//
// Error mapping: a dependency failure carrying a `host-fs` code is
// `host-fs-unavailable` (the client marks the source server-only); any other
// dependency failure is `script-error`; anything escaping the core itself is
// `worker-error`. `handle` NEVER rejects — every request gets a response array.

import {
  encodeMeshBinary,
  featureFingerprint,
  type MeshBinaryTrailer,
} from '../../modeling/capture/featureMeshBinary';
import type { Bounds, FeatureMesh } from '../../modeling/capture/featureMeshing';
import { KERNEL_PROTOCOL_VERSION, type KernelRequest, type KernelResponse } from './protocol';

/** The kernel operations the core drives. The worker entry supplies the real
 *  implementations; tests supply fakes. `unknown` where the core never looks
 *  inside (records/paramTable/session round-trip untouched). */
export interface KernelWorkerDeps {
  runScript(input: { code: string; fileName: string }): Promise<{ records: unknown[]; paramTable: unknown; session: unknown }>;
  mesh(records: unknown[], paramTable: unknown, session: unknown): Promise<{
    features: FeatureMesh[]; bounds: Bounds; failedFeatureIds: string[];
  }>;
  updateParams(model: unknown, edits: Array<{ name: string; value: number | boolean }>):
    Promise<{ model: { records: unknown[]; paramTable: unknown; session: unknown } }>;
}

type StoredModel = { records: unknown[]; paramTable: unknown; session: unknown };
type Meshed = { features: FeatureMesh[]; bounds: Bounds; failedFeatureIds: string[] };
type BuildRequest = Extract<KernelRequest, { type: 'build' }>;
type ParamsRequest = Extract<KernelRequest, { type: 'params' }>;

/** Server-bridge wording for a mesh that lost features — see vite.config.ts's
 *  `/__kernelcad/mesh` handler. */
const FAILED_FEATURES_MESSAGE = 'one or more features failed to compile';

export function createKernelWorkerCore(deps: KernelWorkerDeps): {
  handle(request: KernelRequest): Promise<KernelResponse[]>;
} {
  let model: StoredModel | undefined;

  async function handle(request: KernelRequest): Promise<KernelResponse[]> {
    try {
      if (request.type === 'build') return await handleBuild(request);
      if (request.type === 'params') return await handleParams(request);
      model = undefined;
      return [];
    } catch (err) {
      // A dependency failure is converted to an error response inside the
      // per-type handlers; anything reaching here is a core bug — still a
      // typed answer, never a rejected promise.
      return [workerError(request.id, err)];
    }
  }

  async function handleBuild(request: BuildRequest): Promise<KernelResponse[]> {
    let run: StoredModel;
    try {
      run = await deps.runScript({ code: request.source, fileName: request.fileName });
    } catch (err) {
      return [depError(request.id, err)];
    }
    // The model commits as soon as the script ran. A later mesh may fail a
    // feature (the response is an error) but the geometry that DID compute is
    // the new model, and a following params edit must drive it.
    model = run;
    const done: KernelResponse = { v: KERNEL_PROTOCOL_VERSION, id: request.id, type: 'script-done' };
    try {
      const meshed = await deps.mesh(run.records, run.paramTable, run.session);
      return [done, successResponse(request.id, run, meshed)];
    } catch (err) {
      return [done, depError(request.id, err)];
    }
  }

  async function handleParams(request: ParamsRequest): Promise<KernelResponse[]> {
    if (model === undefined) {
      return [workerError(request.id, new Error('kernel worker: no built model — send a build request first'))];
    }
    let next: StoredModel;
    try {
      next = (await deps.updateParams(model, request.edits)).model;
    } catch (err) {
      return [depError(request.id, err)];
    }
    model = next;
    try {
      const meshed = await deps.mesh(next.records, next.paramTable, next.session);
      return [successResponse(request.id, next, meshed, request.have)];
    } catch (err) {
      return [depError(request.id, err)];
    }
  }

  return { handle };
}

/** The success shape for `build` (no `have`) and `params` (optional `have`). A
 *  non-empty `failedFeatureIds` answers the bridge's error instead — the model
 *  was still committed by the caller. */
function successResponse(
  id: number,
  run: StoredModel,
  meshed: Meshed,
  have?: Record<string, string>,
): KernelResponse {
  if (meshed.failedFeatureIds.length > 0) {
    return {
      v: KERNEL_PROTOCOL_VERSION, id, type: 'error', code: 'script-error',
      message: FAILED_FEATURES_MESSAGE,
      failedFeatureIds: meshed.failedFeatureIds,
    };
  }
  const base: Omit<Extract<KernelResponse, { type: 'result' }>, 'payload' | 'trailer'> = {
    v: KERNEL_PROTOCOL_VERSION, id, type: 'result',
    params: serializeParamTable(run.paramTable),
    featureRecords: run.records,
    bounds: meshed.bounds,
    failedFeatureIds: [],
  };
  if (have === undefined) {
    return { ...base, payload: encodeMeshBinary(meshed.features) };
  }
  const { unchangedIds, removedIds, changed } = diffAgainstHave(meshed.features, have);
  if (changed.length === 0) {
    // The codec cannot encode an empty container that still carries a trailer
    // (the trailer rides in the first record's meta). Nothing changed, so the
    // full payload without a trailer is the locked handling — and the client
    // replaces what it holds with the whole (removed-feature-free) set.
    return { ...base, payload: encodeMeshBinary(meshed.features) };
  }
  const trailer: MeshBinaryTrailer = { unchangedIds, removedIds };
  return { ...base, payload: encodeMeshBinary(changed, trailer), trailer };
}

/** Split the new mesh against the fingerprints the client holds: features whose
 *  hash matches are `unchangedIds`, held ids the new mesh lacks are `removedIds`,
 *  and everything else — new or changed geometry — is the patch body. */
function diffAgainstHave(features: readonly FeatureMesh[], have: Record<string, string>): {
  unchangedIds: string[]; removedIds: string[]; changed: FeatureMesh[];
} {
  const unchangedIds: string[] = [];
  const changed: FeatureMesh[] = [];
  const present = new Set<string>();
  for (const feature of features) {
    present.add(feature.featureId);
    const held = have[feature.featureId];
    if (held !== undefined && held === featureFingerprint(feature)) {
      unchangedIds.push(feature.featureId);
    } else {
      changed.push(feature);
    }
  }
  const removedIds = Object.keys(have).filter((featureId) => !present.has(featureId));
  return { unchangedIds, removedIds, changed };
}

/** The bridge's `params` field: the serialized table when the table offers
 *  `serialize()` (runScriptInBrowser returns a ParamTable, which does), the raw
 *  value otherwise so a fake/test dep still round-trips. */
function serializeParamTable(paramTable: unknown): unknown {
  if (paramTable !== null && typeof paramTable === 'object'
    && typeof (paramTable as { serialize?: unknown }).serialize === 'function') {
    return (paramTable as { serialize(): unknown }).serialize();
  }
  return paramTable;
}

/** A dependency threw: `host-fs` codes become `host-fs-unavailable` (the client
 *  marks the source server-only), everything else is a script failure. */
function depError(id: number, err: unknown): KernelResponse {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  const message = err instanceof Error ? err.message : String(err);
  if (typeof code === 'string' && (code.startsWith('cli.host-fs') || code.includes('host-fs'))) {
    return { v: KERNEL_PROTOCOL_VERSION, id, type: 'error', code: 'host-fs-unavailable', message };
  }
  return { v: KERNEL_PROTOCOL_VERSION, id, type: 'error', code: 'script-error', message };
}

/** An internal failure (or a request out of order, e.g. params before build). */
function workerError(id: number, err: unknown): KernelResponse {
  return {
    v: KERNEL_PROTOCOL_VERSION, id, type: 'error', code: 'worker-error',
    message: err instanceof Error ? err.message : String(err),
  };
}
