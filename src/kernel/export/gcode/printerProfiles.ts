// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/gcode/printerProfiles.ts
//
// The one registry of bundled printer profiles, plus the one bed-fit rule.
// Kept free of node builtins so capture-time validation (`dfmSpec({ printer })`,
// which runs in the browser script runtime), the FDM printability check, the
// 3MF plate layout, the gcode export's pre-slice gate and `send_to_printer`
// all share the exact data and predicate. `profiles.ts` re-exports everything
// here next to the node-only filament profile loader.
//
// Each named profile is taken from the manufacturer's own spec page (URL and
// check date in `source`). The bed is the usable single-tool build volume;
// a printer is left out when its numbers could not be verified there.

/** Slicer project family a printer uses; the 3MF `slicer` option defaults
 *  to it when `printer` is given. Same values as the 3MF `SlicerFlavor`. */
export type PrinterSlicerFamily = 'generic' | 'bambu' | 'orca' | 'prusa';

export interface PrinterProfile {
  /** Selectable id for `options.printer` / `dfmSpec({ printer })`. */
  name: string;
  /** Maker and model, for listings and hints. */
  label: string;
  /** Usable build volume in mm (X x Y bed, Z build height). */
  bedSizeMm: { x: number; y: number; z: number };
  /** Nozzle diameter the printer ships with (mm). */
  nozzleMm: number;
  /** Slicer project family (3MF `slicer` default). */
  slicer: PrinterSlicerFamily;
  /** Manufacturer spec page the numbers come from, and the date checked.
   *  Absent only on the bundled `generic-fdm` profile. */
  source?: { url: string; checked: string };
  /** Spec caveat that the bed box does not capture (e.g. per-nozzle limits). */
  note?: string;
}

/** Date the manufacturer pages below were checked. */
const CHECKED = '2026-09-28';
const VORON_2_4_CONFIG =
  'https://raw.githubusercontent.com/VoronDesign/Voron-2/Voron2.4/firmware/klipper_configurations/Octopus/Voron2_Octopus_Config.cfg';

