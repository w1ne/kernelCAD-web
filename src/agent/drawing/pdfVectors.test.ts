// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/pdfVectors.test.ts
//
// Characterisation test for `readPdfPageVectors`: pins the vector/text
// extraction of the committed drawing fixtures (sha256 over a canonical,
// rounded serialisation) plus the PdfReadError messages for malformed bytes
// and out-of-range pages. Added before the function's phase split so the
// split can be verified as behaviour-preserving.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PdfReadError, readPdfPageVectors, type PdfPageVectors } from './pdfVectors';

const FIXTURES = fileURLToPath(new URL('../../../tests/fixtures/drawing-pdf/', import.meta.url));
const pdfOf = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, `${name}.pdf`)));

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

function canonical(r: PdfPageVectors): string {
  return JSON.stringify({
    page: r.page,
    pageCount: r.pageCount,
    widthMm: r6(r.widthMm),
    heightMm: r6(r.heightMm),
    paths: r.paths.map(p => ({
      points: p.points.map(([x, y]) => [r6(x), r6(y)]),
      closed: p.closed,
      widthMm: r6(p.widthMm),
      dash: p.dash.map(r6),
      stroked: p.stroked,
      filled: p.filled,
      curved: p.curved,
    })),
    texts: r.texts.map(t => ({ text: t.text, x: r6(t.x), y: r6(t.y), dir: [r6(t.dir[0]), r6(t.dir[1])], sizeMm: r6(t.sizeMm), widthMm: r6(t.widthMm) })),
    imageCount: r.imageCount,
    imageCoverage: r6(r.imageCoverage),
  });
}

const digest = (r: PdfPageVectors) => createHash('sha256').update(canonical(r)).digest('hex');

const FIXTURES_EXPECTED: Record<string, {
  digest: string;
  pageCount: number;
  widthMm: number;
  heightMm: number;
  pathCount: number;
  textCount: number;
  imageCount: number;
  imageCoverage: number;
  firstText: string;
}> = {
  'plate-with-holes': {
    digest: 'ccc4188b58294529d3e60b50ccb449226f79c246d8e6aa9bb4d9ace3a8e43724',
    pageCount: 1, widthMm: 297, heightMm: 210, pathCount: 77, textCount: 19, imageCount: 0, imageCoverage: 0,
    firstText: '⌀12 THRU',
  },
  'l-bracket': {
    digest: '604f70daa895a6e4906ab0589262d6b098c960f8ae5070b1c94af13f121abb9c',
    pageCount: 1, widthMm: 297, heightMm: 210, pathCount: 70, textCount: 20, imageCount: 0, imageCoverage: 0,
    firstText: '⌀6.5 THRU',
  },
  'turned-shaft': {
    digest: '65456605c1551b38e6a4819b0f4606e4571c59b2e07cc623d01c7125fcc43c2e',
    pageCount: 1, widthMm: 297, heightMm: 210, pathCount: 77, textCount: 18, imageCount: 0, imageCoverage: 0,
    firstText: '⌀10',
  },
  'raster-only': {
    digest: '471b8e8df644965792d1a35374a47f0f2da78b4ec4351de2b12705266ac5a24c',
    pageCount: 1, widthMm: 297.000013, heightMm: 210.000003, pathCount: 0, textCount: 0, imageCount: 1, imageCoverage: 1,
    firstText: '',
  },
};

describe('readPdfPageVectors', () => {
  for (const [name, expected] of Object.entries(FIXTURES_EXPECTED)) {
    it(`characterises ${name}.pdf`, async () => {
      const r = await readPdfPageVectors(pdfOf(name), 1);
      expect(r.page).toBe(1);
      expect(r.pageCount).toBe(expected.pageCount);
      expect(r6(r.widthMm)).toBe(expected.widthMm);
      expect(r6(r.heightMm)).toBe(expected.heightMm);
      expect(r.paths).toHaveLength(expected.pathCount);
      expect(r.texts).toHaveLength(expected.textCount);
      expect(r.imageCount).toBe(expected.imageCount);
      expect(r6(r.imageCoverage)).toBe(expected.imageCoverage);
      if (expected.firstText) expect(r.texts[0].text).toBe(expected.firstText);
      expect(digest(r)).toBe(expected.digest);
    });
  }

  it('rejects an out-of-range page with the exact message', async () => {
    await expect(readPdfPageVectors(pdfOf('plate-with-holes'), 2)).rejects.toMatchObject({
      name: 'PdfReadError',
      reason: 'page-out-of-range',
      message: 'page 2 is out of range — the document has 1 page(s).',
    });
  });

  it('rejects page 0 and non-integer pages as out of range', async () => {
    await expect(readPdfPageVectors(pdfOf('plate-with-holes'), 0)).rejects.toThrowError(
      new PdfReadError('page-out-of-range', 'page 0 is out of range — the document has 1 page(s).'),
    );
    await expect(readPdfPageVectors(pdfOf('plate-with-holes'), 1.5)).rejects.toThrowError(
      new PdfReadError('page-out-of-range', 'page 1.5 is out of range — the document has 1 page(s).'),
    );
  });

  it('rejects unreadable bytes as an unreadable PDF', async () => {
    await expect(readPdfPageVectors(new Uint8Array([1, 2, 3, 4, 5]), 1)).rejects.toThrowError(
      new PdfReadError('unreadable', 'not a readable PDF: Invalid PDF structure.'),
    );
  });
});
