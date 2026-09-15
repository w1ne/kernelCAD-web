// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/bom.ts
//
// Bill-of-materials extraction — shared by `inspect({ of: 'bom' })` and
// `export({ format: 'bom-csv' | 'bom-json' })` so both surfaces report the
// same numbers from one computation.
//
// Reads `Assembly.__parts()` directly (authoring-time `AssemblyPartStored`),
// NOT the export-side `resolveWorldFrameScene` / `SceneBackend` path — that
// lowerer only carries `color` and PBR `material` per part (see
// `occtLowerer.ts`'s `assemblyModel` case); `density`, the named engineering
// `material`, and `catalogPart` provenance are capture-time-only fields that
// would be silently dropped. `part.originalShape.lower()` (same call
// `inspectAssembly.ts` makes) gives the per-part geometry directly, so no
// second lowerer / RecomputeEngine pass is needed.
//
// Grouping is by GEOMETRY IDENTITY, not by name: purchased parts group by
// `catalogPart.id`; fabricated parts group by a position-invariant geometry
// fingerprint (volume + surface area + sorted bbox dimensions, rounded).
// Quantity is the real count of `assembly.part(...)` instances that share a
// group, so a pattern loop that calls `.part()` N times with the same source
// shape (and N distinct names) collapses to one BOM row with quantity N.

import type { Assembly, AssemblyPartStored } from '../../modeling/capture/assembly';
import type { CaptureSession } from '../../modeling/capture/captureSession';
import type { CatalogPartMetadata } from '../../shared/parts/types';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { tryResolveMaterial } from '../../modeling/properties/materialLibrary';

export type BomKind = 'fabricated' | 'purchased';
export type BomProcessHint = 'sheet-metal' | 'machined' | 'printed';

export interface BomCatalogInfo {
  id: string;
  vendor: string | null;
  partNumber: string | null;
  source: string | null;
  license: string;
}

export interface BomBbox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface BomRow {
  /** 1-based row ordinal, in first-seen instance order. */
  item: number;
  /** Name of the first instance in the group (representative). */
  name: string;
  quantity: number;
  kind: BomKind;
  /** Canonical engineering material name, when resolvable. Null (not
   *  omitted) so a consumer can distinguish "checked, unknown" from
   *  "field absent". */
  material: string | null;
  /** kg/m^3 actually used for mass, when a density source exists. */
  density: number | null;
  massGPerUnit: number | null;
  massGTotal: number | null;
  bboxMm: BomBbox;
  processHint?: BomProcessHint;
  catalog?: BomCatalogInfo;
  /** Every `assembly.part(name, ...)` name contributing to this group, in
   *  declaration order. Length always equals `quantity`. */
  instancePaths: string[];
}

export interface BomTotals {
  partCount: number;
  uniquePartCount: number;
  totalMassG: number | null;
}

export interface BomResult {
  rows: BomRow[];
  totals: BomTotals;
  diagnostics: CompilerDiagnostic[];
}

function round(n: number, dp = 3): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function fingerprint(volumeMm3: number, surfaceAreaMm2: number, bbox: BomBbox): string {
  const dims = [
    round(bbox.max[0] - bbox.min[0]),
    round(bbox.max[1] - bbox.min[1]),
    round(bbox.max[2] - bbox.min[2]),
  ].sort((a, b) => a - b);
  return `geom:${round(volumeMm3)}:${round(surfaceAreaMm2)}:${dims.join(',')}`;
}

function catalogInfo(catalogPart: CatalogPartMetadata): BomCatalogInfo {
  const vendor = catalogPart.upstream?.repo ?? (catalogPart.standard !== undefined ? 'kernelCAD catalog' : null);
  const partNumber = catalogPart.standard ?? catalogPart.id;
  const source = catalogPart.stepUrl ?? catalogPart.glbUrl ?? catalogPart.upstream?.path ?? null;
  return { id: catalogPart.id, vendor, partNumber, source, license: catalogPart.license };
}

/** Best-effort fabrication-process hint from the part's own capture-graph
 *  record kind. A hint, not a CAM decision: never blocks the row. */
function processHintFor(session: CaptureSession, part: AssemblyPartStored): BomProcessHint {
  const record = session.getRecords().find((r) => r.id === part.originalShape.id);
  const kind = record?.kind;
  if (kind === 'sheetMetalBend' || kind === 'sheetMetal') return 'sheet-metal';
  if (kind === 'importedStep' || kind === 'importedBrep' || kind === 'importedStl' || kind === 'importedMesh') {
    return 'machined';
  }
  return 'printed';
}

/**
 * Compute BOM rows + totals + diagnostics for one Assembly. Pure over the
 * capture graph; each fabricated part is lowered once (`.lower()`) to read
 * its geometry.
 */
