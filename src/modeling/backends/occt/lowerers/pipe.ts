// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import {
  buildTubePath,
  isTubePathError,
  type V3,
} from '../../../../shared/tube/tubePath';
import { emptyResultDiagnostic } from '../additiveNoOp';
import { tubeSolid } from '../tubeLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

const EXAMPLE = 'pipe([[0, 0, 0], [40, 0, 0], [40, 0, 30]], 3, { bendRadius: 8 })';
const HINT = 'Fix the pipe() points or bendRadius named in the message, then re-evaluate.';

function readPoints(r: FeatureRecord): V3[] | undefined {
  const raw = (r.metadata as { points?: unknown } | undefined)?.points;
  if (!Array.isArray(raw) || raw.length < 2) return undefined;
  const pts: V3[] = [];
  for (const p of raw) {
    if (
      !Array.isArray(p) || p.length !== 3 ||
      typeof p[0] !== 'number' || !Number.isFinite(p[0]) ||
      typeof p[1] !== 'number' || !Number.isFinite(p[1]) ||
      typeof p[2] !== 'number' || !Number.isFinite(p[2])
    ) {
      return undefined;
    }
    pts.push([p[0], p[1], p[2]]);
  }
  return pts;
}

/** Solid circular pipe: `BRepOffsetAPI_MakePipe` along lines and fillet arcs. */
export function lowerPipe(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const fail = (message: string): LowerOutcome => {
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'pipe(points, radius)',
        path: 'points',
        gotText: message,
        requires: 'an array of at least two [x, y, z] points and a bendRadius greater than the pipe radius',
        example: EXAMPLE,
        hint: HINT,
      }),
    });
    return noShape();
  };

  const points = readPoints(r);
  if (!points) return fail('missing or malformed metadata.points');

  const radius = r.params.radius.evaluated;
  const bendRadius = r.params.bendRadius.evaluated;
  const path = buildTubePath(points, bendRadius);
  if (isTubePathError(path)) {
    if (path.kind === 'unreachable') {
      ctx.diagnostics.push({
        target: ctx.target,
        code: 'feature.invalid-args',
        featureId: r.id,
        severity: 'error',
        ...invalidArgsText({
          api: 'pipe(points, radius, { bendRadius })',
          path: `leg ${path.leg}`,
          gotText: `a leg ${path.missingMm.toFixed(2)} mm too short for the bends at its ends`,
          requires: `the leg at least ${path.missingMm.toFixed(2)} mm longer, or a smaller bendRadius`,
          example: EXAMPLE,
          hint: HINT,
        }),
      });
      return noShape();
    }
    return fail(path.kind);
  }

  try {
    const shape = tubeSolid(path, radius * 2, radius);
    const empty = emptyResultDiagnostic({
      featureId: r.id,
      opLabel: 'pipe',
      volumeAfter: shape.volume(),
      isEmpty: shape.isEmpty(),
    });
    if (empty) ctx.diagnostics.push(empty);
    return built(shape);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: ctx.target,
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT pipe failed: ${msg}`,
      hint: 'OCCT could not sweep a circular disk along the path. Common causes: a self-intersecting centreline or a bend tighter than the pipe radius.',
    });
    return noShape();
  }
}
