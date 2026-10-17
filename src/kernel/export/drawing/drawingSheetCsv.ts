// SPDX-License-Identifier: MIT
// Fusion exports a drawing table as CSV. When the sheet has a parts list,
// that table is the file. Otherwise the file is every text label on the sheet
// (dimensions, title block, notes).

function cell(value: string): string {
  const text = value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function bomRows(svg: string): string[][] {
  return [...svg.matchAll(/data-kc-bom-item="([^"]*)"[^>]*data-kc-bom-name="([^"]*)"[^>]*data-kc-bom-qty="([^"]*)"[^>]*data-kc-bom-material="([^"]*)"/g)]
    .map((m) => [m[1], m[2], m[3], m[4]]);
}

/** CSV of the drawing table, or of the sheet text when there is no table. */
export function drawingSheetCsv(svg: string): string {
  const bom = bomRows(svg);
  if (bom.length > 0) {
    return ['ITEM,NAME,QTY,MATERIAL', ...bom.map((row) => row.map(cell).join(','))].join('\n') + '\n';
  }
  const texts = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => cell(m[1].trim())).filter((t) => t.length > 0);
  return ['TEXT', ...texts].join('\n') + '\n';
}
