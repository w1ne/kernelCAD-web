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
import { inspectStepBuffer, type StepInspectReport } from '../../kernel/import/inspectStep';
import { KernelError } from '../../shared/intent/kernelError';

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
