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
import { inspectStepFile, type StepInspectReport } from '../src/agent/inspect/inspectStep';
import { synthesizeConnectorsFromReport } from '../src/modeling/parts/synthesizeConnectors';
import {
  validateConnectorManifest,
  validateHashBoundConnectorManifest,
  type HashBoundConnectorManifest,
} from '../src/shared/parts/connectorManifestSchema';
import { PAGES_WORKER } from './parts/workerTemplate';
import {
  isOcctOutOfMemory,
  isOutOfMemoryMessage,
} from '../src/kernel/backends/occt/occtException';

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
  /** Raw authoring-sidecar data; validated only after catalog identity is derived. */
  connectorManifest?: unknown;
}

/** A bad authored interface must stop a catalog release instead of becoming a skip. */
export class AuthoredManifestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AuthoredManifestError';
  }
}

/** Duplicate output IDs would overwrite a STEP and make the catalog ambiguous. */
export class DuplicateCatalogIdError extends Error {
  constructor(id: string, firstPath: string, secondPath: string, srcRoot: string) {
    super(
      `ingestDirectory: duplicate catalog id '${id}' for ` +
        `${relative(srcRoot, firstPath)} and ${relative(srcRoot, secondPath)}`,
    );
    this.name = 'DuplicateCatalogIdError';
  }
}

