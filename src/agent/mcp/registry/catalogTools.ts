// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { lookupCookbookTool } from '../tools/lookupCookbook';
import { findPartTool } from '../tools/findPart';
import { fetchPartTool } from '../tools/fetchPart';
import type { ToolRegistryEntry } from './types';

export const catalogToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'lookup_cookbook',
      description:
        'Use this when you need a canonical pattern snippet for a CAD task. ' +
        'Search the kernelCAD cookbook for canonical pattern snippets. ' +
        'Returns top-k snippets matching the natural-language query, ' +
        'ranked by BM25 over title/tags/keywords/trigger. ' +
        'Use when you need a canonical pattern for fillet-after-subtract, ' +
        'non-overlapping booleans, sketch-to-extrude flows, etc. ' +
        'Returns empty if no snippet scores above the relevance floor — ' +
        'proceed without cookbook help in that case.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural-language description of what you want to do (e.g. "round the rim of a hole", "build an L-bracket").',
          },
          k: {
            type: 'number',
            description: 'Max snippets to return. Default 3, max 5.',
            default: 3,
          },
        },
        required: ['query'],
      },
    },
    handler: input => lookupCookbookTool(input as unknown as Parameters<typeof lookupCookbookTool>[0]),
  },
  {
    definition: {
      name: 'find_part',
      description:
        'Use this when you need to find a part in the catalog. ' +
        'Discover bundled (and optionally remote) part-catalog records by fuzzy query and faceted filters. Tokens AND-combine; cross-facet filters AND-combine. Pass partsBaseUrl (or set KERNELCAD_PARTS_BASE_URL) to enable the remote tier; otherwise results are bundled-only.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string' },
          family: { type: 'string' },
          standard: { type: 'string' },
          tag: { type: 'string' },
          limit: { type: 'number' },
          source: { type: 'string', enum: ['local', 'remote', 'auto'] },
          partsBaseUrl: { type: 'string', description: 'Opt-in remote endpoint; no default value ships with kernelCAD.' },
        },
      },
    },
    handler: input => findPartTool(input as Parameters<typeof findPartTool>[0]),
  },
  {
    definition: {
      name: 'fetch_part',
      description:
        'Use this when you need to download a catalog part as a STEP file. ' +
        'Resolve an id (or single-match query) to a part record and write its STEP file to the local cache. Bundled ids resolve offline; non-bundled ids require partsBaseUrl (or KERNELCAD_PARTS_BASE_URL). Returns the cache path plus a sha256 fingerprint.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          query: { type: 'string' },
          category: { type: 'string' },
          family: { type: 'string' },
          standard: { type: 'string' },
          partsBaseUrl: { type: 'string', description: 'Opt-in remote endpoint; no default value ships with kernelCAD.' },
        },
      },
    },
    handler: input => fetchPartTool(input as Parameters<typeof fetchPartTool>[0]),
  },
];
