// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Canonical fastener callouts. Geometry elsewhere in this folder is nominal
// table geometry, not a certified part. The property class on a callout
// (8.8, nut class 8, washer 200 HV) is the nominal ordering designation,
// not a measured mechanical property.
//
// ISO 10642:2026 marks a steel property class with a leading zero (8.8 is
// written 08.8, 10.9 is written 010.9). The scope note on the 2026 edition
// calls that prefix out, and published summaries give 010.9 as the example.
// A caller can pass another class; a non-numeric grade is left unchanged.

/** Compact key: "DIN 912", "ISO4762" and "DIN EN ISO 4762" all become din912 / iso4762 / dineniso4762. */
export function fastenerAliasKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Document aliases that resolve to a stocked family id. The geometry and the
 *  BOM callout stay on the ISO document. Search keeps the DIN name. */
const FAMILY_ALIAS: Record<string, string> = {
  din912: 'socket-head-cap-screw',
  iso4762: 'socket-head-cap-screw',
  dineniso4762: 'socket-head-cap-screw',
  din7991: 'flat-head-countersunk',
  iso10642: 'flat-head-countersunk',
  din931: 'hex-head-bolt-partial',
  iso4014: 'hex-head-bolt-partial',
  din933: 'hex-head-bolt',
  iso4017: 'hex-head-bolt',
  iso7380: 'button-head-cap-screw',
  iso73801: 'button-head-cap-screw',
  iso4032: 'hex-nut',
  iso7089: 'flat-washer',
  iso4026: 'set-screw',
  din975: 'threaded-rod',
  din985: 'lock-nut',
  din127b: 'lock-washer',
};

/** Family id for a standard name or alias, or the input when it is not one. */
export function canonicalFastenerFamily(family: string): string {
  return FAMILY_ALIAS[fastenerAliasKey(family)] ?? family;
}

/** DIN tag preserved on the ISO record so a DIN query still finds it. */
const DIN_TAG: Record<string, string> = {
  'ISO 4762': 'DIN 912',
  'ISO 10642': 'DIN 7991',
  'ISO 4014': 'DIN 931',
  'ISO 4017': 'DIN 933',
};

export function dinAliasTag(standard: string): string | undefined {
  return DIN_TAG[standard];
}

/** Screws whose default ordering designation carries property class 8.8.
 *  ISO 10642 writes that class as 08.8. ISO 4026 is a hardened set screw
 *  (45H), so it is not in this set unless the caller passes a class. */
const CLASS_88 = new Set(['ISO 4762', 'ISO 10642', 'ISO 7380', 'ISO 4017', 'ISO 4014']);

/** ISO 10642:2026 steel marking: one leading zero on a bare class such as 8.8 or 10.9. */
export function iso10642PropertyMark(propertyClass: string): string {
  if (/^0\d/.test(propertyClass)) return propertyClass;
  if (/^\d{1,2}\.\d$/.test(propertyClass)) return `0${propertyClass}`;
  return propertyClass;
}

function screwGrade(standard: string, propertyClass: string | undefined): string {
  if (propertyClass === undefined && !CLASS_88.has(standard)) return '';
  const raw = propertyClass ?? '8.8';
  const marked = standard === 'ISO 10642' ? iso10642PropertyMark(raw) : raw;
  return ` - ${marked}`;
}

export type FastenerCalloutKind = 'screw' | 'nut' | 'washer' | 'other';

export function kindFromFamily(family: string): FastenerCalloutKind {
  if (family === 'hex-nut' || family === 'lock-nut') return 'nut';
  if (family === 'flat-washer' || family === 'lock-washer') return 'washer';
  if (
    family === 'socket-head-cap-screw' ||
    family === 'button-head-cap-screw' ||
    family === 'flat-head-countersunk' ||
    family === 'hex-head-bolt' ||
    family === 'hex-head-bolt-partial' ||
    family === 'set-screw' ||
    family === 'threaded-rod'
  ) {
    return 'screw';
  }
  return 'other';
}

/** BOM designation. Example: `ISO 4762 M5x16 - 8.8`. ISO 10642 defaults to
 *  `ISO 10642 M5x16 - 08.8`. Undefined for parts that are not a stocked
 *  fastener standard. */
export function fastenerCallout(args: {
  standard: string;
  thread: string;
  lengthMm?: number;
  kind: FastenerCalloutKind;
  /** Ordering class. Omitted screws in the 8.8 set use 8.8, written 08.8 for ISO 10642. */
  propertyClass?: string;
}): string | undefined {
  const { standard, thread, kind } = args;
  if (standard.length === 0 || thread.length === 0) return undefined;
  if (kind === 'screw' && args.lengthMm !== undefined && args.lengthMm > 0) {
    if (standard === 'DIN 975') return `DIN 975 ${thread}x${args.lengthMm}`;
    return `${standard} ${thread}x${args.lengthMm}${screwGrade(standard, args.propertyClass)}`;
  }
  if (kind === 'nut') {
    const grade = standard === 'ISO 4032' ? ' - 8' : '';
    return `${standard} ${thread}${grade}`;
  }
  if (kind === 'washer' && standard === 'ISO 7089') return `${standard} ${thread} - 200 HV`;
  if (kind === 'washer') return `${standard} ${thread}`;
  return undefined;
}
