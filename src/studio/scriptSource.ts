import { findGallerySourceUrl, galleryPrecomputedMeshUrl } from './gallerySource';
import { apiCall, rewritePath } from './api/apiBase';
import type { SerializedParamTable } from '../shared/runtime/paramTable';
import type { ScriptReviewSummary } from './context/GeometryContext';

export async function loadStudioScriptSource(script: string): Promise<string> {
  const { base, headers } = await apiCall();
  const response = await fetch(
    rewritePath(`/__kernelcad/source?script=${encodeURIComponent(script)}`, base),
    { headers },
  );
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
    throw new Error(message);
  }
  if (typeof payload?.source !== 'string') {
    throw new Error('Source endpoint did not return source code.');
  }
  return payload.source;
}

export async function loadGalleryScriptSource(slug: string): Promise<string> {
  const sourceUrl = await findGallerySourceUrl(slug);
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Failed to load gallery source: ${response.status}`);
  return response.text();
}

/**
 * Bridge payload returned by the server mesh endpoint — identical shape to
 * the dev-server vite middleware's `/__kernelcad/mesh` response, so the
 * GeometryContext success handler can consume it the same way.
 */
export interface BackendMeshPayload {
  features: unknown[];
  featureRecords?: unknown[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  params?: SerializedParamTable;
  /** Deterministic review baked at build time (precompute) or returned by the
   *  server mesh endpoint. Drives the adaptive scene tree + Validity tab on the
   *  hosted deploy, which has no separate `/__kernelcad/review` fetch. */
  review?: ScriptReviewSummary;
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
  return typeof window !== 'undefined' && window.location.hostname === 'app.kernelcad.com';
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
 * Mesh arbitrary edited code through the dev server's node kernel
 * (`POST /__kernelcad/mesh { source }`). Returns the same bridge payload
 * shape as `meshSourceHosted`, so the GeometryContext success handler
 * consumes it identically. Used as the localhost fallback when the
 * in-browser worker can't evaluate the script (e.g. assembly models).
 */
export async function meshSourceDev(source: string): Promise<BackendMeshPayload> {
  const response = await fetch('/__kernelcad/mesh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!isBridgePayload(payload)) throw new Error('Dev mesh endpoint did not return features.');
  return payload;
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

/**
 * Compute the mesh bridge payload for a source string on the hosted deploy.
 * Tries the build-time precompute first (a static `_mesh/<sha>.json` on the
 * marketing CDN — instant, zero server compute; the common case since
 * curated gallery sources are static and unedited on first open). Falls back
 * to the server mesh endpoint (`POST {VITE_API_BASE_URL}/__kernelcad/mesh`)
 * for edited code, when a backend is configured. Throws if neither resolves.
 */
export async function meshSourceHosted(source: string): Promise<BackendMeshPayload> {
  // 1. Static precompute by source hash.
  try {
    const hash = await sha256Hex(source);
    const res = await fetch(galleryPrecomputedMeshUrl(hash));
    if (res.ok) {
      const payload = await res.json().catch(() => null);
      if (isBridgePayload(payload)) return payload;
    }
  } catch {
    // fall through to backend
  }

  // 2. Server mesh endpoint for edited / non-gallery code.
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === 'string' && base.length > 0) {
    const response = await fetch(`${base}/__kernelcad/mesh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
      throw new Error(message);
    }
    if (!isBridgePayload(payload)) throw new Error('Mesh endpoint did not return features.');
    return payload;
  }

  throw new Error(
    'No precomputed mesh for this edit, and no compute backend is configured. '
    + 'Editing gallery models in the hosted viewer needs a kernel backend.',
  );
}
