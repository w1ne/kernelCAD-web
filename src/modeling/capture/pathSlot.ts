// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The commands behind `path().slot(cx, cy, { width, centerDistance | length, angleDeg? })`:
// a closed stadium (two parallel flats joined by two semicircular ends).
//
// The loop is two `lineTo` flats and two `threePointsArc` half circles, so an
// extrude gives plain planar and cylindrical faces. Every vertex is captured
// as an expression of `cx`, `cy`, `width` and the length input (the turn is a
// plain number), so a ParamRef stays symbolic and the slot re-evaluates when
// it changes.
import type { Param } from '../../shared/intent/types';
import { invalidArgsError } from '../../shared/intent/invalidArgs';
import type { Editable, ParamRefExpr } from '../../shared/runtime/paramRef';
import { currentValue, paramExpr, paramFromExpr, toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

type ParamTable = Parameters<typeof currentValue>[1];

/** Options of `path().slot(cx, cy, opts)`. */
export interface SlotOptions {
  /** Width of the slot (the diameter of its round ends), mm. */
  width: Editable<number>;
  /** Distance between the two arc centres, mm. Give this or `length`. */
  centerDistance?: Editable<number>;
  /** Overall end-to-end length, mm (must exceed `width`). Give this or `centerDistance`. */
  length?: Editable<number>;
  /** Counterclockwise turn of the long axis from sketch +X, degrees. Default 0. */
  angleDeg?: number;
}

const API = 'path().slot(cx, cy, { width, centerDistance | length, angleDeg? })';
const EXAMPLE = 'path().slot(0, 0, { width: 10, centerDistance: 20 })';
const KEYS = ['width', 'centerDistance', 'length', 'angleDeg'];

function cosSinDeg(deg: number): [number, number] {
  const snap = (v: number): number => (Math.abs(v) < 1e-15 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-15 ? Math.sign(v) : v);
  const rad = (deg * Math.PI) / 180;
  return [snap(Math.cos(rad)), snap(Math.sin(rad))];
}

const lit = (value: number): ParamRefExpr => ({ kind: 'lit', value });
const mul = (e: ParamRefExpr, k: number): ParamRefExpr => ({ kind: 'binop', op: '*', left: e, right: lit(k) });
const add = (a: ParamRefExpr, b: ParamRefExpr): ParamRefExpr => ({ kind: 'binop', op: '+', left: a, right: b });

function checkSlotSizes(width: number, along: number, hasCd: boolean, hasLen: boolean): void {
  if (width <= 0) {
    throw invalidArgsError({ api: API, path: 'width', got: width, requires: 'width > 0', unit: 'mm', example: EXAMPLE });
  }
  if (hasCd && along <= 0) {
    throw invalidArgsError({
      api: API, path: 'centerDistance', got: along, requires: 'centerDistance > 0 (use path().circle() for a round hole)', unit: 'mm', example: EXAMPLE,
    });
  }
  if (hasLen && along <= width) {
    throw invalidArgsError({
      api: API, path: 'length', got: along, requires: 'length > width (the overall length includes both round ends)', unit: 'mm', example: EXAMPLE,
    });
  }
}

interface CheckedSlot { angle: number; hasLen: boolean; hasCd: boolean; longSide: Editable<number> }

/** Reject a malformed option bag with the call that works; return what the loop needs. */
function checkSlotOptions(cx: Editable<number>, cy: Editable<number>, opts: SlotOptions, table: ParamTable): CheckedSlot {
  if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
    throw invalidArgsError({
      api: API, path: 'opts', got: opts, showType: true,
      requires: `an option object { width, centerDistance | length, angleDeg? }`, example: EXAMPLE,
    });
  }
  const unknownKey = Object.keys(opts).find((k) => !KEYS.includes(k));
  if (unknownKey !== undefined) {
    throw invalidArgsError({
      api: API, path: unknownKey, gotText: `unknown option ${unknownKey}`,
      requires: `only ${KEYS.join(', ')} (the slot width is width, not diameter)`, example: EXAMPLE,
    });
  }
  const hasCd = opts.centerDistance !== undefined;
  const hasLen = opts.length !== undefined;
  if (hasCd === hasLen) {
    throw invalidArgsError({
      api: API, path: 'centerDistance / length', gotText: hasCd ? 'both' : 'neither',
      requires: 'exactly one of centerDistance (between the arc centres) or length (overall end to end)', example: EXAMPLE,
    });
  }
  const angle = opts.angleDeg ?? 0;
  const values: Array<[string, number]> = [
    ['cx', currentValue(cx, table)],
    ['cy', currentValue(cy, table)],
    ['width', currentValue(opts.width, table)],
    ['angleDeg', angle],
  ];
  const longSide = (hasCd ? opts.centerDistance : opts.length) as Editable<number>;
  values.push([hasCd ? 'centerDistance' : 'length', currentValue(longSide, table)]);
  for (const [name, v] of values) {
    if (!Number.isFinite(v)) {
      throw invalidArgsError({ api: API, path: name, got: v, requires: 'a finite number', unit: name === 'angleDeg' ? 'deg' : 'mm', example: EXAMPLE });
    }
  }
  checkSlotSizes(values[2][1], values[4][1], hasCd, hasLen);
  return { angle, hasLen, hasCd, longSide };
}

