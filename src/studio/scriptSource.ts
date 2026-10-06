// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { parseMeshArtifact } from '../funnel/meshArtifact';
import {
  findGallerySourceUrl,
  findGallerySourceUrlForScriptPath,
  galleryPrecomputedMeshUrl,
} from './gallerySource';
import { apiCall, rewritePath } from './api/apiBase';
import type { SerializedParamTable } from '../shared/runtime/paramTable';
import type { ScriptReviewSummary } from './context/GeometryContext';
import type { FeatureMeshSerialized } from '../modeling/capture/featureMeshSerialize';
import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { ViewerDimension } from '../shared/intent/viewerDimension';

async function parseJsonOrThrowHelpful(response: Response, fallbackMessage: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    const text = await response.text().catch(() => '');
    if (text.includes('<!doctype html') || text.includes('<html')) {
      throw new Error(fallbackMessage);
    }
    throw new Error(fallbackMessage);
  }
}

export async function loadStudioScriptSource(script: string): Promise<string> {
  if (shouldUseHostedMesh()) {
    const curatedSourceUrl = await findGallerySourceUrlForScriptPath(script);
    if (curatedSourceUrl) {
      const curatedResponse = await fetch(curatedSourceUrl);
      if (!curatedResponse.ok) {
        throw new Error(`Failed to load gallery source: ${curatedResponse.status}`);
      }
      return curatedResponse.text();
    }
  }

  const { base, headers } = await apiCall();
  const response = await fetch(
    rewritePath(`/__kernelcad/source?script=${encodeURIComponent(script)}`, base),
    { headers },
  );
  const payload = await parseJsonOrThrowHelpful(
    response,
    'Hosted script link is not public. Use a curated gallery link or sign in.',
  );
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : response.statusText;
    throw new Error(message);
  }
  if (!payload || typeof payload !== 'object' || typeof (payload as { source?: unknown }).source !== 'string') {
    throw new Error('Source endpoint did not return source code.');
  }
  return (payload as { source: string }).source;
}

