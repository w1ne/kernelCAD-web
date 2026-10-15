// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { checkWritableDestination, safeWriteFileDetailed } from '../../script-runtime/safeWriteFile';

export interface BomPart {
  ref: string;
  catalog_id?: string | null;
  mpn?: { value?: string | null; status?: string; source?: string } | string | null;
  quantity?: number;
  qty?: number;
  part?: string;
  name?: string;
  source?: string;
  notes?: string;
}

export interface BomHandoff {
  schema?: string;
  device?: string;
  parts: BomPart[];
}

export interface BomCatalogPart {
  id?: string;
  name?: string;
  partNumber?: string;
  vendor?: string;
  price?: number | { amount?: number; currency?: string };
  currency?: string;
  source?: string;
  notes?: string;
  ref?: string;
  qty?: number;
}

export interface BomRow {
  ref: string;
  qty: number;
  part: string;
  mpn: string;
  source: string;
  unit_price: number | '';
  notes: string;
}

export interface WriteBomInput {
  handoff?: BomHandoff;
  handoff_json?: string;
  handoff_path?: string;
  catalog_parts?: BomCatalogPart[];
  output_path?: string;
  overwrite?: boolean;
}

export interface WriteBomOutput {
  ok: boolean;
  destination: 'csv';
  rows: BomRow[];
  csv: string;
  headers: string[];
  sheets_rows: (string | number)[][];
  path?: string;
  error?: string;
}

export const BOM_HEADERS = ['ref', 'qty', 'part', 'MPN', 'source', 'unit price', 'notes'];
const DEFAULT_CSV_DIR = path.join(process.cwd(), 'artifacts', 'bom');

function mpnValue(value: BomPart['mpn']): string {
  if (typeof value === 'string') return value;
  return value?.value ?? '';
}

function formatPrice(value: BomCatalogPart['price']): number | '' {
  const amount = typeof value === 'number' ? value : value?.amount;
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : '';
}

function catalogMatches(part: BomPart, extras: BomCatalogPart[]): BomCatalogPart[] {
  return extras.filter(extra =>
    (extra.ref && extra.ref.toLowerCase() === part.ref.toLowerCase()) ||
    (part.catalog_id && extra.id?.toLowerCase() === part.catalog_id.toLowerCase()),
  );
}

