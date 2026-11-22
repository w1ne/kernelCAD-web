// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Family-table lookup for find_part. A DIN or ISO name resolves to the
// canonical family and its ordering designation. Rows that are not in the
// loaded catalog are still returned: their sha256 is an identity key, not a
// digest of STEP bytes. lib.part builds those solids; fetch_part needs the
// generated catalog file.

import type { PartRecord } from '../../shared/parts/types';
import { fastenerCallout, kindFromFamily } from './fastenerDesignation';
import { libraryFamily, libraryVariants, type ResolvedPart } from './familyTable';

function standardRe(): RegExp {
  return /(?:din(?:\s*en)?(?:\s*iso)?|iso)[\s-]*\d{3,5}[a-z]?/gi;
}

const FAMILY_IDS = [
  'socket-head-cap-screw',
  'button-head-cap-screw',
  'flat-head-countersunk',
  'hex-head-bolt-partial',
  'hex-head-bolt',
  'set-screw',
  'threaded-rod',
  'hex-nut',
  'lock-nut',
  'flat-washer',
  'lock-washer',
] as const;

export interface FastenerSearchOpts {
  family?: string;
  standard?: string;
  tag?: string;
  category?: string;
}

function addFamily(found: string[], name: string | undefined): void {
  if (name === undefined || name.trim().length === 0) return;
  const family = libraryFamily(name);
  if (family !== undefined && !found.includes(family)) found.push(family);
}

/** Families named by a query string. Empty when the text is not a fastener standard or family id. */
export function familiesInQuery(query: string): string[] {
  const found: string[] = [];
  addFamily(found, query.trim());
  for (const match of query.matchAll(standardRe())) addFamily(found, match[0]);
  const lower = query.toLowerCase();
  for (const id of FAMILY_IDS) {
    if (id === 'hex-head-bolt' && lower.includes('hex-head-bolt-partial')) continue;
    if (lower.includes(id)) addFamily(found, id);
  }
  return found;
}

/** True when find_part should consult the fastener table. A bare size such as "M3" stays on the catalog. */
export function isFastenerLibraryQuery(query: string, opts: FastenerSearchOpts): boolean {
  if (familiesInQuery(query).length > 0) return true;
  if (libraryFamily(opts.family ?? '') !== undefined) return true;
  if (libraryFamily(opts.standard ?? '') !== undefined) return true;
  return false;
}

function normalizeThread(digits: string): string {
  return `M${digits}`;
}

function parseSize(query: string): { thread?: string; lengthMm?: number } {
  const sized = query.match(/M\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (sized !== null) {
    return { thread: normalizeThread(sized[1] ?? ''), lengthMm: Number(sized[2]) };
  }
  const thread = query.match(/\bM\s*(\d+(?:\.\d+)?)\b/i);
  if (thread === null) return {};
  const stripped = query
    .replace(thread[0], ' ')
    .replace(standardRe(), ' ');
  const leftover = stripped.match(/\b(\d+(?:\.\d+)?)\b/g);
  const lengthMm = leftover !== null && leftover.length === 1 ? Number(leftover[0]) : undefined;
  return { thread: normalizeThread(thread[1] ?? ''), ...(lengthMm !== undefined ? { lengthMm } : {}) };
}

/** One agreed family, or null when the query and the filters name different families. */
function agreedFamily(query: string, opts: FastenerSearchOpts): string | null | undefined {
  const named = [
    ...familiesInQuery(query),
    ...(libraryFamily(opts.family ?? '') !== undefined ? [libraryFamily(opts.family ?? '') as string] : []),
    ...(libraryFamily(opts.standard ?? '') !== undefined ? [libraryFamily(opts.standard ?? '') as string] : []),
  ];
  const unique = [...new Set(named)];
  if (unique.length > 1) return null;
  return unique[0];
}

function toRecord(part: ResolvedPart): PartRecord {
  const designation = part.designation ?? fastenerCallout({
    standard: part.standard ?? '',
    thread: part.thread,
    ...(part.lengthMm > 0 ? { lengthMm: part.lengthMm } : {}),
    kind: kindFromFamily(part.family),
  });
  return {
    id: part.id,
    name: part.name,
    category: part.category,
    family: part.family,
    ...(part.standard !== undefined ? { standard: part.standard } : {}),
    tags: [...part.tags],
    attributes: {
      thread: part.thread,
      ...(part.lengthMm > 0 ? { lengthMm: part.lengthMm } : {}),
      nominalMm: part.nominalMm,
      ...(designation !== undefined ? { designation } : {}),
    },
    // Identity of the table row. Not a hash of geometry bytes.
    sha256: `table:${part.id}`,
    source: 'local-catalog',
    license: 'MIT',
    connectors: part.connectors.map((connector) => connector.name),
  };
}

/**
 * Stocked rows for a fastener query.
 * `null` means the query and the filters disagree, so the caller returns nothing.
 * `[]` means the name was a fastener query but no stocked row matched.
 */
export function searchFastenerLibrary(query: string, opts: FastenerSearchOpts = {}): PartRecord[] | null {
  if (opts.category !== undefined && opts.category !== 'fastener') return [];
  const family = agreedFamily(query, opts);
  if (family === null) return null;
  if (family === undefined) return [];
  const { thread, lengthMm } = parseSize(query);
  const tag = opts.tag?.toLowerCase();
  return libraryVariants(family)
    .filter((part) => thread === undefined || part.thread === thread)
    .filter((part) => lengthMm === undefined || part.kind !== 'screw' || part.lengthMm === lengthMm)
    .filter((part) => tag === undefined || part.tags.some((item) => item.toLowerCase() === tag))
    .map(toRecord);
}

/** Copy a designation onto a catalog hit without mutating the cached record. */
export function withFastenerDesignation(record: PartRecord): PartRecord {
  const stored = record.attributes.designation;
  if (typeof stored === 'string' && stored.length > 0) return record;
  const thread = record.attributes.thread;
  const lengthMm = record.attributes.lengthMm;
  if (typeof thread !== 'string' || record.standard === undefined) return record;
  const designation = fastenerCallout({
    standard: record.standard,
    thread,
    ...(typeof lengthMm === 'number' ? { lengthMm } : {}),
    kind: kindFromFamily(record.family),
  });
  if (designation === undefined) return record;
  return { ...record, attributes: { ...record.attributes, designation } };
}
