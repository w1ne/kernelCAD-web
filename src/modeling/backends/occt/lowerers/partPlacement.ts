// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { Vec3Param } from '../../../../shared/intent/types';
import type { ParamTable } from '../../../../shared/runtime/paramTable';
import { resolveParams } from '../../../../shared/runtime/resolveParams';
import { Transform } from '../../../../shared/runtime/se3';
import type { StoredPartRotate } from '../../../capture/assemblyFeatureRecords';
import { readVec3Param } from './helpers';

/**
 * Placement of an `assemblyPart` relative to its solved (FK / mate / identity)
 * frame: P = T(at) · R(rotate). The part shape itself stays in its source's local frame
 * so identical parts can share one OCCT shape; consumers place it with
 * `SceneBackendPart.worldTransform = solved · P`, which equals the former
 * "translate the clone by at, then apply solved" exactly.
 *
 * Scene lowerers see RAW part records (only the record being lowered is
 * param-resolved), so a ParamRef `at` is resolved against `paramTable` here;
 * without it its capture-time snapshot would be used.
 */
export function partPlacementTransform(partRec: FeatureRecord, paramTable?: ParamTable): Transform {
  const meta = partRec.metadata as { at?: Vec3Param; rotate?: StoredPartRotate } | undefined;
  const rotation = rotationOf(meta?.rotate);
  if (meta?.at === undefined) return rotation;
  const at = paramTable === undefined ? meta.at : resolveParams(meta.at, paramTable);
  const [tx, ty, tz] = readVec3Param(at);
  return Transform.translation(tx, ty, tz).compose(rotation);
}

function rotationOf(rotate: StoredPartRotate | undefined): Transform {
  if (rotate === undefined) return Transform.identity();
  if ('eulerDeg' in rotate) return Transform.eulerXYZDeg(rotate.eulerDeg[0], rotate.eulerDeg[1], rotate.eulerDeg[2]);
  return Transform.rotationAxisAngleDeg(rotate.axis, rotate.degrees);
}
