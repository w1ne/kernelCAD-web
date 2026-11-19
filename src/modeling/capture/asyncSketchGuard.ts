// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import type { Sketch } from './sketch';

/**
 * Public method names on `Sketch` (kept in sync with `SKETCH_METHODS` in
 * `src/agent/mcp/tools/listApi.ts`). Used only to decide which property
 * accesses on an un-awaited `sectionSketch` / `faceSketch` / `silhouette` /
 * `Sketch.offset` / sketch boolean result should raise the actionable "missing await" diagnostic below.
 */
const SKETCH_METHOD_NAMES = new Set(['extrude', 'revolve', 'sweep', 'loft', 'reflect', 'offset', 'union', 'subtract', 'intersect']);

/**
 * Wrap the Promise<Sketch> returned by an async Shape->Sketch producer
 * (`sectionSketch`, `faceSketch`, `silhouette`, `Sketch.offset`, the sketch
 * booleans) so that the common agent
 * mistake of chaining a Sketch method directly on the un-awaited result —
 * `part.sectionSketch('xy', 5).extrude(3)` — fails with an actionable
 * `feature.async-result.missing-await` diagnostic instead of the cryptic
 * `TypeError: sec.extrude is not a function`.
 *
 * `await`/`.then`/`.catch`/`.finally`/`Promise.all` etc. are untouched —
 * the Proxy forwards every property that isn't a Sketch method name to the
 * real Promise, bound to it.
 */
export function guardAsyncSketchResult(
  promise: Promise<Sketch>,
  methodName: string,
  receiver: 'shape' | 'sketch' = 'shape',
): Promise<Sketch> {
  return new Proxy(promise, {
    get(target, prop) {
      if (typeof prop === 'string' && SKETCH_METHOD_NAMES.has(prop)) {
        return () => {
          throw new KernelError(
            'feature.async-result.missing-await',
            `${methodName}() is async — write \`(await ${receiver}.${methodName}(...)).${prop}(...)\`.`,
          );
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Promise<Sketch>;
}
