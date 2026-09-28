// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/exportDxf.ts
//
// AutoCAD R2013 (AC1027) DXF writer for kernelCAD's sheet-metal and planar
// export path. Polyline-only by design: laser-cutter shops and sheet-metal
// CAM tools cannot reliably read DXF splines, so every wire ships as an
// `LWPOLYLINE`. Circular arcs ride on the polyline as exact vertex bulges
// (group code 42, tan(sweep/4)); a full circle is two half-circle bulges.
// All vertices live on the XY plane at Z=0; mm units by default.
//
// Vertex-source contract (locked for Slice E preflight consumers):
//   - `kind === 'region'`: `outer`, `holes`, and `bendLines` come from
//     `flatten_pattern`'s `Region` exactly — no resampling, no re-ordering,
//     no chord-tolerance smoothing layered on top of the flatten output.
//   - `kind === 'planarWires'`: vertices come directly from the caller.
//   - `kind === 'profiles'`: closed segment loops (lines + exact bulge arcs)
//     from planarProfile.ts — a flat part's cap boundary or a section —
//     grouped by layer (one layer per part on a multi-part sheet).
//
// Layer contract:
//   - `cut`   — outer + hole polylines (always declared, even when empty).
//     A `profiles` input may name its own layers instead (one per part).
//   - `BEND`  — bend lines (always declared, even when empty). Downstream
//     CAM tooling indexes by layer name, so both layers must exist.
//
// Header `999` comments carry: (a) `kernelCAD <version> (https://kernelcad.com)
// <iso-date>` (shared/links/attribution.ts) matching
// the STL header convention, and (b) the OCCT tessellation tolerance recorded
// in mm. `$INSUNITS = 4` (mm) by default; `5` (cm) and `1` (in) when the
// caller picks them via `options.unit`. Input geometry is in mm; the
// coordinates are rescaled to the chosen unit so they match `$INSUNITS`.

import { createRequire } from 'node:module';
import type {
  Region,
  Vec2,
  BendLineRecord,
} from '../../../shared/intent/region';
import { attributionGenerator } from '../../../shared/links/attribution';
import type { ProjectedSegment } from './sketchFromShape';

const requireFromHere = createRequire(import.meta.url);
// At source: src/kernel/backends/occt/exportDxf.ts → ../../../../package.json (4 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const KERNELCAD_VERSION = loadPkg().version;

export type DxfUnit = 'mm' | 'cm' | 'in';

export interface DxfWriterOptions {
  format: 'dxf';
  /** Drawing unit. Drives `$INSUNITS` (1=in, 4=mm, 5=cm). Defaults to `mm`. */
  unit?: DxfUnit;
  /** Chord tolerance (mm) used by the upstream OCCT tessellation pass.
   *  Recorded in a `999` header comment so downstream CAM preflight can
   *  reconstruct the discretisation budget. Defaults to `0.05`. */
  tolerance?: number;
  /** Optional layer specs. The first entry's `name` overrides the default
   *  `cut` layer name. The `BEND` layer is always emitted at its locked
   *  uppercase name and cannot be renamed. */
  layers?: ReadonlyArray<{ name: string; color?: string }>;
}

export type DxfInput =
  | { kind: 'region'; region: Region }
  | {
      kind: 'planarWires';
      outer: Vec2[];
      holes?: Vec2[][];
      bendLines?: BendLineRecord[];
    }
  | {
      kind: 'profiles';
      /** Closed loops per layer. `name` omitted → the cut layer. */
      layers: ReadonlyArray<{ name?: string; loops: ReadonlyArray<ReadonlyArray<ProjectedSegment>> }>;
    };

/** `$INSUNITS` enum (AutoCAD R-spec). Only the three kernelCAD-supported
 *  units appear; the writer rejects any others at the type system. */
const INSUNITS: Record<DxfUnit, number> = { mm: 4, cm: 5, in: 1 };

/** Millimetres per drawing unit: written coordinates are `mm / MM_PER_UNIT`. */
const MM_PER_UNIT: Record<DxfUnit, number> = { mm: 1, cm: 10, in: 25.4 };

