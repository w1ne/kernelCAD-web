// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Which generation holds each file that generated code imports.
//
// A run with an attached STL returns code like
// `lib.fromSTL('./inputs/<sha12>.stl')` and lists that path in the `done`
// event's `assets`. The file lives on the server, recorded on the generation.
// Until the model is saved, every server call that needs the file names the
// generation: the mesh request (`generationIds`) and the save
// (`generationId` / `assetGenerationIds`). The server checks the caller owns
// each generation, so these ids grant nothing on their own.
//
// A follow-up edit run records no attachment of its own, so a path keeps the
// generation that first returned it.
import { getSupabase, isAuthConfigured } from './supabaseClient';

/** Most ids one request may name (the server's limit). */
export const MAX_ASSET_GENERATIONS = 8;

/** Project-relative path (`inputs/<sha12>.stl`) → generation id. */
const generationByPath = new Map<string, string>();

const IMPORT_RE = /\b(?:lib\.from(?:STEP|STL|BREP|DXF|SVG)|referenceImage|fontPath)\s*\(\s*(['"])\.\/([^'"]+)\1/g;

/** Source-relative files `source` imports, without the leading `./`. */
export function importedAssetPaths(source: string): string[] {
  const paths = new Set<string>();
  for (const match of source.matchAll(IMPORT_RE)) paths.add(match[2]!.replaceAll('\\', '/'));
  return [...paths];
}

/** Record that `generationId` holds these files (the `done` event's asset paths). */
export function rememberGenerationAssets(generationId: string, paths: Iterable<string>): void {
  if (!generationId) return;
  for (const raw of paths) {
    const path = raw.replace(/^\.\//, '');
    if (path && !generationByPath.has(path)) generationByPath.set(path, generationId);
  }
}

/** The generations holding the files `source` imports, at most
 *  MAX_ASSET_GENERATIONS. Empty when it imports none of them. */
export function generationIdsForSource(source: string): string[] {
  const ids = new Set<string>();
  for (const path of importedAssetPaths(source)) {
    const id = generationByPath.get(path);
    if (id) ids.add(id);
  }
  return [...ids].slice(0, MAX_ASSET_GENERATIONS);
}

/** Tests share one module instance. */
export function clearGenerationAssets(): void {
  generationByPath.clear();
}

/** `Authorization` header for the signed-in user, or none. */
export async function bearerAuthHeader(): Promise<Record<string, string>> {
  try {
    if (!isAuthConfigured()) return {};
    const { data: { session } } = await getSupabase().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}
