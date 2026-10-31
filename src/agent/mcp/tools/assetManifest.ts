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
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import { buildRigMetadata } from '../../../kernel/export/rigHierarchy';

/** Return the validated asset contract for the last evaluated local model. */
export function assetManifestTool(): AssetManifest {
  const active = getActiveMcpSession();
  const session = active?.session;
  const meta = session?.assetMetadata ?? AssetMetadataSchema.parse({});
  const presets = Object.entries(session?.assetPresets ?? {})
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, values]) => AssetPresetSchema.parse({ schemaVersion: 1, name, params: values }));
  const scene = isSceneBackend(active?.rootShape) ? active.rootShape : undefined;
  const rigMetadata = scene?.rig === undefined ? undefined : buildRigMetadata(scene.rig);
  const paramsDocument = JSON.parse(emitParamsJson(
    session?.paramTable.list() ?? [],
    rigMetadata === undefined ? undefined : { rig: rigMetadata.rig },
  )) as Record<string, unknown>;
  const params = (rigMetadata === undefined ? paramsDocument : paramsDocument.params) as Record<string, unknown>;

  return AssetManifestSchema.parse({
    meta,
    params,
    presets,
    ...(rigMetadata === undefined ? {} : { rig: rigMetadata.rig, rigWarnings: rigMetadata.warnings }),
  });
}
