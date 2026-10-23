// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/protocol.ts
//
// Messages between the Studio page and its browser kernel worker.
//
// The worker is created from a `data:` URL, so it runs with an opaque origin
// (see kernelWorkerHost.ts). The page hands it a private MessagePort in the
// one `init` message; every later message, both ways, travels on that port.
// Model code running in the worker can still call `self.postMessage`, but the
// page ignores everything on the worker object after `init`, and the port
// itself lives in a closure model code cannot reach. So a model cannot forge
// a reply. Every message is still shape-checked here before use.
//
// The document (source + param values) is the source of truth; meshes are
// derived data the worker can always regenerate. Each job carries the
// document scope, the edit generation and a job id, so a stale reply is
// dropped instead of painted.

import type { FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { SerializedParamTable } from '../../shared/runtime/paramTable';
import type { ViewerDimension } from '../../shared/intent/viewerDimension';

export const BROWSER_KERNEL_PROTOCOL = 1;

/** Tessellation of a job. `coarse` is the kernel's COARSE_MESH_OPTIONS
 *  tolerance profile for intermediate drag ticks; `display` is the full
 *  display quality every settled edit gets. Nothing is ever decimated. */
export type MeshQuality = 'display' | 'coarse';

export type ParamValues = Record<string, number | boolean>;

/** First message, on the worker object, with the private port. */
export interface KernelInitMessage {
  type: 'kc-init';
  v: typeof BROWSER_KERNEL_PROTOCOL;
  /** The OCCT wasm bytes; the worker never fetches anything. */
  wasm: ArrayBuffer;
  /** WebAssembly memory the kernel may grow to, in bytes. */
  memoryCapBytes: number;
}

export interface RebuildJobRequest {
  type: 'rebuild';
  jobId: number;
  /** Document this job belongs to (the Studio model key). */
  scope: string;
  /** Edit order within the scope; a newer generation supersedes. */
  generation: number;
  /** Source with choice/text values already written in. */
  source: string;
  /** Number/boolean overrides, applied like the server's `params` field. */
  params: ParamValues;
  quality: MeshQuality;
  /** Fingerprints of the features the page holds from this worker. Null: it
   *  holds none, send everything. */
  have: Record<string, string> | null;
}

export type PageToWorker = RebuildJobRequest;

export interface KernelReadyMessage {
  type: 'ready';
  v: typeof BROWSER_KERNEL_PROTOCOL;
  /** `self.origin` inside the worker: 'null' when isolated. */
  origin: string;
  /** Capabilities that were present and are now stubbed out. */
  locked: string[];
  initMs: number;
}

/** The mesh payload a job answers with: the server's `/__kernelcad/mesh`
 *  shape, plus the per-feature fingerprints. `features` holds only the
 *  features the page does not already hold; `changedFeatureIds` names those
 *  plus the removed ones (the page's mergeFeatureGeometries contract). */
export interface KernelMeshPayload {
  features: FeatureMeshSerialized[];
  featureRecords: FeatureRecord[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  params: SerializedParamTable;
  dimensions?: ViewerDimension[];
  changedFeatureIds?: string[];
}

export interface JobTimings {
  /** Script run + lowering, or `updateModelParams`. */
  buildMs: number;
  meshMs: number;
  serializeMs: number;
  totalMs: number;
  /** How the model was produced. */
  path: 'cache' | 'incremental' | 'full';
}

export interface RebuildJobResult {
  type: 'result';
  jobId: number;
  scope: string;
  generation: number;
  quality: MeshQuality;
  payload: KernelMeshPayload;
  /** featureId → fingerprint for EVERY feature of the model. */
  fingerprints: Record<string, string>;
  timings: JobTimings;
  /** WebAssembly memory in use after the job, in bytes. */
  memoryBytes: number;
}

/** Why a job failed. `script` is a model error the server would report too;
 *  `server-only` needs a filesystem/server capability; `memory` hit the
 *  cap; `internal` is a kernel/worker fault. `fatal` means the worker state
 *  is no longer trustworthy (poisoned heap) and the page must respawn it. */
export type KernelErrorCode = 'script' | 'server-only' | 'memory' | 'internal';

export interface RebuildJobError {
  type: 'error';
  jobId: number;
  scope: string;
  generation: number;
  code: KernelErrorCode;
  message: string;
  fatal: boolean;
  /** True when the failing step was the first build of this source. */
  firstBuild: boolean;
}

export type WorkerToPage = KernelReadyMessage | RebuildJobResult | RebuildJobError;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJobEnvelope(m: Record<string, unknown>): boolean {
  return typeof m.jobId === 'number' && typeof m.scope === 'string' && typeof m.generation === 'number';
}

function isPayload(value: unknown): value is KernelMeshPayload {
  if (!isRecord(value)) return false;
  return Array.isArray(value.features)
    && Array.isArray(value.featureRecords)
    && isRecord(value.bounds)
    && isRecord(value.params)
    && (value.changedFeatureIds === undefined || Array.isArray(value.changedFeatureIds));
}

const ERROR_CODES: ReadonlySet<string> = new Set(['script', 'server-only', 'memory', 'internal']);

/** True only for a well-formed worker message; anything else is dropped. */
export function isWorkerToPage(value: unknown): value is WorkerToPage {
  if (!isRecord(value)) return false;
  if (value.type === 'ready') {
    return value.v === BROWSER_KERNEL_PROTOCOL && typeof value.origin === 'string' && Array.isArray(value.locked);
  }
  if (!isJobEnvelope(value)) return false;
  if (value.type === 'result') {
    return isPayload(value.payload) && isRecord(value.fingerprints) && isRecord(value.timings)
      && (value.quality === 'display' || value.quality === 'coarse');
  }
  if (value.type === 'error') {
    return typeof value.code === 'string' && ERROR_CODES.has(value.code)
      && typeof value.message === 'string' && typeof value.fatal === 'boolean';
  }
  return false;
}

/** True only for a well-formed job request (the worker's inbound check). */
export function isPageToWorker(value: unknown): value is PageToWorker {
  if (!isRecord(value) || value.type !== 'rebuild' || !isJobEnvelope(value)) return false;
  return typeof value.source === 'string'
    && isRecord(value.params)
    && (value.quality === 'display' || value.quality === 'coarse')
    && (value.have === null || isRecord(value.have));
}
