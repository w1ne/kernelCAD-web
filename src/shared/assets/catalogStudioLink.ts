// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CatalogIndexSchema, type CatalogAsset, type CatalogIndex } from './catalogSchema';

/**
 * Open a catalog asset in Studio: `/studio?catalog=<kit>/<id>`. The value
 * names one row of `catalog/index.json`; the loader resolves it to the row's
 * `.kcad.ts` source (checked against `sourceSha256`) so Studio can seed the
 * workbench exactly as it does for `?gallery=<slug>`. Knobs come from
 * evaluating that source, the same as any other script.
 */
export const CATALOG_STUDIO_PARAM = 'catalog';

export interface CatalogRef {
  kit: string;
  id: string;
}

export class CatalogRefError extends Error {}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Parse a `?catalog=` value (`<kit>/<id>`); null when it is not one. */
export function parseCatalogRef(value: string | null | undefined): CatalogRef | null {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split('/');
  if (parts.length !== 2) return null;
  const [kit, id] = parts as [string, string];
  return SLUG.test(kit) && SLUG.test(id) ? { kit, id } : null;
}

/** The catalog row a ref names. Throws when the kit or the asset is unknown. */
export function resolveCatalogRef(index: CatalogIndex, ref: CatalogRef): CatalogAsset {
  const kit = index.kits.find((candidate) => candidate.id === ref.kit);
  if (kit === undefined) {
    throw new CatalogRefError(`Catalog kit not found: ${ref.kit}. Kits: ${index.kits.map((k) => k.id).join(', ')}.`);
  }
  const asset = index.assets.find((candidate) => candidate.kit === ref.kit && candidate.id === ref.id);
  if (asset === undefined) {
    throw new CatalogRefError(`Catalog asset not found: ${ref.kit}/${ref.id}. Kit ${ref.kit} has: ${kit.assets.join(', ')}.`);
  }
  return asset;
}

/** Studio path that opens `asset` (the `/` stays readable in the query). */
export function catalogStudioPath(asset: Pick<CatalogAsset, 'kit' | 'id'>, studioPath = '/studio'): string {
  return `${studioPath}?${CATALOG_STUDIO_PARAM}=${encodeURIComponent(asset.kit)}/${encodeURIComponent(asset.id)}`;
}

/**
 * URL of a catalog file, given where the repo's `catalog/` directory is
 * served (`catalogBase`, e.g. `/catalog` or `https://cdn.example/catalog`).
 * Index rows store `source` relative to the repo root (`catalog/kits/...`).
 */
export function catalogFileUrl(catalogBase: string, repoRelativePath: string): string {
  const base = catalogBase.replace(/\/+$/, '');
  const path = repoRelativePath.replace(/^catalog\//, '');
  return `${base}/${path}`;
}

/** Reads a URL as text; the host passes `fetch` (browser) or a file reader (tests, CLI). */
export type CatalogTextFetcher = (url: string) => Promise<string>;

export interface LoadedCatalogAsset {
  asset: CatalogAsset;
  source: string;
  title: string;
}

/**
 * Resolve `?catalog=<kit>/<id>` to its source: read `<catalogBase>/index.json`,
 * find the row, read its `.kcad.ts` and check it against `sourceSha256` so a
 * stale index never opens the wrong program under the asset's name.
 */
export async function loadCatalogAsset(
  value: string,
  catalogBase: string,
  fetchText: CatalogTextFetcher,
): Promise<LoadedCatalogAsset> {
  const ref = parseCatalogRef(value);
  if (ref === null) throw new CatalogRefError(`Not a catalog asset reference: '${value}'. Expected <kit>/<id>, e.g. nature/pine-tree.`);
  const index = CatalogIndexSchema.parse(JSON.parse(await fetchText(catalogFileUrl(catalogBase, 'catalog/index.json'))));
  const asset = resolveCatalogRef(index, ref);
  const source = await fetchText(catalogFileUrl(catalogBase, asset.source));
  const sha = await sha256Hex(source);
  if (sha !== asset.sourceSha256) {
    throw new CatalogRefError(`Catalog source for ${ref.kit}/${ref.id} does not match the index (sha256 ${sha}); rebuild catalog/index.json.`);
  }
  return { asset, source, title: asset.title };
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
