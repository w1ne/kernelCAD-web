// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/fetchPart.ts
//
// Resolution-order orchestrator. Per spec §4.3:
//   1. Bundled id → assets/parts/<family>/<id>.step
//   2. Cache hit  → ~/.cache/kernelcad/parts/<sha256>.step
//   3. Remote     → fetch + verify sha256 + cache
//   4. Throw `parts.fetch.remote-disabled` when no partsBaseUrl is set.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
import { snapshotCatalogPart, type PartRecord } from '../../shared/parts/types';
import {
  loadConnectorManifest,
  validateHashBoundConnectorManifest,
  type ConnectorManifest,
} from '../../shared/parts/connectorManifest';
import { formatTopoRef } from '../../kernel/naming';
import { inspectStepFile } from '../../agent/inspect/inspectStep';
import { synthesizeConnectorsFromReport } from './synthesizeConnectors';

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

// ---------------------------------------------------------------------------
// FETCH-BY-URL mode
//
// An agent may hand fetch_part a direct geometry URL instead of a catalog id.
// We never re-host these bytes (redistribution:'fetch-only') and we only ever
// touch the network for a small allowlist of trusted code-hosting hosts. Vendor
// *configurators* (igus, misumi, …) are detected and turned into a `link_out`
// instruction — those need a human to drive a parametric download UI, so the
// agent is told to ingest the resulting STEP locally with fetch_part({ file }).
// ---------------------------------------------------------------------------

/** Hosts we are willing to fetch raw geometry bytes from. */
const ALLOWED_PART_URL_HOSTS = [
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'github.com',
  'gitlab.com',
  'api.step.parts',
];

/**
 * Vendor configurator hosts. These serve parametric part *UIs*, not direct
 * geometry, so we never fetch them — we return a `link_out` telling the agent
 * to download the STEP by hand and ingest it locally.
 */
const VENDOR_CONFIGURATOR_HOSTS: RegExp[] = [
  /(^|\.)partcommunity\.com$/i, // igus.partcommunity.com and friends
  /(^|\.)misumi([.-]|$)/i, // misumi*, e.g. us.misumi-ec.com / misumi.com
  /(^|\.)pololu\.com$/i,
  /(^|\.)traceparts/i, // traceparts.com / traceparts*
];

function parseUrlHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/** True when `url` parses and its host is on the trusted fetch allowlist. */
export function isAllowedPartUrl(url: string): boolean {
  const host = parseUrlHost(url);
  if (host === null) return false;
  // `host` includes a :port; compare on hostname (strip the port) too.
  const hostname = host.replace(/:\d+$/, '');
  return ALLOWED_PART_URL_HOSTS.includes(hostname);
}

function isVendorConfiguratorUrl(url: string): boolean {
  const host = parseUrlHost(url);
  if (host === null) return false;
  const hostname = host.replace(/:\d+$/, '');
  return VENDOR_CONFIGURATOR_HOSTS.some((re) => re.test(hostname));
}

/**
 * Classify a part URL into one of three handling modes:
 *  - 'link_out' — a vendor configurator; the agent must download the STEP by
 *                 hand and ingest it locally (never fetched here).
 *  - 'fetch'    — an allowed host; bytes may be fetched.
 *  - 'blocked'  — anything else (unknown / untrusted host, or unparseable).
 *
 * Vendor detection wins over the allowlist so a configurator can never be
 * fetched even if it were also allowlisted.
 */
export function classifyPartUrl(url: string): 'fetch' | 'link_out' | 'blocked' {
  if (isVendorConfiguratorUrl(url)) return 'link_out';
  if (isAllowedPartUrl(url)) return 'fetch';
  return 'blocked';
}

/** Structured outcomes of the fetch-by-URL path (host-level, pre-Shape). */
export type FetchPartUrlOutcome =
  | { ok: false; error: 'url_host_not_allowed'; host: string | null }
  | {
      ok: true;
      kind: 'link_out';
      url: string;
      instruction: string;
    }
  | { ok: true; kind: 'part'; result: FetchPartResult };

