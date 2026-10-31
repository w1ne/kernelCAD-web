// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The commands behind `path().circle(cx, cy, r, segments?)`.
import type { Param } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import type { Editable, ParamRefExpr } from '../../shared/runtime/paramRef';
import { currentValue, paramExpr, paramFromExpr, toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

type ParamTable = Parameters<typeof currentValue>[1];

function invalid(message: string, hint: string): never {
  throw new KernelError('feature.invalid-args', message, undefined, hint);
}

/**
 * The open loop of a circle at `(cx, cy)` of radius `r`, starting at
 * `(cx + r, cy)` and running counterclockwise (the caller closes it).
 *
 * Without `segments` the circle is exact: two `threePointsArc` half circles,
 * so a revolve gives one smooth torus and an extrude one cylinder face. With
 * `segments` it is a regular N-gon of `lineTo` chords. The polygon used to be
 * the default (48), which revolved every ring into 48 faces and made each
 * later boolean against it many times slower.
 *
 * Each point is captured as `cx + r·k` (k a fixed constant), so a ParamRef
 * centre or radius stays symbolic. Literal inputs fold to plain numbers.
 */
export function circleCommands(
  cx: Editable<number>,
  cy: Editable<number>,
  r: Editable<number>,
  segments: number | undefined,
  table: ParamTable,
): SketchCommand[] {
  const cxv = currentValue(cx, table);
  const cyv = currentValue(cy, table);
  const rv = currentValue(r, table);
  if (!Number.isFinite(cxv) || !Number.isFinite(cyv) || !Number.isFinite(rv)) {
    invalid(
      `path.circle(cx, cy, r): all of cx (${cxv}), cy (${cyv}), r (${rv}) must be finite.`,
      'Pass finite numbers or numeric ParamRefs for cx, cy, r.',
    );
  }
  if (rv <= 0) invalid(`path.circle: radius must be > 0; got ${rv}.`, 'Pass a positive radius.');
  if (segments !== undefined && (!Number.isInteger(segments) || segments < 3)) {
    invalid(
      `path.circle: segments must be an integer >= 3; got ${segments}.`,
      'Pass a segment count >= 3 for a polygon, or omit it for an exact circle.',
    );
  }
  const cxE = paramExpr(toParam(cx, 'mm'));
  const cyE = paramExpr(toParam(cy, 'mm'));
  const rE = paramExpr(toParam(r, 'mm'));
  const at = (c: ParamRefExpr): Param => paramFromExpr(c, 'mm');
  const along = (c: ParamRefExpr, k: number): Param =>
    paramFromExpr(
      { kind: 'binop', op: '+', left: c, right: { kind: 'binop', op: '*', left: rE, right: { kind: 'lit', value: k } } },
      'mm',
    );
  const out: SketchCommand[] = [{ kind: 'moveTo', x: along(cxE, 1), y: at(cyE) }];
  if (segments === undefined) {
    out.push(
      { kind: 'threePointsArc', x: along(cxE, -1), y: at(cyE), midX: at(cxE), midY: along(cyE, 1) },
      { kind: 'threePointsArc', x: along(cxE, 1), y: at(cyE), midX: at(cxE), midY: along(cyE, -1) },
    );
    return out;
  }
  for (let i = 1; i < segments; i++) {
    const theta = (2 * Math.PI * i) / segments;
    out.push({ kind: 'lineTo', x: along(cxE, Math.cos(theta)), y: along(cyE, Math.sin(theta)) });
  }
  return out;
}
