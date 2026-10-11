// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { invalidArgsText, type InvalidArgsSpec } from '../../../../shared/intent/invalidArgs';
import { isTubeMetadata, tubeCornerPoints } from '../../../../shared/intent/tubeRecord';
import { buildTubePath, isTubePathError, tubePathErrorArgs } from '../../../../shared/tube/tubePath';
import { tubeSolid } from '../tubeLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

const HINT = 'Fix the tube() arguments named in the message, then re-evaluate.';

export function lowerTube(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const meta = (r.metadata as { tube?: unknown } | undefined)?.tube;
  const fail = (spec: InvalidArgsSpec): LowerOutcome => {
    ctx.diagnostics.push({
      target: 'export-occt', code: 'feature.invalid-args', featureId: r.id, severity: 'error',
      ...invalidArgsText({ ...spec, hint: HINT }),
    });
    return noShape();
  };
  if (!isTubeMetadata(meta)) {
    return fail({
      api: 'tube.record.invalid',
      path: `record '${r.id}' metadata.tube`,
      gotText: 'missing or malformed tube metadata',
      requires: 'the metadata written by tube(name, opts)',
      example: "tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 100] }, od: 10, wall: 1, bendRadius: 30 })",
    });
  }
  const path = buildTubePath(tubeCornerPoints(meta), r.params.bendRadius.evaluated);
  if (isTubePathError(path)) return fail(tubePathErrorArgs(meta.name, path));
  return built(tubeSolid(path, r.params.od.evaluated, r.params.wall.evaluated));
}
