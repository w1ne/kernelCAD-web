// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

const AssetMetadataFields = {
  schemaVersion: z.literal(1).default(1),
  name: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(128).optional(),
  description: z.string().trim().max(4000).optional(),
  license: AssetLicenseSchema.default('CC-BY-4.0'),
  authors: z.array(z.string().trim().min(1).max(128)).max(32).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(64).optional(),
  sourceUrl: z.string().url().optional(),
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

const RigRangeSchema = z.tuple([z.number().finite(), z.number().finite()]);

export const AssetRigEntrySchema = z.object({
  type: z.enum(['rotate', 'slide']),
  axis: z.enum(['x', 'y', 'z']),
  range: RigRangeSchema,
  node: z.string().trim().min(1),
  closed: z.literal(true).optional(),
  degreesOfFreedom: z.tuple([z.literal('rotate'), z.literal('slide')]).optional(),
  slideRange: RigRangeSchema.optional(),
}).strict();

export const AssetRigSchema = z.record(z.string().trim().min(1), AssetRigEntrySchema);

/** Public read-only asset payload; nested records carry their schema versions. */
export const AssetManifestSchema = z.object({
  meta: AssetMetadataSchema,
  params: AssetParamsSchema,
  presets: z.array(AssetPresetSchema),
  rig: AssetRigSchema.optional(),
  rigWarnings: z.array(z.string()).optional(),
}).strict();

export type AssetMetadataInput = z.input<typeof AssetMetadataInputSchema>;
export type AssetMetadata = z.output<typeof AssetMetadataSchema>;
export type AssetParamValue = z.output<typeof AssetParamValueSchema>;
export type AssetPreset = z.output<typeof AssetPresetSchema>;
export type AssetPresets = z.output<typeof AssetPresetsSchema>;
export type AssetRig = z.output<typeof AssetRigSchema>;
export type AssetRigEntry = z.output<typeof AssetRigEntrySchema>;
export type AssetManifest = z.output<typeof AssetManifestSchema>;
