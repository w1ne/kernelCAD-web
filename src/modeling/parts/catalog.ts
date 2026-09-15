// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/catalog.ts
//
// Bundled-tier catalog loader + resolver. Reads <catalogDir>/index.json
// (produced by scripts/generateSeedCatalog.ts), exposes id and query
// lookups. No network; this module is the offline-default surface.
//
// `assets/parts/` is gitignored and only appears after `npm run generate:parts`
// (or pretest). A committed seed at `assets/parts-seed/` covers example ids
// such as `iso-4762-m2x4` so Studio/evaluate do not fall through to the
// remote CDN, which uses different FreeCAD ids and 404s the seed id.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PartRecord } from '../../shared/parts/types';

export interface CatalogIndex {
  schemaVersion: 1;
  records: PartRecord[];
}

export interface Catalog {
  dir: string;
  records: PartRecord[];
  /** Directory that holds `<family>/<id>.step` for each record id. */
  stepDirById: Map<string, string>;
}

/**
 * Resolve the default bundled-catalog directory. In production this resolves
 * to <pkg-root>/assets/parts; in dev (running source out of the repo) it
 * walks up from this module until it finds an assets/parts directory.
 */
export function defaultCatalogDir(): string {
  return findAssetsDir('parts') ?? resolve(process.cwd(), 'assets', 'parts');
}

/**
 * Committed seed catalog used when `assets/parts/` has not been generated.
 * Walks up from this module the same way `defaultCatalogDir` does.
 */
export function bundledSeedDir(): string {
  return findAssetsDir('parts-seed') ?? resolve(process.cwd(), 'assets', 'parts-seed');
}

function findAssetsDir(leaf: string): string | undefined {
  let dir: string;
  try {
    dir = dirname(fileURLToPath(import.meta.url));
  } catch {
    dir = process.cwd();
  }
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, 'assets', leaf);
    if (existsSync(join(candidate, 'index.json'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export function loadCatalog(dir?: string): Catalog {
  if (dir !== undefined) return loadCatalogFromDir(dir);
  return mergeCatalogs(
    loadCatalogFromDir(defaultCatalogDir()),
    loadCatalogFromDir(bundledSeedDir()),
  );
}

function loadCatalogFromDir(dir: string): Catalog {
  const idxPath = join(dir, 'index.json');
  if (!existsSync(idxPath)) {
    return { dir, records: [], stepDirById: new Map() };
  }
  const json = JSON.parse(readFileSync(idxPath, 'utf8')) as CatalogIndex;
  if (json.schemaVersion !== 1) {
    throw new Error(
      `catalog: index.json schemaVersion ${String(json.schemaVersion)} unsupported`,
    );
  }
  const stepDirById = new Map(json.records.map((r) => [r.id, dir] as const));
  return { dir, records: json.records, stepDirById };
}

/** `primary` wins on id conflict so a generated catalog overrides the seed. */
function mergeCatalogs(primary: Catalog, fallback: Catalog): Catalog {
  const recordsById = new Map<string, PartRecord>();
  const stepDirById = new Map<string, string>();
  for (const r of fallback.records) {
    recordsById.set(r.id, r);
    stepDirById.set(r.id, fallback.stepDirById.get(r.id) ?? fallback.dir);
  }
  for (const r of primary.records) {
    recordsById.set(r.id, r);
    stepDirById.set(r.id, primary.stepDirById.get(r.id) ?? primary.dir);
  }
  return {
    dir: primary.dir,
    records: [...recordsById.values()],
    stepDirById,
  };
}

export function resolveById(
  cat: Catalog,
  id: string,
):
  | {
      record: PartRecord;
      stepPath: string;
    }
  | undefined {
  const record = cat.records.find((r) => r.id === id);
  if (!record) return undefined;
  const stepDir = cat.stepDirById.get(id) ?? cat.dir;
  const stepPath = join(stepDir, record.family, `${id}.step`);
  return { record, stepPath };
}

export interface QueryOpts {
  category?: string;
  family?: string;
  standard?: string;
  tag?: string;
  limit?: number;
}

export function queryCatalog(
  cat: Catalog,
  query: string | undefined,
  opts: QueryOpts = {},
): PartRecord[] {
  const tokens = (query ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const limit = opts.limit ?? 10;
  return cat.records
    .filter((r) => {
      if (opts.category && r.category !== opts.category) return false;
      if (opts.family && r.family !== opts.family) return false;
      if (
        opts.standard &&
        normalize(r.standard ?? '') !== normalize(opts.standard)
      ) {
        return false;
      }
      if (
        opts.tag &&
        !r.tags.map((t) => t.toLowerCase()).includes(opts.tag.toLowerCase())
      ) {
        return false;
      }
      if (tokens.length === 0) return true;
      const hay = recordHaystack(r).toLowerCase();
      return tokens.every((t) => hay.includes(t));
    })
    .slice(0, limit);
}

function normalize(s: string): string {
  return s.replace(/[\s-]+/g, '').toLowerCase();
}

function recordHaystack(r: PartRecord): string {
  return [
    r.id,
    r.name,
    r.category,
    r.family,
    r.standard ?? '',
    r.tags.join(' '),
    ...Object.entries(r.attributes).map(([k, v]) => `${k}:${v}`),
  ].join(' ');
}
