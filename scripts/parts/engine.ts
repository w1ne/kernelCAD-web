// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/engine.ts
//
// The registry-driven parts ingestion engine. Turns the SOURCE registry into a
// mirrored, content-addressed catalog of PartRecords, enforcing four gates:
//
//   G1 (parse)    — a candidate's STEP must inspect to ≥1 solid, else it's
//                   skipped-unparseable (real catalogs ship surface-only exports).
//   G2 (mirror)   — verifyCatalog asserts every mirror record's sha256 object is
//                   actually present in the store (no dangling index entry).
//   G3 (license)  — fetch-only / license-less candidates are dropped, never
//                   mirrored; verifyCatalog re-asserts the invariant on the index.
//   G4 (connector)— zero synthesized connectors still mirrors (the geometry is
//                   useful) but is tagged 'connectorless' and counted, never
//                   silently shipped as a fully-mateable part.
//
// Geometry deps (inspectStep / synthesizeConnectors) and byte fetch are injected
// via `deps`, so the unit tests run without OCCT or the network. The mass run is
// OPERATOR-TRIGGERED (see the `import.meta` main guard at the bottom): importing
// this module never clones a repo or writes a catalog.

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, basename, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type {
  PartSourceEntry,
  PartCandidate,
  IngestRunReport,
  MirrorStore,
} from './contracts';
import type { PartRecord } from '../../src/shared/parts/types';
import type { StepInspectReport } from '../../src/agent/inspect/inspectStep';
import type { AutoConnector } from '../../src/modeling/parts/holeAutoConnectors';
import { guessCategory } from '../../src/shared/parts/taxonomy';
import { ingestStepParts } from './stepPartsIngest';
import { PAGES_WORKER } from './workerTemplate';

// -----------------------------------------------------------------------------
// Injectable geometry/network deps
// -----------------------------------------------------------------------------

export interface IngestDeps {
  /** Inspect STEP bytes → solid report. Injected so tests need no OCCT. */
  inspectStep: (bytes: Uint8Array, hint: string) => Promise<StepInspectReport>;
  /** Synthesize connectors from a report. */
  synthesizeConnectors: (report: StepInspectReport, partName: string) => AutoConnector[];
  /** Fetch impl for candidates that carry only a `stepUrl`. */
  fetchImpl?: typeof fetch;
}

// -----------------------------------------------------------------------------
// Minimal glob (Node 20 has no fs.glob). Supports `**`, `*`, and `?`.
// -----------------------------------------------------------------------------

function globToRegExp(glob: string): RegExp {
  // Tokenize so `**` is handled before single `*`.
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**` matches any number of path segments (incl. none).
        re += '.*';
        i++;
        // consume a trailing slash after ** so `**/x` matches `x`.
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`, 'i');
}

function matchesAny(relPath: string, patterns: string[]): boolean {
  const p = relPath.split(sep).join('/');
  return patterns.some((g) => globToRegExp(g).test(p));
}

/** All files under `dir`, returned as POSIX-style paths relative to `dir`. */
function walkFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Discovery: source → candidates
// -----------------------------------------------------------------------------