export async function loadGalleryScriptSource(slug: string): Promise<string> {
  const sourceUrl = await findGallerySourceUrl(slug);
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Failed to load gallery source: ${response.status}`);
  return response.text();
}

/** The `?script=` path Studio was opened with, or null outside the browser /
 *  on the default (no-script) route. Single source of truth for save-back. */
export function currentStudioScript(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('script');
}

/**
 * Bridge payload returned by the server mesh endpoint — identical shape to
 * the dev-server vite middleware's `/__kernelcad/mesh` response, so the
 * GeometryContext success handler can consume it the same way.
 */
export interface BackendMeshPayload {
  features: FeatureMeshSerialized[];
  featureRecords?: FeatureRecord[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  params?: SerializedParamTable;
  /** Deterministic review baked at build time (precompute) or returned by the
   *  server mesh endpoint. Drives the adaptive scene tree + Validity tab on the
   *  hosted deploy, which has no separate `/__kernelcad/review` fetch. */
  review?: ScriptReviewSummary;
  /** Returned/root feature ids. Construction history remains available in
   * `features` for inspection but is hidden from the default scene. */
  rootFeatureIds?: string[];
  /** Declared + automatic 3D dimensions (model mm) for the viewer overlay. */
  dimensions?: ViewerDimension[];
  /** Set by the server when it answered from the stored revision artifact
   *  instead of a fresh build: the shape is the published one, approximately. */
  degraded?: 'revision-artifact' | string;
}

// --- Mesh status the viewer chrome shows -----------------------------------
// `meshing`: the server answered 504 `mesh.pending` and we are waiting to
// retry. `approximate`: the last payload was `degraded: 'revision-artifact'`.
export interface MeshNotice { meshing: boolean; approximate: boolean }
let meshNotice: MeshNotice = { meshing: false, approximate: false };
const meshNoticeListeners = new Set<() => void>();

function setMeshNotice(next: Partial<MeshNotice>): void {
  const merged = { ...meshNotice, ...next };
  if (merged.meshing === meshNotice.meshing && merged.approximate === meshNotice.approximate) return;
  meshNotice = merged;
  meshNoticeListeners.forEach((l) => l());
}

export function subscribeMeshNotice(listener: () => void): () => void {
  meshNoticeListeners.add(listener);
  return () => { meshNoticeListeners.delete(listener); };
}
export function getMeshNotice(): MeshNotice { return meshNotice; }

export function rootVisibleFeatures(
  payload: Pick<BackendMeshPayload, 'features' | 'rootFeatureIds'>,
): FeatureMeshSerialized[] {
  const roots = payload.rootFeatureIds;
  if (!roots || roots.length === 0) return payload.features;
  const rootSet = new Set(roots);
  return payload.features.filter((feature) => (
    rootSet.has(feature.featureId)
    || (feature.assemblyFeatureId !== undefined && rootSet.has(feature.assemblyFeatureId))
  ));
}

/** Hosted Studio project identity from `/p/<slug>?version=N`. Shared by mesh
 *  and export so relative project assets resolve against the same bundle. */
/** Share pages know the row version before the URL does (`/p/<slug>` with no
 *  `?version=`). The URL pin wins when both are set. */
let hostedRevisionHint: number | undefined;

export function setHostedRevisionHint(version: number | null | undefined): void {
  hostedRevisionHint = typeof version === 'number' && version > 0 ? version : undefined;
}

export function currentHostedProject(): { slug: string; version?: number } | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname?.match(/^\/p\/([^/]+)\/?$/);
  if (!match) return null;
  const rawVersion = new URLSearchParams(window.location.search ?? '').get('version');
  const fromUrl = rawVersion && /^\d+$/.test(rawVersion) ? Number(rawVersion) : undefined;
  const version = fromUrl && fromUrl > 0 ? fromUrl : hostedRevisionHint;
  return {
    slug: decodeURIComponent(match[1]!),
    ...(version && version > 0 ? { version } : {}),
  };
}

/**
 * True when Studio is running on the hosted static deploy, where there is no
 * local `/__kernelcad/*` kernel backend and the client-side worker is the
 * legacy v0.1 runtime (which can't evaluate modern kernelCAD API scripts).
 * On this host, recompute must go through the build-time precompute (static
 * CDN) or, for edited code, the server mesh endpoint — never the local
 * worker. Gated narrowly on the hosted hostname so dev / localhost / preview
 * keep using the in-process worker path unchanged.
 */
export function shouldUseHostedMesh(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname === 'app.kernelcad.com') return true;
  // Local build pointed at production APIs (Playwright). Production builds
  // leave this unset and keep the hostname gate.
  return import.meta.env.VITE_HOSTED_MESH === '1';
}

/**
 * True in the vite dev server (localhost). The dev middleware exposes a
 * node-backed `/__kernelcad/mesh` that can run the modern assembly/joint/
 * tendon API the in-browser worker can't — so when the worker throws on an
 * undefined API global, we fall back to it. Only in `import.meta.env.DEV`
 * (the dev middleware doesn't exist on the hosted/static build).
 */
export function devMeshAvailable(): boolean {
  return Boolean(import.meta.env?.DEV) && !shouldUseHostedMesh();
}

/**
 * True when `code` is built with the modern assembly / joint / kinematic kernel
 * API that the legacy v0.1 in-browser worker does NOT expose (the worker only
 * has `param`/`box`/`cylinder`/`sphere`/`Sketcher`). Worker `param()` returns a
 * plain number, so ParamRef arithmetic (`.add` / `.divide` / `.multiply` /
 * `.negate`) throws `TypeError: t.add is not a function` — the default Studio
 * script hits this. Such a model can only run on the full node kernel, so
 * handing it to the worker is a guaranteed throw. On localhost dev we use this
 * to route the model straight to the node-backed `/__kernelcad/mesh` endpoint
 * up front — the worker never sees code it can't evaluate, so there is no
 * throw-then-recover "choke". A comment that merely mentions one of these
 * tokens only routes to the (still-correct) node kernel, so over-matching is
 * harmless. `.subtract(` is omitted: it is also the v0.1 boolean cutter the
 * worker already implements.
 */
