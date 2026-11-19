// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `Sketch.union` / `Sketch.subtract` / `Sketch.intersect`: 2D booleans of
// closed sketch profiles. The geometry is computed when the script runs (like
// `Sketch.offset`), so the result is an ordinary sketch of exact lines and
// arcs that every downstream consumer of `metadata.commands` already
// understands.
import { KernelError } from '../../shared/intent/kernelError';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId, FeatureRef } from '../../shared/intent/types';
import type { CaptureSession } from './captureSession';
import type { Sketch } from './sketch';
import { guardAsyncSketchResult } from './asyncSketchGuard';
import { exactClosedProfile, type ExactProfileContext } from './sketchOffset';

export type SketchBooleanOp = 'union' | 'subtract' | 'intersect';

const EXAMPLES: Record<SketchBooleanOp, string> = {
  union: '(await plate.union(path().circle(40, 10, 8))).extrude(5)',
  subtract: '(await plate.subtract(path().circle(20, 10, 5))).extrude(5)',
  intersect: '(await plate.intersect(path().circle(40, 10, 8))).extrude(5)',
};

function context(op: SketchBooleanOp, path: string): ExactProfileContext {
  return {
    api: `Sketch.${op}(other)`,
    example: EXAMPLES[op],
    path,
    splineReason: 'a sketch boolean keeps exact lines and arcs and does not approximate a spline',
    operation: op,
  };
}

/** Ids of the tool sketches in `other`, which is one Sketch or an array of them. */
function toolIds(id: FeatureId, session: CaptureSession, op: SketchBooleanOp, other: unknown): FeatureId[] {
  const list = Array.isArray(other) ? other : [other];
  const single = !Array.isArray(other);
  if (list.length === 0) {
    invalidArgs({
      ...context(op, 'other'), gotText: 'an empty array', requires: 'one Sketch or a non-empty array of Sketches', featureId: id,
    });
  }
  const records = session.getRecords();
  return list.map((item, i) => {
    const path = single ? 'other' : `other[${i}]`;
    if (item !== null && typeof item === 'object' && typeof (item as { then?: unknown }).then === 'function') {
      invalidArgs({
        ...context(op, path), gotText: 'an un-awaited Promise<Sketch>',
        requires: 'a Sketch: await sectionSketch, faceSketch, silhouette, offset and the sketch booleans before passing their result',
        featureId: id,
      });
    }
    const toolId = (item as { id?: unknown } | null | undefined)?.id;
    const record = typeof toolId === 'string' ? records.find((r) => r.id === toolId) : undefined;
    if (record === undefined || record.kind !== 'sketch') {
      invalidArgs({
        ...context(op, path), got: item, showType: true,
        requires: `a Sketch (a closed 2D profile). To combine solids use Shape.${op}`,
        featureId: id,
      });
    }
    return record.id;
  });
}

const VERB: Record<SketchBooleanOp, string> = {
  union: 'union',
  subtract: 'subtraction',
  intersect: 'intersection',
};

/** Combine the closed profile of sketch `id` with the profiles in `other`. */
export function booleanSketchOf(
  id: FeatureId,
  session: CaptureSession,
  op: SketchBooleanOp,
  other: Sketch | readonly Sketch[],
): Promise<Sketch> {
  const run = async (): Promise<Sketch> => {
    const ids = toolIds(id, session, op, other);
    const base = exactClosedProfile(id, session, context(op, 'sketch'));
    const tools = ids.map((toolId, i) =>
      exactClosedProfile(toolId, session, context(op, Array.isArray(other) ? `other[${i}]` : 'other'), id),
    );
    const { initOcct } = await import('../../kernel/backends/occt/backendInit');
    await initOcct();
    const { booleanSketchCommands } = await import('../../kernel/backends/occt/sketchBoolean');
    const name = `Sketch.${op}`;
    let result: ReturnType<typeof booleanSketchCommands>;
    try {
      result = booleanSketchCommands(op, base, tools);
    } catch (e) {
      throw new KernelError(
        'feature.sketch-boolean.failed',
        `${name}: a profile could not be built: ${e instanceof Error ? e.message : String(e)}.`,
        id,
        'Check that every sketch is one closed, non-self-intersecting profile.',
      );
    }
    if (!result.ok) {
      if (result.reason === 'empty') {
        throw new KernelError(
          'feature.sketch-boolean.empty',
          `${name}: the ${VERB[op]} leaves no profile (${result.detail}).`,
          id,
          op === 'intersect'
            ? 'The profiles do not overlap. Move them so that they share area.'
            : 'The removed profiles cover the whole sketch. Subtract a smaller profile.',
        );
      }
      if (result.reason === 'split') {
        throw new KernelError(
          'feature.sketch-boolean.split',
          `${name}: the ${VERB[op]} does not give one profile (${result.detail}).`,
          id,
          op === 'union'
            ? 'Profiles that only touch at a point or do not overlap stay separate. Overlap them, or extrude each sketch and union the solids.'
            : 'A sketch is one outline with holes. Keep the result in one piece that does not touch itself, or extrude the sketches and combine the solids.',
        );
      }
      throw new KernelError(
        'feature.sketch-boolean.failed',
        `${name}: the kernel could not compute the ${VERB[op]} (${result.detail}).`,
        id,
        'Check that every sketch is one closed, non-self-intersecting profile, or extrude the sketches and combine the solids.',
      );
    }
    const inputs: Record<string, FeatureRef> = { source: { kind: 'feature', id } };
    ids.forEach((toolId, i) => {
      inputs[`tool${i}`] = { kind: 'feature', id: toolId };
    });
    return session.createSketch({
      kind: 'sketch',
      inputs,
      params: {},
      metadata: {
        commands: result.commands,
        derivedFrom: op,
        loopCount: result.loopCount,
        holeCount: result.loopCount - 1,
        areaMm2: result.areaMm2,
        operandAreasMm2: result.operandAreasMm2,
      },
    });
  };
  return guardAsyncSketchResult(run(), op, 'sketch');
}
