// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/catalog/buildCatalog.ts
//
// Build the asset catalog index from `catalog/kits/<kit>/*.kcad.ts`: evaluate
// each source for its declared metadata, knobs and presets, export it as a
// low-poly GLB inside its triangle budget, and record what the file measures.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { runScript } from '../../composition/runScript';
import { runAndExport } from '../script-runtime/export';
import {
  CatalogAssetSchema,
  CatalogIndexSchema,
  CatalogKitFileSchema,
  type CatalogAsset,
  type CatalogIndex,
  type CatalogParam,
  type CatalogPaletteZone,
} from '../../shared/assets/catalogSchema';
import type { ParamEntry } from '../../shared/runtime/paramTable';
import type { AssetMetadata, AssetRig } from '../../shared/assets/assetSchema';

const ASSET_SUFFIX = '.kcad.ts';

interface GlbKernelcadExtras {
  stats: { triangles: number; sizeM: [number, number, number]; minUpM: number };
  palette?: Array<{ name: string; color: string; parts: string[] }>;
  rig?: AssetRig;
}

export class CatalogBuildError extends Error {}

/** Build every kit under `<repoRoot>/catalog/kits`. */
export async function buildCatalogIndex(repoRoot: string): Promise<CatalogIndex> {
  const kitsDir = join(repoRoot, 'catalog', 'kits');
  const kitIds = readdirSync(kitsDir).filter((name) => statSync(join(kitsDir, name)).isDirectory()).sort();
  const kits: CatalogIndex['kits'] = [];
  const assets: CatalogAsset[] = [];
  for (const kitId of kitIds) {
    const kitDir = join(kitsDir, kitId);
    const kitFile = CatalogKitFileSchema.parse(JSON.parse(readFileSync(join(kitDir, 'kit.json'), 'utf8')));
    const sources = readdirSync(kitDir).filter((name) => name.endsWith(ASSET_SUFFIX)).sort();
    const kitAssets: CatalogAsset[] = [];
    for (const file of sources) {
      kitAssets.push(await buildCatalogAsset(repoRoot, relative(repoRoot, join(kitDir, file))));
    }
    kits.push({ id: kitId, ...kitFile, assets: kitAssets.map((asset) => asset.id) });
    assets.push(...kitAssets);
  }
  const duplicate = assets.find((asset, index) => assets.findIndex((other) => other.id === asset.id) !== index);
  if (duplicate !== undefined) throw new CatalogBuildError(`duplicate catalog asset id '${duplicate.id}'.`);
  return CatalogIndexSchema.parse({ schemaVersion: 1, kits, assets });
}

/** Evaluate and export one catalog source (path relative to the repo root). */
export async function buildCatalogAsset(repoRoot: string, source: string): Promise<CatalogAsset> {
  const absolute = join(repoRoot, source);
  const code = readFileSync(absolute, 'utf8');
  const fileName = basename(source);
  const scriptDir = dirname(absolute);
  const id = fileName.slice(0, -ASSET_SUFFIX.length);
  const kit = basename(scriptDir);

  const run = await runScript({ code, fileName, scriptDir });
  const meta = requireCatalogMeta(source, run.session.assetMetadata, id, kit);
  const params = run.paramTable.list().map(catalogParam);
  const glb = await exportLowPoly(source, { code, fileName, scriptDir }, meta.triangleBudget);

  return CatalogAssetSchema.parse({
    id,
    kit,
    title: meta.title ?? id,
    description: meta.description ?? '',
    category: meta.category,
    origin: meta.origin ?? 'base',
    tags: meta.tags ?? [],
    compat: meta.compat ?? [],
    license: meta.license,
    source,
    sourceSha256: createHash('sha256').update(code).digest('hex'),
    triangleBudget: meta.triangleBudget,
    params,
    presets: run.session.assetPresets ?? {},
    ...(glb.extras.rig === undefined ? {} : { rig: glb.extras.rig }),
    stats: { ...glb.extras.stats, materials: glb.materials },
    palette: (glb.extras.palette ?? []).map((zone) => paletteZone(zone, params)),
  });
}

type CatalogMeta = AssetMetadata & { category: NonNullable<AssetMetadata['category']>; triangleBudget: number };

function requireCatalogMeta(source: string, meta: AssetMetadata | undefined, id: string, kit: string): CatalogMeta {
  const problems = meta === undefined
    ? ['declare meta({ ... }) with name, kit, category and triangleBudget']
    : [
      meta.name === id ? undefined : `meta.name '${String(meta.name)}' must equal the file name '${id}'`,
      meta.kit === kit ? undefined : `meta.kit '${String(meta.kit)}' must equal the kit folder '${kit}'`,
      meta.category === undefined ? 'meta.category is required' : undefined,
      meta.triangleBudget === undefined ? 'meta.triangleBudget is required' : undefined,
    ].filter((problem): problem is string => problem !== undefined);
  if (problems.length > 0) throw new CatalogBuildError(`${source}: ${problems.join('; ')}.`);
  return meta as CatalogMeta;
}

async function exportLowPoly(
  source: string,
  script: { code: string; fileName: string; scriptDir: string },
  maxTriangles: number,
): Promise<{ extras: GlbKernelcadExtras; materials: number }> {
  const exported = await runAndExport({
    ...script,
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles } },
  });
  const errors = exported.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0 || exported.bytes.byteLength === 0) {
    const detail = errors.map((d) => `${d.code}: ${d.message}`).join('; ') || 'no bytes';
    throw new CatalogBuildError(`${source}: low-poly GLB export failed: ${detail}`);
  }
  const gltf = readGlbJson(exported.bytes);
  const extras = gltf.asset?.extras?.kernelcad as GlbKernelcadExtras | undefined;
  if (extras === undefined) throw new CatalogBuildError(`${source}: GLB has no asset.extras.kernelcad block.`);
  return { extras, materials: gltf.materials?.length ?? 1 };
}

function catalogParam(entry: ParamEntry): CatalogParam {
  const meta = entry.meta ?? {};
  return {
    name: entry.name,
    type: entry.type,
    default: entry.defaultValue,
    ...(meta.label === undefined ? {} : { label: meta.label }),
    ...(meta.description === undefined ? {} : { description: meta.description }),
    ...(meta.unit === undefined ? {} : { unit: meta.unit }),
    ...(meta.min === undefined ? {} : { min: meta.min }),
    ...(meta.max === undefined ? {} : { max: meta.max }),
    ...(meta.step === undefined ? {} : { step: meta.step }),
    ...(meta.choices === undefined ? {} : { choices: [...meta.choices] }),
  };
}

/** Name a colour zone after the colour knob whose default produced it. */
function paletteZone(
  zone: { name: string; color: string; parts: string[] },
  params: readonly CatalogParam[],
): CatalogPaletteZone {
  const knob = params.find((param) => param.type === 'color' && String(param.default).toLowerCase() === zone.color);
  return knob === undefined
    ? { name: zone.name, color: zone.color, parts: zone.parts }
    : { name: knob.name, color: zone.color, parts: zone.parts, param: knob.name };
}

function readGlbJson(bytes: Uint8Array): {
  materials?: unknown[];
  asset?: { extras?: Record<string, unknown> };
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true))));
}

/** Canonical on-disk form of the index (stable key order, trailing newline). */
export function serializeCatalogIndex(index: CatalogIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}
