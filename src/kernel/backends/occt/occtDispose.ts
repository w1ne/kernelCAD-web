// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Free an OcctBackend's native handles. A catalog fastener's analysisBody is
// a second solid; leaving it for the V8 finalizer pins wasm the heap never
// returns.

import type { ShapeBackend } from '../backend';
import type { OcctBackend } from './occtBackend';
import { forgetAnalysis } from './analysisMemo';

type ReplicadHandle = { delete?: () => void; isDeleted?: () => boolean };

/** Drop the analysis memo, the fastener envelope, and the display solid. */
export function disposeOcctHandles(backend: OcctBackend, shape: ReplicadHandle): void {
  forgetAnalysis(backend as ShapeBackend);
  const envelope = backend.analysisBody;
  backend.analysisBody = undefined;
  if (envelope && envelope !== backend) {
    try { envelope.dispose(); } catch { /* envelope may already be freed */ }
  }
  try {
    if (typeof shape.isDeleted === 'function' && shape.isDeleted()) return;
    shape.delete?.();
  } catch {
    // A second dispose, or a lower that already freed the handle.
  }
}
