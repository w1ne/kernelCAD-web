// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/refreshCatalog.ts
//
// Slice E — TS-native catalog refresh. Pulls the four upstream HTML pages
// declared in catalogs/sources-manifest.json, recomputes sha256 digests,
// re-derives catalog.json from parsed HTML, and writes raw snapshots to
// sources-snapshot/. 24h cache by default; --force bypasses.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = 'src/agent/skills/kernelcad-shopcheck/catalogs';
const TTL_MS = 24 * 60 * 60 * 1000;

interface ManifestSource { url: string; lastFetched: string; sha256: string }
interface VendorManifest { sources: ManifestSource[]; cacheTtlHours: number }
interface Manifest { vendors: Record<string, VendorManifest> }

export function computeSha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export interface SkuRow {
  displayName: string;
  category: string;
  thicknessesIn: number[];
  services: string[];
}

/** Best-effort SKU + thickness extractor — looks for h2 headings followed
 *  by a list of thickness rows. Generic and tolerant; missing data falls
 *  back to an empty row rather than throwing. */
export function parseMaterialsPage(html: string): Record<string, SkuRow> {
  const $ = cheerio.load(html);
  const skus: Record<string, SkuRow> = {};
  $('h2').each((_, h2) => {
    const displayName = $(h2).text().trim();
    if (!displayName) return;
    const sku = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const thicknessesIn: number[] = [];
    $(h2).next('ul').find('li').each((_, li) => {
      const m = $(li).text().match(/([\d.]+)\s*in/);
      if (m) thicknessesIn.push(parseFloat(m[1]));
    });
    if (thicknessesIn.length > 0) {
      skus[sku] = { displayName, category: 'metal', thicknessesIn, services: ['laser', 'bending'] };
    }
  });
  return skus;
}

export function parseLaserPage(html: string): { thicknessRangeIn: [number, number] } {
  const m = html.match(/Thickness range:\s*([\d.]+)\s*-\s*([\d.]+)\s*in/);
  return { thicknessRangeIn: m ? [parseFloat(m[1]), parseFloat(m[2])] : [0.015, 0.750] };
}

function latestSnapshotName(vendor: string, suffix: string): string {
  const dir = join(ROOT, 'vendors', vendor, 'sources-snapshot');
  const files = readdirSync(dir).filter(f => f.endsWith(suffix)).sort();
  if (files.length === 0) throw new Error(`refreshCatalog: no snapshot matching *${suffix}`);
  return files[files.length - 1];
}

async function refreshOne(vendor: string, manifest: VendorManifest, force: boolean): Promise<void> {
  const now = Date.now();
  for (const src of manifest.sources) {
    const lastMs = new Date(src.lastFetched).getTime();
    if (!force && now - lastMs < TTL_MS) {
      console.log(`[shopcheck:refresh] ${vendor}: ${src.url} — fresh (skip)`);
      continue;
    }
    console.log(`[shopcheck:refresh] ${vendor}: fetch ${src.url}`);
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`refreshCatalog: ${src.url} returned ${res.status}`);
    const body = await res.text();
    const sha = computeSha256(body);
    const date = new Date().toISOString().slice(0, 10);
    const slug = src.url
      .replace(/^https?:\/\/[^/]+\//, '')
      .replace(/\/$/, '')
      .replace(/[/]/g, '-')
      .replace(/^-|-$/g, '') || 'index';
    const snapshotPath = join(ROOT, 'vendors', vendor, 'sources-snapshot', `${date}-${slug}.html`);
    if (!existsSync(dirname(snapshotPath))) mkdirSync(dirname(snapshotPath), { recursive: true });
    writeFileSync(snapshotPath, body, 'utf-8');
    src.lastFetched = new Date().toISOString();
    src.sha256 = sha;
  }

  // Re-derive catalog.json from the materials snapshot if available.
  const matSnap = manifest.sources.find(s => s.url.endsWith('/materials/'));
  if (matSnap) {
    try {
      const matFileName = latestSnapshotName(vendor, '-materials.html');
      const matHtml = readFileSync(join(ROOT, 'vendors', vendor, 'sources-snapshot', matFileName), 'utf-8');
      const skus = parseMaterialsPage(matHtml);
      if (Object.keys(skus).length > 0) {
        writeFileSync(
          join(ROOT, 'vendors', vendor, 'catalog.json'),
          JSON.stringify({
            schemaVersion: 1,
            lastFetched: matSnap.lastFetched,
            sourceSha256: matSnap.sha256,
            skus,
          }, null, 2) + '\n',
        );
        console.log(`[shopcheck:refresh] ${vendor}: re-derived catalog.json (${Object.keys(skus).length} SKUs)`);
      } else {
        console.log(`[shopcheck:refresh] ${vendor}: materials page parser found no SKUs; leaving catalog.json untouched.`);
      }
    } catch (e) {
      console.log(`[shopcheck:refresh] ${vendor}: catalog re-derivation skipped (${(e as Error).message})`);
    }
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const manifest: Manifest = JSON.parse(readFileSync(join(ROOT, 'sources-manifest.json'), 'utf-8'));
  for (const [vendor, m] of Object.entries(manifest.vendors)) {
    await refreshOne(vendor, m, force);
  }
  writeFileSync(join(ROOT, 'sources-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('[shopcheck:refresh] done.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e: Error) => {
    console.error(e);
    process.exit(1);
  });
}
