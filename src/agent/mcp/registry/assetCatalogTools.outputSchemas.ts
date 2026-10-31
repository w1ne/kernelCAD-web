// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Structured-output schemas of the asset tools: asset_manifest and the
// read-only asset catalog.
import type { JSONSchemaObject } from '../toolOutputSchemas';

/** Shortlisting row shared by the asset catalog tools. */
const ASSET_ROW_SCHEMA: JSONSchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, kit: { type: 'string' }, category: { type: 'string' },
    triangles: { type: 'integer' }, size_m: { type: 'array', items: { type: 'number' } }, origin: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } }, remixable: { type: 'boolean' },
    knobs: { type: 'array', items: { type: 'string' } }, palette: { type: 'array', items: { type: 'string' } },
    has_rig: { type: 'boolean' },
  },
  required: ['id', 'title', 'kit', 'category', 'triangles', 'size_m'],
  additionalProperties: true,
};

export const ASSET_CATALOG_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  search_assets: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      page: { type: 'integer' },
      rows: { type: 'array', items: ASSET_ROW_SCHEMA },
      coverage: { type: 'string', enum: ['none', 'poor', 'ok', 'filtered_out'] },
      unmatched_terms: { type: 'array', items: { type: 'string' } },
      matches_before_filters: { type: 'integer' },
      next: { type: 'string' },
    },
    required: ['total', 'rows', 'unmatched_terms', 'matches_before_filters'],
    additionalProperties: false,
  },
  get_asset: {
    type: 'object',
    properties: {
      id: { type: 'string' }, kit: { type: 'string' }, title: { type: 'string' }, category: { type: 'string' },
      params: { type: 'array', items: { type: 'object', additionalProperties: true } },
      presets: { type: 'object', additionalProperties: true },
      stats: { type: 'object', additionalProperties: true },
      palette: { type: 'array', items: { type: 'object', additionalProperties: true } },
      code: { type: 'string' },
      how_to_build: { type: 'string' },
    },
    required: ['id', 'kit', 'params', 'stats', 'code'],
    additionalProperties: true,
  },
  find_matching: {
    type: 'object',
    properties: { id: { type: 'string' }, rows: { type: 'array', items: ASSET_ROW_SCHEMA } },
    required: ['id', 'rows'],
    additionalProperties: false,
  },
  get_variant: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      want: { type: 'string' },
      params: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
      matched: { type: 'array', items: { type: 'object', additionalProperties: true } },
      unmatched: { type: 'array', items: { type: 'string' } },
      preset: { type: 'string' },
      code: { type: 'string' },
      how_to_build: { type: 'string' },
      note: { type: 'string' },
    },
    required: ['id', 'params', 'matched', 'unmatched', 'code'],
    additionalProperties: true,
  },
  list_kits: {
    type: 'object',
    properties: {
      kits: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, assets: { type: 'integer' } },
          required: ['id', 'title', 'assets'],
          additionalProperties: false,
        },
      },
    },
    required: ['kits'],
    additionalProperties: false,
  },
  get_kit: {
    type: 'object',
    properties: {
      id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
      assets: { type: 'array', items: { type: 'string' } },
      rows: { type: 'array', items: ASSET_ROW_SCHEMA },
    },
    required: ['id', 'title', 'assets', 'rows'],
    additionalProperties: false,
  },

  asset_manifest: {
    type: 'object',
    properties: {
      meta: {
        type: 'object',
        properties: {
          schemaVersion: { type: 'integer', const: 1 },
          name: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          license: { type: 'string', enum: ['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC0-1.0', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'MPL-2.0', 'Unlicense'] },
          authors: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          sourceUrl: { type: 'string' },
          kit: { type: 'string' },
          category: { type: 'string', enum: ['prop', 'furniture', 'building', 'structure', 'vehicle', 'nature', 'terrain', 'item', 'attachment', 'character', 'animal'] },
          origin: { type: 'string', enum: ['base', 'center', 'wall', 'ceiling'] },
          compat: { type: 'array', items: { type: 'string' } },
          triangleBudget: { type: 'integer' },
        },
        required: ['schemaVersion', 'license'],
        additionalProperties: false,
      },
      params: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
      presets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            schemaVersion: { type: 'integer', const: 1 },
            name: { type: 'string' },
            label: { type: 'string' },
            description: { type: 'string' },
            params: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
          },
          required: ['schemaVersion', 'name', 'params'],
          additionalProperties: false,
        },
      },
    },
    required: ['meta', 'params', 'presets'],
    additionalProperties: false,
  },
};
