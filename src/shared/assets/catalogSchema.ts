// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';
import {
  ASSET_CATEGORIES,
  ASSET_ORIGINS,
  AssetLicenseSchema,
  AssetParamsSchema,
  AssetRigSchema,
} from './assetSchema';

/**
 * The asset catalog index: one row per parametric `.kcad.ts` asset under
 * `catalog/kits/<kit>/`, built by `scripts/buildAssetCatalog.ts` from the
 * evaluated source and its measured low-poly GLB. Rows describe the DEFAULT
 * knob settings; a variant is the same source with different knob values.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const CatalogParamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['number', 'boolean', 'choice', 'string', 'color']),
  default: z.union([z.string(), z.number(), z.boolean()]),
  label: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  choices: z.array(z.string()).optional(),
}).strict();

export const CatalogPaletteZoneSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
  parts: z.array(z.string()),
  /** Colour knob whose default is this zone's colour, when one exists. */
  param: z.string().optional(),
}).strict();

export const CatalogStatsSchema = z.object({
  triangles: z.number().int().nonnegative(),
  /** Bounding-box size in metres, Y up (x, y, z). */
  sizeM: z.tuple([z.number(), z.number(), z.number()]),
  /** Lowest point in metres; 0 means the asset stands on its origin. */
  minUpM: z.number(),
  /** Materials in the low-poly GLB (1 = merges into one draw call). */
  materials: z.number().int().positive(),
}).strict();

export const CatalogAssetSchema = z.object({
  id: slug,
  kit: slug,
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.enum(ASSET_CATEGORIES),
  origin: z.enum(ASSET_ORIGINS),
  tags: z.array(z.string()),
  compat: z.array(slug),
  license: AssetLicenseSchema,
  source: z.string().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/),
  triangleBudget: z.number().int().positive(),
  params: z.array(CatalogParamSchema),
  presets: z.record(z.string(), AssetParamsSchema),
  rig: AssetRigSchema.optional(),
  stats: CatalogStatsSchema,
  palette: z.array(CatalogPaletteZoneSchema),
}).strict();

export const CatalogKitSchema = z.object({
  id: slug,
  title: z.string().min(1),
  description: z.string().default(''),
  /** Asset ids in this kit, sorted. */
  assets: z.array(slug),
}).strict();

export const CatalogIndexSchema = z.object({
  schemaVersion: z.literal(1),
  kits: z.array(CatalogKitSchema),
  assets: z.array(CatalogAssetSchema),
}).strict();

/** `catalog/kits/<kit>/kit.json`. */
export const CatalogKitFileSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
}).strict();

export type CatalogParam = z.output<typeof CatalogParamSchema>;
export type CatalogPaletteZone = z.output<typeof CatalogPaletteZoneSchema>;
export type CatalogAsset = z.output<typeof CatalogAssetSchema>;
export type CatalogKit = z.output<typeof CatalogKitSchema>;
export type CatalogIndex = z.output<typeof CatalogIndexSchema>;
