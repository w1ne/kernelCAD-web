// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/gcode/profiles.ts
//
// Bundled printer bed geometry and filament material profiles for the
// `gcode` export format. Printer profiles are plain data (bed size + the
// Marlin-safe layer-change gcode the slicer needs — see slicerCli.ts for
// why that flag exists); filament profiles are flattened, self-contained
// OrcaSlicer filament-preset JSON files under `./profiles/`, loaded via
// `--load-filaments` (the one profile-loading path that does not trip the
// slicer's printer/process compatibility-check bug — see the design spec).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROFILES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'profiles');

export interface PrinterProfile {
  /** Selectable name for `options.printer`. */
  name: string;
  /** Bed size in mm, used for the pre-slice bbox gate. */
  bedSizeMm: { x: number; y: number; z: number };
  /** OrcaSlicer --bed-shape value (list of "x,y" corners). */
  bedShapeArg: string;
}

export const PRINTER_PROFILES: Record<string, PrinterProfile> = {
  'generic-fdm': {
    name: 'generic-fdm',
    bedSizeMm: { x: 220, y: 220, z: 250 },
    bedShapeArg: '0x0,220x0,220x220,0x220',
  },
};

export const DEFAULT_PRINTER_PROFILE = 'generic-fdm';

export type MaterialName = 'pla' | 'petg';

const MATERIAL_FILES: Record<MaterialName, string> = {
  pla: 'pla.json',
  petg: 'petg.json',
};

export const DEFAULT_MATERIAL: MaterialName = 'pla';

/** Absolute path to a bundled filament-profile JSON, for `--load-filaments`. */
export function materialProfilePath(material: MaterialName): string {
  return join(PROFILES_DIR, MATERIAL_FILES[material]);
}

export function isKnownMaterial(value: string): value is MaterialName {
  return value === 'pla' || value === 'petg';
}

/** Read + parse a filament profile (used by tests + the CLI arg builder to
 *  surface the resolved nozzle/bed temperature without re-invoking the
 *  slicer). */
export function readMaterialProfile(material: MaterialName): Record<string, unknown> {
  return JSON.parse(readFileSync(materialProfilePath(material), 'utf8'));
}

export function resolvePrinterProfile(name: string | undefined): PrinterProfile {
  const key = name ?? DEFAULT_PRINTER_PROFILE;
  const profile = PRINTER_PROFILES[key];
  if (!profile) {
    throw new Error(`Unknown printer profile '${key}'. Known profiles: ${Object.keys(PRINTER_PROFILES).join(', ')}.`);
  }
  return profile;
}
