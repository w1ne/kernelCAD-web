// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
  findMatchingTool,
  getAssetTool,
  getKitTool,
  getVariantTool,
  listKitsTool,
  searchAssetsTool,
} from '../tools/assetCatalog';
import { ASSET_CATEGORIES } from '../../../shared/assets/assetSchema';
import type { ToolRegistryEntry } from './types';

const ROW_NOTE =
  'Rows: id, title, kit, category, triangles (low-poly GLB at default knobs), size_m [x, y, z] in metres (Y up), '
  + 'origin (base = bottom centre on y 0), tags, remixable, knobs, palette (hex colours), has_rig.';

export const assetCatalogToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'search_assets',
      description:
        'Use this when a game, three.js scene or 3D page needs a ready low-poly model (tree, bench, lamp, crate, building piece) '
        + 'instead of modelling it from scratch. Searches the kernelCAD asset catalog: original parametric .kcad.ts programs '
        + 'that export as flat-shaded GLB at real-world scale with one shared material. Filter by kit, category or a triangle '
        + `budget for mobile. ${ROW_NOTE} `
        + 'When q or a filter is given, coverage says how far to trust the answer: none (nothing answers: say so, do not '
        + 'substitute something unrelated), poor (unmatched_terms lists the words nothing answers), filtered_out (the catalog '
        + 'has it; relax a filter), ok.',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Plain words, e.g. "pine tree", "park bench".' },
          kit: { type: 'string', description: 'Kit id from list_kits.' },
          category: { type: 'string', enum: [...ASSET_CATEGORIES] },
          max_triangles: { type: 'number', description: 'Only assets at or under this triangle count.' },
          min_triangles: { type: 'number' },
          sort: { type: 'string', enum: ['relevance', 'triangles'], default: 'relevance' },
          limit: { type: 'number', description: 'Rows per page, 1-100 (default 20).' },
          page: { type: 'number', description: '1-based page (default 1).' },
        },
      },
    },
    handler: async (input) => searchAssetsTool(input),
  },
  {
    definition: {
      name: 'get_asset',
      description:
        'Use this when you have picked a catalog asset and need everything to use or change it: knobs (type, default, '
        + 'range or choices, label), presets, rig, measured triangles and size in metres, palette zones named after their '
        + 'colour knob, licence, and the full .kcad.ts source (`code`) to export or edit.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Asset id from search_assets.' } },
        required: ['id'],
      },
    },
    handler: async (input) => getAssetTool(input),
  },
  {
    definition: {
      name: 'find_matching',
      description:
        'Use this when one picked asset should become a scene: returns assets that belong with it, same kit first, then '
        + 'shared compat tags (e.g. outdoor), a shared palette colour and compatible real-world scale, spread across '
        + `categories so a tree brings a rock and a bench rather than more trees. Each row adds score and reasons. ${ROW_NOTE}`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Anchor asset id.' },
          limit: { type: 'number', description: '1-50 (default 12).' },
          max_triangles: { type: 'number' },
        },
        required: ['id'],
      },
    },
    handler: async (input) => findMatchingTool(input),
  },
  {
    definition: {
      name: 'get_variant',
      description:
        'Use this when the user describes a variant in plain words ("taller, red foliage, five tiers", "autumn", '
        + '"bark #333333", "with snow"). Matches the words against this asset\'s knob names, option values, presets, '
        + '#hex or basic colour words before a colour knob, with/without for toggles, and taller/shorter/more/fewer for '
        + 'size and count knobs. Returns the knob values, what matched, the words that did not (never guessed), and the '
        + 'variant .kcad.ts source (`code`) with those values written in, ready to export.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Asset id.' },
          want: { type: 'string', description: 'Plain words describing the variant.' },
        },
        required: ['id', 'want'],
      },
    },
    handler: async (input) => getVariantTool(input),
  },
  {
    definition: {
      name: 'list_kits',
      description:
        'Use this when the user is building a whole environment rather than looking for one object: lists the asset '
        + 'kits (themed sets built to one palette and real-world scale) with their asset counts.',
      inputSchema: { type: 'object', properties: {} },
    },
    handler: async () => listKitsTool(),
  },
  {
    definition: {
      name: 'get_kit',
      description: `Use this when you have chosen a kit and want every asset in it as shortlisting rows in one call. ${ROW_NOTE}`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Kit id from list_kits.' } },
        required: ['id'],
      },
    },
    handler: async (input) => getKitTool(input),
  },
];
