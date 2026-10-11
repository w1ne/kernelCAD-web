// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// A small, reproducible envelope catalog for the installation example/tests.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { SEED_FAMILIES } from './generateSeedCatalog';
import type { PartRecord } from '../src/shared/parts/types';

export async function generateFastenerInstallationCatalog(outDir: string): Promise<void> {
  await initOcct();
  const selections = [
    { family: 'socket-head-cap-screw', args: { thread: 'M3', lengthMm: 10 } },
    { family: 'socket-head-cap-screw', args: { thread: 'M3', lengthMm: 6 } },
    { family: 'hex-nut', args: { thread: 'M3' } },
    { family: 'flat-washer', args: { thread: 'M3' } },
  ];
  mkdirSync(outDir, { recursive: true });
  const indexPath = join(outDir, 'index.json');
  const existing = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, 'utf8')) as { records: PartRecord[] }).records : [];
  const records = new Map(existing.map(r => [r.id, r]));
  for (const selection of selections) {
    const family = SEED_FAMILIES.find(f => f.id === selection.family)!;
    const built = await family.generate(selection.args);
    const sha256 = createHash('sha256').update(built.stepBytes).digest('hex');
    const manifest = { schemaVersion: 1, partId: built.record.id, family: family.id,
      geometrySha256: sha256, connectors: built.connectors, license: 'MIT' };
    const record: PartRecord = { ...built.record, sha256, source: 'local-catalog', connectorManifest: manifest };
    records.set(record.id, record);
    const dir = join(outDir, family.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${record.id}.step`), built.stepBytes);
    writeFileSync(join(dir, `${record.id}.json`), JSON.stringify(manifest, null, 2));
  }
  writeFileSync(indexPath, JSON.stringify({ schemaVersion: 1, records: [...records.values()] }, null, 2));
}
if (process.argv[1]?.endsWith('generateFastenerInstallationCatalog.ts')) {
  await generateFastenerInstallationCatalog(process.argv[2] ?? 'assets/parts');
}
