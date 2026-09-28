// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/pdf/pdfDocument.ts
//
// Minimal PDF 1.4 file writer: catalog, page tree, pages with one content
// stream each, the two standard Helvetica faces (WinAnsiEncoding, not
// embedded), a document information dictionary and a classic cross-reference
// table. Content streams are Flate-compressed. Output is byte-deterministic:
// no timestamps, no random file identifier.

import { zlibSync } from 'fflate';

export interface PdfPageSpec {
  /** Page size in PostScript points (1/72 in). */
  widthPt: number;
  heightPt: number;
  /** Page content stream (PDF operators). */
  content: string;
  /** Clickable URI links: rect is [x0, y0, x1, y1] in points, y up. */
  links?: readonly PdfLink[];
}

export interface PdfLink {
  rect: readonly [number, number, number, number];
  uri: string;
}

/** PDF literal string: ASCII with `\`, `(` and `)` escaped. */
const pdfLiteral = (s: string): string => `(${s.replace(/[\\()]/g, c => `\\${c}`)})`;

export interface PdfInfo {
  title?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

/** Font resource names the content streams may use. */
export const PDF_FONTS = {
  regular: 'F1',
  bold: 'F2',
} as const;

const latin1 = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

/** PDF text string as UTF-16BE hex with a byte-order mark (any Unicode). */
export function pdfTextString(s: string): string {
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

/** Format a number for a content stream: ≤4 decimals, no exponent, no -0. */
export function pdfNum(v: number): string {
  const r = Math.round(v * 10000) / 10000;
  if (Object.is(r, -0) || r === 0) return '0';
  return r.toFixed(4).replace(/\.?0+$/, '');
}

/** Serialise `pages` into a complete PDF file. */
export function writePdf(pages: readonly PdfPageSpec[], info: PdfInfo = {}, compress = true): Uint8Array {
  if (pages.length === 0) throw new Error('writePdf: at least one page is required');
  // Object numbers: 1 catalog, 2 page tree, 3 info, 4 F1, 5 F2, then
  // page/content pairs, then link annotations.
  const objects: Uint8Array[] = [];
  const pageIds = pages.map((_, i) => 6 + 2 * i);
  objects.push(latin1('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(latin1(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`));
  const infoEntries = Object.entries({
    Title: info.title, Subject: info.subject, Keywords: info.keywords,
    Creator: info.creator, Producer: info.producer,
  }).filter((e): e is [string, string] => e[1] !== undefined);
  objects.push(latin1(`<< ${infoEntries.map(([k, v]) => `/${k} ${pdfTextString(v)}`).join(' ')} >>`));
  objects.push(latin1('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  objects.push(latin1('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
  let nextAnnotId = 6 + 2 * pages.length;
  const annotations: Uint8Array[] = [];
  pages.forEach((page, i) => {
    const contentId = pageIds[i] + 1;
    const annotIds = (page.links ?? []).map(link => {
      annotations.push(latin1(
        `<< /Type /Annot /Subtype /Link /Rect [${link.rect.map(pdfNum).join(' ')}] /Border [0 0 0] ` +
        `/A << /S /URI /URI ${pdfLiteral(link.uri)} >> >>`,
      ));
      return nextAnnotId++;
    });
    objects.push(latin1(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNum(page.widthPt)} ${pdfNum(page.heightPt)}] ` +
      `/Resources << /ProcSet [/PDF /Text] /Font << /${PDF_FONTS.regular} 4 0 R /${PDF_FONTS.bold} 5 0 R >> >> ` +
      `${annotIds.length > 0 ? `/Annots [${annotIds.map(id => `${id} 0 R`).join(' ')}] ` : ''}` +
      `/Contents ${contentId} 0 R >>`,
    ));
    const raw = latin1(page.content);
    const data = compress ? zlibSync(raw, { level: 9 }) : raw;
    const head = latin1(`<< /Length ${data.length}${compress ? ' /Filter /FlateDecode' : ''} >>\nstream\n`);
    const tail = latin1('\nendstream');
    const body = new Uint8Array(head.length + data.length + tail.length);
    body.set(head, 0);
    body.set(data, head.length);
    body.set(tail, head.length + data.length);
    objects.push(body);
  });
  objects.push(...annotations);

  const chunks: Uint8Array[] = [latin1('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(offset);
    const head = latin1(`${i + 1} 0 obj\n`);
    const tail = latin1('\nendobj\n');
    chunks.push(head, body, tail);
    offset += head.length + body.length + tail.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  chunks.push(latin1(xref));

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
