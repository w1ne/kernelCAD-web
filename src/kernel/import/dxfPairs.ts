// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// DXF group-code pairs and the readers every entity parser shares. Each
// failure names the entity and the physical line of the offending pair.

import type { ImportSegment } from './contourAssembly';

export type DxfParseFailure =
  | 'empty'
  | 'not-dxf'
  | 'no-entities'
  | 'unsupported-entity'
  | 'malformed-entity'
  | 'bad-units'
  | 'contour';

export class DxfParseError extends Error {
  readonly reason: DxfParseFailure;
  constructor(reason: DxfParseFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'DxfParseError';
  }
}

export interface Pair {
  code: number;
  value: string;
  /** 1-based physical line number of the CODE line, for diagnostics. */
  line: number;
}

export function num(p: Pair, entity: string, code: number): number {
  const v = Number(p.value.trim());
  if (!Number.isFinite(v)) {
    throw new DxfParseError(
      'malformed-entity',
      `${entity} at line ${p.line}: group code ${code} must be a finite number, got '${p.value.trim()}'.`,
    );
  }
  return v;
}

export function get(body: readonly Pair[], code: number): Pair | undefined {
  return body.find(p => p.code === code);
}

export function require(body: readonly Pair[], code: number, entity: string, line: number): Pair {
  const p = get(body, code);
  if (!p) {
    throw new DxfParseError(
      'malformed-entity',
      `${entity} at line ${line}: required group code ${code} is missing.`,
    );
  }
  return p;
}

export function values(body: readonly Pair[], code: number, entity: string): number[] {
  return body.filter(p => p.code === code).map(p => num(p, entity, code));
}

export function entityVector(body: readonly Pair[], entity: string, codes: readonly number[], defaults: readonly number[]): number[] {
  return codes.map((code, index) => {
    const pair = get(body, code);
    return pair ? num(pair, entity, code) : defaults[index];
  });
}

/** One `0/<TYPE>` entity and the pairs that follow it. */
export interface EntityBlock {
  type: string;
  /** Pairs AFTER the `0/<TYPE>` pair, up to the next `0`. */
  body: Pair[];
  line: number;
}

export interface PolyVertex { x: number; y: number; bulge: number }

/** Polyline vertices as line and bulge-arc segments; the bulge lives on the starting vertex. */
export function polylineSegments(
  vertices: readonly PolyVertex[],
  closed: boolean,
  src: string,
  line: number,
): ImportSegment[] {
  if (vertices.length < 2) {
    throw new DxfParseError(
      'malformed-entity',
      `${src}: needs at least 2 vertices, found ${vertices.length}.`,
    );
  }
  const out: ImportSegment[] = [];
  const n = vertices.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    // The bulge lives on the vertex that STARTS the segment.
    out.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, bulge: a.bulge, source: `${src} (line ${line})` });
  }
  return out;
}
