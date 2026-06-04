import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
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
});
