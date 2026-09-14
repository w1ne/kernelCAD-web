// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/gcode/printerProfiles.ts
//
// Bundled printer bed geometry plus the one bed-fit rule, kept free of node
// builtins so capture-time validation (`dfmSpec({ printer })`, which runs in
// the browser script runtime) and the FDM printability check can share the
// exact data and predicate the gcode export's pre-slice gate uses.
// `profiles.ts` re-exports everything here next to the node-only filament
// profile loader.

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

export function resolvePrinterProfile(name: string | undefined): PrinterProfile {
  const key = name ?? DEFAULT_PRINTER_PROFILE;
  const profile = PRINTER_PROFILES[key];
  if (!profile) {
    throw new Error(`Unknown printer profile '${key}'. Known profiles: ${Object.keys(PRINTER_PROFILES).join(', ')}.`);
  }
  return profile;
}

/** Part extents (mm) in the printer frame: x/y across the bed, z up. */
export interface BuildVolumeSize {
  x: number;
  y: number;
  z: number;
}

/**
 * The bed-fit rule: a part fits when its printer-frame extents do not exceed
 * the bed on any axis. No rotation about the build axis is attempted — the
 * slicer receives the part exactly as placed, so neither does this.
 */
export function exceedsBed(size: BuildVolumeSize, profile: PrinterProfile): boolean {
  return size.x > profile.bedSizeMm.x
    || size.y > profile.bedSizeMm.y
    || size.z > profile.bedSizeMm.z;
}