export async function computeBom(arm: Assembly, session: CaptureSession): Promise<BomResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const groups = new Map<string, BomRow & { __density: number | null }>();
  let item = 0;

  for (const part of arm.__parts()) {
    const record = session.getRecords().find((r) => r.id === part.originalShape.id);
    const catalogPart = record?.metadata?.catalogPart;
    const lowered = await part.originalShape.lower();
    const bb = lowered.boundingBox({ exact: true });
    const bbox: BomBbox = { min: [bb.min[0], bb.min[1], bb.min[2]], max: [bb.max[0], bb.max[1], bb.max[2]] };
    const volumeMm3 = lowered.volume();
    const surfaceAreaMm2 = lowered.surfaceArea();

    const kind: BomKind = catalogPart !== undefined ? 'purchased' : 'fabricated';
    const groupKey = catalogPart !== undefined ? `catalog:${catalogPart.id}` : fingerprint(volumeMm3, surfaceAreaMm2, bbox);

    // Density resolution: explicit density wins, else the named material's
    // catalog density, else no guess (unlike inspect({ of: 'mass' }), which
    // defaults to water — a BOM total silently padded with water-weight
    // guesses is worse than an honest gap).
    let density: number | null = null;
    let materialName: string | null = null;
    if (part.density !== undefined) {
      density = part.density;
      materialName = part.material ?? null;
    } else if (part.material !== undefined) {
      const resolved = tryResolveMaterial(part.material);
      if (resolved.ok) {
        density = resolved.material.density;
        materialName = resolved.material.name;
      }
    }
    if (kind === 'fabricated' && density === null) {
      diagnostics.push({
        target: 'export-occt',
        code: 'bom.material.unassigned',
        featureId: part.originalShape.id,
        severity: 'warn',
        message: `BOM part '${part.name}' has no density source (no material, no explicit density); mass is omitted.`,
        hint: 'Pass opts.material or opts.density on assembly.part(name, shape, opts) so BOM mass totals are real, not guessed.',
      });
    }
    if (kind === 'purchased' && catalogPart !== undefined) {
      const info = catalogInfo(catalogPart);
      if (info.vendor === null) {
        diagnostics.push({
          target: 'export-occt',
          code: 'bom.purchased.catalog-metadata-missing',
          featureId: part.originalShape.id,
          severity: 'warn',
          message: `BOM part '${part.name}' is purchased (catalog id '${catalogPart.id}') but carries no standard/upstream provenance to derive a vendor from.`,
          hint: 'Re-fetch from a catalog record with `standard` or `upstream.repo` set, or accept catalog.vendor: null on this row.',
        });
      }
    }

    const massGPerUnit = density !== null ? round((volumeMm3 / 1e9) * density * 1000, 4) : null;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.quantity += 1;
      existing.instancePaths.push(part.name);
      if (existing.__density === null && density !== null) {
        existing.__density = density;
        existing.density = density;
        existing.massGPerUnit = massGPerUnit;
      }
      existing.massGTotal = existing.massGPerUnit !== null ? round(existing.massGPerUnit * existing.quantity, 4) : null;
      continue;
    }

    item += 1;
    const row: BomRow & { __density: number | null } = {
      item,
      name: part.name,
      quantity: 1,
      kind,
      material: materialName,
      density,
      massGPerUnit,
      massGTotal: massGPerUnit,
      bboxMm: bbox,
      ...(kind === 'fabricated' ? { processHint: processHintFor(session, part) } : {}),
      ...(catalogPart !== undefined ? { catalog: catalogInfo(catalogPart) } : {}),
      instancePaths: [part.name],
      __density: density,
    };
    groups.set(groupKey, row);
  }

  const rows: BomRow[] = Array.from(groups.values()).map((g) => {
    const { __density, ...row } = g;
    void __density;
    return row;
  });
  const partCount = rows.reduce((sum, r) => sum + r.quantity, 0);
  // Real, possibly-partial total: sums only rows with a known mass. `null`
  // only when NO row has a known mass — never silently zero-fills a gap.
  const massKnownTotal = rows.some((r) => r.massGTotal !== null)
    ? round(rows.reduce((sum, r) => sum + (r.massGTotal ?? 0), 0), 4)
    : null;

  return {
    rows,
    totals: { partCount, uniquePartCount: rows.length, totalMassG: massKnownTotal },
    diagnostics,
  };
}

const CSV_HEADER = [
  'item', 'name', 'quantity', 'kind', 'material', 'densityKgM3',
  'massGPerUnit', 'massGTotal',
  'bboxMinX', 'bboxMinY', 'bboxMinZ', 'bboxMaxX', 'bboxMaxY', 'bboxMaxZ',
  'processHint', 'vendor', 'partNumber', 'license', 'source', 'instancePaths',
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Same rows `computeBom` returns, serialized as CSV — the golden fixture
 *  for `export({ format: 'bom-csv' })`. */
export function bomToCsv(rows: readonly BomRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push([
      r.item, r.name, r.quantity, r.kind, r.material, r.density,
      r.massGPerUnit, r.massGTotal,
      r.bboxMm.min[0], r.bboxMm.min[1], r.bboxMm.min[2],
      r.bboxMm.max[0], r.bboxMm.max[1], r.bboxMm.max[2],
      r.processHint ?? '', r.catalog?.vendor ?? '', r.catalog?.partNumber ?? '',
      r.catalog?.license ?? '', r.catalog?.source ?? '', r.instancePaths.join(';'),
    ].map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}
