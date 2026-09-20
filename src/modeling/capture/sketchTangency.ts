// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sketchTangency.ts
import type { Param } from '../../shared/intent/types';
import { isValidEditableNumber } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { KernelError } from '../../shared/intent/kernelError';
import {
  TANGENT_SIDES,
  type TangentEntity2D,
  type TangentEntitySpec,
  type TangentNearSpec,
} from '../../shared/capture/tangency';
import { currentValue, paramValue, toParam } from '../../shared/runtime/editableHelpers';

/**
 * Validate an authored tangency entity and box it into the `Param`-shaped
 * wire form. Runs at capture time so a malformed entity is rejected at the
 * call site rather than surfacing as an opaque OCCT failure three layers down.
 *
 * `side` defaults to `'outside'` — the sketch-fillet reading, and the value
 * that most often makes the construction unique on its own.
 */
export function validateTangentEntity(e: TangentEntity2D, where: string, table: ParamTable): TangentEntitySpec {
  if (!e || typeof e !== 'object' || (e.kind !== 'line' && e.kind !== 'circle')) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: expected { kind: 'line', from, to } or { kind: 'circle', center, radius }; got ${JSON.stringify(e)}.`,
      undefined,
      "Tangency entities are lines and circles only. Point tangency is unavailable — the bundled OCCT does not bind Handle_Geom2d_Point.",
    );
  }
  const side = e.side ?? 'outside';
  if (!TANGENT_SIDES.includes(side)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: side must be one of ${TANGENT_SIDES.join(' | ')}; got '${side}'.`,
      undefined,
      "side maps to OCCT's GccEnt_Position and is the primary control over which solution you get.",
    );
  }
  // Coordinates may be numbers or numeric ParamRefs. Validation reads the
  // CURRENT value; the captured Param keeps the ParamRef so the lowerer sees
  // the live value after a param change.
  const finite = (v: unknown, field: string): { value: number; param: Param } => {
    if (!isValidEditableNumber(v)) {
      throw new KernelError(
        'feature.invalid-args',
        `${where}.${field}: expected a finite number or numeric ParamRef; got ${JSON.stringify(v)}.`,
        undefined,
        'Tangency entity coordinates must be finite numbers or param() references.',
      );
    }
    const editable = v as Editable<number>;
    const value = currentValue(editable, table);
    if (!Number.isFinite(value)) {
      throw new KernelError(
        'feature.invalid-args',
        `${where}.${field}: expected a finite value; got ${value}.`,
        undefined,
        'Tangency entity coordinates must resolve to finite numbers.',
      );
    }
    return { value, param: toParam(editable, 'mm') };
  };
  if (e.kind === 'line') {
    const from = e.from ?? ([] as unknown as [number, number]);
    const to = e.to ?? ([] as unknown as [number, number]);
    const x1 = finite(from[0], 'from[0]'), y1 = finite(from[1], 'from[1]');
    const x2 = finite(to[0], 'to[0]'), y2 = finite(to[1], 'to[1]');
    if (Math.hypot(x2.value - x1.value, y2.value - y1.value) < 1e-9) {
      throw new KernelError(
        'feature.invalid-args',
        `${where}: from and to are coincident at (${x1.value}, ${y1.value}) — they define no line.`,
        undefined,
        'Give two distinct points. Their order also sets the line direction, which is what side:"outside" is relative to.',
      );
    }
    return { kind: 'line', x1: x1.param, y1: y1.param, x2: x2.param, y2: y2.param, side };
  }
  const center = e.center ?? ([] as unknown as [number, number]);
  const cx = finite(center[0], 'center[0]'), cy = finite(center[1], 'center[1]');
  const r = finite(e.radius, 'radius');
  if (!(r.value > 0)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: circle radius must be > 0; got ${r.value}.`,
      undefined,
      'Pass a positive radius.',
    );
  }
  return { kind: 'circle', cx: cx.param, cy: cy.param, r: r.param, side };
}

/** Box the optional `near` disambiguation hint. */
export function toNearSpec(
  near: [Editable<number>, Editable<number>] | undefined,
  where: string,
  table: ParamTable,
): TangentNearSpec | undefined {
  if (near === undefined) return undefined;
  if (!Array.isArray(near) || near.length !== 2) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: opts.near must be a [x, y] pair; got ${JSON.stringify(near)}.`,
      undefined,
      'Pass opts.near as [x, y] near the solution you want.',
    );
  }
  const x = toParam(near[0], 'mm');
  const y = toParam(near[1], 'mm');
  const xv = paramValue(x, table);
  const yv = paramValue(y, table);
  if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where}: opts.near coordinates must be finite; got [${xv}, ${yv}].`,
      undefined,
      'Pass finite numbers for opts.near.',
    );
  }
  return { x, y };
}
