// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Face } from 'replicad';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { resolveFaceRefFaces } from '../../../../kernel/backends/occt/edgeSelection';
import { editPlanarFaces, FaceEditError, type FaceEditSkip, type PlanarFaceEdit } from '../../../../kernel/backends/occt/faceEdit';
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
    // A FaceQuery is a set selector: it contributes every face it matches, so
    // `{ byNormal: 'X' }` moves all +X-facing walls rather than one arbitrary
    // first match. Canonical names, labels and `near` still select one face.
    const picked = resolveFaceRefFaces(one, base, ctx.allRecords);
    if ('error' in picked) {
      ctx.diagnostics.push(picked.error);
      return undefined;
    }
    for (const face of picked) {
      const hash = (face as unknown as { wrapped: { HashCode: (n: number) => number } }).wrapped
        .HashCode(2147483647)
        .toString(16);
      if (seen.has(hash)) continue;
      seen.add(hash);
      faces.push(face);
    }
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

/**
 * A FaceQuery can select many faces. When one of them cannot slide (a
 * cylindrical wall, a step at a convex boundary), keep the moves that can be
 * made and report the refused face; a one-face edit is still all-or-nothing so
 * a mistaken single selection never returns a body that was not asked for.
 */
function skipReporter(
  ctx: LowerContext,
  record: FeatureRecord,
  count: number,
): ((skip: FaceEditSkip) => void) | undefined {
  if (count <= 1) return undefined;
  return ({ error }: FaceEditSkip) => {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.face-edit.skipped',
      featureId: record.id,
      severity: 'warn',
      message:
        `${record.kind}: one of ${count} selected faces was left unchanged — ` +
        `${error.code}: ${error.message}`,
      hint:
        'The remaining selected faces moved. If this face must move too, select it on its own and ' +
        'build the change as a boolean, or pick faces whose boundary can follow the slide.',
    });
  };
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
    return built(editPlanarFaces(base, edits, record.id, 'offsetFaces', skipReporter(ctx, record, faces.length)));
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
    return built(editPlanarFaces(base, edits, record.id, 'moveFaces', skipReporter(ctx, record, faces.length)));
  } catch (e) {
    if (e instanceof FaceEditError) return reject(ctx, record, e);
    return reject(ctx, record, new FaceEditError('FACE_EDIT_FAILED', e instanceof Error ? e.message : String(e)));
  }
}
