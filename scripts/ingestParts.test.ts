// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OcctBackend, initOcct } from '../src/kernel/backends/occt/occtBackend';
import { ingestDirectory } from './ingestParts';

describe('ingestParts', () => {
  it('ingests a STEP dir into a /v1/parts catalog with measured attrs + synthesized connectors', async () => {
    await initOcct();
    const src = mkdtempSync(join(tmpdir(), 'kc-ingest-src-'));
    const out = mkdtempSync(join(tmpdir(), 'kc-ingest-out-'));

    // A bored plate (through-hole) so synthesis emits bbox faces + a bore.
    const plate = OcctBackend.box(40, 40, 5).subtract(
      OcctBackend.cylinder(8, 4).translate(20, 20, -1),
    );
    const bytes = await plate.exportSTEPAsync();
    // Folder layout drives category/family with no sidecar: <src>/bracket/mount/.
    mkdirSync(join(src, 'bracket', 'mount'), { recursive: true });
    writeFileSync(join(src, 'bracket', 'mount', 'mount-plate.step'), Buffer.from(bytes));

    const records = await ingestDirectory(src, out, {
      baseUrl: 'https://parts.test',
      license: 'CC-BY-3.0',
      attribution: 'fixture',
    });

    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.id).toBe('mount-plate');
    expect(r.category).toBe('bracket');
    expect(r.family).toBe('mount');
    expect(r.license).toBe('CC-BY-3.0');
    expect(r.attribution).toBe('fixture');
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.byteSize).toBeGreaterThan(0);
    expect(r.stepUrl).toBe('https://parts.test/step/mount-plate.step');
    // Measured, not guessed.
    expect(r.attributes.bboxXmm).toBeGreaterThan(39);
    expect(r.attributes.bboxZmm).toBeCloseTo(5, 0);
    // Synthesized frames from the geometry.
    expect(r.connectors.map((c) => c.name)).toEqual(
      expect.arrayContaining(['mating-face', 'top-face', 'bore']),
    );

    // Deployable tree.
    expect(existsSync(join(out, 'step', 'mount-plate.step'))).toBe(true);
    expect(existsSync(join(out, 'v1', 'parts', 'mount-plate.json'))).toBe(true);
    expect(existsSync(join(out, 'functions', 'v1', 'parts', '[[path]].ts'))).toBe(true);
    const index = JSON.parse(
      readFileSync(join(out, 'v1', 'catalog', 'parts.index.json'), 'utf8'),
    ) as { catalog: { partCount: number }; items: Array<{ id: string }> };
    expect(index.catalog.partCount).toBe(1);
    expect(index.items[0].id).toBe('mount-plate');
    const sha = JSON.parse(readFileSync(join(out, 'sha256-manifest.json'), 'utf8'));
    expect(sha['mount-plate']).toBe(r.sha256);
  });
});