const PROFILE_LIST: readonly PrinterProfile[] = [
  // Bundled generic bed: a common 220 mm class i3/CoreXY printer.
  {
    name: 'generic-fdm',
    label: 'Generic FDM (220 mm class)',
    bedSizeMm: { x: 220, y: 220, z: 250 },
    nozzleMm: 0.4,
    slicer: 'generic',
  },
  // Bambu Lab. bambulab.com/en/*/tech-specs is behind a bot challenge, so
  // these come from Bambu's own store pages, spec-sheet PDFs and wiki.
  {
    name: 'bambu-a1-mini', label: 'Bambu Lab A1 mini',
    bedSizeMm: { x: 180, y: 180, z: 180 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://store.bambulab.com/products/a1-mini', checked: CHECKED },
  },
  {
    name: 'bambu-a1', label: 'Bambu Lab A1',
    bedSizeMm: { x: 256, y: 256, z: 256 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://store.bambulab.com/products/a1', checked: CHECKED },
  },
  // Spec 256 x 256 x 256 mm; the footnote sets the default printable height
  // to 250 mm (256 needs a manual unlock), so 250 is the usable height. The
  // collapsible cutter stopper takes an 18 x 28 mm front-left corner
  // (wiki.bambulab.com/en/knowledge-sharing/print-volume-limitations); the
  // rectangular bed here does not model it.
  {
    name: 'bambu-p1s', label: 'Bambu Lab P1S',
    bedSizeMm: { x: 256, y: 256, z: 250 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://store.bambulab.com/products/p1s', checked: CHECKED },
    note: 'front-left 18x28 mm cutter zone not modelled',
  },
  // Same footnote as the P1S (the P1S page's P1P/P1S comparison table).
  {
    name: 'bambu-p1p', label: 'Bambu Lab P1P',
    bedSizeMm: { x: 256, y: 256, z: 250 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://store.bambulab.com/products/p1s', checked: CHECKED },
    note: 'front-left 18x28 mm cutter zone not modelled',
  },
  // X1 series: same 18 x 28 mm front-left cutter zone (wiki, as above).
  {
    name: 'bambu-x1c', label: 'Bambu Lab X1 Carbon',
    bedSizeMm: { x: 256, y: 256, z: 256 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://public-cdn.bambulab.com/store/bambulab-X1-carbon-tech-specs.pdf', checked: CHECKED },
    note: 'front-left 18x28 mm cutter zone not modelled',
  },
  {
    name: 'bambu-x1e', label: 'Bambu Lab X1E',
    bedSizeMm: { x: 256, y: 256, z: 256 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://cdn1.bambulab.com/x1e/spec/X1E%20Spec(EN).pdf', checked: CHECKED },
    note: 'front-left 18x28 mm cutter zone not modelled',
  },
  // Single-nozzle volume 325 x 320 x 325 mm. Printing with both nozzles the
  // spec gives 300 x 320 x 325 mm (350 wide only with identical filament in
  // both nozzles).
  {
    name: 'bambu-h2d', label: 'Bambu Lab H2D',
    bedSizeMm: { x: 325, y: 320, z: 325 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://store.bambulab.com/products/h2d', checked: CHECKED },
    note: 'single nozzle; both nozzles: 300x320x325 mm',
  },
  // "H2S Specs" PDF linked from store.bambulab.com/products/h2s.
  {
    name: 'bambu-h2s', label: 'Bambu Lab H2S',
    bedSizeMm: { x: 340, y: 320, z: 340 }, nozzleMm: 0.4, slicer: 'bambu',
    source: { url: 'https://store.bblcdn.com/s7/default/3f91ec86de1a4ce28fe8fb660b95cd3e/h2s.pdf', checked: CHECKED },
  },
  // Prusa Research.
  {
    name: 'prusa-mini-plus', label: 'Prusa MINI+',
    bedSizeMm: { x: 180, y: 180, z: 180 }, nozzleMm: 0.4, slicer: 'prusa',
    source: { url: 'https://www.prusa3d.com/product/original-prusa-mini-3/', checked: CHECKED },
  },
  {
    name: 'prusa-mk4s', label: 'Prusa MK4S',
    bedSizeMm: { x: 250, y: 210, z: 220 }, nozzleMm: 0.4, slicer: 'prusa',
    source: { url: 'https://www.prusa3d.com/product/original-prusa-mk4s-3d-printer-5/', checked: CHECKED },
  },
  {
    name: 'prusa-core-one', label: 'Prusa CORE One',
    bedSizeMm: { x: 250, y: 220, z: 270 }, nozzleMm: 0.4, slicer: 'prusa',
    source: { url: 'https://www.prusa3d.com/product/prusa-core-one/', checked: CHECKED },
  },
  // Single-toolhead XL; the spec states the same 360 mm cube for all tools.
  {
    name: 'prusa-xl', label: 'Prusa XL',
    bedSizeMm: { x: 360, y: 360, z: 360 }, nozzleMm: 0.4, slicer: 'prusa',
    source: { url: 'https://www.prusa3d.com/product/original-prusa-xl-assembled-single-toolhead-3d-printer/', checked: CHECKED },
  },
  // Creality.
  {
    name: 'creality-ender-3-v3', label: 'Creality Ender-3 V3',
    bedSizeMm: { x: 220, y: 220, z: 250 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: 'https://www.creality.com/support/creality-ender-3-v3', checked: CHECKED },
  },
  {
    name: 'creality-k1', label: 'Creality K1',
    bedSizeMm: { x: 220, y: 220, z: 250 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: 'https://www.creality.com/support/creality-k1-3d-printer', checked: CHECKED },
  },
  {
    name: 'creality-k1-max', label: 'Creality K1 Max',
    bedSizeMm: { x: 300, y: 300, z: 300 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: 'https://www.creality.com/support/creality-k1-max-3d-printer', checked: CHECKED },
  },
  {
    name: 'creality-k2-plus', label: 'Creality K2 Plus',
    bedSizeMm: { x: 350, y: 350, z: 350 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: 'https://www.creality.com/support/creality-k2-plus-cfs-combo', checked: CHECKED },
  },
  // Elegoo: the build volume is on the product page; the 0.4 mm nozzle is
  // from Elegoo's Neptune 4 / 4 Pro hotend kit page
  // (us.elegoo.com/products/hotend-kit-for-neptune-4-4-pro).
  {
    name: 'elegoo-neptune-4-pro', label: 'Elegoo Neptune 4 Pro',
    bedSizeMm: { x: 225, y: 225, z: 265 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: 'https://us.elegoo.com/products/elegoo-neptune-4-pro-fdm-3d-printer', checked: CHECKED },
  },
  // Anycubic.
  {
    name: 'anycubic-kobra-3', label: 'Anycubic Kobra 3',
    bedSizeMm: { x: 250, y: 250, z: 260 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: 'https://store.anycubic.com/products/anycubic-kobra-3', checked: CHECKED },
  },
  // Voron 2.4: X/Y and the 0.4 mm nozzle from the stock Klipper config;
  // Z is its `position_max` (210/260/310), the lower of the two official
  // figures (docs.vorondesign.com/hardware.html says 220/280/330).
  {
    name: 'voron-2.4-250', label: 'Voron 2.4 (250 mm)',
    bedSizeMm: { x: 250, y: 250, z: 210 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: VORON_2_4_CONFIG, checked: CHECKED },
  },
  {
    name: 'voron-2.4-300', label: 'Voron 2.4 (300 mm)',
    bedSizeMm: { x: 300, y: 300, z: 260 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: VORON_2_4_CONFIG, checked: CHECKED },
  },
  {
    name: 'voron-2.4-350', label: 'Voron 2.4 (350 mm)',
    bedSizeMm: { x: 350, y: 350, z: 310 }, nozzleMm: 0.4, slicer: 'orca',
    source: { url: VORON_2_4_CONFIG, checked: CHECKED },
  },
  // UltiMaker: one volume for single and dual extrusion. Its slicer is not
  // one of the 3MF sidecar families, so it writes a plain core 3MF.
  {
    name: 'ultimaker-s5', label: 'UltiMaker S5',
    bedSizeMm: { x: 330, y: 240, z: 300 }, nozzleMm: 0.4, slicer: 'generic',
    source: { url: 'https://ultimaker.com/3d-printers/s-series/ultimaker-s5/', checked: CHECKED },
  },
];

export const PRINTER_PROFILES: Record<string, PrinterProfile> = Object.fromEntries(
  PROFILE_LIST.map(p => [p.name, p]),
);

/** Every profile id, in listing order (generic first, then by maker). */
export const PRINTER_PROFILE_IDS: readonly string[] = PROFILE_LIST.map(p => p.name);

export const DEFAULT_PRINTER_PROFILE = 'generic-fdm';

export function resolvePrinterProfile(name: string | undefined): PrinterProfile {
  const key = name ?? DEFAULT_PRINTER_PROFILE;
  const profile = Object.hasOwn(PRINTER_PROFILES, key) ? PRINTER_PROFILES[key] : undefined;
  if (!profile) {
    throw new Error(`Unknown printer profile '${key}'. Known profiles: ${PRINTER_PROFILE_IDS.join(', ')}.`);
  }
  return profile;
}

/** OrcaSlicer `--printable-area` value: the bed rectangle's corners. */
export function printableAreaArg(profile: PrinterProfile): string {
  const { x, y } = profile.bedSizeMm;
  return `0x0,${x}x0,${x}x${y},0x${y}`;
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

/** Profiles ordered smallest bed first (footprint area, then height, then id). */
export function profilesBySize(): PrinterProfile[] {
  const area = (p: PrinterProfile) => p.bedSizeMm.x * p.bedSizeMm.y;
  return [...PROFILE_LIST].sort((a, b) =>
    area(a) - area(b) || a.bedSizeMm.z - b.bedSizeMm.z || a.name.localeCompare(b.name));
}

/** How many fitting profiles a bed-fit hint names. */
export const FITS_ON_LIMIT = 3;

/**
 * The smallest named profiles (up to `FITS_ON_LIMIT`, `generic-fdm` excluded)
 * that satisfy `fits`, smallest bed first — the "fits on:" suggestion for a
 * bed-fit diagnostic.
 */
export function smallestFittingProfiles(fits: (p: PrinterProfile) => boolean): PrinterProfile[] {
  return profilesBySize()
    .filter(p => p.name !== DEFAULT_PRINTER_PROFILE && fits(p))
    .slice(0, FITS_ON_LIMIT);
}

/** Hint suffix naming `fitting` profiles, or saying none of them fits. */
export function fitsOnAdvice(fitting: readonly PrinterProfile[]): string {
  if (fitting.length === 0) return ' No bundled printer profile fits it.';
  return ` Fits on: ${fitting.map(p => `${p.label} ('${p.name}')`).join(', ')}.`;
}
