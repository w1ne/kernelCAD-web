// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/ingestElectronics.ts
//
// Ingest the electronics parts (chips, modules, IC packages) declared in
// scripts/electronics-parts.json into the kernelCAD parts catalog. Mirrors the
// FreeCAD-library ingest, but the source models are fetched at run time from a
// CC-licensed remote (KiCad packages3D) per the manifest — nothing binary is
// committed to this repo. Each part becomes a catalog record with a MEASURED
// bbox (not guessed), so the same `find_part` / `fetch_part` path that serves
// mechanical parts now serves the chips/peripherals LabWired supports.
//
// Usage:
//   npx tsx scripts/ingestElectronics.ts <outDir> \
//     [--manifest scripts/electronics-parts.json] \
//     [--base-url https://kernelcad-parts.pages.dev]
//
// Run AFTER the mechanical ingest into the SAME outDir to merge (this appends
// records and rewrites the index to include both); or into its own dir to
// inspect electronics alone.

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ingestDirectory, type CatalogRecord } from './ingestParts';

interface ManifestPart {
  id: string;
  name: string;
  family: string;
  mpn: string;
  /** Path appended to the manifest baseModelUrl. Ignored if `url` is set. */
  model?: string;
  /** Full model URL (overrides baseModelUrl + model) — for parts from a
   *  different CC-licensed source than the default catalog base. */
  url?: string;
  tags?: string[];
  /** Per-part license / attribution override (e.g. an MIT Adafruit STEP in an
   *  otherwise CC-BY-SA KiCad manifest). Falls back to the manifest defaults. */
  license?: string;
  attribution?: string;
}
interface Manifest {
  baseModelUrl: string;
  license: string;
  attribution: string;
  parts: ManifestPart[];
}

function parseArgs(argv: string[]) {
  const out = { outDir: '', manifest: 'scripts/electronics-parts.json', baseUrl: 'https://kernelcad-parts.pages.dev' };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest') out.manifest = argv[++i];
    else if (argv[i] === '--base-url') out.baseUrl = argv[++i];
    else rest.push(argv[i]);
  }
  out.outDir = rest[0] ?? '';
  return out;
}

/**
 * Fetch each manifest model into a temp dir as `<id>.step` + an `<id>.meta.json`
 * sidecar (category Electronics + family/license/attribution/mpn), then hand the
 * dir to ingestDirectory which measures + records each. Returns the records.
 */
export async function ingestElectronics(
  manifestPath: string,
  outDir: string,
  baseUrl: string,
): Promise<CatalogRecord[]> {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const src = mkdtempSync(join(tmpdir(), 'kc-electronics-'));
  mkdirSync(src, { recursive: true });

  let ok = 0;
  for (const part of manifest.parts) {
    // Full per-part URL wins (different CC source); else baseModelUrl + model.
    const url = part.url ?? `${manifest.baseModelUrl.replace(/\/$/, '')}/${part.model}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`SKIP ${part.id}: fetch ${url} -> HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Guard against an HTML 404 page slipping through as a "200" on some CDNs.
    if (!buf.subarray(0, 64).toString('latin1').includes('ISO-10303-21')) {
      console.warn(`SKIP ${part.id}: ${url} did not return a STEP file`);
      continue;
    }
    writeFileSync(join(src, `${part.id}.step`), buf);
    writeFileSync(
      join(src, `${part.id}.meta.json`),
      JSON.stringify(
        {
          id: part.id,
          name: part.name,
          category: 'Electronics',
          family: part.family,
          tags: part.tags ?? ['electronics', part.family],
          attributes: { mpn: part.mpn },
          license: part.license ?? manifest.license,
          attribution: part.attribution ?? manifest.attribution,
        },
        null,
        2,
      ),
    );
    ok++;
  }
  console.log(`fetched ${ok}/${manifest.parts.length} electronics models -> ${src}`);

  // Ingest into a temp dir, then MERGE into outDir so we never clobber an
  // existing (e.g. mechanical) catalog already written there. ingestDirectory
  // rewrites parts.index.json from only its own records, so a naive second run
  // into the same dir would drop everything ingested before it.
  const tmpOut = mkdtempSync(join(tmpdir(), 'kc-elec-out-'));
  const records = await ingestDirectory(src, tmpOut, {
    baseUrl,
    license: manifest.license,
    attribution: manifest.attribution,
  });

  mergeCatalog(tmpOut, outDir, records);
  return records;
}

/** Copy a freshly-ingested catalog (step/ + v1/parts/) into `outDir` and rewrite
 *  the discovery index + sha manifest as the UNION of what was already there and
 *  the new records (new records win on id collision). */
function mergeCatalog(fromDir: string, outDir: string, fresh: CatalogRecord[]): void {
  mkdirSync(join(outDir, 'step'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'catalog'), { recursive: true });

  for (const r of fresh) {
    copyFileSync(join(fromDir, 'step', `${r.id}.step`), join(outDir, 'step', `${r.id}.step`));
    copyFileSync(join(fromDir, 'v1', 'parts', `${r.id}.json`), join(outDir, 'v1', 'parts', `${r.id}.json`));
  }

  const indexPath = join(outDir, 'v1', 'catalog', 'parts.index.json');
  const freshIds = new Set(fresh.map((r) => r.id));
  let existing: CatalogRecord[] = [];
  if (existsSync(indexPath)) {
    try {
      existing = (JSON.parse(readFileSync(indexPath, 'utf8')) as { items?: CatalogRecord[] }).items ?? [];
    } catch {
      existing = [];
    }
  }
  const merged = [...existing.filter((r) => !freshIds.has(r.id)), ...fresh];
  writeFileSync(indexPath, JSON.stringify({ catalog: { partCount: merged.length }, items: merged }, null, 2));

  const shaPath = join(outDir, 'sha256-manifest.json');
  let sha: Record<string, string> = {};
  if (existsSync(shaPath)) {
    try {
      sha = JSON.parse(readFileSync(shaPath, 'utf8')) as Record<string, string>;
    } catch {
      sha = {};
    }
  }
  for (const r of fresh) sha[r.id] = r.sha256;
  writeFileSync(shaPath, JSON.stringify(sha, null, 2));

  // Serving shim: copy if the target doesn't already have one.
  const worker = join(outDir, '_worker.js');
  if (!existsSync(worker) && existsSync(join(fromDir, '_worker.js'))) {
    copyFileSync(join(fromDir, '_worker.js'), worker);
  }
  console.log(`merged ${fresh.length} records into ${outDir} (catalog now ${merged.length} parts)`);
}

const invokedDirectly =
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /ingestElectronics\.(ts|js)$/.test(process.argv[1]);

if (invokedDirectly) {
  const { outDir, manifest, baseUrl } = parseArgs(process.argv.slice(2));
  if (!outDir) {
    console.error('usage: ingestElectronics <outDir> [--manifest PATH] [--base-url URL]');
    process.exit(1);
  }
  ingestElectronics(manifest, outDir, baseUrl)
    .then((records) => {
      console.log(`ingested ${records.length} electronics parts -> ${outDir}`);
      for (const r of records) {
        const a = r.attributes;
        console.log(`  ${r.id}  ${a.bboxXmm}x${a.bboxYmm}x${a.bboxZmm}mm  (${r.byteSize}b)`);
      }
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
