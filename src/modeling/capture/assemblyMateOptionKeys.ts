// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { isPlainOptionsRecord } from './assemblyOptionRecords';
import type { MateOptions } from './assemblyJoints';

// Keep exhaustive with MateOptions so runtime validation tracks the capture
// contract as supported mate metadata grows.
const MATE_OPTION_KEYS: Readonly<Record<keyof MateOptions, true>> = {
  pose: true,
  limitsDeg: true,
  limitsMm: true,
  exposure: true,
  capacity: true,
  maxLoad: true,
  stiffnessNmmPerDeg: true,
  springRefDeg: true,
  dampingNmmsPerDeg: true,
  stiffnessNPerMm: true,
  springRefMm: true,
  dampingNsPerMm: true,
  fastener: true,
  fit: true,
};

export function assertMateOptionKeys(name: string, opts: unknown): void {
  const api = `assembly.mate('${name}', aRef, bRef, type, opts)`;
  const example = "arm.mate('hinge', 'base.pivot', 'lid.pivot', 'revolute', { limitsDeg: [0, 120] })";
  if (opts !== undefined && !isPlainOptionsRecord(opts)) {
    const got = opts !== null && typeof opts === 'object' && !Array.isArray(opts)
      ? { gotText: 'a non-plain object' }
      : { got: opts, showType: true };
    invalidArgs({
      api,
      path: 'opts',
      ...got,
      requires: `a plain options object with only ${Object.keys(MATE_OPTION_KEYS).join(', ')}`,
      example,
    });
  }
  if (opts === undefined) return;
  const unknownKey = Object.keys(opts).find((key) => !Object.hasOwn(MATE_OPTION_KEYS, key));
  if (unknownKey === undefined) return;
  invalidArgs({
    api,
    path: `opts.${unknownKey}`,
    gotText: `an unknown option '${unknownKey}'`,
    requires: `one of ${Object.keys(MATE_OPTION_KEYS).join(', ')}`,
    example,
  });
}