export interface FetchPartUrlOpts {
  /** Injectable network fetch so tests never hit the wire. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const STEP_EXT_RE = /\.(step|stp)(\?.*)?$/i;
const MESH_EXT_RE = /\.(stl|dae|obj)(\?.*)?$/i;

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * FETCH-BY-URL entrypoint. Resolves a direct geometry URL on a trusted host to
 * a fetch-only PartRecord (STEP → inspected + connector-synthesized; mesh →
 * cached, flagged non-BREP). Never re-hosts. See classifyPartUrl for routing.
 */
export async function fetchPartFromUrlHost(
  ctx: FetchPartCtx,
  url: string,
  opts: FetchPartUrlOpts = {},
): Promise<FetchPartUrlOutcome> {
  const mode = classifyPartUrl(url);
  if (mode === 'link_out') {
    return {
      ok: true,
      kind: 'link_out',
      url,
      instruction:
        'Download the STEP from this configurator and ingest it locally with fetch_part({ file })',
    };
  }
  if (mode === 'blocked') {
    return { ok: false, error: 'url_host_not_allowed', host: parseUrlHost(url) };
  }

  const doFetch = opts.fetchImpl ?? fetch;
  const fetcher = async (u: string): Promise<Buffer> => {
    const resp = await doFetch(u);
    if (!resp.ok) {
      throw new KernelError(
        'parts.fetch.api-error',
        `fetch_part(url): HTTP ${resp.status} fetching ${u}.`,
        undefined,
        'parts.fetch.url.http-error — the geometry URL returned a non-2xx status; verify the link is a direct file URL.',
      );
    }
    return Buffer.from(await resp.arrayBuffer());
  };

  const isMesh = MESH_EXT_RE.test(url);
  const isStep = STEP_EXT_RE.test(url);
  if (!isMesh && !isStep) {
    throw new KernelError(
      'feature.invalid-args',
      `fetch_part(url): ${url} is not a recognized geometry URL (.step/.stp or .stl/.dae/.obj).`,
      undefined,
      'parts.fetch.url.unsupported-ext — point at a direct .step/.stp (BREP) or .stl/.dae/.obj (mesh) URL.',
    );
  }

  const ext = isMesh ? meshExt(url) : '.step';
  // Cache under the same ~/.cache/kernelcad/parts/<sha256(url)><ext> path the
  // remote tier uses. No expectedSha256: the URL is the trust anchor here, and
  // we hash the bytes ourselves for the record's provenance field.
  const path = await getOrFetchAsync({
    consumer: 'parts',
    url,
    ext,
    ttlMs: null,
    fetcher,
  });
  const bytes = readFileSync(path);
  const sha256 = sha256Hex(bytes);
  const baseName = urlBaseName(url);

  if (isMesh) {
    // Mesh import: we do NOT have a BREP path here, so return a usable cached
    // handle flagged as a mesh. The cache path is exposed via metadata so the
    // mesh-import escape hatch can pick it up.
    const record: PartRecord = {
      id: `url:${sha256.slice(0, 16)}`,
      name: baseName,
      category: 'imported',
      family: 'url-import',
      tags: ['url-import', 'mesh-import'],
      attributes: { geometryKind: 'mesh', cachePath: path },
      sha256,
      source: 'remote',
      license: 'unknown',
      connectors: [],
      stepUrl: url,
      redistribution: 'fetch-only',
    };
    // Mesh imports have no Shape (no BREP); surface the cached path on a stub
    // shape so callers keep a uniform { shape, record } contract. We park no
    // geometry — the lowerer treats this as a mesh-import escape hatch.
    const shape = ctx.session.createShape({
      kind: 'importedMesh',
      params: {},
      inputs: {},
      metadata: { sourcePath: path, geometryKind: 'mesh' },
    });
    attachCatalogPartMetadata(ctx, shape, record);
    return { ok: true, kind: 'part', result: { shape, record } };
  }

  // STEP path: import → inspect → synthesize connectors (same flow the remote
  // tier uses for catalog STEP).
  const shape = await fromStepBytes(ctx, bytes, url);
  let connectors: string[] = [];
  try {
    const report = await inspectStepFile(path);
    const conns = synthesizeConnectorsFromReport(report, shape.id);
    if (conns.length > 0) {
      ctx.session.attachAutoConnectors(shape.id, conns);
      connectors = conns.map((c) => c.name);
    }
  } catch {
    // Defensive: a STEP that resists inspection still imports, just without
    // synthesized connectors.
  }

  const record: PartRecord = {
    id: `url:${sha256.slice(0, 16)}`,
    name: baseName,
    category: 'imported',
    family: 'url-import',
    tags: ['url-import'],
    attributes: {},
    sha256,
    source: 'remote',
    license: 'unknown',
    connectors,
    stepUrl: url,
    redistribution: 'fetch-only',
  };
  attachCatalogPartMetadata(ctx, shape, record);
  return { ok: true, kind: 'part', result: { shape, record } };
}

function meshExt(url: string): string {
  const m = MESH_EXT_RE.exec(url);
  return m ? `.${m[1].toLowerCase()}` : '.stl';
}

function urlBaseName(url: string): string {
  try {
    const p = new URL(url).pathname;
    const last = p.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
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
    attachCatalogPartMetadata(ctx, shape, direct.record);
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
    attachCatalogPartMetadata(ctx, shape, r.record);
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
      // GLB-only record. The authored dev-board catalog entries (`*-board`) ship
      // `glbUrl` and NO `stepUrl` by design (scripts/buildBoardGlbs.ts drops the
      // 4–27 MB STEP so the catalog stays under Cloudflare Pages' 25 MiB
      // per-file limit). Fail with a code that says *that*, not a generic
      // "no stepUrl" API error, so the agent stops re-fetching a record that
      // will never carry BREP.
      //
      // We deliberately do NOT route these into the `importedMesh` escape hatch:
      // `importedMesh` has no lowerer (occtLowerer's switch falls through to
      // `default:` → "Feature kind 'importedMesh' is not supported"), and the
      // boards are multi-component meshes that OCCT cannot sew into a solid
      // anyway (nucleo-h563zi-board = 10 disjoint meshes → sewing yields a
      // COMPOUND, and fromTriangleMesh rejects it). A mesh Shape here would fail
      // later, further from the cause.
      if (meta.glbUrl) {
        throw new KernelError(
          'parts.fetch.geometry-not-brep',
          `Catalog record ${idOrQuery} is GLB-only: it has glbUrl (${meta.glbUrl}) but no stepUrl, so there is no BREP geometry to import.`,
          undefined,
          'parts.fetch.geometry-not-brep — the authored dev-board records are served as display meshes (GLB) because their STEP exceeds the catalog file-size limit. kernelCAD has no mesh-import lowerer, so fetch_part cannot build a Shape from a GLB. Use the authored source instead: compile scripts/parts/authored/<board>.kcad.ts to STEP and load it with lib.fromSTEP(path), or pick a catalog part that exposes stepUrl.',
        );
      }
      throw new KernelError(
        'parts.fetch.api-error',
        `Remote record ${idOrQuery} has no stepUrl.`,
        undefined,
        'Remote catalog response missing stepUrl; cannot download bytes.',
      );
    }
    // Cache via userCache. `expectedSha256` gates BOTH the download and any
    // existing cache entry: entries are keyed by sha256(URL), so without the
    // content check a catalog rebuild that republishes this same URL would keep
    // serving pre-rebuild geometry indefinitely (see userCache.ts).
    const path = await getOrFetchAsync({
      consumer: 'parts',
      url: meta.stepUrl,
      ext: '.step',
      ttlMs: null,
      expectedSha256: meta.sha256,
      fetcher: (u) => remoteFetchPartBytes(u),
    });
    const bytes = readFileSync(path);
    const manifest = meta.connectorManifest;
    if (manifest !== undefined) {
      validateHashBoundConnectorManifest(manifest, {
        partId: meta.id,
        family: meta.family,
        geometrySha256: sha256Hex(bytes),
      });
    }
    const shape = await fromStepBytes(ctx, bytes, meta.stepUrl);
    let record: PartRecord = { ...meta, source: 'remote' };
    if (manifest !== undefined) {
      const connectors = attachManifestConnectors(ctx, shape, manifest);
      record = { ...record, connectors };
    } else {
      // Records without authored interfaces retain geometry-derived discovery
      // connectors. A STEP that resists inspection still imports normally.
      try {
        const report = await inspectStepFile(path);
        const conns = synthesizeConnectorsFromReport(report, shape.id);
        if (conns.length > 0) {
          ctx.session.attachAutoConnectors(shape.id, conns);
          record = { ...record, connectors: conns.map((c) => c.name) };
        }
      } catch {
        // fall through to the unenriched record
      }
    }
    attachCatalogPartMetadata(ctx, shape, record);
    return { shape, record };
  } catch (e) {
    if (e instanceof RemoteDisabledError) throw e;
    throw e;
  }
}

