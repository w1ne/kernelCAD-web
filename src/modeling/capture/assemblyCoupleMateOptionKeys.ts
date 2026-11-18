// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { isPlainOptionsRecord } from './assemblyOptionRecords';

const COUPLE_MATE_OPTION_KEYS = ['source', 'ratio', 'offset'] as const;

export function assertCoupleMateOptionKeys(driven: string, opts: unknown): void {
  const api = `assembly.coupleMates('${driven}', opts)`;
  const example = "arm.coupleMates('output', { source: 'input', ratio: -0.25, offset: 0 })";
  if (!isPlainOptionsRecord(opts)) {
    const got = opts !== null && typeof opts === 'object' && !Array.isArray(opts)
      ? { gotText: 'a non-plain object' }
      : { got: opts, showType: true };
    invalidArgs({
      api,
      path: 'opts',
      ...got,
      requires: `a plain options object with only ${COUPLE_MATE_OPTION_KEYS.join(', ')}`,
      example,
    });
  }

  const unknownKey = Object.keys(opts).find((key) => !(COUPLE_MATE_OPTION_KEYS as readonly string[]).includes(key));
  if (unknownKey === undefined) return;
  invalidArgs({
    api,
    path: `opts.${unknownKey}`,
    gotText: `an unknown option '${unknownKey}'`,
    requires: `one of ${COUPLE_MATE_OPTION_KEYS.join(', ')}`,
    example,
  });
}
