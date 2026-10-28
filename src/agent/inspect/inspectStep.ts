// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/inspect/inspectStep.ts
//
// Thin file-reading wrapper around the pure STEP inspector in
// `src/kernel/import/inspectStep.ts`. This file is the only place in the
// STEP-inspect path that touches `node:fs` — kept out of `src/kernel` so
// the browser runtime never pulls in a Node builtin (see
// `src/modeling/runtime/browserGraphNodeFree.test.ts`).

import { readFile } from 'node:fs/promises';
import { inspectShapeReport, inspectStepBuffer, type StepInspectReport } from '../../kernel/import/inspectStep';
import { importStepCached, StepParseError } from '../../modeling/parts/stepParseCache';
import { KernelError, isKernelError } from '../../shared/intent/kernelError';

export type { StepSolidReport, StepInspectReport } from '../../kernel/import/inspectStep';

/**
 * Inspect a STEP file on disk and report its solid tree.
 *
 * @throws {KernelError} `feature.invalid-args` when the file cannot be
 *   read; `feature.kernel-failed` when the bytes do not parse as a STEP
 *   model containing at least one 3D solid.
 */
export async function inspectStepFile(path: string): Promise<StepInspectReport> {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'inspectStepFile(path): path must be a non-empty string.',
      undefined,
      'invalid-args.inspect.step — pass an absolute path to a .step file.',
    );
  }

  let buf: Buffer;
  try {
    buf = await readFile(path);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `inspectStepFile: cannot read STEP file at ${path}.`,
      undefined,
      `invalid-args.inspect.step.path — verify the file exists and is readable at '${path}'.`,
    );
  }

  return inspectStepBuffer(buf, path);
}

/**
 * Inspect the solid `lib.fromSTEP` will edit.
 *
 * The raw STEP inspector reports the file as imported. `fromSTEP` then merges
 * same-domain faces, so a large valid file can drop from 1,026 faces to 867
 * before the script runs. Editing observations and promotion have to measure
 * that normalized solid, or a no-op export of the healed import looks like a
 * geometry change and a real edit is judged against the wrong baseline.
 */
export async function inspectNormalizedStepFile(path: string): Promise<StepInspectReport> {
  if (typeof path !== 'string' || path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'inspectStepFile(path): path must be a non-empty string.',
      undefined,
      'invalid-args.inspect.step — pass an absolute path to a .step file.',
    );
  }
  let buf: Buffer;
  try {
    buf = await readFile(path);
  } catch {
    throw new KernelError(
      'feature.invalid-args',
      `inspectStepFile: cannot read STEP file at ${path}.`,
      undefined,
      `invalid-args.inspect.step.path — verify the file exists and is readable at '${path}'.`,
    );
  }
  try {
    const backend = await importStepCached(buf);
    try {
      return inspectShapeReport(backend.getReplicadShape(), path, buf.toString('utf8'));
    } finally {
      backend.dispose();
    }
  } catch (e) {
    if (isKernelError(e)) throw e;
    const outOfMemory = e instanceof StepParseError && e.reason === 'out-of-memory';
    throw new KernelError(
      'feature.kernel-failed',
      `inspectStepFile: replicad failed to parse STEP at ${path}: ${e instanceof Error ? e.message : String(e)}`,
      undefined,
      outOfMemory
        ? 'kernel-failed.inspect.step.out-of-memory — the file is NOT invalid; the geometry kernel exhausted its 2 GiB wasm heap. Restart the host process and retry.'
        : 'kernel-failed.inspect.step.parse — file is not a valid STEP model; re-export from the source CAD as AP203/AP214 with solid bodies.',
    );
  }
}
