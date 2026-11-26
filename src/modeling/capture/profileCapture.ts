// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture for the two sketch-driven profile features:
//   * `Shape.cutout(profile, opts)` — subtractive pocket/profile cut;
//   * `Shape.pad(profile, opts)`    — additive boss/pad fused to the face.
// They share the face frame and profile validation. Keeping both here holds
// proxy.ts under the repository file-size ratchet without changing behaviour.

import type { FeatureId, FeatureRef } from '../../shared/intent/types';
import type { CaptureSession } from './captureSession';
import type { PathBuilder, Sketch, SketchCommand } from './sketch';
import type { Shape } from './proxy';
import {
  assertCutoutOptionKeys, validateCutoutOpts, resolveCutoutOpts, serializeCutoutParams,
  validateCutoutProfile,
  type EditableCutoutOpts,
} from '../validation/cutoutValidation';
import {
  assertPadOptionKeys, validatePadOpts, resolvePadOpts, serializePadParams,
  type EditablePadOpts,
} from '../validation/padValidation';
import { buildFaceInputRef, buildUpToFaceInputRef } from './shapeOperationFeatureRecords';
import {
  normalizeFaceSelector,
  assertFeatureNameUniqueOnChain,
  nextOrdinalForKindOnChain,
} from './proxyFeatureChain';

/** A bare PathBuilder is auto-closed; a Sketch must already be closed. */
function resolveProfile(profile: PathBuilder | Sketch): Sketch {
  return typeof (profile as { close?: unknown }).close === 'function'
    ? (profile as PathBuilder).close()
    : (profile as Sketch);
}

function profileCommands(session: CaptureSession, sketch: Sketch): SketchCommand[] {
  const record = session.getRecords().find(r => r.id === sketch.id);
  return (record?.metadata as { commands?: SketchCommand[] } | undefined)?.commands ?? [];
}

export function captureCutout(
  session: CaptureSession,
  baseId: FeatureId,
  profile: PathBuilder | Sketch,
  opts: EditableCutoutOpts,
): Shape {
  assertCutoutOptionKeys(opts, baseId);
  const resolved = resolveCutoutOpts(opts, session.paramTable);
  validateCutoutOpts(resolved, baseId);
  const sketch = resolveProfile(profile);
  validateCutoutProfile(profileCommands(session, sketch), baseId);
  const faceSel = normalizeFaceSelector(opts.face);
  const { params, metadata } = serializeCutoutParams(faceSel, opts);
  if (opts.name !== undefined) {
    assertFeatureNameUniqueOnChain(session.getRecords(), baseId, opts.name);
  } else {
    metadata.ordinal = nextOrdinalForKindOnChain(session.getRecords(), baseId, 'cutout');
  }
  const inputs: Record<string, FeatureRef> = {
    target: { kind: 'feature', id: baseId },
    profile: { kind: 'feature', id: sketch.id },
    face: buildFaceInputRef(baseId, faceSel),
  };
  if (opts.upToFace !== undefined) inputs.upToFace = buildUpToFaceInputRef(baseId, opts.upToFace);
  return session.createShape({ kind: 'cutout', inputs, params, metadata });
}

export function capturePad(
  session: CaptureSession,
  baseId: FeatureId,
  profile: PathBuilder | Sketch,
  opts: EditablePadOpts,
): Shape {
  assertPadOptionKeys(opts, baseId);
  const resolved = resolvePadOpts(opts, session.paramTable);
  validatePadOpts(resolved, baseId);
  const sketch = resolveProfile(profile);
  validateCutoutProfile(profileCommands(session, sketch), baseId, 'pad');
  const faceSel = normalizeFaceSelector(opts.face);
  const { params, metadata } = serializePadParams(faceSel, opts);
  if (opts.name !== undefined) {
    assertFeatureNameUniqueOnChain(session.getRecords(), baseId, opts.name);
  } else {
    metadata.ordinal = nextOrdinalForKindOnChain(session.getRecords(), baseId, 'pad');
  }
  const inputs: Record<string, FeatureRef> = {
    target: { kind: 'feature', id: baseId },
    profile: { kind: 'feature', id: sketch.id },
    face: buildFaceInputRef(baseId, faceSel),
  };
  if (opts.upToFace !== undefined) inputs.upToFace = buildUpToFaceInputRef(baseId, opts.upToFace);
  return session.createShape({ kind: 'pad', inputs, params, metadata });
}