const FULL_KERNEL_PATTERNS: readonly RegExp[] = [
  /\bassembly\s*\(/,
  /\bjoint\s*\./,
  /\blib\s*\.\s*fromSTEP\b/,
  /\.\s*tendon\s*\(/,
  /\.\s*solvedModel\s*\(/,
  /\.\s*(add|divide|multiply|negate)\s*\(/,
];

export function needsFullKernel(code: string): boolean {
  return FULL_KERNEL_PATTERNS.some((re) => re.test(code));
}

/**
 * Mesh arbitrary edited code through the dev server's node kernel
 * (`POST /__kernelcad/mesh { source }`). Returns the same bridge payload
 * shape as `meshSourceHosted`, so the GeometryContext success handler
 * consumes it identically. Used as the localhost fallback when the
 * in-browser worker can't evaluate the script (e.g. assembly models).
 */
/** Override map for declared parameters: `{ paramName: value }`. Applied to the
 *  param table after the script runs but before lowering, so a slider edit
 *  re-runs the script with the new value baked in — the stateless recompute
 *  path used when there is no live kernel session (hosted viewer / arbitrary
 *  edited code). Empty/undefined = use the script's declared defaults. */
export type ParamOverrides = Record<string, number | boolean>;

function hasOverrides(p?: ParamOverrides): p is ParamOverrides {
  return !!p && Object.keys(p).length > 0;
}

export async function meshSourceDev(
  source: string,
  paramOverrides?: ParamOverrides,
): Promise<BackendMeshPayload> {
  // Route through `apiCall()` so embed-mode hosts (StudioConfigProvider
  // with a `backendUrl`) get the correct prefix; standalone dev with no
  // embed config resolves to base='' and the URL stays `/__kernelcad/mesh`
  // (matches the existing test contract bit-for-bit).
  const { base, headers } = await apiCall();
  const response = await fetch(rewritePath('/__kernelcad/mesh', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ source, ...(hasOverrides(paramOverrides) ? { params: paramOverrides } : {}) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!isBridgePayload(payload)) throw new Error('Dev mesh endpoint did not return features.');
  return payload;
}

/**
 * Review arbitrary edited code through the dev server's node kernel
 * (`POST /__kernelcad/review?script=<script> { source }`). Returns the
 * `reviewCadTool` payload directly — the candidate-evaluation path used by
 * direct edit, which needs the interference/validity verdict WITHOUT paying
 * for a full mesh round-trip. The script query param only anchors relative
 * asset resolution; it is not required to exist on disk.
 */
export async function reviewSourceDev(
  source: string,
  script: string,
): Promise<ScriptReviewSummary> {
  const { base, headers } = await apiCall();
  const response = await fetch(
    rewritePath(`/__kernelcad/review?script=${encodeURIComponent(script)}`, base),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ source }),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  // Guard against a 200 that is not a review at all — an SPA fallback page or
  // a missing endpoint would otherwise parse to `{}` and be mistaken for a
  // review with no interference evidence.
  if (payload === null || typeof payload !== 'object' || typeof (payload as { ok?: unknown }).ok !== 'boolean') {
    throw new Error('Review endpoint returned an unexpected payload.');
  }
  return payload as ScriptReviewSummary;
}

/** sha256 hex of a string via the Web Crypto API (available in https
 *  contexts). Matches the node `crypto.createHash('sha256')` digest the
 *  build uses for precomputed-mesh filenames, so an unedited gallery source
 *  resolves to its static precompute. */
async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isBridgePayload(value: unknown): value is BackendMeshPayload {
  return !!value && typeof value === 'object' && Array.isArray((value as { features?: unknown }).features);
}

/** `/__kernelcad/mesh` body: the stored `/p/<slug>` project, or the source.
 *  `preferSource`: the caller rewrote the source (param values baked into
 *  it), so the stored project body would drop the edit. */
function hostedMeshBody(source: string, paramOverrides: ParamOverrides | undefined, preferSource?: boolean) {
  const project = preferSource ? null : currentHostedProject();
  return {
    ...(project
      ? { projectSlug: project.slug, ...(project.version ? { projectVersion: project.version } : {}) }
      : { source }),
    ...(hasOverrides(paramOverrides) ? { params: paramOverrides } : {}),
  };
}

/** Retries after a 504 `mesh.pending` (the server is still building). Three
 *  waits of at most 30 s each keep the total under ~90 s. */
const MESH_PENDING_MAX_RETRIES = 3;
const MESH_PENDING_MAX_WAIT_MS = 30_000;
const MESH_PENDING_DEFAULT_WAIT_MS = 5_000;

function pendingWaitMs(response: Response, payload: { retryAfterMs?: unknown } | null): number {
  const header = Number(response.headers?.get?.('Retry-After'));
  const ms = Number.isFinite(header) && header > 0
    ? header * 1000
    : typeof payload?.retryAfterMs === 'number' && payload.retryAfterMs > 0
      ? payload.retryAfterMs
      : MESH_PENDING_DEFAULT_WAIT_MS;
  return Math.min(ms, MESH_PENDING_MAX_WAIT_MS);
}

/** `POST {base}/__kernelcad/mesh`; throws the server's error message. A 504
 *  `mesh.pending` is retried (the build keeps running server-side). */
async function meshOnServer(base: string, body: ReturnType<typeof hostedMeshBody>): Promise<BackendMeshPayload> {
  try {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${base}/__kernelcad/mesh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 504 && payload?.code === 'mesh.pending' && attempt < MESH_PENDING_MAX_RETRIES) {
          setMeshNotice({ meshing: true });
          await new Promise((resolve) => setTimeout(resolve, pendingWaitMs(response, payload)));
          continue;
        }
        const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
        throw new Error(message);
      }
      if (!isBridgePayload(payload)) throw new Error('Mesh endpoint did not return features.');
      setMeshNotice({ approximate: payload.degraded === 'revision-artifact' });
      return payload;
    }
  } finally {
    setMeshNotice({ meshing: false });
  }
}

/** Public CDN holding the meshes stored at publish time. */
const MESH_CDN_BASE = import.meta.env.VITE_MESH_CDN_BASE ?? 'https://mesh.kernelcad.com';

/** A hung CDN read must not leave the viewer on "Building…" forever. */
const ARTIFACT_FETCH_MS = 8_000;

const STORED_MESH_MISSING = 'The stored mesh for this revision is not available yet.';

const storedMeshCache = new Map<string, Promise<BackendMeshPayload | null>>();

/** Tests share one module cache. A failed read is not cached. */
export function clearStoredMeshCache(): void {
  storedMeshCache.clear();
}

async function fetchBridgePayloadOnce(url: string): Promise<BackendMeshPayload | null> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ARTIFACT_FETCH_MS) : undefined;
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) return null;
    const payload = await res.json().catch(() => null);
    return isBridgePayload(payload) ? payload : null;
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** One parse per URL. Repeat opens, SSE refetches, and poll retries must not
 *  re-download and re-parse a multi-megabyte mesh on the main thread. */
