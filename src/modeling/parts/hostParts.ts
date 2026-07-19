// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capability-guarded façade over the node-only parts features.
//
// `lib.fromSTEP` / `fromBREP` / `fromSTL` read files off disk; `lib.findPart`,
// `lib.fetchPart` and `lib.standard.*` additionally reach the parts catalog
// (disk cache + network). Their implementations pull `node:fs`, `node:crypto`,
// `node:path` and `node:url`, and `src/modeling/api.ts` imported all of them
// STATICALLY — which is what made the modeling API unbundleable for a browser.
//
// Every entry here does the same two things, in this order:
//   1. `requireHostFs(<the call the user wrote>)` — throws a KernelError naming
//      the feature when there is no filesystem. This is the whole point: a
//      browser script that calls `lib.fromSTEP('x.step')` gets a diagnostic
//      that says fromSTEP needs a filesystem, NOT a module-resolution crash and
//      NOT a silent no-op.
//   2. `await import(...)` the real implementation. Because the guard runs
//      first, the node-only module is never even fetched in a browser.
//
// The node path is unchanged: the guard passes, the dynamic import resolves,
// and the same function is called with the same arguments.

import { requireHostFs } from '../../shared/runtime/hostFs';
import type { Shape } from '../capture/proxy';
import type { CaptureSession } from '../capture/captureSession';
import type { FromSTLOptions } from './fromMeshFormats';
import type { FetchPartOpts } from './fetchPart';
import type { FindPartOpts, FindPartResult } from './findPart';
import type { StandardParts } from './standardParts';

export interface HostPartsCtx {
  session: CaptureSession;
  scriptDir?: string;
}

export async function fromSTEPViaHost(ctx: HostPartsCtx, path: string): Promise<Shape> {
  requireHostFs('lib.fromSTEP()');
  const { fromSTEP } = await import('./fromSTEP');
  return fromSTEP(ctx, path);
}

export async function fromBREPViaHost(ctx: HostPartsCtx, path: string): Promise<Shape> {
  requireHostFs('lib.fromBREP()');
  const { fromBREP } = await import('./fromMeshFormats');
  return fromBREP(ctx, path);
}

export async function fromSTLViaHost(
  ctx: HostPartsCtx,
  path: string,
  opts: FromSTLOptions,
): Promise<Shape> {
  requireHostFs('lib.fromSTL()');
  const { fromSTL } = await import('./fromMeshFormats');
  return fromSTL(ctx, path, opts);
}

export async function findPartViaHost(
  query: string,
  opts: FindPartOpts,
): Promise<FindPartResult> {
  requireHostFs('lib.findPart()');
  const { findPartHost } = await import('./findPart');
  return findPartHost(query, opts);
}

export async function fetchPartViaHost(
  ctx: HostPartsCtx,
  idOrQuery: string,
  opts: FetchPartOpts,
): Promise<Shape> {
  requireHostFs('lib.fetchPart()');
  const { fetchPartHost } = await import('./fetchPart');
  const r = await fetchPartHost(ctx, idOrQuery, opts);
  return r.shape;
}

/**
 * Lazy stand-in for `createStandardParts(ctx)`.
 *
 * `createStandardParts` is called EAGERLY while the API object is built, so it
 * cannot simply become an `await import`. Every member of `StandardParts`
 * returns a Promise, so a Proxy that resolves the member on first call is
 * behaviourally identical while keeping the module out of the static graph.
 * Using a Proxy rather than a hand-listed key map means this cannot drift as
 * parts are added to `StandardParts`.
 */
export function standardPartsViaHost(ctx: HostPartsCtx): StandardParts {
  const cache = new Map<string, unknown>();
  const target = {} as Record<string, unknown>;
  return new Proxy(target, {
    get(_t, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      let fn = cache.get(prop);
      if (fn === undefined) {
        fn = async (...args: unknown[]) => {
          requireHostFs(`lib.standard.${prop}()`);
          const { createStandardParts } = await import('./standardParts');
          const parts = createStandardParts(ctx) as unknown as Record<
            string,
            (...a: unknown[]) => Promise<Shape>
          >;
          const impl = parts[prop];
          if (typeof impl !== 'function') {
            throw new TypeError(`lib.standard.${prop} is not a function`);
          }
          return impl(...args);
        };
        cache.set(prop, fn);
      }
      return fn;
    },
  }) as unknown as StandardParts;
}