export interface CandidatesOptions {
  /** Local checkout root for 'github-glob' / 'step-passthrough' adapters. */
  checkoutDir?: string;
  /** Forwarded to the step.parts adapter (baseUrl / fetchImpl / limit). */
  stepParts?: Parameters<typeof ingestStepParts>[0];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function humanize(s: string): string {
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Resolve a category from the source's categoryMap (by top dir), else heuristic. */
function categoryForFile(source: PartSourceEntry, relPath: string, fileName: string): string {
  const topDir = relPath.split('/')[0]?.toLowerCase() ?? '';
  if (source.categoryMap) {
    for (const [key, cat] of Object.entries(source.categoryMap)) {
      if (topDir === key.toLowerCase() || topDir.includes(key.toLowerCase())) return cat;
    }
  }
  return guessCategory(`${fileName} ${relPath}`);
}

/**
 * Discover candidates for one source.
 *   - 'step-parts'   → delegate to the step.parts adapter.
 *   - 'github-glob' | 'step-passthrough' → glob a LOCAL checkout (opts.checkoutDir)
 *     for STEP files; this does NOT clone (the caller provides the checkout).
 */
export async function candidatesFromSource(
  source: PartSourceEntry,
  opts: CandidatesOptions = {},
): Promise<{ candidates: PartCandidate[]; report: IngestRunReport }> {
  if (source.adapter === 'step-parts') {
    return ingestStepParts(opts.stepParts ?? {});
  }

  const report: IngestRunReport = {
    source: source.id,
    ingested: 0,
    skippedUnparseable: 0,
    droppedForLicense: 0,
    deduped: 0,
    connectorless: 0,
    errors: [],
  };
  const candidates: PartCandidate[] = [];

  const checkoutDir = opts.checkoutDir;
  if (!checkoutDir) {
    report.errors.push(`no checkoutDir provided for source ${source.id}`);
    return { candidates, report };
  }

  const include = source.include.length > 0 ? source.include : ['**/*.step', '**/*.stp'];
  const exclude = source.exclude ?? [];

  for (const abs of walkFiles(checkoutDir)) {
    const relPath = relative(checkoutDir, abs).split(sep).join('/');
    if (!matchesAny(relPath, include)) continue;
    if (exclude.length > 0 && matchesAny(relPath, exclude)) continue;

    const fileName = basename(abs);
    const baseName = fileName.replace(/\.(step|stp)$/i, '');
    const category = categoryForFile(source, relPath, fileName);
    const id = `${source.id}--${slugify(baseName)}`;

    candidates.push({
      id,
      name: humanize(baseName),
      category,
      family: slugify(baseName),
      tags: [source.id, category],
      attributes: {},
      license: source.license,
      licenseClass: source.licenseClass,
      attribution: source.attribution,
      redistribution: source.redistribution,
      upstream: {
        repo: source.repo,
        commit: source.commit,
        path: relPath,
      },
      stepPath: abs,
    });
  }

  return { candidates, report };
}

/**
 * Shallow-clone a source into `destDir` at its pinned commit. Used by the
 * operator CLI run, NOT by unit tests (which provide a pre-built checkoutDir).
 */
export function shallowCloneSource(source: PartSourceEntry, destDir: string): string {
  const url = source.repo.startsWith('http') ? source.repo : `https://${source.repo}`;
  mkdirSync(destDir, { recursive: true });
  // Fetch just the pinned commit when possible; fall back to a depth-1 clone.
  try {
    execFileSync('git', ['init', '-q'], { cwd: destDir });
    execFileSync('git', ['remote', 'add', 'origin', url], { cwd: destDir });
    execFileSync('git', ['fetch', '--depth', '1', 'origin', source.commit], { cwd: destDir });
    execFileSync('git', ['checkout', '-q', 'FETCH_HEAD'], { cwd: destDir });
  } catch {
    // Some hosts disallow fetch-by-sha; depth-1 clone then checkout the commit.
    execFileSync('git', ['clone', '--depth', '1', url, destDir]);
    try {
      execFileSync('git', ['fetch', '--depth', '1', 'origin', source.commit], { cwd: destDir });
      execFileSync('git', ['checkout', '-q', source.commit], { cwd: destDir });
    } catch {
      // Leave HEAD at the default branch; the commit pin couldn't be resolved.
    }
  }
  return destDir;
}

// -----------------------------------------------------------------------------
// Ingest a single candidate (the gate gauntlet)
// -----------------------------------------------------------------------------

export type IngestOutcome =
  | 'mirrored'
  | 'deduped'
  | 'skipped-unparseable'
  | 'dropped-license'
  | 'connectorless';

export interface IngestCandidateOptions {
  /** sha256s already mirrored in this run, for cross-source dedup. */
  seen?: Set<string>;
  /** Source-level legalHold flag → 'legal-hold' tag on the record. */
  legalHold?: boolean;
}

async function bytesForCandidate(
  c: PartCandidate,
  deps: IngestDeps,
): Promise<Uint8Array> {
  if (c.stepPath) {
    return readFileSync(c.stepPath);
  }
  if (c.stepUrl) {
    const doFetch = deps.fetchImpl ?? fetch;
    const res = await doFetch(c.stepUrl);
    if (!res.ok) throw new Error(`fetch ${c.stepUrl} → HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  throw new Error(`candidate ${c.id} has neither stepPath nor stepUrl`);
}

export async function ingestCandidate(
  c: PartCandidate,
  store: MirrorStore,
  deps: IngestDeps,
  opts: IngestCandidateOptions = {},
): Promise<{ part?: PartRecord; outcome: IngestOutcome }> {
  // GATE G3 (license): never mirror fetch-only or license-less geometry.
  if (c.licenseClass === 'fetch-only' || !c.license) {
    return { outcome: 'dropped-license' };
  }

  // Materialize bytes (local file or remote fetch).
  let bytes: Uint8Array;
  try {
    bytes = await bytesForCandidate(c, deps);
  } catch {
    return { outcome: 'skipped-unparseable' };
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex');

  // Dedup: identical content already mirrored in this run. (store.put is itself
  // idempotent on the content-addressed key, so a cross-RUN re-mirror is a
  // harmless no-op; we only short-circuit the in-run duplicate here.)
  const seen = opts.seen;
  if (seen?.has(sha256) && (await store.has(sha256))) {
    return { outcome: 'deduped' };
  }

  // GATE G1 (parse): must yield ≥1 solid.
  let report: StepInspectReport;
  try {
    report = await deps.inspectStep(bytes, c.id);
  } catch {
    return { outcome: 'skipped-unparseable' };
  }
  if (!report || report.solidCount < 1 || report.solids.length < 1) {
    return { outcome: 'skipped-unparseable' };
  }

  // GATE G4 (connectors): zero ⇒ still mirror, but tag + count.
  const connectors = deps.synthesizeConnectors(report, c.id);
  const connectorless = connectors.length === 0;

  const mirrorUrl = await store.put(sha256, bytes);
  seen?.add(sha256);

  const tags = [...c.tags];
  if (connectorless && !tags.includes('connectorless')) tags.push('connectorless');
  if (opts.legalHold && !tags.includes('legal-hold')) tags.push('legal-hold');

  const part: PartRecord = {
    id: c.id,
    name: c.name,
    category: c.category,
    family: c.family,
    tags,
    attributes: c.attributes,
    sha256,
    source: 'remote',
    license: c.license,
    connectors: connectors.map((conn) => conn.name),
    stepUrl: mirrorUrl,
    licenseClass: c.licenseClass,
    redistribution: 'mirror',
    upstream: c.upstream,
  };
  if (c.standard !== undefined) part.standard = c.standard;
  if (c.attribution !== undefined) part.attribution = c.attribution;

  return { part, outcome: connectorless ? 'connectorless' : 'mirrored' };
}

// -----------------------------------------------------------------------------
// Orchestrate across the whole registry
// -----------------------------------------------------------------------------

export interface RegistryIngestOptions {
  deps: IngestDeps;
  candidatesOptions?: (source: PartSourceEntry) => CandidatesOptions;
  /** Sink for per-source summary lines (defaults to console.log). */
  log?: (line: string) => void;
}

export async function ingestFromRegistry(
  sources: PartSourceEntry[],
  store: MirrorStore,
  opts: RegistryIngestOptions,
): Promise<{ index: PartRecord[]; reports: IngestRunReport[] }> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const index: PartRecord[] = [];
  const reports: IngestRunReport[] = [];
  const seen = new Set<string>(); // cross-source dedup by sha256

  for (const source of sources) {
    const { candidates, report } = await candidatesFromSource(
      source,
      opts.candidatesOptions ? opts.candidatesOptions(source) : {},
    );

    for (const c of candidates) {
      try {
        const { part, outcome } = await ingestCandidate(c, store, opts.deps, {
          seen,
          legalHold: source.legalHold,
        });
        switch (outcome) {
          case 'mirrored':
            report.ingested++;
            if (part) index.push(part);
            break;
          case 'connectorless':
            report.ingested++;
            report.connectorless++;
            if (part) index.push(part);
            break;
          case 'deduped':
            report.deduped++;
            break;
          case 'skipped-unparseable':
            report.skippedUnparseable++;
            break;
          case 'dropped-license':
            report.droppedForLicense++;
            break;
        }
      } catch (err) {
        report.errors.push(`${c.id}: ${String(err)}`);
      }
    }

    reports.push(report);
    // No silent truncation — every source's accounting is logged.
    log(
      `[${report.source}] ingested=${report.ingested} ` +
        `skipped=${report.skippedUnparseable} dropped=${report.droppedForLicense} ` +
        `deduped=${report.deduped} connectorless=${report.connectorless}` +
        (report.errors.length ? ` errors=${report.errors.length}` : ''),
    );
  }

  return { index, reports };
}

// -----------------------------------------------------------------------------
// Catalog verification gates (post-ingest invariants)
// -----------------------------------------------------------------------------

export async function verifyCatalog(
  index: PartRecord[],
  store: MirrorStore,
): Promise<{ ok: boolean; problems: string[] }> {
  const problems: string[] = [];
  let connectorlessCount = 0;

  for (const rec of index) {
    // GATE G3: every record must carry a non-empty license.
    if (!rec.license || rec.license.trim().length === 0) {
      problems.push(`G3: record ${rec.id} has empty license`);
    }
    // GATE G3: no mirror record may be fetch-only class.
    if (rec.redistribution === 'mirror' && rec.licenseClass === 'fetch-only') {
      problems.push(`G3: mirror record ${rec.id} is licenseClass:'fetch-only'`);
    }
    // GATE G2: every mirror record's sha256 object must be present.
    if (rec.redistribution === 'mirror') {
      const present = await store.has(rec.sha256);
      if (!present) {
        problems.push(`G2: mirror record ${rec.id} sha256 ${rec.sha256} missing from store`);
      }
    }
    // GATE G4: flag connectorless records.
    if ((rec.tags ?? []).includes('connectorless') || rec.connectors.length === 0) {
      connectorlessCount++;
    }
  }

  if (connectorlessCount > 0) {
    problems.push(`G4: ${connectorlessCount} connectorless record(s) (mirrored but un-mateable)`);
  }

  // G4 is a flag, not a hard failure — `ok` reflects G2/G3 (mirror integrity +
  // license). Connectorless parts are still served; the count is surfaced.
  const hardProblems = problems.filter((p) => p.startsWith('G2') || p.startsWith('G3'));
  return { ok: hardProblems.length === 0, problems };
}

// -----------------------------------------------------------------------------
// Catalog writer (shared output tree shape with scripts/ingestParts.ts)
// -----------------------------------------------------------------------------

/** Write a deployable /v1/parts catalog tree from an in-memory index. */
export function writeCatalog(outDir: string, index: PartRecord[]): void {
  mkdirSync(join(outDir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'catalog'), { recursive: true });

  const shaManifest: Record<string, string> = {};
  for (const rec of index) {
    writeFileSync(join(outDir, 'v1', 'parts', `${rec.id}.json`), JSON.stringify(rec, null, 2));
    shaManifest[rec.id] = rec.sha256;
  }
  writeFileSync(
    join(outDir, 'v1', 'catalog', 'parts.index.json'),
    JSON.stringify({ catalog: { partCount: index.length }, items: index }, null, 2),
  );
  writeFileSync(join(outDir, 'sha256-manifest.json'), JSON.stringify(shaManifest, null, 2));
  writeFileSync(join(outDir, '_worker.js'), PAGES_WORKER, { flag: 'w' });
}

// -----------------------------------------------------------------------------
// CLI — OPERATOR-TRIGGERED mass run only. Importing this module never runs it.
// -----------------------------------------------------------------------------
//
// The real mass-run clones every SOURCE at its pinned commit into a temp dir and
// ingests into a LocalFsMirrorStore (or R2 when R2_* env is set), writing the
// catalog tree. It loads OCCT (inspectStepFile) and hits the network, so it is
// guarded behind the import.meta main check and intended to be operator-run:
//
//   npx tsx scripts/parts/engine.ts <outDir> [--mirror-root DIR]

async function runCli(argv: string[]): Promise<void> {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { SOURCES } = await import('./sources');
  const { inspectStepFile } = await import('../../src/agent/inspect/inspectStep');
  const { synthesizeConnectorsFromReport } = await import(
    '../../src/modeling/parts/synthesizeConnectors'
  );
  const { LocalFsMirrorStore, R2MirrorStore } = await import('./mirrorStore');
  const { writeFile, rm } = await import('node:fs/promises');

  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  const outDir = pos[0];
  if (!outDir) {
    console.error('usage: engine <outDir> [--mirror-root DIR]');
    process.exit(2);
    return;
  }

  // inspectStepFile reads a path; the engine injects bytes — bridge via a temp file.
  const inspectStep = async (bytes: Uint8Array, hint: string) => {
    const tmp = join(mkdtempSync(join(tmpdir(), 'kc-step-')), `${slugify(hint)}.step`);
    await writeFile(tmp, bytes);
    try {
      return await inspectStepFile(tmp);
    } finally {
      await rm(tmp, { force: true }).catch(() => {});
    }
  };

  const deps: IngestDeps = {
    inspectStep,
    synthesizeConnectors: synthesizeConnectorsFromReport,
  };

  const store: MirrorStore =
    process.env.R2_BUCKET && process.env.R2_ACCOUNT_ID
      ? new R2MirrorStore({
          bucket: process.env.R2_BUCKET,
          accountId: process.env.R2_ACCOUNT_ID,
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
          publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
        })
      : new LocalFsMirrorStore(flags['mirror-root'] ?? outDir);

  const checkoutRoot = mkdtempSync(join(tmpdir(), 'kc-parts-'));
  const { index } = await ingestFromRegistry(SOURCES, store, {
    deps,
    candidatesOptions: (source) => {
      if (source.adapter === 'step-parts') return {};
      const dir = join(checkoutRoot, source.id);
      shallowCloneSource(source, dir);
      return { checkoutDir: dir };
    },
  });

  writeCatalog(outDir, index);
  console.log(`ingested ${index.length} parts into ${outDir}`);
}

const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /parts[/\\]engine\.(ts|js)$/.test(process.argv[1]);

if (isMain) {
  runCli(process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
