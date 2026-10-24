// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/assemblyLoopModes.ts
//
// `assembly.loopMode(loopName, { joint, sign })` — optional branch pin for a
// closed kinematic loop. A loop is named after the mate that closes it (the
// mate the solver's spanning tree leaves out; `solveMates(...).loop.loops`
// and every `kinematic.loop.*` diagnostic name it). The pin holds the elbow
// at `joint` on one side of straight: '+' when the turn from the link on the
// joint's `a` side to the link on its `b` side is counter-clockwise about
// the `a` connector's axis (right-hand rule), '-' when clockwise.

import { argChecker } from '../../shared/intent/invalidArgs';
import type { LoopPin } from '../../shared/kinematics/loopClosure';
import type { AssemblyState } from './assemblyState';

export interface LoopModeOpts {
  readonly joint: string;
  readonly sign: '+' | '-';
}

const PIN_KINDS = new Set(['revolute', 'cylindrical', 'pin_slot']);

const EXAMPLE = "arm.loopMode('coupler_rocker', { joint: 'crank_coupler', sign: '+' })";

export function recordLoopMode(state: AssemblyState, loopName: string, opts: LoopModeOpts): void {
  const check = argChecker('assembly.loopMode(loopName, { joint, sign })');
  if (typeof loopName !== 'string' || loopName.length === 0) {
    check({ path: 'loopName', got: loopName, requires: 'the name of the mate that closes the loop', example: EXAMPLE });
  }
  if (opts === null || typeof opts !== 'object') check({ path: 'opts', got: opts, requires: 'an object { joint, sign }', example: EXAMPLE });
  if (opts.sign !== '+' && opts.sign !== '-') check({ path: 'opts.sign', got: opts.sign, requires: "'+' or '-'", example: EXAMPLE });
  const mate = state.mates.find((m) => m.name === opts.joint);
  if (mate === undefined) {
    check({ path: 'opts.joint', got: opts.joint, requires: 'a mate declared earlier with arm.mate(...)', example: EXAMPLE });
  } else if (!PIN_KINDS.has(mate.type)) {
    check({ path: 'opts.joint', got: opts.joint, requires: `a revolute-like mate (this one is ${mate.type})`, example: EXAMPLE });
  }
  if (state.loopModes.some((p) => p.loop === loopName)) {
    check({ path: 'loopName', got: loopName, requires: 'one pin per loop (this loop is already pinned)', example: EXAMPLE });
  }
  state.loopModes.push({ loop: loopName, joint: opts.joint, sign: opts.sign });
}

export type { LoopPin };
