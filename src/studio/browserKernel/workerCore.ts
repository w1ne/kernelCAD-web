// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/workerCore.ts
//
// The browser kernel worker's job logic, with every kernel dependency
// injected: kernel.worker.ts wires the real OCCT runtime, the tests drive
// the same core with the node kernel.
//
// One model is kept warm: the BuiltModel of the last source. A slider edit
// of that source re-lowers only the features the edited params reach
// (`updateModelParams`, the same incremental path the hosted server's model
// cache uses); a different source is a full build. Finished rebuilds also go
// into a small content-keyed LRU (rebuildCache.ts).
//
// The answer mirrors the server's `/__kernelcad/mesh` payload: the same
// FeatureMesh serialization, records, bounds and param table. Only the
// features whose fingerprint differs from what the page already holds are
// sent; the rest are named unchanged by omission (see protocol.ts).
//
// Jobs run strictly one after another: OCCT is single-threaded and its
// session caches must not be touched by two jobs at once.

import type { FeatureMesh } from '../../modeling/capture/featureMeshing';
import type { FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { SerializedParamTable } from '../../shared/runtime/paramTable';
import type { ViewerDimension } from '../../shared/intent/viewerDimension';
import { featureMeshFingerprint } from './meshFingerprint';
import { DEFAULT_REBUILD_CACHE, RebuildCache, rebuildCacheKey, type RebuildCacheOptions } from './rebuildCache';
import type {
  JobTimings,
  KernelErrorCode,
  KernelMeshPayload,
  MeshQuality,
  ParamValues,
  RebuildJobError,
  RebuildJobRequest,
  RebuildJobResult,
} from './protocol';

/** The parts of a BuiltModel the core reads. */
export interface CoreModel {
  records: readonly FeatureRecord[];
  session: {
    paramTable: {
      serialize(): SerializedParamTable;
    };
  };
}

export interface CoreMeshing {
  features: readonly FeatureMesh[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  failedFeatureIds: readonly string[];
}

export interface KernelWorkerDeps<M extends CoreModel, R extends CoreMeshing> {
  /** Run the script and lower it, with `params` set before lowering (the
   *  server's override semantics). */
  build(source: string, params: ParamValues): Promise<M>;
  /** Incremental param edit of a built model. */
  update(model: M, edits: Array<{ name: string; value: number | boolean }>): Promise<M>;
  mesh(model: M, quality: MeshQuality): Promise<R>;
  /** Viewer dimensions for a settled (display) mesh; undefined to omit. */
  dimensions(model: M, meshing: R): ViewerDimension[] | undefined;
  serialize(feature: FeatureMesh): FeatureMeshSerialized;
  /** WebAssembly memory in use, in bytes. */
  memoryBytes(): number;
  /** True once a heap growth was refused by the memory cap. */
  memoryCapHit(): boolean;
  /** True when an error means the wasm heap is corrupt. */
  isFatal(error: unknown): boolean;
  kernelVersion: string;
  now(): number;
}

interface CachedRebuild {
  features: readonly FeatureMesh[];
  fingerprints: Record<string, string>;
  featureRecords: FeatureRecord[];
  bounds: CoreMeshing['bounds'];
  params: SerializedParamTable;
  dimensions?: ViewerDimension[];
}

interface WarmModel<M> {
  source: string;
  model: M;
}

const FAILED_FEATURES_MESSAGE = 'one or more features failed to compile';

/** A job failure with the code the page routes on. */
export class KernelJobError extends Error {
  readonly code: KernelErrorCode;
  readonly fatal: boolean;
  readonly firstBuild: boolean;

  constructor(code: KernelErrorCode, message: string, fatal: boolean, firstBuild: boolean) {
    super(message);
    this.code = code;
    this.fatal = fatal;
    this.firstBuild = firstBuild;
    this.name = 'KernelJobError';
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function isServerOnlyError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.includes('host-fs')) return true;
  return /host-fs-unavailable/.test(errorText(error));
}

function bytesOfFeatures(features: readonly FeatureMesh[]): number {
  let total = 0;
  const add = (view: ArrayBufferView | undefined): void => { total += view?.byteLength ?? 0; };
  for (const feature of features) {
    for (const face of feature.faces) {
      add(face.vertices); add(face.normals); add(face.indices); add(face.uv);
    }
    add(feature.mesh?.positions); add(feature.mesh?.normals); add(feature.mesh?.indices);
    add(feature.edges);
    total += 512;
  }
  return total;
}

function sizeOfRebuild(value: CachedRebuild): number {
  return bytesOfFeatures(value.features) + JSON.stringify(value.featureRecords).length * 2;
}

/** Number/boolean value each declared param must have for this job: the
 *  override when given, the declared default otherwise. */
function targetEdits(
  table: SerializedParamTable,
  params: ParamValues,
): Array<{ name: string; value: number | boolean }> {
  const edits: Array<{ name: string; value: number | boolean }> = [];
  for (const entry of Object.values(table)) {
    if (entry.type !== 'number' && entry.type !== 'boolean') continue;
    const target = Object.prototype.hasOwnProperty.call(params, entry.name)
      ? params[entry.name]
      : entry.defaultValue as number | boolean;
    if (entry.value !== target) edits.push({ name: entry.name, value: target });
  }
  return edits;
}

type FaultProbe = Pick<KernelWorkerDeps<CoreModel, CoreMeshing>, 'memoryCapHit' | 'memoryBytes' | 'isFatal'>;

/** The routing code of a failure (see protocol.ts). */
function classify(deps: FaultProbe, error: unknown, firstBuild: boolean): KernelJobError {
  if (error instanceof KernelJobError) return error;
  if (deps.memoryCapHit()) {
    return new KernelJobError('memory', `The model needs more memory than the browser kernel may use (${Math.round(deps.memoryBytes() / 1048576)} MiB in use). ${errorText(error)}`, true, firstBuild);
  }
  if (deps.isFatal(error)) return new KernelJobError('internal', errorText(error), true, firstBuild);
  if (isServerOnlyError(error)) return new KernelJobError('server-only', errorText(error), false, firstBuild);
  return new KernelJobError('script', errorText(error), false, firstBuild);
}

/** A result for `request`: only the features the page does not hold. */
function respond(
  deps: Pick<KernelWorkerDeps<CoreModel, CoreMeshing>, 'now' | 'serialize' | 'memoryBytes'>,
  request: RebuildJobRequest,
  entry: CachedRebuild,
  timings: JobTimings,
): RebuildJobResult {
  const started = deps.now();
  const have = request.have;
  const changed: FeatureMeshSerialized[] = [];
  const present = new Set<string>();
  for (const feature of entry.features) {
    present.add(feature.featureId);
    if (have && have[feature.featureId] === entry.fingerprints[feature.featureId]) continue;
    changed.push(deps.serialize(feature));
  }
  const payload: KernelMeshPayload = {
    features: changed,
    featureRecords: entry.featureRecords,
    bounds: entry.bounds,
    params: entry.params,
    ...(entry.dimensions ? { dimensions: entry.dimensions } : {}),
  };
  if (have) {
    const removed = Object.keys(have).filter((id) => !present.has(id));
    payload.changedFeatureIds = [...changed.map((f) => f.featureId), ...removed];
  }
  const serializeMs = timings.serializeMs + (deps.now() - started);
  return {
    type: 'result',
    jobId: request.jobId,
    scope: request.scope,
    generation: request.generation,
    quality: request.quality,
    payload,
    fingerprints: entry.fingerprints,
    timings: { ...timings, serializeMs, totalMs: timings.totalMs + (deps.now() - started) },
    memoryBytes: deps.memoryBytes(),
  };
}

export interface KernelWorkerCore {
  handle(request: RebuildJobRequest): Promise<RebuildJobResult | RebuildJobError>;
  /** Drop the warm model and the cache (after a fatal error). */
  reset(): void;
}

export function createKernelWorkerCore<M extends CoreModel, R extends CoreMeshing>(
  deps: KernelWorkerDeps<M, R>,
  cacheOptions: RebuildCacheOptions = DEFAULT_REBUILD_CACHE,
): KernelWorkerCore {
  const cache = new RebuildCache<CachedRebuild>(cacheOptions, sizeOfRebuild);
  let warm: WarmModel<M> | null = null;
  let chain: Promise<unknown> = Promise.resolve();

  const reset = (): void => {
    warm = null;
    cache.clear();
  };

  /** The model for this job, built or edited; and how it was produced. */
  async function modelFor(request: RebuildJobRequest): Promise<{ model: M; path: JobTimings['path'] }> {
    if (warm && warm.source === request.source) {
      const edits = targetEdits(warm.model.session.paramTable.serialize(), request.params);
      if (edits.length === 0) return { model: warm.model, path: 'incremental' };
      try {
        warm.model = await deps.update(warm.model, edits);
        return { model: warm.model, path: 'incremental' };
      } catch (error) {
        if (deps.isFatal(error) || deps.memoryCapHit()) throw error;
        // The incremental path can refuse an edit a full build accepts; the
        // full build is the authority.
        warm = null;
      }
    }
    try {
      const model = await deps.build(request.source, request.params);
      warm = { source: request.source, model };
      return { model, path: 'full' };
    } catch (error) {
      warm = null;
      throw classify(deps, error, true);
    }
  }

  async function run(request: RebuildJobRequest): Promise<RebuildJobResult | RebuildJobError> {
    const started = deps.now();
    const key = rebuildCacheKey({
      source: request.source,
      params: request.params,
      quality: request.quality,
      kernelVersion: deps.kernelVersion,
    });
    const hit = cache.get(key);
    if (hit) {
      return respond(deps, request, hit, { buildMs: 0, meshMs: 0, serializeMs: 0, totalMs: deps.now() - started, path: 'cache' });
    }
    let firstBuild = !(warm && warm.source === request.source);
    try {
      const { model, path } = await modelFor(request);
      firstBuild = path === 'full';
      const built = deps.now();
      const meshing = await deps.mesh(model, request.quality);
      if (meshing.failedFeatureIds.length > 0) {
        throw new KernelJobError('script', `${FAILED_FEATURES_MESSAGE}: ${meshing.failedFeatureIds.join(', ')}`, false, firstBuild);
      }
      const meshed = deps.now();
      const fingerprints: Record<string, string> = {};
      for (const feature of meshing.features) fingerprints[feature.featureId] = featureMeshFingerprint(feature);
      const dimensions = request.quality === 'display' ? deps.dimensions(model, meshing) : undefined;
      const entry: CachedRebuild = {
        features: meshing.features,
        fingerprints,
        // Records cross like the server's JSON body: plain data only.
        featureRecords: JSON.parse(JSON.stringify(model.records)) as FeatureRecord[],
        bounds: meshing.bounds,
        params: model.session.paramTable.serialize(),
        ...(dimensions ? { dimensions } : {}),
      };
      cache.set(key, entry);
      return respond(deps, request, entry, {
        buildMs: built - started,
        meshMs: meshed - built,
        serializeMs: deps.now() - meshed,
        totalMs: deps.now() - started,
        path,
      });
    } catch (error) {
      const failure = classify(deps, error, firstBuild);
      if (failure.fatal) reset();
      return {
        type: 'error',
        jobId: request.jobId,
        scope: request.scope,
        generation: request.generation,
        code: failure.code,
        message: failure.message,
        fatal: failure.fatal,
        firstBuild: failure.firstBuild,
      };
    }
  }

  return {
    handle(request) {
      const next = chain.then(() => run(request));
      chain = next.catch(() => undefined);
      return next;
    },
    reset,
  };
}
