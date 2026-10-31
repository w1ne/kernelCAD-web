// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/catalog/catalogStore.ts
//
// Locate and load the committed asset catalog (`catalog/index.json` plus the
// `.kcad.ts` sources it names). Resolution: KERNELCAD_CATALOG_DIR, else walk
// up from this module (source tree, CLI bundle, or a vendored copy), else
// `<cwd>/catalog`.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogIndexSchema, type CatalogAsset, type CatalogIndex } from '../../shared/assets/catalogSchema';
import { setParamValue } from '../../modeling/edits/setParamValue';

let cached: { dir: string; index: CatalogIndex } | undefined;

export function catalogDir(): string {
  const fromEnv = process.env.KERNELCAD_CATALOG_DIR;
  if (fromEnv !== undefined && fromEnv !== '') return resolve(fromEnv);
  let dir: string;
  try {
    dir = dirname(fileURLToPath(import.meta.url));
  } catch {
    dir = process.cwd();
  }
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'catalog');
    if (existsSync(join(candidate, 'index.json'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(process.cwd(), 'catalog');
}

/** The parsed catalog index (cached per process; `reload` re-reads it). */
export function loadAssetCatalog(options: { reload?: boolean } = {}): { dir: string; index: CatalogIndex } {
  if (cached !== undefined && options.reload !== true) return cached;
  const dir = catalogDir();
  const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')));
  cached = { dir, index };
  return cached;
}

/** Source of one asset. Index paths are repo-relative (`catalog/kits/...`). */
export function readAssetSource(dir: string, asset: CatalogAsset): string {
  const relativeToCatalog = asset.source.replace(/^catalog\//, '');
  const path = resolve(dir, relativeToCatalog);
  if (!path.startsWith(resolve(dir) + sep)) throw new Error(`asset source escapes the catalog: ${asset.source}`);
  return readFileSync(path, 'utf8');
}

/** The asset's source with the given knob values written in as defaults. */
export function variantSource(code: string, params: Readonly<Record<string, string | number | boolean>>): string {
  let source = code;
  for (const [name, value] of Object.entries(params)) {
    const edited = setParamValue(source, name, value);
    if (!edited.ok || edited.new_code === undefined) throw new Error(edited.error ?? `could not set '${name}'.`);
    source = edited.new_code;
  }
  return source;
}