/**
 * The open loop of the slot, starting at one flat's near end and ending back
 * on it (the caller closes it). `centerDistance` and `length` are both linear
 * in the vertices; with `length`, the centre distance is `length - width`.
 */
export function slotCommands(
  cx: Editable<number>,
  cy: Editable<number>,
  opts: SlotOptions,
  table: ParamTable,
  existingCommands = 0,
): SketchCommand[] {
  if (existingCommands > 0) {
    throw invalidArgsError({
      api: API, path: 'path', gotText: 'a path that already has other commands',
      requires: 'a fresh path: slot() is a whole closed profile, like circle()', example: EXAMPLE,
    });
  }
  const { angle, hasLen, longSide } = checkSlotOptions(cx, cy, opts, table);

  const [ux, uy] = cosSinDeg(angle);
  const [nx, ny] = [-uy, ux];
  const cxE = paramExpr(toParam(cx, 'mm'));
  const cyE = paramExpr(toParam(cy, 'mm'));
  const wE = paramExpr(toParam(opts.width, 'mm'));
  const lE = paramExpr(toParam(longSide, 'mm'));
  // A vertex is c + alpha * centerDistance * u + (beta * u + gamma * n) * width.
  // With `length` the centre distance is length - width, so the width term
  // loses alpha * u.
  const vertex = (alpha: number, beta: number, gamma: number): { x: Param; y: Param } => {
    const wx = beta * ux + gamma * nx - (hasLen ? alpha * ux : 0);
    const wy = beta * uy + gamma * ny - (hasLen ? alpha * uy : 0);
    const x = add(add(cxE, mul(lE, alpha * ux)), mul(wE, wx));
    const y = add(add(cyE, mul(lE, alpha * uy)), mul(wE, wy));
    return { x: paramFromExpr(x, 'mm'), y: paramFromExpr(y, 'mm') };
  };
  const a = vertex(-0.5, 0, -0.5);
  const b = vertex(0.5, 0, -0.5);
  const c = vertex(0.5, 0, 0.5);
  const d = vertex(-0.5, 0, 0.5);
  const m1 = vertex(0.5, 0.5, 0);
  const m2 = vertex(-0.5, -0.5, 0);
  return [
    { kind: 'moveTo', x: a.x, y: a.y },
    { kind: 'lineTo', x: b.x, y: b.y },
    { kind: 'threePointsArc', x: c.x, y: c.y, midX: m1.x, midY: m1.y },
    { kind: 'lineTo', x: d.x, y: d.y },
    { kind: 'threePointsArc', x: a.x, y: a.y, midX: m2.x, midY: m2.y },
  ];
}
