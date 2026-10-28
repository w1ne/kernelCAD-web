// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { EditableVec3 } from '../../shared/intent/types';
import { isValidEditableVec3 } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FaceQuery } from '../../kernel/backends/occt/edgeQueries';
import type { Query, FaceMarker } from '../../kernel/naming/query';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';
import { toParam, toVec3Param } from '../../shared/runtime/editableHelpers';
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';

export type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export type FaceSelector =
  | FaceQuery
  | { face: CanonicalFace | string }
  // Q8 — Query DSL value (kc.q.face(...) etc) reaches every face-feature
  // lowerer (shell / hole / cutout) through the same {face} slot. Captured
  // at append-time and dispatched through the Q3 evaluator at lower-time.
  | Query<FaceMarker>
  | Query<unknown>;

export type FaceEditInput =
  | FaceSelector
  | CanonicalFace
  | string
  | readonly (FaceSelector | CanonicalFace | string)[];

function faceEditList(
  featureId: string,
  faces: FaceEditInput,
  api: string,
): (FaceSelector | CanonicalFace | string)[] {
  const list = Array.isArray(faces) ? [...faces] : [faces];
  if (list.length === 0 || list.some((face) => face === undefined || face === null || face === '')) {
    invalidArgs({
      api,
      path: 'faces',
      got: faces,
      requires: "one or more faces: a canonical name ('top'), a label, a FaceQuery, kc.q / @kcq[...], or an array of those",
      example: "box(10, 10, 10).offsetFaces('top', 2)",
      featureId,
    });
  }
  return list;
}

/** Push or pull planar faces along their outward normals by `distance` mm. */
export function captureOffsetFaces(
  session: CaptureSession,
  shape: Shape,
  faces: FaceEditInput,
  distance: Editable<number>,
): Shape {
  const list = faceEditList(shape.id, faces, 'offsetFaces(faces, distance)');
  if (!isParamRef(distance) && !(typeof distance === 'number' && Number.isFinite(distance))) {
    invalidArgs({
      api: 'offsetFaces(faces, distance)',
      path: 'distance',
      got: distance,
      requires: 'a finite distance in mm; positive moves each face along its outward normal',
      unit: 'mm',
      example: "box(10, 10, 10).offsetFaces('top', 2)",
      featureId: shape.id,
    });
  }
  return session.faceEditFeature('offsetFaces', shape, list, {
    distance: toParam(distance, 'mm'),
  });
}

/** Move planar faces by a vector parallel to each face's outward normal. */
export function captureMoveFaces(
  session: CaptureSession,
  shape: Shape,
  faces: FaceEditInput,
  by: EditableVec3,
): Shape {
  const list = faceEditList(shape.id, faces, 'moveFaces(faces, by)');
  if (!isValidEditableVec3(by)) {
    invalidArgs({
      api: 'moveFaces(faces, by)',
      path: 'by',
      got: by,
      requires: 'a finite [x, y, z] displacement in mm, parallel to the face normal',
      unit: 'mm',
      example: "box(10, 10, 10).moveFaces('top', [0, 0, 2])",
      featureId: shape.id,
    });
  }
  const vec = toVec3Param(by as EditableVec3, 'mm');
  return session.faceEditFeature('moveFaces', shape, list, {
    dx: vec.x,
    dy: vec.y,
    dz: vec.z,
  });
}
