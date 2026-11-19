// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Appearance of one emitted feature mesh: the whole-body colour/material and
// the per-face overrides the renderer reads from `materialByFaceId`.

import type { FeatureId } from '../../shared/intent/types';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { memberMaterialsByFace } from '../../kernel/backends/occt/memberMaterials';
import { resolvePerFaceMaterialOverrides } from './featureMeshingPhases';
import type { PerFaceMaterialWarning } from './featureMeshing';

export interface FeatureAppearanceContext {
  readonly recordById: ReadonlyMap<FeatureId, FeatureRecord>;
  readonly records: readonly FeatureRecord[];
  readonly colorByFeatureId: ReadonlyMap<FeatureId, string>;
  readonly materialByFeatureId: ReadonlyMap<FeatureId, PBRMaterial>;
  readonly materialByLabelByFeatureId: ReadonlyMap<FeatureId, Record<string, PBRMaterial>>;
  readonly warnings: PerFaceMaterialWarning[];
}

export interface FeatureAppearance {
  color?: string;
  material?: PBRMaterial;
  materialByFaceId?: Record<number, PBRMaterial>;
}

/**
 * A record's own `.color()` / `.material()` / `.finish()` covers every face.
 * Without one, the body takes the primary-lineage appearance (shape > base >
 * target, the rule the exporters use) and each face that came from a
 * differently finished `union()` member keeps that member's finish
 * (`memberMaterialsByFace`). A `.material({ face })` label written on the
 * record itself wins over both.
 */
export function resolveFeatureAppearance(
  featureId: FeatureId,
  shape: ShapeBackend,
  ctx: FeatureAppearanceContext,
): FeatureAppearance {
  const own = { color: ctx.colorByFeatureId.get(featureId), material: ctx.materialByFeatureId.get(featureId) };
  const body = own.color !== undefined || own.material !== undefined
    ? { ...own, members: undefined }
    : inheritedAppearance(featureId, shape, ctx);

  let materialByFaceId = body.members;
  const perFaceMap = ctx.materialByLabelByFeatureId.get(featureId);
  if (perFaceMap !== undefined && shape instanceof OcctBackend) {
    // Per-face label resolution: each label resolves to a face index; an
    // unresolved label is a soft warning and falls back to the body.
    const labelled = resolvePerFaceMaterialOverrides(featureId, shape, perFaceMap, ctx.records, ctx.warnings);
    if (labelled !== undefined) materialByFaceId = { ...(materialByFaceId ?? {}), ...labelled };
  }
  return {
    ...(body.color !== undefined ? { color: body.color } : {}),
    ...(body.material !== undefined ? { material: body.material } : {}),
    ...(materialByFaceId !== undefined ? { materialByFaceId } : {}),
  };
}

function inheritedAppearance(
  featureId: FeatureId,
  shape: ShapeBackend,
  ctx: FeatureAppearanceContext,
): { color?: string; material?: PBRMaterial; members?: Record<number, PBRMaterial> } {
  const record = ctx.recordById.get(featureId);
  if (record === undefined) return {};
  return {
    color: lookupColorFromLineage(record, ctx.records, ctx.recordById),
    material: lookupMaterialFromLineage(record, ctx.records, ctx.recordById),
    members: memberMaterialsByFace(shape, record, ctx.records, ctx.recordById),
  };
}
