import { findGallerySourceUrl } from './gallerySource';

export async function loadStudioScriptSource(script: string): Promise<string> {
  const response = await fetch(`/__kernelcad/source?script=${encodeURIComponent(script)}`);
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
  params?: Record<string, unknown>;
}

/**
 * True when Studio is running on the hosted static deploy, where there is no
 * local `/__kernelcad/*` kernel backend and the client-side worker is the
 * legacy v0.1 runtime (which can't evaluate modern kernelCAD API scripts).
 * On this host, recompute must go through the server mesh endpoint instead.
 * Gated narrowly on the hosted hostname so dev / localhost / preview deploys
 * keep using the in-process worker path unchanged.
 */
export function shouldUseBackendMesh(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname !== 'app.kernelcad.com') return false;
  return typeof import.meta.env.VITE_API_BASE_URL === 'string'
    && import.meta.env.VITE_API_BASE_URL.length > 0;
}

/**
 * POST a .kcad.ts source string to the server mesh endpoint and return the
 * bridge payload. Used by the hosted deploy in place of the legacy
 * client-side worker (see `shouldUseBackendMesh`).
 */
export async function meshSourceViaBackend(source: string): Promise<BackendMeshPayload> {
  const base = import.meta.env.VITE_API_BASE_URL;
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
  if (!payload || !Array.isArray(payload.features)) {
    throw new Error('Mesh endpoint did not return features.');
  }
  return payload as BackendMeshPayload;
}
