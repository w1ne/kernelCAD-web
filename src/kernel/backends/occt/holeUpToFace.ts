// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build a hole's full cutter, then clip it to the selected target-face plane.

import * as replicad from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import type { OcctBackend } from './occtBackend';
import type { BoreFrame } from './holeClassifier';
import { buildUpToFaceTool } from './cutoutUpToFace';

interface HoleEntryFrame {
  centroid: Vec3;
  axisIntoBody: Vec3;
  uBasis: Vec3;
  vBasis: Vec3;
}

interface HoleToolBuild<B extends BoreFrame> {
  tool: replicad.Shape3D;
  bore: B;
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Build each bore at a sufficient depth, then clip its complete tool to the
 *  selected plane. This preserves entry treatments and follows inclined faces. */
export function buildHoleUpToFace<B extends BoreFrame>(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  entry: HoleEntryFrame,
  u: number,
  v: number,
  buildTool: (depth: number) => HoleToolBuild<B>,
  onToolBuildError: (error: unknown) => CompilerDiagnostic,
): HoleToolBuild<B> | { error: CompilerDiagnostic } {
  const entryPoint = add(entry.centroid, add(scale(entry.uBasis, u), scale(entry.vBasis, v)));
  let longBuild: HoleToolBuild<B> | undefined;
  const trimmed = buildUpToFaceTool(
    feature,
    target,
    records,
    { centroid: entryPoint, axisIntoBody: entry.axisIntoBody },
    (depth) => {
      longBuild = buildTool(depth);
      return longBuild.tool;
    },
    onToolBuildError,
  );
  if ('error' in trimmed) return trimmed;
  if (!longBuild) {
    return { error: onToolBuildError(new Error('the upToFace tool was not built')) };
  }
  return {
    tool: trimmed.tool,
    bore: {
      ...longBuild.bore,
      effectiveDepth: trimmed.effectiveDepth,
      through: trimmed.through,
    },
  };
}
