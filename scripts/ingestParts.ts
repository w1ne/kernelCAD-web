// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/ingestParts.ts
//
// Ingest a directory of off-the-shelf STEP files into a self-hosted parts
// catalog that kernelCAD's remote tier can consume directly — same `/v1/parts`
// schema the bundled remote adapter already speaks, so the output is a drop-in
// source: point KERNELCAD_PARTS_BASE_URL at the deployed catalog and stop.
//
// Reuses the EXACT runtime pipeline that enriches remotely-fetched parts:
//   inspectStepFile  → bbox + cylindrical holes (measured, not guessed)
//   synthesizeConnectorsFromReport → mating-face / top-face / bolt-holes-N / bore
//
// Each ingested STEP yields: a copied .step, a per-part detail JSON, an entry in
// parts.index.json, and a sha256. An optional `<name>.meta.json` sidecar beside
// a STEP overrides any derived field (id, name, category, family, standard,
// tags, attributes, license, attribution).
//
// Seed it from any license-clean source you control — e.g. the CC-BY FreeCAD
// parts_library (github.com/FreeCAD/FreeCAD-library) plus your own STEP — so the
// catalog is richer than a third-party API AND owned by you.
//
// Usage:
//   npx tsx scripts/ingestParts.ts <srcDir> <outDir> \
//     [--base-url https://parts.example.com] [--license CC-BY-3.0] \
//     [--attribution "FreeCAD parts_library"]

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, relative, basename, extname, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectStepFile } from '../src/agent/inspect/inspectStep';
import { synthesizeConnectorsFromReport } from '../src/modeling/parts/synthesizeConnectors';

// -----------------------------------------------------------------------------
// Types — the served record matches the remote adapter's StepPartsRecord shape.
// -----------------------------------------------------------------------------

export interface IngestSidecar {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  family?: string;
  standard?: string;
  tags?: string[];
  attributes?: Record<string, number | string>;
  license?: string;
  attribution?: string;
}

export interface CatalogRecord {
  id: string;
  name: string;
  category: string;
  family: string;
  standard?: string;
  tags: string[];
  attributes: Record<string, number | string>;
  stepUrl: string;
  sha256: string;
  byteSize: number;
  license: string;
  attribution?: string;
  /** Pre-synthesized so a consumer can skip re-inspection; the runtime adapter
   *  still re-synthesizes on fetch, so this is richness, not a contract. */
  connectors: { name: string; origin: [number, number, number]; axis: [number, number, number] }[];
}

export interface IngestOpts {
  baseUrl: string;
  license: string;
  attribution?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanize(s: string): string {
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function listStepFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listStepFiles(abs));
    else if (/\.(step|stp)$/i.test(entry.name)) out.push(abs);
  }
  return out;
}

