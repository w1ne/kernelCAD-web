// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CatalogIndexSchema } from '../../src/shared/assets/catalogSchema';
import { join, resolve } from 'node:path';
import { renderManufacturingCatalogPreview, MANUFACTURING_PREVIEW } from './manufacturingCatalogPreview';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8J0AAAAASUVORK5CYII=', 'base64');

describe('manufacturing catalog preview source/provenance', () => {
  it('uses the gallery publish preset, 4:3 frame, and no baked labels', async () => {
    const calls: unknown[] = [];
    const result = await renderManufacturingCatalogPreview('catalog/kits/standard-components/angle-bracket.kcad.ts', async input => {
      calls.push(input);
      const file = join(input.out_dir!, 'hero.png');
      writeFileSync(file, png);
      return { ok: true, images: [{ name: 'hero', path: file, description: '' }] } as never;
    });
    expect(result).toEqual(png);
    expect(MANUFACTURING_PREVIEW.width / MANUFACTURING_PREVIEW.height).toBe(4 / 3);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      file: expect.stringContaining('standard-components/angle-bracket.kcad.ts'),
      preset: 'publish', background: '#F4ECD7', width: 720, height: 540, no_mechanism_check: true,
    });
    expect(JSON.stringify(calls[0])).not.toMatch(/label|caption|watermark/);
  });
  it('refuses missing hero or failed CAD verification rather than publishing a false preview', async () => {
    await expect(renderManufacturingCatalogPreview('missing.kcad.ts', async () => ({ ok: false, mechanism: 'broken', images: [], error: 'geometry failure' }) as never))
      .rejects.toThrow('geometry failure');
  });
});


describe('committed manufacturing-component catalog renders', () => {
  it('publishes source-bound 4:3 PNGs with the same neutral backdrop for all 50 components', async () => {
    const root = resolve(import.meta.dirname, '../..');
    const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(root, 'catalog/index.json'), 'utf8')));
    const rows = index.assets.filter(row => row.kit === 'standard-components');
    expect(rows.length).toBeGreaterThanOrEqual(50);
    for (const row of rows) {
      const source = readFileSync(join(root, row.source));
      expect(createHash('sha256').update(source).digest('hex'), row.id).toBe(row.sourceSha256);
      const png = readFileSync(join(root, 'catalog/kits', row.kit, 'previews', `${row.id}.png`));
      const metadata = await sharp(png).metadata();
      expect([metadata.width, metadata.height], row.id).toEqual([720, 540]);
      const topLeft = await sharp(png).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      expect(Array.from(topLeft), row.id).toEqual([244, 236, 215]);
    }
  }, 30_000);
});
