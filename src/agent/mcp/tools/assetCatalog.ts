// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/assetCatalog.ts
//
// Read-only MCP tools over the bundled asset catalog: search_assets,
// get_asset, find_matching, get_variant, list_kits, get_kit. Every asset is
// an original parametric `.kcad.ts` program; the rows describe its default
// knob settings and its measured low-poly GLB.

import type { CatalogAsset } from '../../../shared/assets/catalogSchema';
import { ASSET_CATEGORIES, type AssetCategory } from '../../../shared/assets/assetSchema';
import { findMatching, resolveVariant, searchCatalog } from '../../../shared/assets/catalogSearch';
import { loadAssetCatalog, readAssetSource, variantSource } from '../../catalog/catalogStore';

/** Shortlisting row: what an agent needs to pick, without the full knob schema. */
export interface AssetRow {
  id: string;
  title: string;
  kit: string;
  category: string;
  triangles: number;
  size_m: [number, number, number];
  origin: string;
  tags: string[];
  remixable: boolean;
  knobs: string[];
  palette: string[];
  has_rig: boolean;
}

export function assetRow(asset: CatalogAsset): AssetRow {
  return {
    id: asset.id,
    title: asset.title,
    kit: asset.kit,
    category: asset.category,
    triangles: asset.stats.triangles,
    size_m: asset.stats.sizeM,
    origin: asset.origin,
    tags: asset.tags,
    remixable: asset.params.length > 0,
    knobs: asset.params.map((param) => param.name),
    palette: asset.palette.map((zone) => zone.color),
    has_rig: asset.rig !== undefined && Object.keys(asset.rig).length > 0,
  };
}

const LOWPOLY_EXPORT_HINT =
  "Build it: export({ code, format: 'glb', output_path, options: { format: 'glb', style: 'lowpoly' } }) " +
  '(metres, Y up, one shared vertex-coloured material). Change knobs with set_param or get_variant first.';

function optionalNumber(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${name} must be a number.`);
  return value;
}

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
  return value;
}

function requireAsset(id: unknown): { asset: CatalogAsset; dir: string } {
  if (typeof id !== 'string' || id === '') throw new Error('id is required.');
  const { dir, index } = loadAssetCatalog();
  const asset = index.assets.find((row) => row.id === id);
  if (asset === undefined) {
    throw new Error(`unknown asset '${id}'. Call search_assets to find ids.`);
  }
  return { asset, dir };
}

export function searchAssetsTool(input: Record<string, unknown>) {
  const { index } = loadAssetCatalog();
  const category = optionalString(input.category, 'category');
  if (category !== undefined && !(ASSET_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error(`category must be one of ${ASSET_CATEGORIES.join(', ')}.`);
  }
  const limit = Math.min(Math.max(optionalNumber(input.limit, 'limit') ?? 20, 1), 100);
  const page = Math.max(optionalNumber(input.page, 'page') ?? 1, 1);
  const sort = optionalString(input.sort, 'sort');
  const result = searchCatalog(index, {
    q: optionalString(input.q, 'q'),
    kit: optionalString(input.kit, 'kit'),
    category: category as AssetCategory | undefined,
    maxTriangles: optionalNumber(input.max_triangles, 'max_triangles'),
    minTriangles: optionalNumber(input.min_triangles, 'min_triangles'),
    sort: sort === 'triangles' ? 'triangles' : 'relevance',
    limit,
    offset: (page - 1) * limit,
  });
  return {
    total: result.total,
    page,
    rows: result.rows.map(assetRow),
    ...(result.coverage === undefined ? {} : { coverage: result.coverage }),
    unmatched_terms: result.unmatchedTerms,
    matches_before_filters: result.matchesBeforeFilters,
    ...(result.coverage === undefined ? {} : { next: coverageAdvice(result.coverage) }),
  };
}

function coverageAdvice(coverage: string): string {
  switch (coverage) {
    case 'none':
      return 'Nothing in the catalog answers this. Say so rather than substituting something unrelated; '
        + 'author the object as a new .kcad.ts asset instead (meta({ kit, category, triangleBudget }), '
        + "polygon profiles, export style 'lowpoly').";
    case 'poor':
      return 'Only part of the request is covered (see unmatched_terms). Tell the user what is and is not there.';
    case 'filtered_out':
      return 'The catalog has matches but the filters removed them (matches_before_filters); relax a filter.';
    default:
      return 'Pick by triangles and size_m; get_asset gives knobs, presets, palette and source.';
  }
}

export function getAssetTool(input: Record<string, unknown>) {
  const { asset, dir } = requireAsset(input.id);
  return { ...asset, code: readAssetSource(dir, asset), how_to_build: LOWPOLY_EXPORT_HINT };
}

export function findMatchingTool(input: Record<string, unknown>) {
  const { index } = loadAssetCatalog();
  const id = typeof input.id === 'string' ? input.id : '';
  const rows = findMatching(index, id, {
    limit: Math.min(Math.max(optionalNumber(input.limit, 'limit') ?? 12, 1), 50),
    maxTriangles: optionalNumber(input.max_triangles, 'max_triangles'),
  });
  if (rows === undefined) throw new Error(`unknown asset '${id}'. Call search_assets to find ids.`);
  return { id, rows: rows.map((row) => ({ ...assetRow(row.asset), score: row.score, reasons: row.reasons })) };
}

export function getVariantTool(input: Record<string, unknown>) {
  const { asset, dir } = requireAsset(input.id);
  const want = optionalString(input.want, 'want') ?? '';
  const resolved = resolveVariant(asset, want);
  const knobs = { ...(resolved.preset === undefined ? {} : asset.presets[resolved.preset]), ...resolved.params };
  return {
    id: asset.id,
    want,
    params: knobs,
    matched: resolved.matched,
    unmatched: resolved.unmatched,
    ...(resolved.preset === undefined ? {} : { preset: resolved.preset }),
    code: variantSource(readAssetSource(dir, asset), knobs),
    how_to_build: LOWPOLY_EXPORT_HINT,
    ...(resolved.unmatched.length > 0
      ? { note: `Words with no matching knob, option, preset or colour: ${resolved.unmatched.join(', ')}. Knobs: ${asset.params.map((p) => p.name).join(', ')}.` }
      : {}),
  };
}

export function listKitsTool() {
  const { index } = loadAssetCatalog();
  return {
    kits: index.kits.map((kit) => ({
      id: kit.id,
      title: kit.title,
      description: kit.description,
      assets: kit.assets.length,
    })),
  };
}

export function getKitTool(input: Record<string, unknown>) {
  const { index } = loadAssetCatalog();
  const kit = index.kits.find((row) => row.id === input.id);
  if (kit === undefined) throw new Error(`unknown kit '${String(input.id)}'. Call list_kits.`);
  const rows = index.assets.filter((asset) => asset.kit === kit.id).map(assetRow);
  return { ...kit, rows };
}
