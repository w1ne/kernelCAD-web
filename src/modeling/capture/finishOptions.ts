// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Key check for the `finish(name, opts)` options. A British `{ colour: '#c00' }`
// used to be dropped and the finish rendered in its default hue silently.
import type { FeatureId } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';

const FINISH_OPTION_KEYS: ReadonlySet<string> = new Set(['color', 'face']);

const FINISH_OPTIONS_EXAMPLE = "box(40, 30, 10).finish('anodized-black', { color: '#c00000' })";

export function assertFinishOptions(opts: unknown, featureId: FeatureId): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'finish(name, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { color?: string; face?: string }',
      example: FINISH_OPTIONS_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !FINISH_OPTION_KEYS.has(key));
  if (unknown !== undefined) {
    invalidArgs({
      api: 'finish(name, opts)',
      path: `opts.${unknown}`,
      got: (opts as Record<string, unknown>)[unknown],
      requires: 'a known option key; finish accepts color and face',
      example: FINISH_OPTIONS_EXAMPLE,
      featureId,
    });
  }
}
