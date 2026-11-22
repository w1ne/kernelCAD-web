// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/stock.ts
//
// Declared manufacturing stock: the bar, plate, blank, or filament a part is
// made from. Dimensions are millimetres. Capture refuses anything else.

import { invalidArgs } from './intent/invalidArgs';

export interface StockParseContext {
  readonly partName: string;
  readonly featureId?: string;
}

/** Round bar: length plus diameter, both mm. */
export interface RoundBarStock {
  readonly kind: 'bar';
  readonly lengthMm: number;
  readonly diameterMm: number;
}

/** Rectangular bar: length plus cross-section, all mm. */
export interface RectBarStock {
  readonly kind: 'bar';
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface PlateStock {
  readonly kind: 'plate';
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly thicknessMm: number;
}

/** Bounding box of a raw blank, mm. */
export interface BlankStock {
  readonly kind: 'blank';
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
}

export interface FilamentStock {
  readonly kind: 'filament';
  readonly diameterMm: number;
  /** Spool length, when known. */
  readonly lengthMm?: number;
}

export type BarStock = RoundBarStock | RectBarStock;

export type StockSpec = BarStock | PlateStock | BlankStock | FilamentStock;

const EXAMPLE =
  "arm.part('shaft', cylinder(10, 80), { material: 'aluminum-6061', process: 'cnc', stock: { kind: 'bar', lengthMm: 80, diameterMm: 20 } })";

function api(partName: string): string {
  return `assembly.part('${partName}', shape, { stock })`;
}

function fail(ctx: StockParseContext, path: string, got: unknown, requires: string): never {
  invalidArgs({
    api: api(ctx.partName),
    path,
    got,
    requires,
    ...(path.endsWith('kind') ? {} : { unit: 'mm' as const }),
    example: EXAMPLE,
    featureId: ctx.featureId,
  });
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function positive(ctx: StockParseContext, raw: Record<string, unknown>, field: string): number {
  const value = raw[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(ctx, `opts.stock.${field}`, value, 'a positive finite length');
  }
  return value;
}

function parseBar(raw: Record<string, unknown>, ctx: StockParseContext): BarStock {
  const lengthMm = positive(ctx, raw, 'lengthMm');
  const hasDiameter = raw.diameterMm !== undefined;
  const hasWidth = raw.widthMm !== undefined;
  const hasHeight = raw.heightMm !== undefined;
  if (hasDiameter && (hasWidth || hasHeight)) {
    fail(ctx, 'opts.stock', raw, 'a round bar (lengthMm + diameterMm) or a rectangular bar (lengthMm + widthMm + heightMm), not both');
  }
  if (hasDiameter) {
    return { kind: 'bar', lengthMm, diameterMm: positive(ctx, raw, 'diameterMm') };
  }
  if (hasWidth || hasHeight) {
    return {
      kind: 'bar',
      lengthMm,
      widthMm: positive(ctx, raw, 'widthMm'),
      heightMm: positive(ctx, raw, 'heightMm'),
    };
  }
  fail(ctx, 'opts.stock', raw, 'lengthMm plus a round diameterMm or a rectangular widthMm and heightMm');
}

/** Validate and canonicalize `assembly.part(..., { stock })`. */
export function parseStockSpec(raw: unknown, ctx: StockParseContext): StockSpec {
  if (!isRecord(raw)) {
    fail(ctx, 'opts.stock', raw, "an object { kind: 'bar' | 'plate' | 'blank' | 'filament', ...dims }");
  }
  const { kind } = raw;
  if (kind === 'bar') return parseBar(raw, ctx);
  if (kind === 'plate') {
    return {
      kind: 'plate',
      lengthMm: positive(ctx, raw, 'lengthMm'),
      widthMm: positive(ctx, raw, 'widthMm'),
      thicknessMm: positive(ctx, raw, 'thicknessMm'),
    };
  }
  if (kind === 'blank') {
    return {
      kind: 'blank',
      lengthMm: positive(ctx, raw, 'lengthMm'),
      widthMm: positive(ctx, raw, 'widthMm'),
      heightMm: positive(ctx, raw, 'heightMm'),
    };
  }
  if (kind === 'filament') {
    const diameterMm = positive(ctx, raw, 'diameterMm');
    if (raw.lengthMm === undefined) return { kind: 'filament', diameterMm };
    return { kind: 'filament', diameterMm, lengthMm: positive(ctx, raw, 'lengthMm') };
  }
  fail(ctx, 'opts.stock.kind', kind, "one of 'bar' | 'plate' | 'blank' | 'filament'");
}


/** Parse stock when present; `undefined` stays `undefined` (no throw). */
export function parseOptionalStockSpec(
  raw: unknown | undefined,
  ctx: StockParseContext,
): StockSpec | undefined {
  if (raw === undefined) return undefined;
  return parseStockSpec(raw, ctx);
}

/** Spread helper so call sites do not pay ternary complexity. */
export function optionalStockField(stock: StockSpec | undefined): { stock?: StockSpec } {
  if (stock === undefined) return {};
  return { stock };
}

/** One CSV / pack cell. Dimensions are millimetres. */
export function formatStockSpec(stock: StockSpec): string {
  if (stock.kind === 'bar') {
    if ('diameterMm' in stock) return `bar ${stock.lengthMm}xD${stock.diameterMm} mm`;
    return `bar ${stock.lengthMm}x${stock.widthMm}x${stock.heightMm} mm`;
  }
  if (stock.kind === 'plate') return `plate ${stock.lengthMm}x${stock.widthMm}x${stock.thicknessMm} mm`;
  if (stock.kind === 'blank') return `blank ${stock.lengthMm}x${stock.widthMm}x${stock.heightMm} mm`;
  if (stock.lengthMm !== undefined) return `filament D${stock.diameterMm}xL${stock.lengthMm} mm`;
  return `filament D${stock.diameterMm} mm`;
}
