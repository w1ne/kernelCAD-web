// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Deterministic asset-pack zip: source (when the licence allows it), a GLB,
// params JSON, README, licence, a three.js viewer and a sha256 manifest.

import { createHash } from 'node:crypto';
import { zipSync, type Zippable } from 'fflate';
import { KERNELCAD_NAME } from '../../../shared/links/attribution';
import { emitParamsJson } from '../../../shared/assets/emitParamsJson';
import type { ParamValue } from '../../../shared/runtime/paramTable';
import type { GlbStats } from '../lowPolyGlb';
import { renderAssetPackDemoHtml } from './demoHtmlTemplate';
import { licenseAllowsSource, renderAssetPackLicense } from './licenseText';
import { renderAssetPackReadme } from './readmeTemplate';

const ZIP_MTIME = new Date('2020-01-01T00:00:00Z');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EMPTY_STATS: GlbStats = {
  triangles: 0,
  sizeM: [0, 0, 0],
  minUpM: 0,
  materials: 0,
  drawCalls: 0,
  parts: 0,
  hasRig: false,
  hasIk: false,
};

export interface AssetPackParam {
  readonly name: string;
  readonly type: string;
  readonly defaultValue: ParamValue;
  readonly value?: ParamValue;
  readonly min?: number;
  readonly max?: number;
  readonly choices?: readonly string[];
  readonly description?: string;
}

export interface AssetPackPreset {
  readonly name: string;
  readonly params: Readonly<Record<string, ParamValue>>;
}

export interface AssetPackMeta {
  readonly id?: string;
  readonly name?: string;
  readonly title?: string;
  readonly description?: string;
  readonly license?: string;
  readonly authors?: readonly string[];
}

/** Evaluated asset the pack writer turns into a zip. The GLB is already encoded. */
export interface AssetPackModel {
  readonly id?: string;
  readonly fileName?: string;
  readonly source?: string;
  readonly glb: Uint8Array;
  readonly params: readonly AssetPackParam[];
  readonly presets?: readonly AssetPackPreset[];
  readonly meta?: AssetPackMeta;
  readonly stats?: GlbStats;
  readonly rig?: Readonly<Record<string, unknown>>;
}

export interface AssetPackOptions {
  readonly generatorVersion: string;
  /** Copyright year stamped into LICENSE.txt. Defaults to the current UTC year. */
  readonly year?: number;
}

/** Build a deterministic asset-pack zip. Two calls with the same input match byte for byte. */
export function buildAssetPack(evaluated: AssetPackModel, opts: AssetPackOptions): Uint8Array {
  const id = resolveAssetPackId(evaluated);
  const year = opts.year ?? new Date().getUTCFullYear();
  const files = packFiles(evaluated, id, year);
  files['manifest.json'] = utf8(manifestDocument(files, opts.generatorVersion));
  return zipEntries(files);
}

export function resolveAssetPackId(model: Pick<AssetPackModel, 'id' | 'fileName' | 'meta'>): string {
  return slugOf(model.meta?.id)
    ?? slugOf(model.id)
    ?? slugOf(model.meta?.name)
    ?? slugOf(model.fileName)
    ?? 'asset';
}

function packFiles(model: AssetPackModel, id: string, year: number): Record<string, Uint8Array> {
  const source = sourceEntry(model, id);
  const files: Record<string, Uint8Array> = {
    [`${id}.glb`]: model.glb,
    [`${id}.params.json`]: utf8(paramsDocument(model)),
    'README.md': utf8(renderAssetPackReadme({
      id,
      model,
      stats: model.stats ?? EMPTY_STATS,
      sourceNote: source.note,
    })),
    'LICENSE.txt': utf8(renderAssetPackLicense({
      license: model.meta?.license,
      authors: model.meta?.authors,
      year,
    })),
    'index.html': utf8(renderAssetPackDemoHtml(id)),
  };
  if (source.name !== undefined && model.source !== undefined) files[source.name] = utf8(model.source);
  return files;
}

function sourceEntry(model: AssetPackModel, id: string): { name?: string; note: string } {
  if (model.source === undefined || model.source.length === 0) {
    return { note: 'The parametric source was not available, so this pack does not include a .kcad.ts file.' };
  }
  if (!licenseAllowsSource(model.meta?.license)) {
    return { note: 'The declared licence does not permit redistributing the source, so this pack does not include a .kcad.ts file.' };
  }
  return { name: `${id}.kcad.ts`, note: `The parametric source is \`${id}.kcad.ts\`.` };
}

function paramsDocument(model: AssetPackModel): string {
  const entries = model.params.map((param) => ({
    name: param.name,
    value: param.value ?? param.defaultValue,
    defaultValue: param.defaultValue,
  }));
  return emitParamsJson(entries, model.rig === undefined ? undefined : { rig: model.rig });
}

function manifestDocument(files: Readonly<Record<string, Uint8Array>>, generatorVersion: string): string {
  const hashed: Record<string, string> = {};
  for (const name of Object.keys(files).sort()) hashed[name] = sha256(files[name]!);
  return `${JSON.stringify({ generator: KERNELCAD_NAME, generatorVersion, files: hashed }, null, 2)}\n`;
}

function zipEntries(files: Readonly<Record<string, Uint8Array>>): Uint8Array {
  const archive: Zippable = {};
  for (const name of Object.keys(files).sort()) {
    archive[name] = [files[name]!, { level: 9, mtime: ZIP_MTIME, os: 0 }];
  }
  return zipSync(archive);
}

function slugOf(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim().replace(/\.kcad\.ts$/i, '');
  if (SLUG.test(trimmed) && trimmed.length <= 64) return trimmed;
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '');
  return SLUG.test(slug) ? slug : undefined;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}
