// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export type EmbedPresentation = 'viewer' | 'studio';

/** The plain embed stays the compatibility default; Studio is opt-in per host. */
export function embedPresentationMode(value: unknown): EmbedPresentation {
  return value === 'studio' ? 'studio' : 'viewer';
}

/**
 * `undefined` means no requested revision (the compatible live model). `null`
 * means a malformed requested revision, which the embed must fail closed.
 */
export function embedRevision(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  const raw = typeof value === 'number' ? String(value) : value;
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) return null;
  const revision = Number(raw);
  return Number.isSafeInteger(revision) ? revision : null;
}

export interface EmbedCodeLoaders {
  loadCurrent: () => Promise<string | null>;
  loadRevision: (revision: number) => Promise<string>;
}

/**
 * Resolves the source code an embed is allowed to render. Explicit revisions
 * never fall back to the mutable current project after a failed read.
 */
export async function loadEmbedCode(
  revision: number | null | undefined,
  loaders: EmbedCodeLoaders,
): Promise<string | null> {
  if (revision === null) return null;
  if (revision === undefined) return loaders.loadCurrent();
  try {
    return await loaders.loadRevision(revision);
  } catch {
    return null;
  }
}

const GEOMETRY_HASH_MESH_PATH = /\/mesh-artifacts\/g\/[a-f0-9]+\.json$/i;

/**
 * Pre-#147 tool results advertised geometry-hash CDN URLs. Those JSON bodies
 * stamp `revision` from the *first* persist, so a later open_in_studio revision
 * fails FunnelViewer with "Mesh revision N does not match requested revision M".
 * Rewrite to the revision-pinned object the server now always writes.
 */
export function revisionPinnedMeshUrl(
  meshUrl: string | undefined,
  slug: string,
  revision: number | null | undefined,
): string | undefined {
  if (!meshUrl || typeof revision !== 'number' || revision < 1 || !slug) return meshUrl;
  let parsed: URL;
  try {
    parsed = new URL(meshUrl);
  } catch {
    return meshUrl;
  }
  if (!GEOMETRY_HASH_MESH_PATH.test(parsed.pathname)) return meshUrl;
  parsed.pathname = `/mesh-artifacts/${encodeURIComponent(slug)}/v${revision}.json`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}
