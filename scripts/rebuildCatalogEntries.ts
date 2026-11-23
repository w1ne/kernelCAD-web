// SPDX-License-Identifier: MIT
// Rebuild only EXISTING edited catalog records; reuse the same canonical
// buildCatalogAsset + serializeCatalogIndex as the full index builder.
// Usage: node --import tsx scripts/rebuildCatalogEntries.ts kit/id [kit/id ...]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogAsset, serializeCatalogIndex } from '../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema } from '../src/shared/assets/catalogSchema';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const path = join(root, 'catalog/index.json');
const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
const slugs = [...new Set(process.argv.slice(2))];
if (!slugs.length) throw new Error('supply one or more kit/id slugs');
await initOcct();
for (const slug of slugs) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(slug)) throw new Error('invalid slug: ' + slug);
  const [kit,id] = slug.split('/');
  const filename = `catalog/kits/${kit}/${id}.kcad.ts`;
  if (!existsSync(join(root, filename))) throw new Error('source missing: ' + filename);
  const position = index.assets.findIndex((asset) => asset.kit===kit && asset.id===id);
  if (position < 0) throw new Error('asset not in index: ' + slug);
  const asset=await buildCatalogAsset(root,filename);
  index.assets[position]=asset;
  console.log(`${slug}: ${asset.stats.triangles} triangles, source ${asset.sourceSha256.slice(0,12)}`);
}
writeFileSync(path,serializeCatalogIndex(CatalogIndexSchema.parse(index)));
console.log('updated',slugs.length,'catalog entries, retained all other records');
