// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `Sketch.offset(distance)`: the parallel curve of a closed sketch profile.
// The geometry is computed when the script runs (like `sectionSketch`), so the
// result is an ordinary sketch of exact lines and arcs that every downstream
// consumer of `metadata.commands` already understands.
import { KernelError } from '../../shared/intent/kernelError';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';
import type { SketchCommand } from '../../shared/capture/sketchCommand';
import type { CaptureSession } from './captureSession';
import type { Sketch } from './sketch';
import { guardAsyncSketchResult } from './asyncSketchGuard';

export interface SketchOffsetOptions {
  /** `'round'` (default) joins an outward-moving corner with an arc of radius
   *  `|distance|`, so every point of the result is exactly `|distance|` from
   *  the source. `'sharp'` extends the neighbouring segments until they meet. */
  corners?: 'round' | 'sharp';
}

const API = 'Sketch.offset(distance, { corners })';
const EXAMPLE = '(await outline.offset(-2)).extrude(5)';
const ALLOWED_KEYS = new Set(['corners']);
/** Segment kinds whose parallel curve is again a line or a circular arc. */
const EXACT_KINDS = new Set([
  'moveTo', 'lineTo', 'tangentArc', 'threePointsArc', 'sagittaArc', 'bulgeArc', 'radiusArc',
  'tangentCircle', 'tangentLine', 'close',
]);

/** True when any coordinate of `value` is driven by a `param()`. */
function hasParamRef(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasParamRef);
  const node = value as Record<string, unknown>;
  if ('evaluated' in node && 'expression' in node) return node.paramRef !== undefined;
  return Object.values(node).some(hasParamRef);
}

function validateArgs(id: FeatureId, distance: unknown, opts: unknown): 'round' | 'sharp' {
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance === 0) {
    invalidArgs({
      api: API,
      path: 'distance',
      got: distance,
      showType: true,
      requires:
        'a finite non-zero number: positive grows the profile, negative shrinks it. A param() reference is not accepted, because the offset is computed when the script runs and would not follow a later parameter edit',
      unit: 'mm',
      example: EXAMPLE,
      featureId: id,
    });
  }
  if (opts === undefined || opts === null) return 'round';
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: API, path: 'opts', got: opts, showType: true,
      requires: "an options object such as { corners: 'sharp' }", example: EXAMPLE, featureId: id,
    });
  }
  for (const key of Object.keys(opts as object)) {
    if (!ALLOWED_KEYS.has(key)) {
      invalidArgs({
        api: API, path: `opts.${key}`, gotText: `unknown option '${key}'`,
        requires: 'only the option corners', example: EXAMPLE, featureId: id,
      });
    }
  }
  const corners = (opts as SketchOffsetOptions).corners ?? 'round';
  if (corners !== 'round' && corners !== 'sharp') {
    invalidArgs({
      api: API, path: 'opts.corners', got: corners, showType: true,
      requires: "'round' or 'sharp'", example: "(await outline.offset(2, { corners: 'sharp' })).extrude(5)", featureId: id,
    });
  }
  return corners;
}

function sourceCommands(id: FeatureId, session: CaptureSession): SketchCommand[] {
  const record = session.getRecords().find((r) => r.id === id);
  const commands = (record?.metadata as { commands?: SketchCommand[] } | undefined)?.commands;
  if (!Array.isArray(commands) || !commands.some((c) => c.kind === 'close')) {
    invalidArgs({
      api: API, path: 'sketch', gotText: 'a sketch without a closed path profile (text, projected or open)',
      requires: 'a closed profile from path()...close(), path().circle(), reflect, offset, sectionSketch, faceSketch, silhouette or a DXF/SVG import',
      example: EXAMPLE, featureId: id,
    });
  }
  const unsupported = commands.find((c) => !EXACT_KINDS.has(c.kind));
  if (unsupported !== undefined) {
    invalidArgs({
      api: API, path: 'sketch', gotText: `a profile with a '${unsupported.kind}' segment`,
      requires: 'a profile of straight lines and circular arcs only; the parallel curve of a spline is not a spline',
      example: EXAMPLE, featureId: id,
    });
  }
  if (hasParamRef(commands)) {
    invalidArgs({
      api: API, path: 'sketch', gotText: 'a profile with param()-driven coordinates',
      requires:
        'plain-number coordinates: the offset is computed when the script runs and would not follow a later parameter edit',
      example: EXAMPLE, featureId: id,
    });
  }
  return commands;
}

/** Offset the closed profile of sketch `id` by `distance` mm. */
export function offsetSketchOf(
  id: FeatureId,
  session: CaptureSession,
  distance: number,
  opts?: SketchOffsetOptions | null,
): Promise<Sketch> {
  const run = async (): Promise<Sketch> => {
    const corners = validateArgs(id, distance, opts);
    const commands = sourceCommands(id, session);
    const { initOcct } = await import('../../kernel/backends/occt/backendInit');
    await initOcct();
    const { offsetSketchStable } = await import('../../kernel/backends/occt/sketchOffset');
    let result: ReturnType<typeof offsetSketchStable>;
    try {
      result = offsetSketchStable(commands, distance, corners);
    } catch (e) {
      throw new KernelError(
        'feature.sketch-offset.failed',
        `Sketch.offset: the source profile could not be built: ${e instanceof Error ? e.message : String(e)}.`,
        id,
        'Check that the source sketch is one closed, non-self-intersecting profile.',
      );
    }
    if (!result.ok) {
      const d = `${distance} mm`;
      if (result.reason === 'collapsed') {
        throw new KernelError(
          'feature.sketch-offset.collapsed',
          `Sketch.offset: an offset of ${d} leaves no profile (${result.detail}).`,
          id,
          'Use a smaller inward distance: it must stay below half the narrowest width of the profile.',
        );
      }
      if (result.reason === 'split') {
        throw new KernelError(
          'feature.sketch-offset.split',
          `Sketch.offset: an offset of ${d} does not give one profile (${result.detail}).`,
          id,
          'Use a smaller distance so that no neck, gap or wall between a hole and the boundary closes, or offset each region as its own sketch.',
        );
      }
      throw new KernelError(
        'feature.sketch-offset.failed',
        `Sketch.offset: the kernel could not offset this profile by ${d} (${result.detail}).`,
        id,
        "Try corners: 'round', a smaller distance, or a simpler profile.",
      );
    }
    return session.createSketch({
      kind: 'sketch',
      inputs: { source: { kind: 'feature', id } },
      params: {},
      metadata: {
        commands: result.commands,
        derivedFrom: 'offset',
        offsetDistanceMm: distance,
        corners,
        loopCount: result.loopCount,
        holeCount: result.loopCount - 1,
        areaMm2: result.areaMm2,
      },
    });
  };
  return guardAsyncSketchResult(run(), 'offset', 'sketch');
}
