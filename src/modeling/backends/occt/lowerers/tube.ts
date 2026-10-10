// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { isTubeMetadata, tubeCornerPoints } from '../../../../shared/intent/tubeRecord';
import { buildTubePath, isTubePathError, tubePathErrorMessage } from '../../../../shared/tube/tubePath';
import { tubeSolid } from '../tubeLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './context';

export function lowerTube(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const meta = (r.metadata as { tube?: unknown } | undefined)?.tube;
  const fail = (message: string): LowerOutcome => {
    ctx.diagnostics.push({
      target: 'export-occt', code: 'feature.invalid-args', featureId: r.id, severity: 'error', message,
      hint: 'Fix the tube() arguments named in the message, then re-evaluate.',
    });
    return noShape();
  };
  if (!isTubeMetadata(meta)) return fail(`tube record '${r.id}' is missing valid metadata.tube.`);
  const path = buildTubePath(tubeCornerPoints(meta), r.params.bendRadius.evaluated);
  if (isTubePathError(path)) return fail(tubePathErrorMessage(meta.name, path));
  return built(tubeSolid(path, r.params.od.evaluated, r.params.wall.evaluated));
}
