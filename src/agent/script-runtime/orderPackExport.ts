// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/orderPackExport.ts
// Server-side order-pack producer. For every fabricated BOM row: one
// single-body file (STEP always; STL for 3d-print; DXF for sheet-cut when
// the holes-aware flatten walk succeeds) plus a per-row drawing PDF when
// the drawing pipeline accepts the target (each drawing is a nested full
// run — accepted cost, documented). Purchased rows contribute vendor
// handoffs only. `processes` / `items` filter which rows are packed.
import { computeBom, bomToCsv } from './bom';
import { buildOrderPack, zipEntries, type OrderPackEntry, type OrderPackFileInput } from '../../kernel/export/order/orderPack';
import type { OrderPackBomRow } from '../../kernel/export/order/orderRows';
import { partDxfBytes, partStepBytes, partStlBytes } from '../../kernel/backends/occt/partFileExport';
import { flattenPatternWithHoles } from '../../modeling/sheetMetalFlatPattern';
import type { Assembly } from '../../modeling/capture/assembly';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FabProcess } from '../../shared/fab';
import type { runScript } from '../../composition/runScript';
import type { ExportInput, ExportResult } from './export';

export interface OrderPackOptions {
  /** Pack name carried by the manifest / README; default 'order'. */
  name?: string;
  /** Fabricated rows to pack, by declared/inferred process. Ignored when `items` is given. */
  processes?: FabProcess[];
  /** Fabricated rows to pack, by BOM item number; wins over `processes`. */
  items?: number[];
}

type ScriptRun = Awaited<ReturnType<typeof runScript>>;

/** Nested-run hooks the order pack cannot import itself: `export.ts` imports
 *  `exportPhases.ts`, which imports this module, so the per-row drawing
 *  runner is injected by the caller instead of imported (the module graph
 *  stays acyclic and the cycle ratchet stays green). */
export interface OrderPackDeps {
  /** One per-row drawing PDF: runs the full `pdf-drawing` pipeline for the
   *  given feature id (accepted cost, one run per row). Absent: drawings are
   *  skipped with a note. */
  drawingBytes?: (featureId: string) => Promise<{ bytes: Uint8Array; diagnostics: CompilerDiagnostic[] }>;
}

export interface CollectedOrderPack {
  entries: OrderPackEntry[];
  notes: string[];
  diagnostics: CompilerDiagnostic[];
  featureCount: number;
}

/** Rows whose per-part files are packed: fabricated only; `items` (BOM item
 *  numbers) wins over `processes`; otherwise every fabricated row. */
export function selectOrderPackRows(
  rows: readonly OrderPackBomRow[],
  opts: OrderPackOptions,
): OrderPackBomRow[] {
  const fabricated = rows.filter((row) => row.kind === 'fabricated');
  if (opts.items !== undefined) {
    const items = new Set(opts.items);
    return fabricated.filter((row) => items.has(row.item));
  }
  if (opts.processes !== undefined) {
    const processes = new Set(opts.processes);
    return fabricated.filter((row) => row.process !== null && processes.has(row.process));
  }
  return fabricated;
}

/** The order-pack knobs out of the shared options bag (discriminator-checked). */
function orderPackOptions(input: ExportInput): OrderPackOptions {
  return input.options !== undefined && input.options.format === 'order-pack' ? input.options : {};
}

/** One per-row drawing PDF through the injected runner. Any failure
 *  (refusal, empty bytes, thrown error) degrades to a note instead of
 *  failing the pack. Without a runner the drawing is skipped and noted. */
