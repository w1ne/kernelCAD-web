// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/gcode/profiles.ts
//
// Bundled printer bed geometry and filament material profiles for the
// `gcode` export format. Printer profiles are plain data living in the
// node-free `printerProfiles.ts` (re-exported here) so capture-time
// validation and the FDM printability check share them; filament profiles
// are flattened, self-contained OrcaSlicer filament-preset JSON files under
// `./profiles/`, loaded via `--load-filaments` (the one profile-loading path
// that does not trip the slicer's printer/process compatibility-check bug —
// see the design spec).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROFILES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'profiles');

export {
  PRINTER_PROFILES, DEFAULT_PRINTER_PROFILE, resolvePrinterProfile, exceedsBed,
  type PrinterProfile, type BuildVolumeSize,
} from './printerProfiles';

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
