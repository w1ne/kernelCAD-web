// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getActiveMcpSession } from '../activeSession';
import {
  AssetManifestSchema,
  AssetMetadataSchema,
  AssetPresetSchema,
  type AssetManifest,
} from '../../../shared/assets/assetSchema';
import { emitParamsJson } from '../../../shared/assets/emitParamsJson';

/** Return the validated asset contract for the last evaluated local model. */
export function assetManifestTool(): AssetManifest {
  const session = getActiveMcpSession()?.session;
  const meta = session?.assetMetadata ?? AssetMetadataSchema.parse({});
  const params = JSON.parse(emitParamsJson(session?.paramTable.list() ?? [])) as Record<string, unknown>;
  const presets = Object.entries(session?.assetPresets ?? {})
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, values]) => AssetPresetSchema.parse({ schemaVersion: 1, name, params: values }));

  return AssetManifestSchema.parse({ meta, params, presets });
}
