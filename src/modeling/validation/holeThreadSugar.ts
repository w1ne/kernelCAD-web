// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `hole` / `holes` sugar: `thread: true` and `thread: { fromDiameter: true }`
// fill the ISO 261 coarse pitch from `opts.diameter`. The diameter stays the
// nominal (major) size the caller wrote. An explicit `pitch` is unchanged.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Editable } from '../../shared/runtime/paramRef';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { metricThreadFromDiameter } from '../threads';
import type { EditableHoleOpts, EditableHoleThread, EditableHolesOpts } from './holeValidation';

export interface HoleThreadRequest {
  pitch?: Editable<number>;
  modeled?: boolean;
  clearance?: Editable<number>;
  /** Fill `pitch` from the ISO 261 coarse row for `opts.diameter`. */
  fromDiameter?: boolean;
}

export type HoleThreadInput = boolean | HoleThreadRequest;

export type HoleCallOpts = Omit<EditableHoleOpts, 'thread'> & { thread?: HoleThreadInput };
export type HolesCallOpts = Omit<EditableHolesOpts, 'thread'> & { thread?: HoleThreadInput };

const EXAMPLE = "plate.hole('top', { u: 0, v: 0, diameter: 12, depth: 8, thread: true })  // M12 × 1.75";

function threadArg(which: 'hole' | 'holes', path: string, got: unknown, requires: string): never {
  const api = which === 'hole' ? 'hole(face, { thread })' : 'holes(face, { thread })';
  return invalidArgs({
    api,
    path,
    got,
    showType: typeof got !== 'number' && typeof got !== 'boolean',
    requires,
    example: EXAMPLE,
    featureId: which,
  });
}

function nominalMm(diameter: Editable<number>, table: ParamTable, which: 'hole' | 'holes'): number {
  const value = currentValue(diameter, table);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return threadArg(which, 'opts.diameter', diameter, 'a finite nominal diameter in mm when thread is resolved from the diameter');
}

function fromDiameter(
  request: HoleThreadRequest,
  diameter: Editable<number>,
  table: ParamTable,
  which: 'hole' | 'holes',
): { thread: EditableHoleThread; spec: string } {
  const info = metricThreadFromDiameter(nominalMm(diameter, table, which), { kind: 'nominal' });
  if (request.pitch !== undefined) {
    const pitch = currentValue(request.pitch, table);
    if (!(typeof pitch === 'number' && Number.isFinite(pitch)) || Math.abs(pitch - info.pitch) > 1e-9) {
      threadArg(
        which,
        'opts.thread.pitch',
        request.pitch,
        `the coarse pitch of ${info.spec} (${info.pitch} mm) when fromDiameter is set, or omit pitch`,
      );
    }
  }
  return {
    spec: info.spec,
    thread: {
      pitch: info.pitch,
      ...(request.modeled !== undefined ? { modeled: request.modeled } : {}),
      ...(request.clearance !== undefined ? { clearance: request.clearance } : {}),
    },
  };
}

function expandThread(
  thread: HoleThreadInput,
  diameter: Editable<number>,
  table: ParamTable,
  which: 'hole' | 'holes',
): { thread: EditableHoleThread; spec?: string } {
  if (thread === true) return fromDiameter({}, diameter, table, which);
  if (typeof thread !== 'object' || thread === null) {
    return threadArg(which, 'opts.thread', thread, 'true, { pitch, modeled?, clearance? }, or { fromDiameter: true, modeled?, clearance? }');
  }
  if (thread.fromDiameter === true) return fromDiameter(thread, diameter, table, which);
  if (thread.pitch === undefined) {
    return threadArg(which, 'opts.thread.pitch', thread.pitch, 'the ISO pitch in mm, or fromDiameter: true to take the coarse pitch from opts.diameter');
  }
  return {
    thread: {
      pitch: thread.pitch,
      ...(thread.modeled !== undefined ? { modeled: thread.modeled } : {}),
      ...(thread.clearance !== undefined ? { clearance: thread.clearance } : {}),
    },
  };
}

/** Resolve `thread: true` / `{ fromDiameter: true }` before hole validation. */
export function applyHoleThreadSugar<T extends { diameter: Editable<number>; thread?: HoleThreadInput }>(
  opts: T,
  table: ParamTable,
  which: 'hole' | 'holes',
): { opts: Omit<T, 'thread'> & { thread?: EditableHoleThread }; spec?: string } {
  if (opts.thread === undefined) return { opts: opts as Omit<T, 'thread'> & { thread?: EditableHoleThread } };
  const expanded = expandThread(opts.thread, opts.diameter, table, which);
  return { opts: { ...opts, thread: expanded.thread }, spec: expanded.spec };
}
