// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { lookupCookbookTool } from '../tools/lookupCookbook';
import { findPartTool } from '../tools/findPart';
import { fetchPartTool } from '../tools/fetchPart';
import { fetchPartModelTool, type FetchPartModelInput } from '../tools/fetchPartModel';
import type { ToolRegistryEntry } from './types';

interface FetchPartModelRequest {
  url?: string; sha256?: string; source?: string; license?: string; attribution?: string;
  expectedBboxMm?: number[]; toleranceRatio?: number;
}

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
              'Natural-language description of what you want to do (e.g. "round the rim of a hole", "build an L-bracket"). One of query / id is required.',
          },
          id: {
            type: 'string',
            description:
              'Exact snippet id as the skills cite it (e.g. "clearance-hole-through-plate"); returns that snippet. An unknown id is ranked as a query.',
          },
          k: {
            type: 'number',
            description: 'Max snippets to return. Default 3, max 5.',
            default: 3,
          },
        },
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
        'Resolve an id (or single-match query) to a part record and write its STEP file to the local cache. Bundled ids resolve offline; non-bundled ids require partsBaseUrl (or KERNELCAD_PARTS_BASE_URL). Returns the cache path plus a sha256 fingerprint. ' +
        'Set includeModel (or pass model.url) to instead resolve a verified STEP or GLB model file: a model.url must be public HTTPS with model.sha256 plus model.source and model.license; a catalog id/query (matched as catalog id or MPN) uses the catalog hash. The bytes are hash-checked and cached by SHA-256, optional model.expectedBboxMm is compared with the measured STEP/GLB dimensions (GLB only when POSITION bounds exist, else bbox_check.status is not_checked), and the result is { ok, format, model_path, sha256, cache_hit, bbox_check, attribution } or an errorCode such as model_not_found.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          query: { type: 'string' },
          category: { type: 'string' },
          family: { type: 'string' },
          standard: { type: 'string' },
          partsBaseUrl: { type: 'string', description: 'Opt-in remote endpoint; no default value ships with kernelCAD.' },
          includeModel: { type: 'boolean', description: 'Resolve a hash-verified STEP/GLB model file instead of the plain catalog STEP record.' },
          model: {
            type: 'object',
            description: 'Verified model options; supplying model implies includeModel.',
            properties: {
              url: { type: 'string', description: 'Direct public HTTPS .step/.stp/.glb download URL. Requires sha256, source and license.' },
              sha256: { type: 'string', description: 'Required SHA-256 digest for an explicit URL; for catalog parts it overrides the catalog GLB digest.' },
              source: { type: 'string', description: 'Catalog or manufacturer name, such as KiCad Packages3D.' },
              license: { type: 'string', description: 'License string supplied by the source.' },
              attribution: { type: 'string' },
              expectedBboxMm: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Expected [x,y,z] dimensions to compare with the measured model.' },
              toleranceRatio: { type: 'number', description: 'Relative expected-versus-measured bbox tolerance, default 0.25.' },
            },
          },
        },
      },
    },
    handler: input => {
      const { includeModel, model, ...fetchInput } = input as Parameters<typeof fetchPartTool>[0] & { includeModel?: boolean; model?: FetchPartModelRequest };
      if (!includeModel && !model) return fetchPartTool(fetchInput);
      const request: FetchPartModelInput = {
        ...(model?.url ? { url: model.url } : {}),
        ...(model?.sha256 ? { expected_sha256: model.sha256 } : {}),
        ...(model?.source ? { source: model.source } : {}),
        ...(model?.license ? { license: model.license } : {}),
        ...(model?.attribution ? { attribution: model.attribution } : {}),
        ...(model?.expectedBboxMm ? { bbox_mm: model.expectedBboxMm } : {}),
        ...(model?.toleranceRatio !== undefined ? { tolerance_ratio: model.toleranceRatio } : {}),
        ...(fetchInput.id ? { catalog_id: fetchInput.id } : {}),
        ...(!fetchInput.id && fetchInput.query ? { mpn: fetchInput.query } : {}),
        ...(fetchInput.partsBaseUrl ? { partsBaseUrl: fetchInput.partsBaseUrl } : {}),
      };
      return fetchPartModelTool(request);
    },
  },
];
