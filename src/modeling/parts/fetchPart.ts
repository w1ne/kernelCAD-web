// src/modeling/parts/fetchPart.ts
//
// Resolution-order orchestrator. Per spec §4.3:
//   1. Bundled id → assets/parts/<family>/<id>.step
//   2. Cache hit  → ~/.cache/kernelcad/parts/<sha256>.step
//   3. Remote     → fetch + verify sha256 + cache
//   4. Throw `parts.fetch.remote-disabled` when no partsBaseUrl is set.

import { existsSync, readFileSync } from 'node:fs';
import type { CaptureSession } from '../capture/captureSession';
import { fromStepBytes } from './fromSTEP';
import type { Shape } from '../capture/proxy';
import { loadCatalog, resolveById, queryCatalog } from './catalog';
import { getOrFetchAsync } from '../../shared/cache/userCache';
import {
  remoteFetchPartMeta,
  remoteFetchPartBytes,
  RemoteDisabledError,
} from './remoteClient';
import { KernelError } from '../../shared/intent/kernelError';
import type { PartRecord } from '../../shared/parts/types';
import { loadConnectorManifest } from '../../shared/parts/connectorManifest';
import { formatTopoRef } from '../../kernel/naming';

export interface FetchPartCtx {
  session: CaptureSession;
  scriptDir?: string;
}

export interface FetchPartOpts {
  category?: string;
  family?: string;
  standard?: string;
  /** When the fuzzy query has multiple matches, throw unless strict === false. Default true. */
  strict?: boolean;
  partsBaseUrl?: string;
}

export interface FetchPartResult {
  shape: Shape;
  record: PartRecord;
}

export async function fetchPartHost(
  ctx: FetchPartCtx,
  idOrQuery: string,
  opts: FetchPartOpts,
): Promise<FetchPartResult> {
  if (typeof idOrQuery !== 'string' || idOrQuery.length === 0) {
    throw new KernelError(
      'parts.input.id-or-query-required',
      'fetchPart requires an id or a query string.',
      undefined,
      'Pass either an `id` (for a known catalog record) or a `query` (for fuzzy search). Both are missing.',
    );
  }
  const catalog = loadCatalog();

  // (1) Bundled id direct hit.
  const direct = resolveById(catalog, idOrQuery);
  if (direct) {
    const bytes = readFileSync(direct.stepPath);
    const shape = await fromStepBytes(ctx, bytes, direct.stepPath);
    attachManifestConnectorsFromSidecar(ctx, shape, direct.stepPath);
    return { shape, record: direct.record };
  }

  // (1b) Bundled fuzzy query — accept the single-match case unless strict=false.
  const matches = queryCatalog(catalog, idOrQuery, {
    ...(opts.category !== undefined ? { category: opts.category } : {}),
    ...(opts.family !== undefined ? { family: opts.family } : {}),
    ...(opts.standard !== undefined ? { standard: opts.standard } : {}),
    limit: 5,
  });
  if (matches.length === 1) {
    const r = resolveById(catalog, matches[0].id)!;
    const bytes = readFileSync(r.stepPath);
    const shape = await fromStepBytes(ctx, bytes, r.stepPath);
    attachManifestConnectorsFromSidecar(ctx, shape, r.stepPath);
    return { shape, record: r.record };
  }
  if (matches.length > 1 && opts.strict !== false) {
    throw new KernelError(
      'feature.invalid-args',
      `fetchPart: query '${idOrQuery}' matched ${matches.length} records (${matches
        .map((m) => m.id)
        .slice(0, 3)
        .join(', ')}). Pass a more specific query or an exact id.`,
      undefined,
      'Use find_part to inspect matches, then fetch_part with the exact id.',
    );
  }

  // (2) Remote tier — opt-in.
  try {
    const meta = await remoteFetchPartMeta({
      id: idOrQuery,
      ...(opts.partsBaseUrl !== undefined
        ? { partsBaseUrl: opts.partsBaseUrl }
        : {}),
    });
    if (!meta.stepUrl) {
      throw new KernelError(
        'parts.fetch.api-error',
        `Remote record ${idOrQuery} has no stepUrl.`,
        undefined,
        'Remote catalog response missing stepUrl; cannot download bytes.',
      );
    }
    // Cache via userCache; sha256 verified inside getOrFetchAsync.
    const path = await getOrFetchAsync({
      consumer: 'parts',
      url: meta.stepUrl,
      ext: '.step',
      ttlMs: null,
      expectedSha256: meta.sha256,
      fetcher: (u) => remoteFetchPartBytes(u),
    });
    const bytes = readFileSync(path);
    const shape = await fromStepBytes(ctx, bytes, meta.stepUrl);
    return { shape, record: { ...meta, source: 'remote' } };
  } catch (e) {
    if (e instanceof RemoteDisabledError) throw e;
    throw e;
  }
}

/**
 * Load the per-part `<id>.json` connector manifest sidecar (when present) and
 * attach the manifest's connectors to the captured shape via the session's
 * autoConnectors map. The Slice C bracket-side auto-connector consumers use
 * the same map, so the assembly resolver can mix authored + bundled parts
 * without distinguishing the source.
 */
function attachManifestConnectorsFromSidecar(
  ctx: FetchPartCtx,
  shape: Shape,
  stepPath: string,
): void {
  const manifestPath = stepPath.replace(/\.step$/, '.json');
  if (!existsSync(manifestPath)) return;
  try {
    const manifest = loadConnectorManifest(manifestPath);
    const conns = manifest.connectors.map((c) => ({
      name: c.name,
      ref: formatTopoRef({
        owner: shape.id,
        kind: 'connector',
        segments: [c.name],
      }),
      origin: c.origin,
      axis: c.type === 'axis' ? c.axis : c.normal,
      type: 'frame' as const,
    }));
    ctx.session.attachAutoConnectors(shape.id, conns);
  } catch {
    // A malformed manifest must not break the import; the lowerer survives
    // without the manifest's named connectors.
  }
}
