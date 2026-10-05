// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/helpers/viewerDimensionParts.ts
//
// Test-only: build a kernelCAD script and return its world-frame parts, the
// same input `computeViewerDimensions` gets in production. Lives under
// tests/ because it reaches up into src/modeling, which src/kernel may not.

import { buildModel } from '../../src/modeling/buildModel';
import { isSceneBackend } from '../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts, type WorldFramePart } from '../../src/kernel/backends/occt/sceneToWorldFrame';
import type { OcctBackend } from '../../src/kernel/backends/occt/occtBackend';

export async function partsFromSource(code: string): Promise<WorldFramePart[]> {
  const model = await buildModel({ code, fileName: 'viewer-dimensions.kcad.ts' });
  const root = model.rootShape;
  if (!root) {
    throw new Error(`script produced no shape: ${JSON.stringify(model.diagnostics.map(d => d.message))}`);
  }
  return isSceneBackend(root)
    ? sceneToWorldFrameParts(root)
    : [{ name: 'part', shape: root as OcctBackend }];
}
