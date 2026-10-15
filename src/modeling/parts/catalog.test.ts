// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCatalog, resolveById, queryCatalog } from './catalog';

function makeFixtureCatalog(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kc-catalog-'));
  const idx = {
    schemaVersion: 1,
    records: [
      {
        id: 'iso-4762-m3x12',
        name: 'M3 × 12 SHCS',
        category: 'fastener',
        family: 'socket-head-cap-screw',
        standard: 'ISO 4762',
        tags: ['screw', 'metric', 'DIN 912'],
        attributes: { thread: 'M3', lengthMm: 12 },
        sha256: '0'.repeat(64),
        source: 'local-catalog' as const,
        license: 'MIT',
        connectors: ['head-bearing'],
      },
      {
        id: 'iso-4762-m4x16',
        name: 'M4 × 16 SHCS',
        category: 'fastener',
        family: 'socket-head-cap-screw',
        standard: 'ISO 4762',
        tags: ['screw', 'metric', 'DIN 912'],
        attributes: { thread: 'M4', lengthMm: 16 },
        sha256: '0'.repeat(64),
        source: 'local-catalog' as const,
        license: 'MIT',
        connectors: ['head-bearing'],
      },
    ],
  };
  mkdirSync(join(dir, 'socket-head-cap-screw'), { recursive: true });
  writeFileSync(join(dir, 'index.json'), JSON.stringify(idx));
  writeFileSync(join(dir, 'socket-head-cap-screw', 'iso-4762-m3x12.step'), Buffer.from('stub'));
  writeFileSync(join(dir, 'socket-head-cap-screw', 'iso-4762-m4x16.step'), Buffer.from('stub'));
  return dir;
}

describe('catalog resolver', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeFixtureCatalog();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads index.json with schemaVersion 1', () => {
    const cat = loadCatalog(dir);
    expect(cat.records.length).toBe(2);
  });

  it('resolveById returns the bundled record and its absolute STEP path', () => {
    const cat = loadCatalog(dir);
    const r = resolveById(cat, 'iso-4762-m3x12');
    expect(r).toBeDefined();
    expect(r!.record.id).toBe('iso-4762-m3x12');
    expect(r!.stepPath).toMatch(/socket-head-cap-screw\/iso-4762-m3x12\.step$/);
  });

  it('returns undefined for an unknown id', () => {
    const cat = loadCatalog(dir);
    expect(resolveById(cat, 'iso-4762-m100x999')).toBeUndefined();
  });

  it('queryCatalog AND-combines tokens and filters by category/family', () => {
    const cat = loadCatalog(dir);
    const r1 = queryCatalog(cat, 'M3 SHCS', { category: 'fastener' });
    expect(r1.map((r) => r.id)).toContain('iso-4762-m3x12');
    const r2 = queryCatalog(cat, 'M4', { family: 'socket-head-cap-screw' });
    expect(r2.map((r) => r.id)).toContain('iso-4762-m4x16');
  });

  it('aliases DIN 912 ↔ ISO 4762 via tag set', () => {
    const cat = loadCatalog(dir);
    const r = queryCatalog(cat, 'din 912 M3 12');
    expect(r.map((x) => x.id)).toContain('iso-4762-m3x12');
  });

  it('does not merge the committed seed into an explicit catalog dir', () => {
    const cat = loadCatalog(dir);
    expect(resolveById(cat, 'iso-4762-m2x4')).toBeUndefined();
    expect(cat.records.map((r) => r.id)).toEqual(['iso-4762-m3x12', 'iso-4762-m4x16']);
  });
});

describe('committed seed catalog fallback', () => {
  it('resolves iso-4762-m2x4 to a real local STEP without the generated catalog', () => {
    const cat = loadCatalog();
    const r = resolveById(cat, 'iso-4762-m2x4');
    expect(r).toBeDefined();
    expect(r!.record.id).toBe('iso-4762-m2x4');
    expect(r!.record.source).toBe('local-catalog');
    expect(r!.record.family).toBe('socket-head-cap-screw');
    expect(existsSync(r!.stepPath)).toBe(true);
    expect(r!.stepPath).toMatch(/iso-4762-m2x4\.step$/);
  });
});

describe('bundled SG90 discovery', () => {
  it('finds the community reference body and horn by SG90 query and exact id', () => {
    const cat = loadCatalog();
    expect(queryCatalog(cat, 'SG90').map(r => r.id)).toEqual(expect.arrayContaining(['sg90-servo', 'sg90-horn-single-arm']));
    for (const id of ['sg90-servo', 'sg90-horn-single-arm']) {
      const found = resolveById(cat, id)!;
      expect(found.record.licenseClass).toBe('share-alike');
      expect(found.record.license).toBe('CC-BY-SA-4.0');
      expect(found.stepPath).toMatch(/\.step$/);
    }
  });

  it('has one SG90 servo entry; the old sg90-micro-servo id is an alias of it', () => {
    const cat = loadCatalog();
    const servos = queryCatalog(cat, 'SG90', { limit: 50 }).filter(r => r.family === 'micro-servo');
    expect(servos.map(r => r.id)).toEqual(['sg90-servo']);
    expect(queryCatalog(cat, 'SG90', { limit: 50 }).map(r => r.id).sort()).toEqual(['sg90-horn-single-arm', 'sg90-servo']);
    expect(cat.records.some(r => r.id === 'sg90-micro-servo')).toBe(false);

    const alias = resolveById(cat, 'sg90-micro-servo')!;
    const canonical = resolveById(cat, 'sg90-servo')!;
    expect(alias.record.id).toBe('sg90-servo');
    expect(alias.stepPath).toBe(canonical.stepPath);
    expect(existsSync(alias.stepPath)).toBe(true);
    // The electrical facts of the old electronics entry live on the one record.
    expect(alias.record.attributes).toMatchObject({
      mpn: 'SG90', wireGround: 'brown', wireVplus: 'red', wirePwm: 'orange', harnessPitchMm: 2.54, harnessLengthMm: 250,
    });
  });
});