async function drawingBytes(
  deps: OrderPackDeps | undefined,
  row: OrderPackBomRow,
  shapeId: string,
  notes: string[],
): Promise<Uint8Array | undefined> {
  if (deps?.drawingBytes === undefined) {
    notes.push('drawing skipped: no drawing runner');
    return undefined;
  }
  try {
    const drawing = await deps.drawingBytes(shapeId);
    const error = drawing.diagnostics.find((d) => d.severity === 'error');
    if (error !== undefined) {
      notes.push(`No drawing for '${row.name}': ${error.message}`);
      return undefined;
    }
    if (drawing.bytes.length === 0) {
      notes.push(`No drawing for '${row.name}': the drawing export produced no bytes.`);
      return undefined;
    }
    return drawing.bytes;
  } catch (e) {
    notes.push(`No drawing for '${row.name}': ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
}

type AssemblyPart = ReturnType<Assembly['__parts']>[number];

/** Append one fabricated row's files: STEP always; STL for 3d-print; DXF for
 *  sheet-cut when the holes-aware flatten walk succeeds; plus the per-row
 *  drawing PDF when a runner is injected. Failures that must not sink the
 *  whole pack land in `notes`. */
async function collectRowFiles(
  deps: OrderPackDeps | undefined,
  run: ScriptRun,
  part: AssemblyPart,
  row: OrderPackBomRow,
  files: OrderPackFileInput[],
  notes: string[],
): Promise<void> {
  files.push({ row, kind: 'step', bytes: await partStepBytes(part.originalShape, row.name) });
  if (row.process === '3d-print') {
    files.push({ row, kind: 'stl', bytes: partStlBytes(await part.originalShape.lower()) });
  }
  if (row.process === 'sheet-cut') {
    try {
      // The same holes-aware walk `exportShapeDxf` uses (exportPhases.ts):
      // diagnostics/paramTable from this run, the shapes map left to the
      // walk (it lowers the blank itself).
      const region = await flattenPatternWithHoles(run.records, part.originalShape.id, undefined, run.paramTable);
      files.push({ row, kind: 'dxf', bytes: partDxfBytes(region) });
    } catch (e) {
      notes.push(`No DXF for '${row.name}': ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const drawing = await drawingBytes(deps, row, part.originalShape.id, notes);
  if (drawing !== undefined) files.push({ row, kind: 'drawing', bytes: drawing });
}

/** Collect every zip entry of an order pack for one solved assembly: the BOM
 *  (CSV + JSON), manifest, README, vendor handoff texts and the per-row
 *  files. Failures that must not sink the whole pack (DXF flatten, drawing)
 *  land in `notes`, which travel into the manifest. Shared by the
 *  `order-pack` export format and the `fab_pack` assembly mode. */
export async function collectOrderPack(
  input: ExportInput,
  run: ScriptRun,
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  deps?: OrderPackDeps,
): Promise<CollectedOrderPack> {
  const bom = await computeBom(arm, run.session);
  // Compile-time contract: the kernel-side structural mirror stays
  // assignable from the agent-side BomRow (tsc-checked, no runtime cost).
  const _contract: readonly OrderPackBomRow[] = bom.rows;
  void _contract;

  const opts = orderPackOptions(input);
  const notes: string[] = [];
  for (const row of bom.rows) {
    if (row.kind === 'purchased' && !row.catalog?.partNumber?.trim()) {
      notes.push(`purchased '${row.name}' has no catalog part number — add it to the vendor list manually`);
    }
  }
  const files: OrderPackFileInput[] = [];
  const parts = arm.__parts();
  for (const row of selectOrderPackRows(bom.rows, opts)) {
    const firstName = row.instancePaths[0];
    const part = firstName !== undefined ? parts.find((p) => p.name === firstName) : undefined;
    if (part === undefined) {
      notes.push(`No model files for '${row.name}': no assembly part named '${firstName ?? ''}' to lower.`);
      continue;
    }
    await collectRowFiles(deps, run, part, row, files, notes);
  }

  const pack = buildOrderPack({
    name: opts.name ?? 'order',
    rows: bom.rows,
    totals: bom.totals,
    csv: bomToCsv(bom.rows),
    files,
    notes,
  });
  return { entries: pack.entries, notes, diagnostics: [...diagnostics, ...bom.diagnostics], featureCount };
}

/** `order-pack` export: zip the collected entries. The runtime behind
 *  `export({ format: 'order-pack' })` and the Studio Order sheet's
 *  `/__kernelcad/export?format=order-pack` call. */
export async function exportOrderPack(
  input: ExportInput,
  run: ScriptRun,
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  deps?: OrderPackDeps,
): Promise<ExportResult> {
  const collected = await collectOrderPack(input, run, arm, diagnostics, featureCount, deps);
  return {
    bytes: zipEntries(collected.entries),
    featureCount: collected.featureCount,
    diagnostics: collected.diagnostics,
  };
}
