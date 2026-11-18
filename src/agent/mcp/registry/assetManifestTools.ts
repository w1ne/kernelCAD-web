// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { assetManifestTool } from '../tools/assetManifest';
import type { ToolRegistryEntry } from './types';

export const assetManifestToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'asset_manifest',
      description:
        'Use this when you need a machine-readable description of the current parametric asset. ' +
        'Read the validated asset metadata, evaluated parameter values, named presets, and mesh stats ' +
        '(triangles, sizeM, minUpM, materials, drawCalls, parts, hasRig, hasIk) from the most recently evaluated model. ' +
        'Stats match asset.extras.kernelcad.stats on a GLB export. ' +
        'This tool is read-only; parameters reflect their current evaluated values and fall back to their declared defaults.',
      inputSchema: { type: 'object', properties: {} },
    },
    handler: async () => assetManifestTool(),
  },
];