export interface CatalogRecord {
  id: string;
  name: string;
  category: string;
  family: string;
  standard?: string;
  tags: string[];
  attributes: Record<string, number | string>;
  /** URL of the served STEP. Optional because authored dev-board records serve
   *  a web-ready GLB instead (buildBoardGlbs drops stepUrl + adds glbUrl). */
  stepUrl?: string;
  /** URL of a web-ready decimated GLB. Set only for authored `*-board` records
   *  whose heavy STEP is not served (see buildBoardGlbs). */
  glbUrl?: string;
  sha256: string;
  byteSize: number;
  license: string;
  attribution?: string;
  /** Legacy connector shape derived from authored interfaces when present, or
   *  synthesized from geometry otherwise. */
  connectors: { name: string; origin: [number, number, number]; axis: [number, number, number] }[];
  /** Authored interfaces bound to the exact emitted STEP bytes. */
  connectorManifest?: HashBoundConnectorManifest;
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

function sidecarPathFor(stepPath: string): string {
  return stepPath.replace(/\.(step|stp)$/i, '.meta.json');
}

function loadSidecar(stepPath: string): IngestSidecar {
  const sidecar = sidecarPathFor(stepPath);
  if (!existsSync(sidecar)) return {};
  try {
    const parsed = JSON.parse(readFileSync(sidecar, 'utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new AuthoredManifestError(`ingest: sidecar ${sidecar} must contain a JSON object`);
    }
    return parsed as IngestSidecar;
  } catch (error) {
    if (error instanceof AuthoredManifestError) throw error;
    throw new AuthoredManifestError(`ingest: invalid JSON sidecar ${sidecar}`, {
      cause: error,
    });
  }
}

/** Resolve the exact output ID and reject JSON values TypeScript cannot enforce. */
function resolveCatalogId(stepPath: string, meta: IngestSidecar): string {
  if (meta.id === undefined) return slugify(basename(stepPath, extname(stepPath)));
  if (typeof meta.id !== 'string') {
    throw new AuthoredManifestError(
      `ingest: sidecar ${sidecarPathFor(stepPath)} id must be a string when provided`,
    );
  }
  return meta.id;
}

/**
 * Refuse ambiguous output names before creating any catalog files.  The
 * sidecar is deliberately read here because an explicit id overrides the
 * filename-derived default used by the emitted STEP and detail paths.
 */
function assertUniqueCatalogIds(stepFiles: string[], srcRoot: string): void {
  const pathsById = new Map<string, string>();
  for (const stepPath of stepFiles) {
    const meta = loadSidecar(stepPath);
    const id = resolveCatalogId(stepPath, meta);
    const firstPath = pathsById.get(id);
    if (firstPath !== undefined) {
      throw new DuplicateCatalogIdError(id, firstPath, stepPath, srcRoot);
    }
    pathsById.set(id, stepPath);
  }
}

function bindAuthoredConnectorManifest(
  rawManifest: unknown,
  stepPath: string,
  id: string,
  family: string,
  sha256: string,
): HashBoundConnectorManifest | undefined {
  if (rawManifest === undefined) return undefined;
  try {
    validateConnectorManifest(rawManifest);
    if (rawManifest.partId !== id || rawManifest.family !== family) {
      throw new Error(
        `manifest identity ${rawManifest.partId}/${rawManifest.family} does not match ${id}/${family}`,
      );
    }
    const manifest: HashBoundConnectorManifest = {
      ...rawManifest,
      geometrySha256: sha256,
    };
    validateHashBoundConnectorManifest(manifest, {
      partId: id,
      family,
      geometrySha256: sha256,
    });
    return manifest;
  } catch (error) {
    throw new AuthoredManifestError(
      `ingest: invalid authored connector manifest in ${sidecarPathFor(stepPath)}`,
      { cause: error },
    );
  }
}

/**
 * Measure the complete imported model rather than only its dominant solid.
 *
 * STEP assemblies often retain electrically meaningful solids separately —
 * contacts, lids, optical windows, and pin-one markers.  Catalog dimensions
 * must describe the extents a user will actually place, so combine every
 * inspected solid's exact bounds. Volume and hole metadata deliberately keep
 * the established dominant-solid semantics: presentation solids can overlap
 * their body, so summing them would falsely inflate material volume. For
 * conventional one-solid STEP files every field is identical to the prior
 * measurement behavior.
 */
export function measureStepReport(report: StepInspectReport): Record<string, number> {
  if (report.solids.length === 0) return { solidCount: report.solidCount };

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let dominantSolid = report.solids[0];

  for (const solid of report.solids) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], solid.bboxExact.min[axis]);
      max[axis] = Math.max(max[axis], solid.bboxExact.max[axis]);
    }
    if (solid.volumeMm3 > dominantSolid.volumeMm3) dominantSolid = solid;
  }

  const rounded = (value: number) => Math.round(value * 100) / 100;
  return {
    bboxXmm: rounded(max[0] - min[0]),
    bboxYmm: rounded(max[1] - min[1]),
    bboxZmm: rounded(max[2] - min[2]),
    volumeMm3: rounded(dominantSolid.volumeMm3),
    solidCount: report.solidCount,
    holeCount: dominantSolid.holes.length,
  };
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
  const id = resolveCatalogId(stepPath, meta);
  // Derive category/family from the source folder layout when no sidecar:
  // <srcRoot>/<category>/<family>/part.step
  const relParts = relative(srcRoot, dirname(stepPath)).split(/[\\/]/).filter(Boolean);
  const rootName = slugify(basename(srcRoot)) || 'imported';
  const category = meta.category ?? relParts[0] ?? rootName;
  const family = meta.family ?? relParts[relParts.length - 1] ?? category;
  const connectorManifest = bindAuthoredConnectorManifest(
    meta.connectorManifest,
    stepPath,
    id,
    family,
    sha256,
  );

  const report = await inspectStepFile(stepPath);
  const measured = measureStepReport(report);
  const connectors = connectorManifest === undefined
    ? synthesizeConnectorsFromReport(report, id).map((connector) => ({
        name: connector.name,
        origin: connector.origin,
        axis: connector.axis,
      }))
    : connectorManifest.connectors.map((connector) => ({
        name: connector.name,
        origin: connector.origin,
        axis: connector.type === 'axis' ? connector.axis : connector.normal,
      }));

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
    connectors,
    ...(connectorManifest === undefined ? {} : { connectorManifest }),
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
  assertUniqueCatalogIds(stepFiles, srcDir);
  mkdirSync(join(outDir, 'step'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'catalog'), { recursive: true });

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
      if (e instanceof AuthoredManifestError) throw e;
      // "Skip the bad file and carry on" is right for genuinely bad geometry
      // and WRONG for an exhausted kernel heap: once OCCT's wasm heap fills,
      // every remaining import in this process fails too, so a tolerant loop
      // would quietly publish a catalog missing a run of perfectly good parts
      // and label them unparseable. That is strictly worse than no catalog —
      // it looks successful. Fail the whole ingest, loudly.
      if (isOcctOutOfMemory(e) || isOutOfMemoryMessage(e)) {
        throw new Error(
          `ingestDirectory: OCCT wasm heap exhausted while ingesting ` +
            `${relative(srcDir, stepPath)} (after ${records.length} part(s)). ` +
            'This is a host memory limit, NOT a bad STEP file — the remaining parts were ' +
            'never given a fair chance, so the catalog is incomplete and is not being ' +
            'published. Re-run the ingest with a smaller batch or more memory.',
          { cause: e },
        );
      }
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
  writeFileSync(join(outDir, '_worker.js'), PAGES_WORKER, { flag: 'w' });
  return records;
}

// The advanced-mode Cloudflare Pages Worker (`_worker.js`) is factored into
// scripts/parts/workerTemplate.ts (PAGES_WORKER) so the registry-driven engine
// and this directory-ingest CLI emit the same serving shim. It intercepts
// `/v1/parts` itself and passes everything else (the .step / .json / index)
// through to `env.ASSETS`. See remoteClient.ts for the contract.

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
