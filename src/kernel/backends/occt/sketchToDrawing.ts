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
// MULTI-LOOP COMMAND LISTS
// ------------------------
// A derived profile (`shape.sectionSketch`) may carry more than one closed
// loop: an outer boundary followed by one or more holes. The convention is the
// same as `lib.fromDXF`/`lib.fromSVG`: loops appear in the command array as
// consecutive `moveTo … close` groups, largest area first, so group 0 is the
// outer boundary and the rest are holes. A single-loop list (every
// hand-authored `path()`) is the trivial case and lowers identically.
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

/** Split a command list into `moveTo … close` groups. */
export function splitSketchLoops(commands: readonly SketchCommand[]): SketchCommand[][] {
  const groups: SketchCommand[][] = [];
  let current: SketchCommand[] = [];
  for (const c of commands) {
    if (c.kind === 'moveTo') {
      if (current.length > 0) groups.push(current);
      current = [c];
    } else if (c.kind === 'close') {
      current.push(c);
      groups.push(current);
      current = [];
    } else {
      current.push(c);
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Build one closed `replicad.Drawing` from a single loop's commands. */
function drawingForLoop(commands: readonly SketchCommand[]): replicad.Drawing {
  const first = commands[0];
  if (first.kind !== 'moveTo') throw new Error('drawingFromCommands: first command must be moveTo');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pen: any = replicad.draw([first.x.evaluated, first.y.evaluated]);
  let currentX = first.x.evaluated;
  let currentY = first.y.evaluated;
  for (let i = 1; i < commands.length; i++) {
    const c = commands[i];
    if (c.kind === 'close') break;
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
      const chord = Math.hypot(cx - currentX, cy - currentY);
      if (chord < 1e-9) {
        throw new Error(`radiusArc: degenerate chord (start ≈ end) at point (${cx}, ${cy})`);
      }
      const halfChord = chord / 2;
      const r = Math.abs(cr);
      if (r < halfChord) {
        throw new Error(`radiusArc: radius (${cr}) too small for chord length ${chord.toFixed(3)} — needs |radius| >= chord/2`);
      }
      const sagitta = (cr >= 0 ? 1 : -1) * (r - Math.sqrt(r * r - halfChord * halfChord));
      pen = pen.sagittaArcTo([cx, cy], sagitta);
    }
    else if (c.kind === 'smoothSpline') pen = pen.smoothSplineTo([c.x.evaluated, c.y.evaluated]);
    else {
      throw new Error(`drawingFromCommands: unsupported segment kind '${(c as { kind: string }).kind}'`);
    }
    if ('x' in c && 'y' in c) {
      currentX = c.x.evaluated;
      currentY = c.y.evaluated;
    }
  }
  return pen.close();
}

/**
 * Build a `replicad.Drawing` from a SketchCommand[]. The array must start
 * with a `moveTo` and contain at least one `close`. All segment kinds use
 * resolved `.evaluated` coordinates — Params are NOT re-walked here; callers
 * are expected to have resolved any symbolic refs upstream.
 *
 * Multi-loop lists are supported: the first `moveTo … close` group is the
 * outer boundary; every subsequent group is subtracted as a hole via
 * `Drawing.cut`.
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
  if (!commands.some(c => c.kind === 'close')) {
    throw new Error('drawingFromCommands: missing close');
  }
  if (commands.length === 0 || commands[0].kind !== 'moveTo') {
    throw new Error('drawingFromCommands: first command must be moveTo');
  }
  const groups = splitSketchLoops(commands);
  if (groups.length === 0) throw new Error('drawingFromCommands: no closed loop');
  let drawing = drawingForLoop(groups[0]);
  for (let i = 1; i < groups.length; i++) {
    drawing = drawing.cut(drawingForLoop(groups[i]));
  }
  return drawing;
}

