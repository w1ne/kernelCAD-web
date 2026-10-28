// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Face } from 'replicad';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../../kernel/backends/occt/edgeSelection';
import { editPlanarFaces, FaceEditError, type PlanarFaceEdit } from '../../../../kernel/backends/occt/faceEdit';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { FeatureRef } from '../../../../shared/intent/types';
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import { built, finished, type LowerContext, type LowerOutcome } from './context';

function faceKeys(record: FeatureRecord): string[] {
  return Object.keys(record.inputs)
    .filter((key) => key === 'face' || /^face_\d+$/.test(key))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function selectedFaces(
  ctx: LowerContext,
  record: FeatureRecord,
  base: OcctBackend,
): Face[] | undefined {
  const keys = faceKeys(record);
  if (keys.length === 0) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.face-edit.rejected',
      featureId: record.id,
      severity: 'error',
      message: `FaceEditError FACE_EDIT_EMPTY: ${record.kind} needs at least one face.`,
      hint: "Select a planar face: offsetFaces('top', 2) or moveFaces('top', [0, 0, 2]).",
    });
    return undefined;
  }
  const faces: Face[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const one: FeatureRecord = {
      ...record,
      inputs: { ...record.inputs, face: record.inputs[key] as FeatureRef },
    };
    const picked = pickFace(one, base, ctx.allRecords);
    if ('error' in picked) {
      ctx.diagnostics.push(picked.error);
      return undefined;
    }
    const hash = (picked as unknown as { wrapped: { HashCode: (n: number) => number } }).wrapped
      .HashCode(2147483647)
      .toString(16);
    if (seen.has(hash)) {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.face-edit.rejected',
        featureId: record.id,
        severity: 'error',
        message: 'FaceEditError FACE_EDIT_FAILED: the same face was selected twice.',
        hint: 'Pass each face once.',
      });
      return undefined;
    }
    seen.add(hash);
    faces.push(picked);
  }
  return faces;
}

function reject(ctx: LowerContext, record: FeatureRecord, error: FaceEditError): LowerOutcome {
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.face-edit.rejected',
    featureId: record.id,
    severity: 'error',
    message: `${error.name} ${error.code}: ${error.message}`,
    hint: error.message,
    nextAction: { kind: 'rewrite-feature', guidance: error.message },
  });
  return finished(ctx.inputs.byKey.base);
}

function requireBase(ctx: LowerContext, record: FeatureRecord): OcctBackend | undefined {
  const base = ctx.inputs.byKey.base;
  if (base instanceof OcctBackend) return base;
  ctx.diagnostics.push({
    target: ctx.target,
    code: 'feature.invalid-args',
    featureId: record.id,
    severity: 'error',
    ...invalidArgsText({
      api: `${record.kind}(faces, ...)`,
      path: 'inputs.base',
      gotText: 'no solid',
      requires: 'a solid Shape — call it as a method on the solid',
      example: "box(10, 10, 10).offsetFaces('top', 2)",
    }),
  });
  return undefined;
}

export function lowerOffsetFaces(ctx: LowerContext, record: FeatureRecord): LowerOutcome {
  const base = requireBase(ctx, record);
  if (!base) return finished(ctx.inputs.byKey.base);
  const distance = record.params.distance?.evaluated;
  if (typeof distance !== 'number' || !Number.isFinite(distance)) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: record.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'offsetFaces(faces, distance)',
        path: 'distance',
        got: distance,
        requires: 'a finite distance in mm; positive moves the face along its outward normal',
        unit: 'mm',
        example: "box(10, 10, 10).offsetFaces('top', 2)",
      }),
    });
    return finished(base);
  }
  const faces = selectedFaces(ctx, record, base);
  if (!faces) return finished(base);
  try {
    const edits: PlanarFaceEdit[] = faces.map((face) => ({ face, distance }));
    return built(editPlanarFaces(base, edits, record.id, 'offsetFaces'));
  } catch (e) {
    if (e instanceof FaceEditError) return reject(ctx, record, e);
    return reject(ctx, record, new FaceEditError('FACE_EDIT_FAILED', e instanceof Error ? e.message : String(e)));
  }
}

export function lowerMoveFaces(ctx: LowerContext, record: FeatureRecord): LowerOutcome {
  const base = requireBase(ctx, record);
  if (!base) return finished(ctx.inputs.byKey.base);
  const by: [number, number, number] = [
    record.params.dx?.evaluated,
    record.params.dy?.evaluated,
    record.params.dz?.evaluated,
  ];
  if (by.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: record.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'moveFaces(faces, by)',
        path: 'by',
        got: by,
        requires: 'a finite [x, y, z] displacement in mm, parallel to the face normal',
        unit: 'mm',
        example: "box(10, 10, 10).moveFaces('top', [0, 0, 2])",
      }),
    });
    return finished(base);
  }
  const faces = selectedFaces(ctx, record, base);
  if (!faces) return finished(base);
  try {
    const edits: PlanarFaceEdit[] = faces.map((face) => ({ face, by }));
    return built(editPlanarFaces(base, edits, record.id, 'moveFaces'));
  } catch (e) {
    if (e instanceof FaceEditError) return reject(ctx, record, e);
    return reject(ctx, record, new FaceEditError('FACE_EDIT_FAILED', e instanceof Error ? e.message : String(e)));
  }
}
