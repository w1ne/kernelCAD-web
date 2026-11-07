// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture bodies for `Shape.hole`, `Shape.holes`, and `Shape.threadedHole`.
// Kept out of proxy.ts so that file stays under the max-lines ratchet.

import type { FeatureId, FeatureRef } from '../../shared/intent/types';
import type { CaptureSession } from './captureSession';
import type { CanonicalFace, FaceSelector } from './faceEditCapture';
import { buildFaceInputRef } from './shapeOperationFeatureRecords';
import { attachHolesConnectors, attachSingleHoleConnectors } from './emitHoleConnectors';
import { threadedHoleToHoleOpts, type ThreadedHoleOpts } from './threadedHole';
import {
  normalizeFaceSelector,
  assertFeatureNameUniqueOnChain,
  nextOrdinalForKindOnChain,
} from './proxyFeatureChain';
import {
  validateHoleOpts, validateHolesOpts, serializeHoleParams, serializeHolesParams,
  resolveHoleOpts, resolveHolesOpts,
} from '../validation/holeValidation';
import { applyHoleThreadSugar, type HoleCallOpts, type HolesCallOpts } from '../validation/holeThreadSugar';

export function captureHole(
  session: CaptureSession,
  shapeId: FeatureId,
  face: FaceSelector | CanonicalFace | string,
  opts: HoleCallOpts,
  carriedSpec: string | undefined,
): ReturnType<CaptureSession['createShape']> {
  // Slice-3: validate against the resolved-at-capture-time numeric view, but
  // serialize from the original Editable opts so symbolic ParamRefs survive
  // into the FeatureRecord for later edit-after-build.
  // `thread: true` fills the coarse pitch first; an explicit pitch is kept.
  const prepared = applyHoleThreadSugar(opts, session.paramTable, 'hole');
  const resolved = resolveHoleOpts(prepared.opts, session.paramTable);
  validateHoleOpts(resolved, shapeId);
  const faceSel = normalizeFaceSelector(face);
  const { params, metadata } = serializeHoleParams(faceSel, prepared.opts);
  const threadSpec = prepared.spec ?? carriedSpec;
  if (threadSpec !== undefined) metadata.threadSpec = threadSpec;
  if (opts.name !== undefined) {
    assertFeatureNameUniqueOnChain(session.getRecords(), shapeId, opts.name);
  } else {
    metadata.ordinal = nextOrdinalForKindOnChain(session.getRecords(), shapeId, 'hole');
  }
  const inputs: Record<string, FeatureRef> = {
    target: { kind: 'feature', id: shapeId },
    face: buildFaceInputRef(shapeId, faceSel),
  };
  const holeShape = session.createShape({
    kind: 'hole',
    inputs,
    params,
    metadata,
  });
  attachSingleHoleConnectors(session, holeShape.id, metadata, resolved);
  return holeShape;
}

export function captureThreadedHole(
  session: CaptureSession,
  shapeId: FeatureId,
  face: FaceSelector | CanonicalFace | string,
  opts: ThreadedHoleOpts,
): ReturnType<CaptureSession['createShape']> {
  const prepared = threadedHoleToHoleOpts(opts, session.paramTable);
  return captureHole(session, shapeId, face, prepared.opts, prepared.spec);
}

export function captureHoles(
  session: CaptureSession,
  shapeId: FeatureId,
  face: FaceSelector | CanonicalFace | string,
  opts: HolesCallOpts,
): ReturnType<CaptureSession['createShape']> {
  const prepared = applyHoleThreadSugar(opts, session.paramTable, 'holes');
  const resolved = resolveHolesOpts(prepared.opts, session.paramTable);
  validateHolesOpts(resolved, shapeId);
  const faceSel = normalizeFaceSelector(face);
  const { params, metadata } = serializeHolesParams(faceSel, prepared.opts);
  if (prepared.spec !== undefined) metadata.threadSpec = prepared.spec;
  if (opts.name !== undefined) {
    assertFeatureNameUniqueOnChain(session.getRecords(), shapeId, opts.name);
  } else {
    metadata.ordinal = nextOrdinalForKindOnChain(session.getRecords(), shapeId, 'holes');
  }
  const inputs: Record<string, FeatureRef> = {
    target: { kind: 'feature', id: shapeId },
    face: buildFaceInputRef(shapeId, faceSel),
  };
  const holesShape = session.createShape({
    kind: 'holes',
    inputs,
    params,
    metadata,
  });
  attachHolesConnectors(session, holesShape.id, metadata, resolved);
  return holesShape;
}