function loadSidecar(stepPath: string): IngestSidecar {
  const sidecar = stepPath.replace(/\.(step|stp)$/i, '.meta.json');
  if (!existsSync(sidecar)) return {};
  try {
    return JSON.parse(readFileSync(sidecar, 'utf8')) as IngestSidecar;
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------------
// Ingest one STEP → a catalog record (measured attributes + synthesized frames)
// -----------------------------------------------------------------------------

export async function ingestStepFile(
  stepPath: string,
  srcRoot: string,
  opts: IngestOpts,
): Promise<{ record: CatalogRecord; bytes: Buffer }> {
  const bytes = readFileSync(stepPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const meta = loadSidecar(stepPath);

  const baseName = basename(stepPath, extname(stepPath));
  const id = meta.id ?? slugify(baseName);
  // Derive category/family from the source folder layout when no sidecar:
  // <srcRoot>/<category>/<family>/part.step
  const relParts = relative(srcRoot, dirname(stepPath)).split(/[\\/]/).filter(Boolean);
  const rootName = slugify(basename(srcRoot)) || 'imported';
  const category = meta.category ?? relParts[0] ?? rootName;
  const family = meta.family ?? relParts[relParts.length - 1] ?? category;

  const report = await inspectStepFile(stepPath);
  const solid = [...report.solids].sort((a, b) => b.volumeMm3 - a.volumeMm3)[0];
  const conns = synthesizeConnectorsFromReport(report, id);

  const measured: Record<string, number> = solid
    ? {
        bboxXmm: Math.round((solid.bboxExact.max[0] - solid.bboxExact.min[0]) * 100) / 100,
        bboxYmm: Math.round((solid.bboxExact.max[1] - solid.bboxExact.min[1]) * 100) / 100,
        bboxZmm: Math.round((solid.bboxExact.max[2] - solid.bboxExact.min[2]) * 100) / 100,
        volumeMm3: Math.round(solid.volumeMm3 * 100) / 100,
        solidCount: report.solidCount,
        holeCount: solid.holes.length,
      }
    : { solidCount: report.solidCount };

  const record: CatalogRecord = {
    id,
    name: meta.name ?? humanize(baseName),
    category,
    family,
    tags: meta.tags ?? Array.from(new Set([category, family, ...relParts].map(slugify).filter(Boolean))),
    attributes: { ...measured, ...(meta.attributes ?? {}) },
    stepUrl: `${opts.baseUrl.replace(/\/$/, '')}/step/${id}.step`,
    sha256,
    byteSize: bytes.length,
    license: meta.license ?? opts.license,
    connectors: conns.map((c) => ({ name: c.name, origin: c.origin, axis: c.axis })),
  };
  if (meta.standard) record.standard = meta.standard;
  const attribution = meta.attribution ?? opts.attribution;
  if (attribution) record.attribution = attribution;

  return { record, bytes };
}

// -----------------------------------------------------------------------------
// Ingest a directory → a deployable /v1/parts catalog tree
// -----------------------------------------------------------------------------

export async function ingestDirectory(
  srcDir: string,
  outDir: string,
  opts: IngestOpts,
): Promise<CatalogRecord[]> {
  const stepFiles = listStepFiles(srcDir);
  mkdirSync(join(outDir, 'step'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'catalog'), { recursive: true });
  mkdirSync(join(outDir, 'functions', 'v1', 'parts'), { recursive: true });

  const records: CatalogRecord[] = [];
  const shaManifest: Record<string, string> = {};
  const skipped: { file: string; reason: string }[] = [];
  for (const stepPath of stepFiles) {
    // Real-world catalogs carry STEP the kernel can't parse (surface-only
    // exports, non-solid bodies). Skip and record them rather than aborting the
    // whole ingest on one bad file.
    try {
      const { record, bytes } = await ingestStepFile(stepPath, srcDir, opts);
      writeFileSync(join(outDir, 'step', `${record.id}.step`), bytes);
      writeFileSync(join(outDir, 'v1', 'parts', `${record.id}.json`), JSON.stringify(record, null, 2));
      records.push(record);
      shaManifest[record.id] = record.sha256;
    } catch (e) {
      skipped.push({ file: relative(srcDir, stepPath), reason: e instanceof Error ? e.message : String(e) });
    }
  }
  if (skipped.length > 0) {
    writeFileSync(join(outDir, 'skipped.json'), JSON.stringify(skipped, null, 2));
    console.warn(`skipped ${skipped.length} unparseable STEP file(s) → ${join(outDir, 'skipped.json')}`);
  }

  // Discovery index (step.parts-compatible: { catalog, items }).
  writeFileSync(
    join(outDir, 'v1', 'catalog', 'parts.index.json'),
    JSON.stringify({ catalog: { partCount: records.length }, items: records }, null, 2),
  );
  writeFileSync(join(outDir, 'sha256-manifest.json'), JSON.stringify(shaManifest, null, 2));
  // The serving shim (search + detail over the static index) for Cloudflare Pages.
  writeFileSync(join(outDir, 'functions', 'v1', 'parts', '[[path]].ts'), PAGES_FUNCTION, {
    flag: 'w',
  });
  return records;
}

// A ~static Cloudflare Pages Function implementing the two endpoints the remote
// adapter calls, over the bundled index. Emitted into the catalog so the whole
// outDir deploys as one Pages project. See remoteClient.ts for the contract.
const PAGES_FUNCTION = `// SPDX-License-Identifier: MIT
// Serves /v1/parts?q=... (search) and /v1/parts/{id} (detail) from the bundled
// parts.index.json. Deploy this directory to Cloudflare Pages and point
// KERNELCAD_PARTS_BASE_URL at it.
import index from '../../catalog/parts.index.json';

export const onRequest: PagesFunction = ({ params, request }) => {
  const items = (index as { items: Array<Record<string, unknown>> }).items;
  const path = ([] as string[]).concat((params.path as string[]) ?? []).join('/');
  if (path) {
    const rec = items.find((r) => r.id === path);
    return rec
      ? Response.json(rec)
      : new Response('not found', { status: 404 });
  }
  const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
  const hits = q
    ? items.filter((r) =>
        [r.id, r.name, ...((r.tags as string[]) ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : items;
  return Response.json({ items: hits, total: hits.length });
};
`;

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function parseArgs(argv: string[]): { srcDir: string; outDir: string; opts: IngestOpts } {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return {
    srcDir: pos[0],
    outDir: pos[1],
    opts: {
      baseUrl: flags['base-url'] ?? '',
      license: flags['license'] ?? 'CC-BY-3.0',
      ...(flags['attribution'] ? { attribution: flags['attribution'] } : {}),
    },
  };
}

const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /ingestParts\.(ts|js)$/.test(process.argv[1]);

if (isMain) {
  const { srcDir, outDir, opts } = parseArgs(process.argv.slice(2));
  if (!srcDir || !outDir) {
    console.error('usage: ingestParts <srcDir> <outDir> [--base-url URL] [--license SPDX] [--attribution TEXT]');
    process.exit(2);
  }
  ingestDirectory(srcDir, outDir, opts)
    .then((r) => console.log(`ingested ${r.length} parts into ${outDir}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