/**
 * Attach exact manifest data and retain the legacy discovery projection.
 */
function attachManifestConnectors(
  ctx: FetchPartCtx,
  shape: Shape,
  manifest: ConnectorManifest,
): string[] {
  ctx.session.attachCatalogConnectors(shape.id, manifest.connectors);
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
  return conns.map((connector) => connector.name);
}

/**
 * Load the per-part `<id>.json` connector manifest sidecar (when present).
 * Local sidecars remain best-effort: a malformed one must not block import.
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
    attachManifestConnectors(ctx, shape, manifest);
  } catch {
    // A malformed manifest must not break the import; the lowerer survives
    // without the manifest's named connectors.
  }
}

/**
 * Retain immutable catalog semantics on the imported feature itself.
 *
 * `fetchPartHost()` has a rich `{ shape, record }` result, but the public
 * `lib.fetchPart()` API intentionally returns only the composable Shape. Put a
 * frozen record snapshot on the Shape's FeatureRecord before that wrapper is
 * discarded so assemblies, Studio, and MCP inspection can still identify the
 * physical package instead of seeing only an imported STEP source path.
 */
function attachCatalogPartMetadata(
  ctx: FetchPartCtx,
  shape: Shape,
  record: PartRecord,
): void {
  const feature = ctx.session.getRecords().find((candidate) => candidate.id === shape.id);
  if (!feature) return;
  feature.metadata = {
    ...(feature.metadata ?? {}),
    catalogPart: snapshotCatalogPart(record),
  };
}
