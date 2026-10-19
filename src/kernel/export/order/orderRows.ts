// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/order/orderRows.ts
// Structural mirror of the agent-side BomRow for the order module family:
// eslint's layering rule forbids src/kernel -> src/agent imports (even
// type-only), so kernel modules bind to this shape structurally. Keep in
// sync with src/agent/script-runtime/bom.ts's BomRow.
import type { FabProcess } from '../../../shared/fab';

export interface OrderPackBomCatalogInfo {
  id: string;
  vendor: string | null;
  partNumber: string | null;
  source: string | null;
  license: string;
}

export interface OrderPackBomBbox {
  min: [number, number, number];
  max: [number, number, number];
}

/** Every field the order-pack family (handoffs, order sheet, manifest)
 *  consumes from a BOM row. */
export interface OrderPackBomRow {
  item: number;
  name: string;
  quantity: number;
  kind: 'fabricated' | 'purchased';
  material: string | null;
  density: number | null;
  massGPerUnit: number | null;
  massGTotal: number | null;
  bboxMm: OrderPackBomBbox;
  process: FabProcess | null;
  processSource: 'declared' | 'inferred' | null;
  catalog?: OrderPackBomCatalogInfo;
  instancePaths: string[];
}
