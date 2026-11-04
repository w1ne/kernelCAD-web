// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/threadedHole.ts
//
// `Shape.threadedHole(face, { u, v, spec, depth, ... })` — an ISO tapped hole
// named by its designation. It is sugar over `hole(face, { thread })`, so the
// record, created refs, drawing callouts and bolt connectors are exactly a
// threaded `hole`'s.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Editable } from '../../shared/runtime/paramRef';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { isoThreadInfo, metricThreadFromDiameter, NOMINAL_DIAMETER_TOL_MM, type IsoThreadInfo } from '../threads';
import type { EditableHoleOpts } from '../validation/holeValidation';

export interface ThreadedHoleOpts {
  u: Editable<number>;
  v: Editable<number>;
  /** ISO metric designation: `'M6'` (coarse pitch) or `'M6x0.75'`. */
  spec?: string;
  /** Nominal major diameter in mm. Coarse pitch is filled from the ISO 261
   *  table (`12` → M12). Must agree with `spec` when both are set. */
  diameter?: Editable<number>;
  depth: Editable<number> | 'through';
  /** `true` cuts the real 60° internal thread; default `false` drills the
   *  ISO minor diameter and records the thread (cosmetic — what drawings and
   *  most printed/machined parts need). */
  modeled?: boolean;
  /** Flank play added to the internal thread, mm, capped at pitch / 8. */
  clearance?: Editable<number>;
  name?: string;
  enabled?: Editable<boolean>;
}

const KEYS = new Set(['u', 'v', 'spec', 'diameter', 'depth', 'modeled', 'clearance', 'name', 'enabled']);

function threadedHoleArg(path: string, got: unknown, requires: string, example: string): never {
  return invalidArgs({
    api: 'threadedHole(face, opts)',
    path,
    got,
    showType: typeof got !== 'number' && typeof got !== 'string',
    requires,
    example,
    featureId: 'threadedHole',
  });
}

function readDiameter(diameter: Editable<number>, table: ParamTable | undefined, example: string): number {
  const value = table ? currentValue(diameter, table) : diameter;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return threadedHoleArg('opts.diameter', diameter, 'a finite nominal diameter in mm', example);
}

function resolveThreadedInfo(opts: ThreadedHoleOpts, table: ParamTable | undefined, example: string): IsoThreadInfo {
  const named = opts.spec !== undefined ? isoThreadInfo(opts.spec, 'threadedHole(face, { spec })') : undefined;
  const given = opts.diameter !== undefined ? readDiameter(opts.diameter, table, example) : undefined;
  if (named === undefined && given === undefined) {
    return threadedHoleArg('opts.spec', opts.spec, "spec: 'M6' (or 'M6x0.75'), or diameter: 12 for the ISO 261 coarse pitch", example);
  }
  if (named !== undefined && given !== undefined && Math.abs(named.diameter - given) > NOMINAL_DIAMETER_TOL_MM + 1e-9) {
    return threadedHoleArg(
      'opts.diameter',
      given,
      `a nominal that must agree with ${opts.spec} (${named.diameter} mm) within ${NOMINAL_DIAMETER_TOL_MM} mm`,
      example,
    );
  }
  return named ?? metricThreadFromDiameter(given as number, { kind: 'nominal' });
}

/** Map `threadedHole` options onto the `hole` options they stand for. */
export function threadedHoleToHoleOpts(
  opts: ThreadedHoleOpts,
  table?: ParamTable,
): { opts: EditableHoleOpts; spec: string } {
  const example = "plate.threadedHole('top', { u: 0, v: 0, spec: 'M6', depth: 12 })";
  if (!opts || typeof opts !== 'object') {
    invalidArgs({
      api: 'threadedHole(face, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: '{ u, v, spec | diameter, depth, modeled?, clearance?, name? }',
      example,
    });
  }
  for (const k of Object.keys(opts)) {
    if (!KEYS.has(k)) {
      invalidArgs({
        api: 'threadedHole(face, opts)',
        path: `opts.${k}`,
        got: k,
        requires: 'one of u, v, spec, diameter, depth, modeled, clearance, name, enabled',
        example,
      });
    }
  }
  const info = resolveThreadedInfo(opts, table, example);
  const out: EditableHoleOpts = {
    u: opts.u,
    v: opts.v,
    diameter: info.diameter,
    depth: opts.depth,
    thread: {
      pitch: info.pitch,
      ...(opts.modeled !== undefined ? { modeled: opts.modeled } : {}),
      ...(opts.clearance !== undefined ? { clearance: opts.clearance } : {}),
    },
  };
  if (opts.name !== undefined) out.name = opts.name;
  if (opts.enabled !== undefined) out.enabled = opts.enabled;
  return { opts: out, spec: info.spec };
}
