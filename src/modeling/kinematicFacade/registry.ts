// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/kinematicFacade/registry.ts
//
// The kinematic layer sits above modeling (shared -> kernel -> modeling ->
// kinematic -> agent -> studio), so modeling cannot import `src/kinematic` to
// build `api.kinematic` directly. The agent layer (which CAN import both
// modeling and kinematic) registers the real implementation here via a
// side-effect import — see `src/agent/kinematic/register.ts` and its import
// from the CLI, MCP server, and browser runtime entry points — before any
// script that reads `api.kinematic` runs.

import { KernelError } from '../../shared/intent/kernelError';
import type { KinematicFacade } from './facade';

export type { KinematicFacade };

let kinematicImpl: KinematicFacade | undefined;

/** Called once, at process/bundle start, by the agent layer's side-effect
 *  `register.ts` import. Not for script authors — this wires the facade
 *  `api.kinematic` reads from, it is not itself part of the script API. */
export function registerKinematicFacade(facade: KinematicFacade): void {
  kinematicImpl = facade;
}

export function getKinematicFacade(): KinematicFacade {
  if (!kinematicImpl) {
    throw new KernelError(
      'feature.invalid-args',
      'kinematic facade not registered — the runtime entry point must import `src/agent/kinematic/register.ts` (a side-effect import) before evaluating any script that reads `kinematic.*`.',
      undefined,
      'invalid-args.kinematic.facade-not-registered — call site never imported `src/agent/kinematic/register.ts`.',
    );
  }
  return kinematicImpl;
}
