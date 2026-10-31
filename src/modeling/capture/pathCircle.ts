// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The commands behind `path().circle(cx, cy, r, segments?)`.
import type { Param } from '../../shared/intent/types';
import { invalidArgsError } from '../../shared/intent/invalidArgs';
import type { Editable, ParamRefExpr } from '../../shared/runtime/paramRef';
import { currentValue, paramExpr, paramFromExpr, toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

type ParamTable = Parameters<typeof currentValue>[1];


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
  const API = 'path().circle(cx, cy, r, segments?)';
  const EXAMPLE = 'path().circle(0, 0, 5)';
  for (const [name, v] of [['cx', cxv], ['cy', cyv], ['r', rv]] as const) {
    if (!Number.isFinite(v)) {
      throw invalidArgsError({ api: API, path: name, got: v, requires: 'a finite number', unit: 'mm', example: EXAMPLE });
    }
  }
  if (rv <= 0) {
    throw invalidArgsError({ api: API, path: 'r', got: rv, requires: 'r > 0 (a positive radius)', unit: 'mm', example: EXAMPLE });
  }
  if (segments !== undefined && (!Number.isInteger(segments) || segments < 3)) {
    throw invalidArgsError({
      api: API,
      path: 'segments',
      got: segments,
      requires: 'an integer >= 3, or omit it for an exact circle',
      unit: 'count',
      example: 'path().circle(0, 0, 5, 48)',
    });
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
