// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const BOM_CODES = {
  'bom.material.unassigned': {
    hintTemplate:
      'A fabricated BOM row has neither a named `material` nor an explicit `density` on `assembly.part(name, shape, opts)`, so its mass is omitted rather than guessed. Pass opts.material (e.g. \'aluminum\', \'steel\', \'pla\', \'abs\', \'pet\') or opts.density (kg/m^3) on that part.',
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'warn',
    group: 'bom',
    description: 'inspect({ of: \'bom\' }) / export({ format: \'bom-csv\'|\'bom-json\' }) found a fabricated part with no density source, so massG is omitted for that row rather than defaulted to water.',
  },
  'bom.purchased.catalog-metadata-missing': {
    hintTemplate:
      'A purchased BOM row\'s catalog part has neither `standard` nor `upstream.repo`, so vendor/partNumber could not be populated with confidence. Re-fetch the part with fetch_part against a catalog record that carries provenance, or accept catalog.vendor: null.',
    nextAction: { kind: 'fix-arg', field: 'catalogPart' },
    defaultSeverity: 'warn',
    group: 'bom',
    description: 'inspect({ of: \'bom\' }) / export({ format: \'bom-csv\'|\'bom-json\' }) found a purchased part whose catalogPart carries no standard and no upstream provenance to derive vendor/partNumber from.',
  },
} as const satisfies Record<`bom.${string}`, DiagnosticCodeSpec>;
