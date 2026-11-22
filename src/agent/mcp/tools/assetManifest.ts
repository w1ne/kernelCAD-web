// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getActiveMcpSession } from '../activeSession';
import {
  AssetManifestSchema,
  AssetMetadataSchema,
  AssetPresetSchema,
  type AssetManifest,
  type AssetMetadata,
  type AssetPreset,
  type AssetPresets,
  type AssetStats,
} from '../../../shared/assets/assetSchema';
import { emitParamsJson } from '../../../shared/assets/emitParamsJson';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import { isSceneBackend } from '../../../kernel/backends/sceneBackend';
import { OcctBackend, meshShapeForExport } from '../../../kernel/backends/occt/occtBackend';
import { releaseWorldFrameParts, sceneToWorldFrameParts } from '../../../kernel/backends/occt/sceneToWorldFrame';
import { measureGlbStats, type GlbStatsPart } from '../../../kernel/export/assetStats';
import { buildRigMetadata } from '../../../kernel/export/rigHierarchy';
import type { CaptureSession } from '../../../modeling/capture/captureSession';

type RigMetadata = ReturnType<typeof buildRigMetadata>;

/** Return the validated asset contract for the last evaluated local model. */
export function assetManifestTool(): AssetManifest {
  const active = getActiveMcpSession();
  const session = active?.session;
  const rigMetadata = rigMetadataForRoot(active?.rootShape);
  return AssetManifestSchema.parse({
    meta: manifestMeta(session),
    params: manifestParams(session, rigMetadata),
    presets: manifestPresets(session),
    stats: manifestStats(active?.rootShape, rigMetadata),
    ...manifestRigFields(rigMetadata),
  });
}

function manifestMeta(session: CaptureSession | undefined): AssetMetadata {
  return session?.assetMetadata ?? AssetMetadataSchema.parse({});
}

function manifestPresets(session: CaptureSession | undefined): AssetPreset[] {
  const presets: AssetPresets = session?.assetPresets ?? {};
  return Object.entries(presets)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, values]) => AssetPresetSchema.parse({ schemaVersion: 1, name, params: values }));
}

function manifestParams(
  session: CaptureSession | undefined,
  rigMetadata: RigMetadata | undefined,
): Record<string, unknown> {
  const paramsDocument = JSON.parse(emitParamsJson(
    session?.paramTable.list() ?? [],
    rigMetadata === undefined ? undefined : { rig: rigMetadata.rig },
  )) as Record<string, unknown>;
  return (rigMetadata === undefined ? paramsDocument : paramsDocument.params) as Record<string, unknown>;
}

/** Rig keys are omitted entirely when the active root has no solved assembly. */
function manifestRigFields(rigMetadata: RigMetadata | undefined): {
  rig?: RigMetadata['rig'];
  rigWarnings?: RigMetadata['warnings'];
} {
  return rigMetadata === undefined ? {} : { rig: rigMetadata.rig, rigWarnings: rigMetadata.warnings };
}

function rigMetadataForRoot(root: ShapeBackend | undefined): RigMetadata | undefined {
  if (!isSceneBackend(root) || root.rig === undefined) return undefined;
  return buildRigMetadata(root.rig);
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