async function fetchBridgePayload(url: string): Promise<BackendMeshPayload | null> {
  const cached = storedMeshCache.get(url);
  if (cached) return cached;
  const pending = fetchBridgePayloadOnce(url).then((payload) => {
    if (!payload) storedMeshCache.delete(url);
    return payload;
  });
  storedMeshCache.set(url, pending);
  return pending;
}

function payloadRevision(payload: BackendMeshPayload): number | null {
  const revision = (payload as { revision?: unknown }).revision;
  return typeof revision === 'number' && revision > 0 ? revision : null;
}

/** Drop empty records and coincident duplicate parts. A payload the parser
 *  rejects (tests, legacy) is painted as-is. */
function prepareStoredPayload(payload: BackendMeshPayload, expected: number | null): BackendMeshPayload {
  try {
    const parsed = parseMeshArtifact(payload, expected);
    const next: BackendMeshPayload = { ...payload, features: parsed.features };
    if (parsed.dimensions) next.dimensions = parsed.dimensions;
    delete next.degraded;
    return next;
  } catch {
    return payload;
  }
}

function storedMeshUrls(base: string, project: { slug: string; version?: number }): string[] {
  const slug = encodeURIComponent(project.slug);
  if (project.version) {
    const urls = [`${MESH_CDN_BASE}/mesh-artifacts/${slug}/v${project.version}.json`];
    if (base) urls.push(`${base}/api/v1/projects/${slug}/revisions/${project.version}/mesh-artifact`);
    return urls;
  }
  return [`${MESH_CDN_BASE}/mesh-artifacts/${slug}/latest.json`];
}

