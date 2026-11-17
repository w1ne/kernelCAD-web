// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Key check for the `hole` / `holes` option bags. Unknown keys used to be
// dropped silently: `hole('top', { ..., cbore: 6 })` cut a plain hole with no
// counterbore, and `holes('top', { at: ... })` failed with a raw TypeError.
// `threadedHole` already rejects unknown keys (see capture/threadedHole.ts).

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';

const HOLE_KEYS = [
  'u', 'v', 'at', 'axis', 'diameter', 'depth', 'upToFace',
  'counterbore', 'countersink', 'thread', 'name', 'enabled',
] as const;
const HOLES_KEYS = [
  'positions', 'diameter', 'depth', 'upToFace',
  'counterbore', 'countersink', 'thread', 'name', 'enabled',
] as const;
const NESTED_KEYS: Record<string, readonly string[]> = {
  counterbore: ['diameter', 'depth'],
  countersink: ['diameter', 'angleDeg'],
  thread: ['pitch', 'modeled', 'clearance', 'fromDiameter'],
};

const HOLE_EXAMPLE = "plate.hole('top', { u: 10, v: 10, diameter: 3.4, depth: 'through', counterbore: { diameter: 6.5, depth: 3.4 } })";
const HOLES_EXAMPLE =
  "plate.holes('top', { positions: [{ u: 10, v: 10 }, { u: 30, v: 10 }], diameter: 3.4, depth: 'through' })";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertKeys(
  api: string,
  path: string,
  bag: Record<string, unknown>,
  allowed: readonly string[],
  example: string,
  featureId: FeatureId,
): void {
  for (const key of Object.keys(bag)) {
    if (!allowed.includes(key)) {
      invalidArgs({
        api,
        path: `${path}.${key}`,
        got: bag[key],
        requires: `no such option — ${api} reads only ${allowed.join(', ')}`,
        example,
        featureId,
      });
    }
  }
}

/**
 * Reject a missing / non-object option bag for `hole` or `holes`, an unknown
 * top-level key, or an unknown key inside `counterbore`, `countersink` or an
 * object `thread`. Runs before thread sugar and value validation.
 */
export function validateHoleOptionKeys(which: 'hole' | 'holes', opts: unknown, featureId: FeatureId): void {
  const allowed = which === 'hole' ? HOLE_KEYS : HOLES_KEYS;
  const example = which === 'hole' ? HOLE_EXAMPLE : HOLES_EXAMPLE;
  const api = `${which}(face, opts)`;
  if (!isPlainObject(opts)) {
    invalidArgs({
      api,
      path: 'opts',
      got: opts,
      showType: true,
      requires: `an option object { ${allowed.join(', ')} }`,
      example,
      featureId,
    });
  }
  assertKeys(api, 'opts', opts, allowed, example, featureId);
  for (const [field, keys] of Object.entries(NESTED_KEYS)) {
    const nested = opts[field];
    if (isPlainObject(nested)) {
      assertKeys(`${which}(face, { ${field} })`, `opts.${field}`, nested, keys, example, featureId);
    }
  }
}
