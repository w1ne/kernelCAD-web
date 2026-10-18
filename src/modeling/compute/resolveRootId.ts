// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Root-id resolution lives in this browser-safe module (no `node:` imports) so
// the studio kernel worker can compute the script's root feature id without
// importing the build pipeline. `buildModel.ts` re-exports it unchanged.

import type { FeatureId } from '../../shared/intent/types';
import { Shape } from '../capture/proxy';
import { Scene } from '../validation/scene';

/**
 * Resolve the FeatureId of the value the script `return`ed.
 * Shape → its feature id; Scene → the upstream solvedAssembly /
 * assemblyModel record id; anything else (Region, plain data, no
 * return) → fall back to the chain tail.
 */
export function resolveRootId(
  returnValue: unknown,
  tailId: FeatureId | undefined,
): FeatureId | undefined {
  if (returnValue instanceof Shape) return returnValue.id;
  if (returnValue instanceof Scene) return returnValue.__sourceFeatureId() ?? tailId;
  return tailId;
}