export function exportDxf(input: DxfInput, options: DxfWriterOptions): Uint8Array {
  const unit: DxfUnit = options.unit ?? 'mm';
  const tolerance = options.tolerance ?? 0.05;
  const cutLayer = options.layers?.[0]?.name ?? 'cut';
  const k = MM_PER_UNIT[unit];
  const toUnit = (pts: Vec2[]): Vec2[] => pts.map(([x, y]) => [x / k, y / k]);

  const outer = input.kind === 'region' ? input.region.outer : input.kind === 'planarWires' ? input.outer : [];
  const holes = input.kind === 'region' ? input.region.holes : input.kind === 'planarWires' ? (input.holes ?? []) : [];
  const bendLines =
    input.kind === 'region' ? input.region.bendLines : input.kind === 'planarWires' ? (input.bendLines ?? []) : [];
  const profileLayers = input.kind === 'profiles'
    ? input.layers.map((l) => ({ name: l.name ?? cutLayer, loops: l.loops }))
    : [];
  const layerNames = [...new Set([
    ...(input.kind === 'profiles' && profileLayers.length > 0 ? profileLayers.map((l) => l.name) : [cutLayer]),
    'BEND',
  ])];

  const isoDate = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  // Header comments (group code 999) — top-of-file provenance.
  lines.push('999', `${attributionGenerator(KERNELCAD_VERSION)} ${isoDate}`);
  lines.push('999', `tolerance: ${tolerance} mm (OCCT tessellation)`);

  // HEADER section
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1027');
  lines.push('9', '$INSUNITS', '70', String(INSUNITS[unit]));
  lines.push('0', 'ENDSEC');

  // TABLES section — declare every layer up front so downstream CAM tools
  // index correctly even when a layer ends up empty.
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(layerNames.length));
  for (const layer of layerNames) {
    lines.push(
      '0', 'LAYER',
      '2', layer,
      '70', '0',
      '62', '7',
      '6', 'CONTINUOUS',
    );
  }
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ENTITIES section
  lines.push('0', 'SECTION', '2', 'ENTITIES');
  if (input.kind === 'profiles') {
    for (const layer of profileLayers) {
      for (const loop of layer.loops) writeBulgePolyline(lines, loop, k, layer.name);
    }
  } else {
    writeClosedPolyline(lines, toUnit(outer), cutLayer);
    for (const hole of holes) {
      writeClosedPolyline(lines, toUnit(hole), cutLayer);
    }
  }
  for (const bl of bendLines) {
    writeOpenPolyline(lines, toUnit([bl.start, bl.end]), 'BEND');
  }
  lines.push('0', 'ENDSEC');

  lines.push('0', 'EOF', '');
  return new TextEncoder().encode(lines.join('\n'));
}

/** Emit a closed `LWPOLYLINE` (flag = 1) at the given layer. */
function writeClosedPolyline(out: string[], pts: Vec2[], layer: string): void {
  out.push(
    '0', 'LWPOLYLINE',
    '8', layer,
    '90', String(pts.length),
    '70', '1',
  );
  for (const [x, y] of pts) {
    out.push('10', x.toFixed(6), '20', y.toFixed(6));
  }
}

/** Emit a closed segment loop as one closed `LWPOLYLINE` (flag = 1). Each
 *  vertex is a segment start; an arc segment carries its exact bulge on that
 *  vertex (group 42), which DXF applies to the span to the next vertex.
 *  Coordinates are divided by `mmPerUnit`; bulges are scale-free. */
function writeBulgePolyline(
  out: string[],
  loop: ReadonlyArray<ProjectedSegment>,
  mmPerUnit: number,
  layer: string,
): void {
  out.push(
    '0', 'LWPOLYLINE',
    '8', layer,
    '90', String(loop.length),
    '70', '1',
  );
  for (const s of loop) {
    out.push('10', (s.x0 / mmPerUnit).toFixed(6), '20', (s.y0 / mmPerUnit).toFixed(6));
    const b = s.bulge ?? 0;
    if (Math.abs(b) > 1e-12) out.push('42', b.toFixed(12));
  }
}

/** Emit an open `LWPOLYLINE` (flag = 0) at the given layer — used for the
 *  bend-line segments which are explicitly *not* closed loops. */
function writeOpenPolyline(out: string[], pts: Vec2[], layer: string): void {
  out.push(
    '0', 'LWPOLYLINE',
    '8', layer,
    '90', String(pts.length),
    '70', '0',
  );
  for (const [x, y] of pts) {
    out.push('10', x.toFixed(6), '20', y.toFixed(6));
  }
}
