// SPDX-License-Identifier: MIT
// Refresh only the SG90 committed seed; leave unrelated seed records intact.
// Downloads the pinned upstream STEP files, checks them against
// assets/reference-parts/sg90/sha256.json, translates them and writes
// assets/parts-seed/<family>/<id>.{step,json} plus the index records.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { SG90_PARTS, normalizeSg90, sg90UpstreamUrl } from './sg90Catalog';
import type { PartRecord } from '../src/shared/parts/types';

const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const out = process.argv[2] ?? 'assets/parts-seed';
const expected = JSON.parse(readFileSync('assets/reference-parts/sg90/sha256.json', 'utf8')) as Record<string, string>;
const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) as { schemaVersion: 1; records: PartRecord[] };
for (const part of SG90_PARTS) {
  const res = await fetch(sg90UpstreamUrl(part));
  if (!res.ok) throw new Error(`${part.upstreamFile}: HTTP ${res.status}`);
  const upstream = new Uint8Array(await res.arrayBuffer());
  if (sha256(upstream) !== expected[part.upstreamFile]) throw new Error(`${part.upstreamFile}: sha256 mismatch with sha256.json`);
  const stepBytes = await normalizeSg90(part, upstream);
  const record: PartRecord = { ...part.record, source: 'local-catalog', sha256: sha256(stepBytes) };
  const dir = join(out, part.family);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${record.id}.step`), stepBytes);
  writeFileSync(join(dir, `${record.id}.json`), JSON.stringify({ schemaVersion: 1, partId: record.id, family: part.family, geometrySha256: record.sha256, connectors: part.connectors, license: record.license, attribution: record.attribution }, null, 2) + '\n');
  index.records = index.records.filter(r => r.id !== record.id);
  index.records.push(record);
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 2) + '\n');
