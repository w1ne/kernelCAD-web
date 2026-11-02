// SPDX-License-Identifier: MIT
// Volume audit of the kernelCAD asset catalog: for every row of catalog/index.json
// record LOAD (source resolves + evaluates), KNOBS (param table matches the index),
// MESH (low-poly GLB renders real geometry), and the failure mode when one fails.
//   npx tsx audit-assets.ts [--out out.json] [--only kit/id] [--limit N]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema } from '../src/shared/assets/catalogSchema';
import { glbTriangles } from '../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

interface Row {
  kit: string;
  id: string;
  loadOk: boolean;
  knobsOk: boolean;
  meshOk: boolean;
  triangles: number;
  budget: number;
  indexParams: string[];
  builtParams: string[];
  indexTriangles: number;
  failure: string | null;
  detail: string | null;
  ms: number;
}

const index = CatalogIndexSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')),
);
const only = flag('--only');
const limit = Number(flag('--limit') ?? '0');
let rows = index.assets.map((a) => ({ kit: a.kit, id: a.id, asset: a }));
if (only) rows = rows.filter((r) => `${r.kit}/${r.id}` === only);
if (limit > 0) rows = rows.slice(0, limit);

await initOcct();

const out: Row[] = [];
for (const { kit, id, asset } of rows) {
  const t0 = Date.now();
  const row: Row = {
    kit, id,
    loadOk: false, knobsOk: false, meshOk: false,
    triangles: 0,
    budget: (asset as { triangleBudget?: number }).triangleBudget ?? 0,
    indexParams: (asset.params ?? []).map((p) => `${p.name}:${p.type}`).sort(),
    builtParams: [],
    indexTriangles: (asset as { stats?: { triangles?: number } }).stats?.triangles ?? 0,
    failure: null,
    detail: null,
    ms: 0,
  };
  try {
    const { asset: built, glb } = await buildCatalogAssetWithGlb(repoRoot, (asset as { source: string }).source);
    row.loadOk = true;

    row.builtParams = (built.params ?? []).map((p) => `${p.name}:${p.type}`).sort();
    if (row.builtParams.length > 0 && row.builtParams.join('|') === row.indexParams.join('|')) {
      row.knobsOk = true;
    } else if (row.builtParams.length === 0) {
      row.failure = 'knobs-none';
      row.detail = 'the evaluated source exposes no param table';
    } else {
      row.failure = 'knobs-mismatch';
      row.detail = `index [${row.indexParams.join(',')}] vs built [${row.builtParams.join(',')}]`;
    }

    const tris = await glbTriangles(glb);
    row.triangles = tris.length;
    if (tris.length === 0) {
      row.meshOk = false;
      if (row.failure === null) {
        row.failure = 'mesh-empty';
        row.detail = 'low-poly GLB carries no triangles';
      }
    } else if (glb.byteLength === 0) {
      row.meshOk = false;
      if (row.failure === null) { row.failure = 'mesh-empty'; row.detail = 'empty GLB bytes'; }
    } else {
      row.meshOk = true;
    }
  } catch (e) {
    row.loadOk = false;
    row.failure = 'load-threw';
    row.detail = (e instanceof Error ? e.message : String(e)).slice(0, 400);
  }
  row.ms = Date.now() - t0;
  out.push(row);
  console.log(`${row.loadOk ? 'L' : '-'}${row.knobsOk ? 'K' : '-'}${row.meshOk ? 'M' : '-'} ${kit}/${id} tris=${row.triangles} ${row.failure ?? ''} ${row.ms}ms`);
  if (only === undefined) {
    writeFileSync(flag('--out') ?? join(repoRoot, 'assets-audit.partial.json'), JSON.stringify(out, null, 2));
  }
}

const dest = flag('--out');
if (dest) {
  mkdirSync(dirname(resolve(dest)), { recursive: true });
  writeFileSync(resolve(dest), JSON.stringify(out, null, 2));
}
const pad = (s: string, n: number) => s.padEnd(n);
console.log('\n=== SUMMARY ===');
console.log(`total      ${out.length}`);
console.log(`load OK    ${out.filter((r) => r.loadOk).length}`);
console.log(`knobs OK   ${out.filter((r) => r.knobsOk).length}`);
console.log(`mesh OK    ${out.filter((r) => r.meshOk).length}`);
const byFailure = new Map<string, number>();
for (const r of out) {
  if (r.failure === null) continue;
  byFailure.set(r.failure, (byFailure.get(r.failure) ?? 0) + 1);
}
console.log('failures:');
for (const [k, v] of [...byFailure.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${pad(k, 18)} ${v}`);
