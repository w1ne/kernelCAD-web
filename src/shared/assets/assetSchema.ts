// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Asset content metadata: the shape `meta({ ... })` accepts inside a
// `.kcad.ts` catalog asset, and the presets `presets({ ... })` declares.
//
// This module lives in the kernel (not in the catalog build tooling) because
// the SAME call is executed by the script itself: the browser/Studio runtime
// injects `meta` and `presets` as globals alongside `box`, `param`, … so a
// published asset loads through exactly one code path. The catalog build
// (`src/agent/catalog/buildCatalog.ts`) then reads the captured values off the
// session instead of re-parsing the source text.
import { z } from 'zod';

/** Asset-content licences are separate from the MIT licence of this package. */
export const ASSET_LICENSE_IDS = [
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC-BY-NC-4.0',
  'CC-BY-NC-SA-4.0',
  'CC0-1.0',
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'MPL-2.0',
  'Unlicense',
] as const;

export const AssetLicenseSchema = z.enum(ASSET_LICENSE_IDS);

/** Catalog shelves for game/scene assets. */
export const ASSET_CATEGORIES = [
  'prop',
  'furniture',
  'building',
  'structure',
  'vehicle',
  'nature',
  'terrain',
  'item',
  'attachment',
  'character',
  'animal',
] as const;

/** Where the model's origin sits, so a placer knows what y = 0 means.
 *  `base`: bottom centre on the ground (default). `center`: bounding-box
 *  centre. `wall`/`ceiling`: the mounting face, built at installed height. */
export const ASSET_ORIGINS = ['base', 'center', 'wall', 'ceiling'] as const;

const slug = z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase-kebab-case');

export const AssetMetadataFields = {
  schemaVersion: z.literal(1).default(1),
  name: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(128).optional(),
  description: z.string().trim().max(4000).optional(),
  license: AssetLicenseSchema.default('CC-BY-4.0'),
  authors: z.array(z.string().trim().min(1).max(128)).max(32).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(64).optional(),
  sourceUrl: z.string().url().optional(),
  /** Catalog kit (themed set built to one palette and scale) this asset belongs to. */
  kit: slug.optional(),
  category: z.enum(ASSET_CATEGORIES).optional(),
  origin: z.enum(ASSET_ORIGINS).optional(),
  /** Matching tags beyond the kit: shared grids, styles, settings (e.g. `grid-1m`, `street`). */
  compat: z.array(slug).max(32).optional(),
  /** Low-poly GLB triangle budget the catalog build enforces for this asset. */
  triangleBudget: z.number().int().positive().max(1_000_000).optional(),
};

export const AssetMetadataSchema = z.object(AssetMetadataFields).strict();
export const AssetMetadataInputSchema = AssetMetadataSchema.omit({ schemaVersion: true });

export const AssetParamValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export const AssetParamsSchema = z.record(z.string(), AssetParamValueSchema);

export const AssetPresetSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().trim().min(1).max(128),
  label: z.string().trim().min(1).max(128).optional(),
  description: z.string().trim().max(1000).optional(),
  params: AssetParamsSchema,
}).strict();

/** Input form: preset name -> parameter overrides. */
export const AssetPresetsSchema = z.record(z.string().trim().min(1).max(128), AssetParamsSchema);

/** Public read-only asset payload; nested records carry their schema versions. */
export const AssetManifestSchema = z.object({
  meta: AssetMetadataSchema,
  params: AssetParamsSchema,
  presets: z.array(AssetPresetSchema),
}).strict();

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type AssetOrigin = (typeof ASSET_ORIGINS)[number];
export type AssetMetadataInput = z.input<typeof AssetMetadataInputSchema>;
export type AssetMetadata = z.output<typeof AssetMetadataSchema>;
export type AssetParamValue = z.output<typeof AssetParamValueSchema>;
export type AssetPreset = z.output<typeof AssetPresetSchema>;
export type AssetPresets = z.output<typeof AssetPresetsSchema>;
export type AssetManifest = z.output<typeof AssetManifestSchema>;
