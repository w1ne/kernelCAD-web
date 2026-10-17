// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/order/handoffs.ts
// Vendor paste texts for purchased BOM rows. Formats from vendor docs
// (checked 2026-10-17): McMaster paste = PartNumber lines; Mouser =
// `MPN|qty`; DigiKey = `part,qty`. McMaster interprets a quantity as PACKS,
// and no pack sizes exist in catalog data yet, so L1 never writes a
// McMaster quantity. The pack-size caveat lives in the pack README/manifest
// and the Order sheet, never in the pasteable text (the paste box parses
// the whole text). Duplicate part numbers across rows deliberately produce
// one line per row: the sheet and manifest carry the row identity.
import { buildVendorUrl } from '../../../shared/links/referral';
import type { OrderPackBomRow } from './orderRows';

/** The fields the handoff builders read; a kernel-side structural alias of
 *  the agent's BomRow, which satisfies it. */
export type HandoffBomRow = Pick<OrderPackBomRow, 'kind' | 'quantity' | 'catalog'>;

export interface Handoffs {
  mcmaster: string | null;
  mouser: string | null;
  digikey: string | null;
}

export interface HandoffItem {
  partNumber: string;
  quantity: number;
}

/** Purchased rows with a non-empty (trimmed) part number, in row order. */
export function handoffItems(rows: readonly HandoffBomRow[]): HandoffItem[] {
  const out: HandoffItem[] = [];
  for (const r of rows) {
    if (r.kind !== 'purchased') continue;
    const pn = r.catalog?.partNumber?.trim();
    if (pn !== undefined && pn.length > 0) out.push({ partNumber: pn, quantity: r.quantity });
  }
  return out;
}

export function buildHandoffs(rows: readonly HandoffBomRow[]): Handoffs {
  const items = handoffItems(rows);
  if (items.length === 0) return { mcmaster: null, mouser: null, digikey: null };
  return {
    mcmaster: items.map((i) => i.partNumber).join('\n') + '\n',
    mouser: items.map((i) => `${i.partNumber}|${i.quantity}`).join('\n') + '\n',
    digikey: items.map((i) => `${i.partNumber},${i.quantity}`).join('\n') + '\n',
  };
}

/** FastAdd pre-fill URL (official DigiKey bulk cart builder). Only
 *  meaningful with DigiKey part numbers; returns null otherwise so the
 *  caller falls back to the copy-list. */
export function digikeyFastAddUrl(items: readonly { partNumber: string; quantity: number }[]): string | null {
  if (items.length === 0 || !items.every((i) => /-ND$/i.test(i.partNumber))) return null;
  const params = new URLSearchParams();
  items.forEach((item, n) => {
    params.set(`part${n + 1}`, item.partNumber);
    params.set(`qty${n + 1}`, String(item.quantity));
  });
  return buildVendorUrl(`https://www.digikey.com/classic/ordering/fastadd.aspx?${params.toString()}`, { surface: 'bom' });
}