async function readStoredMesh(url: string, expected: number | null): Promise<BackendMeshPayload | null> {
  const payload = await fetchBridgePayload(url);
  if (!payload) return null;
  const revision = payloadRevision(payload);
  // A newer latest.json is a different model. Never paint it for a pin.
  if (expected && revision && revision !== expected) return null;
  return prepareStoredPayload(payload, expected);
}

/** The mesh stored when this `/p/<slug>` revision was published.
 *  Unpinned pages use `latest.json`. Reads the CDN before the API redirect:
 *  that redirect runs on the mesh server and answers 503 under load. */
async function storedRevisionMesh(base: string): Promise<BackendMeshPayload | null> {
  const project = currentHostedProject();
  if (!project) return null;
  const expected = project.version ?? null;
  for (const url of storedMeshUrls(base, project)) {
    const payload = await readStoredMesh(url, expected);
    if (payload) return payload;
  }
  return null;
}

/**
 * Compute the mesh bridge payload for a source string on the hosted deploy.
 * Tries the build-time precompute first (a static `_mesh/<sha>.json` on the
 * marketing CDN — instant, zero server compute; the common case since
 * curated gallery sources are static and unedited on first open). Falls back
 * to the server mesh endpoint (`POST {VITE_API_BASE_URL}/__kernelcad/mesh`)
 * for edited code, when a backend is configured. Throws if neither resolves.
 */
const NO_HOSTED_BACKEND = 'No precomputed mesh for this edit, and no compute backend is configured. '
  + 'Editing gallery models in the hosted viewer needs a kernel backend.';

/** Project viewers paint the mesh stored at publish time. They do not hash
 *  the source against the gallery and they do not remesh on the request path. */
async function meshStoredProject(
  paramOverrides: ParamOverrides | undefined,
  preferSource: boolean | undefined,
): Promise<BackendMeshPayload | null> {
  if (hasOverrides(paramOverrides) || preferSource || !currentHostedProject()) return null;
  const base = typeof import.meta.env.VITE_API_BASE_URL === 'string' ? import.meta.env.VITE_API_BASE_URL : '';
  const stored = await storedRevisionMesh(base);
  if (!stored) throw new Error(STORED_MESH_MISSING);
  setMeshNotice({ meshing: false, approximate: false });
  return stored;
}

/** Static precompute by source hash. Only the unmodified gallery source is
 *  in that set; a saved project is not. */
async function meshGalleryPrecompute(
  source: string,
  paramOverrides: ParamOverrides | undefined,
): Promise<BackendMeshPayload | null> {
  if (hasOverrides(paramOverrides) || currentHostedProject()) return null;
  try {
    const hash = await sha256Hex(source);
    const res = await fetch(galleryPrecomputedMeshUrl(hash));
    if (!res.ok) return null;
    const payload = await res.json().catch(() => null);
    return isBridgePayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

/** Server mesh for an edit. A pinned revision that exceeds the live budget
 *  falls back to the mesh stored at publish time. */
async function meshViaServer(
  source: string,
  paramOverrides: ParamOverrides | undefined,
  preferSource: boolean | undefined,
): Promise<BackendMeshPayload> {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base !== 'string' || base.length === 0) throw new Error(NO_HOSTED_BACKEND);
  try {
    return await meshOnServer(base, hostedMeshBody(source, paramOverrides, preferSource));
  } catch (error) {
    const stored = hasOverrides(paramOverrides) || preferSource ? null : await storedRevisionMesh(base);
    if (stored) return stored;
    throw error;
  }
}

export async function meshSourceHosted(
  source: string,
  paramOverrides?: ParamOverrides,
  options?: { preferSource?: boolean },
): Promise<BackendMeshPayload> {
  const preferSource = options?.preferSource;
  const stored = await meshStoredProject(paramOverrides, preferSource);
  if (stored) return stored;
  const gallery = await meshGalleryPrecompute(source, paramOverrides);
  if (gallery) return gallery;
  return meshViaServer(source, paramOverrides, preferSource);
}
