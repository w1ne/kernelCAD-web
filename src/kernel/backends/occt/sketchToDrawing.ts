// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sketchToDrawing.ts
//
// Shared helper: rebuild a `replicad.Drawing` from a SketchCommand[]. Used by
// `cutoutLowerer.ts` (subtractive sketch-driven extrudes) and by W3
// `projectCurveLowerer.ts` (wrap a 2D closed curve onto a 3D face).
//
// Promoted from cutoutLowerer.ts so the two lowerers share one implementation
// (per feedback_reuse_existing_solutions — no duplication).
//
// Coverage: handles the planar SketchCommand subset used by both cutout and
// projectCurve callers — moveTo (required first), lineTo, tangentArc,
// threePointsArc, sagittaArc, bulgeArc, radiusArc, smoothSpline. Slice-D
// NURBS segments (spline, nurbsSegment, hermiteG2_2d) are NOT supported by
// this builder because the replicad 2D pen has no NURBS segment constructor;
// callers that need NURBS-bearing curves take the `buildNurbsSketchOnPlane`
// path instead.

import * as replicad from 'replicad';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { resolveTangency } from './tangencySolver';

/**
 * Build a `replicad.Drawing` from a SketchCommand[]. The array must start
 * with a `moveTo` and contain at least one `close`. All segment kinds use
 * resolved `.evaluated` coordinates — Params are NOT re-walked here; callers
 * are expected to have resolved any symbolic refs upstream.
 *
 * @throws {Error} If the command list does not begin with `moveTo`, has no
 *   `close`, or includes a segment kind unsupported by the replicad 2D pen.
 */
export function drawingFromCommands(input: readonly SketchCommand[]): replicad.Drawing {
  // Solve any tangency construction FIRST, so the pen below only ever sees
  // primitive segment kinds. A no-solution / ambiguous construction throws a
  // `tangency:`-prefixed error here, which the lowerer maps to the
  // `sketch.tangency.*` diagnostics.
  const commands = resolveTangency(input);
  const closeIdx = commands.findIndex(c => c.kind === 'close');
  if (closeIdx === -1) throw new Error('drawingFromCommands: missing close');
  const first = commands[0];
  if (first.kind !== 'moveTo') throw new Error('drawingFromCommands: first command must be moveTo');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pen: any = replicad.draw([first.x.evaluated, first.y.evaluated]);
  for (let i = 1; i < closeIdx; i++) {
    const c = commands[i];
    if (c.kind === 'lineTo') pen = pen.lineTo([c.x.evaluated, c.y.evaluated]);
    else if (c.kind === 'tangentArc') pen = pen.tangentArcTo([c.x.evaluated, c.y.evaluated]);
    else if (c.kind === 'threePointsArc') pen = pen.threePointsArcTo([c.x.evaluated, c.y.evaluated], [c.midX.evaluated, c.midY.evaluated]);
    else if (c.kind === 'sagittaArc') pen = pen.sagittaArcTo([c.x.evaluated, c.y.evaluated], c.sagitta.evaluated);
    else if (c.kind === 'bulgeArc') pen = pen.bulgeArcTo([c.x.evaluated, c.y.evaluated], c.bulge.evaluated);
    else if (c.kind === 'radiusArc') {
      // radius → sagitta conversion (positive bulges left of chord)
      const cx = c.x.evaluated;
      const cy = c.y.evaluated;
      const cr = c.radius.evaluated;
      const dx = cx - first.x.evaluated, dy = cy - first.y.evaluated;
      const chord = Math.hypot(dx, dy);
      const halfChord = chord / 2;
      const r = Math.abs(cr);
      if (r < halfChord) throw new Error(`drawingFromCommands: radiusArc |radius|=${r} < chord/2=${halfChord}`);
      const sagitta = (cr >= 0 ? 1 : -1) * (r - Math.sqrt(r * r - halfChord * halfChord));
      pen = pen.sagittaArcTo([cx, cy], sagitta);
    }
    else if (c.kind === 'smoothSpline') pen = pen.smoothSplineTo([c.x.evaluated, c.y.evaluated]);
    else {
      throw new Error(`drawingFromCommands: unsupported segment kind '${(c as { kind: string }).kind}'`);
    }
  }
  return pen.close();
}
