// src/kernel/backends/occt/exportDxf.ts
//
// AutoCAD R2013 (AC1027) DXF writer for kernelCAD's sheet-metal and planar
// export path. Polyline-only by design: laser-cutter shops and sheet-metal
// CAM tools cannot reliably read DXF splines, so every wire ships as an
// `LWPOLYLINE`. All vertices live on the XY plane at Z=0; mm units by default.
//
// Vertex-source contract (locked for Slice E preflight consumers):
//   - `kind === 'region'`: `outer`, `holes`, and `bendLines` come from
//     `flatten_pattern`'s `Region` exactly — no resampling, no re-ordering,
//     no chord-tolerance smoothing layered on top of the flatten output.
//   - `kind === 'planarWires'`: vertices come directly from the caller (the
//     planar-face / sketch entry path that lives behind
//     `OcctBackend.tryExtractPlanarWires`).
//
// Layer contract:
//   - `cut`   — outer + hole polylines (always declared, even when empty).
//   - `BEND`  — bend lines (always declared, even when empty). Downstream
//     CAM tooling indexes by layer name, so both layers must exist.
//
// Header `999` comments carry: (a) `kernelcad <version> <iso-date>` matching
// the STL header convention, and (b) the OCCT tessellation tolerance recorded
// in mm. `$INSUNITS = 4` (mm) by default; `5` (cm) and `1` (in) when the
// caller picks them via `options.unit`.

import { createRequire } from 'node:module';
import type {
  Region,
  Vec2,
  BendLineRecord,
} from '../../../shared/intent/region';

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
    };

/** `$INSUNITS` enum (AutoCAD R-spec). Only the three kernelCAD-supported
 *  units appear; the writer rejects any others at the type system. */
const INSUNITS: Record<DxfUnit, number> = { mm: 4, cm: 5, in: 1 };

export function exportDxf(input: DxfInput, options: DxfWriterOptions): Uint8Array {
  const unit: DxfUnit = options.unit ?? 'mm';
  const tolerance = options.tolerance ?? 0.05;
  const cutLayer = options.layers?.[0]?.name ?? 'cut';

  const outer = input.kind === 'region' ? input.region.outer : input.outer;
  const holes = input.kind === 'region' ? input.region.holes : (input.holes ?? []);
  const bendLines =
    input.kind === 'region' ? input.region.bendLines : (input.bendLines ?? []);

  const isoDate = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  // Header comments (group code 999) — top-of-file provenance.
  lines.push('999', `kernelcad ${KERNELCAD_VERSION} ${isoDate}`);
  lines.push('999', `tolerance: ${tolerance} mm (OCCT tessellation)`);

  // HEADER section
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1027');
  lines.push('9', '$INSUNITS', '70', String(INSUNITS[unit]));
  lines.push('0', 'ENDSEC');

  // TABLES section — declare every layer up front so downstream CAM tools
  // index correctly even when a layer ends up empty.
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '2');
  for (const layer of [cutLayer, 'BEND']) {
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
  writeClosedPolyline(lines, outer, cutLayer);
  for (const hole of holes) {
    writeClosedPolyline(lines, hole, cutLayer);
  }
  for (const bl of bendLines) {
    writeOpenPolyline(lines, [bl.start, bl.end], 'BEND');
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
