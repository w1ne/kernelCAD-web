// SPDX-License-Identifier: MIT
// src/kernel/export/order/handoffs.ts
// Vendor paste texts for purchased BOM rows. Formats from vendor docs
// (checked 2026-10-17): McMaster paste = PartNumber lines, quantity means
// PACKS, so L1 never writes a quantity unless pack size is known catalog
// data; Mouser = `MPN|qty`; DigiKey = `part,qty`. The pack-size caveat
// lives in the pack README/manifest and the Order sheet, never in the
// pasteable text (the paste box parses the whole text).

/** The fields the handoff builders read. The agent-side `BomRow`
 *  (src/agent/script-runtime/bom.ts) satisfies this structurally; the shape
 *  is redeclared here because src/kernel must not import src/agent
 *  (layering rule) — same split as DrawingBomRow in drawingExplode.ts. */
export interface HandoffBomRow {
  kind: 'fabricated' | 'purchased';
  quantity: number;
  catalog?: { partNumber: string | null };
}

export interface Handoffs {
  mcmaster: string | null;
  mouser: string | null;
  digikey: string | null;
}

function withPartNumber(rows: readonly HandoffBomRow[]): { partNumber: string; quantity: number }[] {
  const out: { partNumber: string; quantity: number }[] = [];
  for (const r of rows) {
    if (r.kind !== 'purchased') continue;
    const pn = r.catalog?.partNumber?.trim();
    if (pn !== undefined && pn.length > 0) out.push({ partNumber: pn, quantity: r.quantity });
  }
  return out;
}

export function buildHandoffs(rows: readonly HandoffBomRow[]): Handoffs {
  const items = withPartNumber(rows);
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
  return `https://www.digikey.com/classic/ordering/fastadd.aspx?${params.toString()}`;
}
