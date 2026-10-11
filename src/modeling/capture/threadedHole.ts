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
import { isoThreadInfo } from '../threads';
import type { EditableHoleOpts } from '../validation/holeValidation';

export interface ThreadedHoleOpts {
  u: Editable<number>;
  v: Editable<number>;
  /** ISO metric designation: `'M6'` (coarse pitch) or `'M6x0.75'`. */
  spec: string;
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

const KEYS = new Set(['u', 'v', 'spec', 'depth', 'modeled', 'clearance', 'name', 'enabled']);

/** Map `threadedHole` options onto the `hole` options they stand for. */
export function threadedHoleToHoleOpts(opts: ThreadedHoleOpts): EditableHoleOpts {
  const example = "plate.threadedHole('top', { u: 0, v: 0, spec: 'M6', depth: 12 })";
  if (!opts || typeof opts !== 'object') {
    invalidArgs({
      api: 'threadedHole(face, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: '{ u, v, spec, depth, modeled?, clearance?, name? }',
      example,
    });
  }
  for (const k of Object.keys(opts)) {
    if (!KEYS.has(k)) {
      invalidArgs({
        api: 'threadedHole(face, opts)',
        path: `opts.${k}`,
        got: k,
        requires: 'one of u, v, spec, depth, modeled, clearance, name, enabled',
        example,
      });
    }
  }
  const info = isoThreadInfo(opts.spec, 'threadedHole(face, { spec })');
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
  return out;
}
