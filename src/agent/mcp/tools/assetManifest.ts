// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getActiveMcpSession } from '../activeSession';
import {
  AssetManifestSchema,
  AssetMetadataSchema,
  AssetPresetSchema,
  type AssetManifest,
  type AssetStats,
} from '../../../shared/assets/assetSchema';
import { emitParamsJson } from '../../../shared/assets/emitParamsJson';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import { OcctBackend, meshShapeForExport } from '../../../kernel/backends/occt/occtBackend';
import { releaseWorldFrameParts, sceneToWorldFrameParts } from '../../../kernel/backends/occt/sceneToWorldFrame';
import { measureGlbStats, type GlbStatsPart } from '../../../kernel/export/assetStats';
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
  const stats = manifestStats(active?.rootShape, rigMetadata);
  const paramsDocument = JSON.parse(emitParamsJson(
    session?.paramTable.list() ?? [],
    rigMetadata === undefined ? undefined : { rig: rigMetadata.rig },
  )) as Record<string, unknown>;
  const params = (rigMetadata === undefined ? paramsDocument : paramsDocument.params) as Record<string, unknown>;

  return AssetManifestSchema.parse({
    meta,
    params,
    presets,
    stats,
    ...(rigMetadata === undefined ? {} : { rig: rigMetadata.rig, rigWarnings: rigMetadata.warnings }),
  });
}

/** Same stats object a default Y-up PBR GLB would write. Empty scenes stay at zero. */
function manifestStats(
  root: ShapeBackend | undefined,
  rigMetadata: { readonly rig: Readonly<Record<string, unknown>> } | undefined,
): AssetStats {
  const rig = rigMetadata === undefined ? undefined : { rig: rigMetadata.rig };
  if (root === undefined || (isSceneBackend(root) && root.parts.length === 0)) {
    return measureGlbStats([], { rig });
  }
  if (isSceneBackend(root)) {
    const parts = sceneToWorldFrameParts(root);
    try {
      return measureGlbStats(parts.map((part): GlbStatsPart => ({
        mesh: meshShapeForExport(part.shape.getReplicadShape()),
        name: part.name,
        material: part.material,
        color: part.color,
        colorParamName: part.colorParamName,
      })), { axis: 'y-up', style: 'pbr', rig });
    } finally {
      releaseWorldFrameParts(parts);
    }
  }
  const clone = (root as OcctBackend).clone();
  try {
    return measureGlbStats([{
      mesh: meshShapeForExport(clone.getReplicadShape()),
      name: 'part',
    }], { axis: 'y-up', style: 'pbr', rig });
  } finally {
    clone.dispose?.();
  }
}
