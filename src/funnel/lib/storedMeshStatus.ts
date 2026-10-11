// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Where the mesh stored at publish time for `slug@version` stands, from the
 * server's `GET /api/v1/projects/:slug/revisions/:version/mesh-status`.
 *
 * Asking also starts the build when the artifact is missing and nothing is
 * building it (lost on a deploy, never built), so a viewer that polls this
 * never waits on a build no one runs. A failed build stays `failed` with its
 * error until `retry` (or a server deploy) rebuilds it.
 */

export type StoredMeshState = 'ready' | 'building' | 'failed' | 'missing';

export interface StoredMeshStatus {
  status: StoredMeshState;
  meshUrl?: string;
  error?: string;
}

const STATES: readonly StoredMeshState[] = ['ready', 'building', 'failed', 'missing'];

/** A status read must not hang a poll loop. */
const STATUS_FETCH_MS = 10_000;

export function storedMeshStatusUrl(apiBase: string, slug: string, version: number, retry = false): string {
  const base = apiBase.replace(/\/+$/, '');
  const url = `${base}/api/v1/projects/${encodeURIComponent(slug)}/revisions/${version}/mesh-status`;
  return retry ? `${url}?retry=1` : url;
}

/** `{ slug, version }` of a revision-pinned CDN mesh URL
 *  (`…/mesh-artifacts/<slug>/v<N>.json`), else null. */
export function revisionOfMeshUrl(meshUrl: string): { slug: string; version: number } | null {
  const match = /\/mesh-artifacts\/([^/]+)\/v(\d+)\.json(?:[?#].*)?$/.exec(meshUrl);
  if (!match) return null;
  const version = Number(match[2]);
  if (!(version > 0)) return null;
  try {
    return { slug: decodeURIComponent(match[1]!), version };
  } catch {
    return null;
  }
}

function parseStatus(body: unknown): StoredMeshStatus | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const status = b.status;
  if (typeof status !== 'string' || !STATES.includes(status as StoredMeshState)) return null;
  return {
    status: status as StoredMeshState,
    ...(typeof b.meshUrl === 'string' ? { meshUrl: b.meshUrl } : {}),
    ...(typeof b.error === 'string' ? { error: b.error } : {}),
  };
}

/**
 * Read the stored mesh status. Null when there is no API base, the server is
 * unreachable, or it answers something else (an older server without the
 * route): callers then keep their previous behaviour.
 */
export async function fetchStoredMeshStatus(
  apiBase: string | undefined,
  slug: string,
  version: number,
  opts: { retry?: boolean; signal?: AbortSignal } = {},
): Promise<StoredMeshStatus | null> {
  if (typeof apiBase !== 'string' || apiBase.length === 0) return null;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), STATUS_FETCH_MS) : undefined;
  const onAbort = () => controller?.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await fetch(storedMeshStatusUrl(apiBase, slug, version, opts.retry), {
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return null;
    return parseStatus(await res.json().catch(() => null));
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}
