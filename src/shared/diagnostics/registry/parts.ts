// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const PARTS_CODES = {
  // Parts catalog (6) — Slice C
  'parts.input.id-or-query-required': {
    hintTemplate:
      'Pass either an `id` (for a known catalog record) or a `query` (for fuzzy search). Both are missing in this call.',
    nextAction: { kind: 'call-tool', tool: 'list_part_categories', args: {} },
    defaultSeverity: 'error',
    group: 'parts',
    description: 'find_part or fetch_part was called with neither an id nor a query.',
  },
  'parts.fetch.offline-and-uncached': {
    hintTemplate:
      'No network reachable and the requested id is not in the local cache. Call find_part with source: "local" to see similar bundled ids, or restore network.',
    nextAction: { kind: 'call-tool', tool: 'find_part', args: { source: 'local' } },
    defaultSeverity: 'error',
    group: 'parts',
    description: 'fetch_part needed a remote round-trip but the remote tier was unreachable and the cache had no entry for the id.',
  },
  'parts.fetch.checksum-mismatch': {
    hintTemplate:
      "Downloaded bytes hashed to a value that disagreed with the record's declared sha256. Discarded the file; do not retry against the same endpoint without verifying upstream integrity.",
    nextAction: { kind: 'call-tool', tool: 'find_part', args: { source: 'local' } },
    defaultSeverity: 'error',
    group: 'parts',
    description: 'A remote fetch produced bytes whose sha256 did not match the catalog record.',
  },
  'parts.fetch.checksum-drift': {
    hintTemplate:
      'Cached bytes still hash correctly but the remote endpoint now reports a different sha256. Geometry may have changed upstream. Re-fetch explicitly with the refresh flag to opt into the new bytes.',
    nextAction: { kind: 'rerun-with-flag', flag: '--refresh-parts-cache' },
    defaultSeverity: 'warn',
    group: 'parts',
    description: 'A remote re-validation observed that the upstream sha256 differs from the cached one for the same id.',
  },
  'parts.fetch.api-error': {
    hintTemplate:
      'The configured remote parts endpoint returned an error status. Retry later, check that partsBaseUrl is reachable, or fall back to the bundled catalog with source: "local".',
    nextAction: { kind: 'call-tool', tool: 'find_part', args: { source: 'local' } },
    defaultSeverity: 'error',
    group: 'parts',
    description: 'A remote parts call returned a non-2xx status or a network-level failure.',
  },
  'parts.fetch.remote-disabled': {
    hintTemplate:
      'No partsBaseUrl configured; the remote parts tier is disabled. Pass partsBaseUrl (programmatic), set the KERNELCAD_PARTS_BASE_URL env var, or use only bundled-catalog ids.',
    nextAction: { kind: 'call-tool', tool: 'find_part', args: { source: 'local' } },
    defaultSeverity: 'error',
    group: 'parts',
    description: 'A tool call required a remote round-trip but partsBaseUrl was unset, so the remote tier was dormant.',
  },
  'parts.fetch.geometry-not-brep': {
    hintTemplate:
      'This catalog record exposes only a display mesh (glbUrl) and no stepUrl, so there is no BREP body to import. The authored dev-board records are GLB-only because their STEP exceeds the catalog per-file size limit. Compile the authored scripts/parts/authored/<board>.kcad.ts to STEP and load it with lib.fromSTEP(path), or choose a catalog part that exposes stepUrl.',
    nextAction: { kind: 'call-tool', tool: 'find_part', args: { source: 'local' } },
    defaultSeverity: 'error',
    group: 'parts',
    description:
      'fetch_part resolved a remote record whose only geometry is a GLB display mesh; kernelCAD has no mesh-import lowerer, so no Shape can be built.',
  },
} as const satisfies Record<`parts.${string}`, DiagnosticCodeSpec>;
