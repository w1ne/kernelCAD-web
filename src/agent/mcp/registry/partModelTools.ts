// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { fetchPartModelTool } from '../tools/fetchPartModel';
import type { ToolRegistryEntry } from './types';

export const partModelToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'fetch_part_model',
    description: 'Use this when a LabWired handoff part needs a STEP or GLB model resolved from a verified HTTPS URL plus SHA-256, or from catalog_id / MPN. The tool uses fetch_part/find_part catalog plumbing, stores URL-fetched bytes in a SHA-256 cache, checks the supplied hash, compares measurable model dimensions with bbox_mm, and returns provenance or a model_not_found result. GLB bounds are checked when POSITION accessor bounds are available; otherwise bbox_check.status is not_checked.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Direct public HTTPS download URL from the handoff step field.' },
        expected_sha256: { type: 'string', description: 'Required SHA-256 digest for an explicit URL; catalog hashes are used when resolving catalog records.' },
        ref: { type: 'string' },
        catalog_id: { type: 'string' },
        mpn: { type: 'string' },
        source: { type: 'string', description: 'Catalog or manufacturer name, such as KiCad Packages3D.' },
        license: { type: 'string', description: 'License string supplied by the source.' },
        attribution: { type: 'string' },
        bbox_mm: { type: 'array', items: { type: 'number' }, description: 'Expected [x,y,z] dimensions from the handoff.' },
        tolerance_ratio: { type: 'number', description: 'Relative expected-versus-measured bbox tolerance, default 0.25.' },
        partsBaseUrl: { type: 'string', description: 'Optional parts catalog endpoint, passed to find_part/fetch_part.' },
      },
    },
  },
  handler: input => fetchPartModelTool(input as unknown as Parameters<typeof fetchPartModelTool>[0]),
}];