function requireOptionalText(record: Record<string, unknown>, field: string, label: string): void {
  const value = record[field];
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error(`${label}.${field} must be text.`);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function validateTextFields(record: Record<string, unknown>, fields: readonly string[], label: string): void {
  fields.forEach(field => requireOptionalText(record, field, label));
}

function validatePositiveIntegerFields(record: Record<string, unknown>, fields: readonly string[], label: string): void {
  fields.forEach(field => {
    const value = record[field];
    if (value !== undefined && (!Number.isSafeInteger(value) || (value as number) <= 0)) {
      throw new Error(`${label}.${field} must be a positive safe integer.`);
    }
  });
}

function validateMpn(value: unknown, label: string): void {
  if (value === undefined || value === null || typeof value === 'string') return;
  validateTextFields(asRecord(value, `${label}.mpn`), ['value', 'status', 'source'], `${label}.mpn`);
}

function validateHandoffPart(part: BomPart, index: number): void {
  const label = `handoff.parts[${index}]`;
  const record = asRecord(part, label);
  if (typeof record.ref !== 'string' || !record.ref.trim()) throw new Error(`${label}.ref must be a non-empty string.`);
  validateTextFields(record, ['catalog_id', 'part', 'name', 'source', 'notes'], label);
  validatePositiveIntegerFields(record, ['quantity', 'qty'], label);
  validateMpn(record.mpn, label);
}

function validateHandoff(handoff: BomHandoff): void {
  handoff.parts.forEach((part, index) => validateHandoffPart(part, index));
}

function validateCatalogPrice(price: unknown, label: string): void {
  if (price === undefined || price === null) return;
  if (typeof price === 'number') {
    if (!Number.isFinite(price) || price < 0) throw new Error(`${label}.price must be a non-negative finite number or a price object with that amount.`);
    return;
  }
  const record = asRecord(price, `${label}.price`);
  const amount = record.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label}.price must be a non-negative finite number or a price object with that amount.`);
  }
  requireOptionalText(record, 'currency', `${label}.price`);
}

function validateCatalogPart(part: BomCatalogPart, index: number): void {
  const label = `catalog_parts[${index}]`;
  const record = asRecord(part, label);
  validateTextFields(record, ['id', 'name', 'partNumber', 'vendor', 'currency', 'source', 'notes', 'ref'], label);
  validatePositiveIntegerFields(record, ['qty'], label);
  validateCatalogPrice(record.price, label);
}

function validateCatalogParts(parts: BomCatalogPart[]): void {
  parts.forEach((part, index) => validateCatalogPart(part, index));
}

function sourcesForPart(part: BomPart, match?: BomCatalogPart): string {
  const sources = [part.source, part.catalog_id ? `LabWired:${part.catalog_id}` : undefined, match?.vendor ? `KernelCAD:${match.vendor}` : undefined];
  return [...new Set(sources.filter((source): source is string => Boolean(source)))].join('; ');
}

function notesForPart(part: BomPart, match?: BomCatalogPart): string {
  const status = typeof part.mpn === 'object' && part.mpn !== null ? part.mpn.status : undefined;
  const mpnSource = typeof part.mpn === 'object' && part.mpn !== null ? part.mpn.source : undefined;
  return [part.notes, status, mpnSource, match?.notes].filter((note): note is string => Boolean(note)).join('; ');
}

function rowForHandoffPart(part: BomPart, extras: BomCatalogPart[]): BomRow {
  const match = catalogMatches(part, extras)[0];
  return {
    ref: part.ref,
    qty: (part.quantity ?? part.qty ?? 1) + (match?.qty ?? 0),
    part: part.part ?? part.name ?? match?.name ?? part.catalog_id ?? part.ref,
    mpn: mpnValue(part.mpn) || match?.partNumber || '',
    source: sourcesForPart(part, match),
    unit_price: formatPrice(match?.price),
    notes: notesForPart(part, match),
  };
}

function rowForCatalogPart(part: BomCatalogPart): BomRow {
  return {
    ref: part.ref ?? '', qty: part.qty ?? 1, part: part.name ?? part.id ?? 'Catalog part',
    mpn: part.partNumber ?? '', source: part.vendor ? `KernelCAD:${part.vendor}` : part.source ?? 'KernelCAD',
    unit_price: formatPrice(part.price), notes: part.notes ?? 'Catalog addition',
  };
}

function appendUnmatchedCatalogRows(rows: BomRow[], handoff: BomHandoff, extras: BomCatalogPart[]): void {
  // A handoff part consumes only its primary match. Secondary matches still
  // represent catalog entries with their own quantity/pricing and must remain
  // visible as catalog rows.
  const primaryMatches = new Set(handoff.parts.map(part => catalogMatches(part, extras)[0]).filter(Boolean));
  extras.filter(extra => !primaryMatches.has(extra)).forEach(extra => rows.push(rowForCatalogPart(extra)));
}

export function mergeBomRows(handoff: BomHandoff, extras: BomCatalogPart[] = []): BomRow[] {
  const rows = handoff.parts.map(part => rowForHandoffPart(part, extras));
  appendUnmatchedCatalogRows(rows, handoff, extras);
  return rows;
}

function safeText(value: string): string {
  return /^[\t\r ]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const text = typeof value === 'string' ? safeText(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function bomRowsToCsv(rows: BomRow[]): string {
  return [BOM_HEADERS, ...bomRowsToSheetsRows(rows)]
    .map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function bomRowsToSheetsRows(rows: BomRow[]): (string | number)[][] {
  return rows.map(row => [safeText(row.ref), row.qty, safeText(row.part), safeText(row.mpn), safeText(row.source), row.unit_price, safeText(row.notes)]);
}

async function loadHandoff(input: WriteBomInput): Promise<BomHandoff> {
  const supplied = [input.handoff !== undefined, input.handoff_json !== undefined, input.handoff_path !== undefined].filter(Boolean).length;
  if (supplied !== 1) throw new Error('Pass exactly one of handoff, handoff_json, or handoff_path.');
  let raw: unknown = input.handoff;
  if (input.handoff_json) raw = JSON.parse(input.handoff_json) as unknown;
  if (input.handoff_path) raw = JSON.parse(await readFile(input.handoff_path, 'utf8')) as unknown;
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as BomHandoff).parts)) {
    throw new Error('Pass handoff, handoff_json, or handoff_path containing an object with a parts array.');
  }
  const handoff = raw as BomHandoff;
  validateHandoff(handoff);
  return handoff;
}

async function writeCsv(csv: string, requestedPath?: string, overwrite = false): Promise<string> {
  const outputPath = requestedPath ?? path.join(DEFAULT_CSV_DIR, `bom-${randomUUID()}.csv`);
  const pathCheck = validateOutputPath(outputPath);
  if (!pathCheck.ok) throw new Error(pathCheck.error);
  const finalPath = outputPath;
  if (!overwrite) {
    const destinationError = await checkWritableDestination(finalPath);
    if (destinationError) throw new Error(destinationError);
    try {
      await lstat(finalPath);
      throw new Error(`Cannot write to ${finalPath}: file already exists.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  await mkdir(path.dirname(finalPath), { recursive: true });
  // Always use the symlink-/swap-safe writer, including overwrite mode.
  const result = await safeWriteFileDetailed(finalPath, csv);
  if (result.error) throw new Error(result.error);
  return finalPath;
}

/** Merge handoff and optional catalog pricing, then write a CSV with Sheets-ready rows. */
export async function writeBomTool(input: WriteBomInput): Promise<WriteBomOutput> {
  try {
    const handoff = await loadHandoff(input);
    const catalogParts = input.catalog_parts ?? [];
    if (!Array.isArray(catalogParts)) throw new Error('catalog_parts must be an array.');
    validateCatalogParts(catalogParts);
    const rows = mergeBomRows(handoff, catalogParts);
    const sheets_rows = [BOM_HEADERS, ...bomRowsToSheetsRows(rows)];
    const csv = bomRowsToCsv(rows);
    const filePath = await writeCsv(csv, input.output_path, input.overwrite ?? false);
    return { ok: true, destination: 'csv', rows, csv, headers: BOM_HEADERS, sheets_rows, path: filePath };
  } catch (error) {
    return { ok: false, destination: 'csv', rows: [], csv: '', headers: BOM_HEADERS, sheets_rows: [], error: error instanceof Error ? error.message : String(error) };
  }
}
