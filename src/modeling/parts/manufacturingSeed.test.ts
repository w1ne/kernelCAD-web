// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The manufacturing-library model sources must resolve from the committed
// STEP seed. Production cannot depend on missing /v1/parts remote records.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { loadCatalog, resolveById, bundledSeedDir } from './catalog';

const ids = [
  'nema-17', 'nema-23',
  'heatset-m2-5-l3-8', 'heatset-m2-5-l5-7',
  'heatset-m3-l3-8', 'heatset-m3-l5-7',
  'heatset-m4-l3-8', 'heatset-m4-l5-7',
] as const;

const savedPartsUrl = process.env.KERNELCAD_PARTS_BASE_URL;
beforeAll(async () => {
  process.env.KERNELCAD_PARTS_BASE_URL = 'off';
  await initOcct();
}, 60_000);
afterAll(() => {
  if (savedPartsUrl === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
  else process.env.KERNELCAD_PARTS_BASE_URL = savedPartsUrl;
});

describe('manufacturing envelopes have committed MIT STEP geometry', () => {
  it.each(ids)('%s has hash-bound local geometry and connectors', (id) => {
    const local = loadCatalog(bundledSeedDir());
    const found = resolveById(local, id);
    expect(found, id).toBeDefined();
    const { record, stepPath } = found!;
    expect(record.license).toBe('MIT');
    expect(record.source).toBe('local-catalog');
    expect(createHash('sha256').update(readFileSync(stepPath)).digest('hex')).toBe(record.sha256);
    const manifest = JSON.parse(readFileSync(join(bundledSeedDir(), record.family, `${id}.json`), 'utf8'));
    expect(manifest.partId).toBe(id);
    expect(manifest.license).toBe('MIT');
    expect(manifest.connectors.length).toBeGreaterThan(0);
  });

  it('resolves both NEMA sizes and every advertised heat-set insert choice with the remote tier disabled', async () => {
    const api = createModelingApi({ session: new CaptureSession() });
    for (const call of [api.lib.standard.nema17, api.lib.standard.nema23]) {
      expect((await call()).id).toBeDefined();
    }
    for (const thread of ['M2.5', 'M3', 'M4'] as const) {
      for (const lengthMm of [3.8, 5.7]) {
        expect((await api.lib.standard.heatSetInsert({ thread, lengthMm })).id).toBeDefined();
      }
    }
  }, 120_000);
});
