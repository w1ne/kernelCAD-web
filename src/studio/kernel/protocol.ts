// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/protocol.ts
//
// Versioned message protocol between Studio's main thread and the kernel
// worker. `v` is the wire version: a host and a worker built from different
// revisions must be able to refuse each other rather than misread messages.
//
// Geometry rides as a bin1 payload (modeling/capture/featureMeshBinary), so a
// dense model crosses the boundary as one transferred ArrayBuffer. A `params`
// request may carry `have` — the fingerprints the client already holds — and
// the worker answers with only the changed features plus a `MeshBinaryTrailer`
// naming the rest (see mergeFeatureMeshes for the client side).

import type { Bounds } from '../../modeling/capture/featureMeshing';
import type { MeshBinaryTrailer } from '../../modeling/capture/featureMeshBinary';

export const KERNEL_PROTOCOL_VERSION = 1;

export type KernelRequest =
  | { v: 1; id: number; type: 'build'; source: string; fileName: string }
  | { v: 1; id: number; type: 'params'; edits: Array<{ name: string; value: number | boolean }>; have?: Record<string, string> }
  | { v: 1; id: number; type: 'dispose' };

/** A `result`'s `bounds` is the same shape `BackendMeshPayload['bounds']` uses in
 *  src/studio/scriptSource.ts (structurally `Bounds` from featureMeshing). */
export type KernelResponse =
  | { v: 1; id: number; type: 'script-done' }
  | { v: 1; id: number; type: 'result'; payload: Uint8Array; trailer?: MeshBinaryTrailer;
      params: unknown; featureRecords: unknown[]; bounds: Bounds; failedFeatureIds: string[] }
  | { v: 1; id: number; type: 'error'; code: 'script-error' | 'host-fs-unavailable' | 'worker-error'; message: string;
      failedFeatureIds?: string[] };
