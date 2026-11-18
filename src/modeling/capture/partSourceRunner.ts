// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The node script runner registers itself here. `assembly.instance` calls
// the slot instead of importing the runner, so the modeling API graph does
// not cycle back through script execution.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { ParamTable } from '../../shared/runtime/paramTable';
import type { CaptureSession } from './captureSession';

const INSTANCE_EXAMPLE = "arm.instance('block', { source: './part.kcad.ts', configuration: 'compact' })";

export interface PartSourceRunRequest {
  readonly code: string;
  readonly fileName: string;
  readonly scriptDir: string;
}

export interface PartSourceRunResult {
  readonly session: CaptureSession;
  readonly returnValue: unknown;
  readonly paramTable: ParamTable;
}

type PartSourceRunner = (req: PartSourceRunRequest) => Promise<PartSourceRunResult>;

let runner: PartSourceRunner | undefined;

export function registerPartSourceRunner(next: PartSourceRunner): void {
  runner = next;
}

export function runPartSource(req: PartSourceRunRequest): Promise<PartSourceRunResult> {
  if (!runner) {
    invalidArgs({
      api: 'assembly.instance(name, opts)',
      path: 'source',
      got: 'no script runner',
      requires: 'evaluation through the node script runtime',
      example: INSTANCE_EXAMPLE,
      hintSlug: 'invalid-args.assembly.configuration-source-missing',
    });
  }
  return runner(req);
}
