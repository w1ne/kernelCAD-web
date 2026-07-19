// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/buildBoardGlbs.ts
//
// Build small, web-ready GLB meshes for the AUTHORED dev-board models in the
// parts catalog, and swap those boards over from STEP to GLB for serving.
//
// Why: the authored boards (`kcad_source` whose id ends in `-board`) compile to
// 4–27 MB STEP files — far too heavy for a browser 3D viewer, and the biggest
// (nucleo-h563zi-board) exceeds Cloudflare Pages' 25 MiB per-file limit so the
// catalog deploy fails outright. A GLB the browser can load directly, decimated
// to a few hundred KB, is the right web artifact. STEP stays the source of
// truth for the CAD/CNC path via the `.kcad.ts`; the catalog just stops
// *serving* the giant STEP for these boards.
//
// Pipeline, per authored `-board` entry (replicates a proven recipe):
//   1. Compile the `.kcad.ts` to GLB via the bundled kernelCAD CLI
//        node dist/cli/index.js export glb <script> -o <raw>.glb
//   2. Decimate with the gltf-transform CLI, UNCOMPRESSED so a viewer needs no
//      Draco/meshopt decoder, keeping distinct per-component materials/colors:
//        gltf-transform optimize <raw> <out> \
//          --simplify-error 0.0005 --compress false \
//          --texture-compress false --palette false
//   3. Write `<outDir>/glb/<id>.glb`, assert < 1 MB and >= 2 materials.
//   4. Patch the already-ingested catalog record: add `glbUrl`, drop `stepUrl`,
//      delete the deployed `step/<id>.step` (web uses the GLB; this also keeps
//      every deployed file under the 25 MiB limit). Non-authored parts (chips,
//      sensors, rpi-pico-board) keep their STEP + stepUrl untouched.
//
// Run AFTER ingestElectronics has written the catalog into <outDir> (so the
// board records + step/<id>.step already exist to patch).
//
// Usage:
//   npx tsx scripts/buildBoardGlbs.ts <outDir> \
//     [--manifest scripts/electronics-parts.json] \
//     [--base-url https://kernelcad-parts.pages.dev] \
//     [--seed]   // compile the board STEPs into <outDir> first (local testing
//                //  without a full ingest); real runs rely on ingestElectronics.

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  mkdtempSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { optimizeGlb, gltfTransformBin } from './lib/optimizeGlb';

/** Upper bound for a web-served board GLB. The decimation lands each board in
 *  the hundreds of KB; 1 MB is a generous ceiling that still stays far under
 *  Cloudflare Pages' 25 MiB per-file limit. */
const MAX_GLB_BYTES = 1_000_000;

interface ManifestPart {
  id: string;
  name: string;
  family: string;
  mpn: string;
  model?: string;
  url?: string;
  kcad_source?: string;
  tags?: string[];
  license?: string;
  attribution?: string;
}
interface Manifest {
  baseModelUrl: string;
  license: string;
  attribution: string;
  parts: ManifestPart[];
}

/** An authored board is a manifest entry that is compiled from a `.kcad.ts`
 *  (`kcad_source`) AND whose stable id ends in `-board`. Only these switch to
 *  GLB; url-sourced boards (e.g. rpi-pico-board) keep their STEP. */
function isAuthoredBoard(p: ManifestPart): boolean {
  return typeof p.kcad_source === 'string' && p.id.endsWith('-board');
}

export interface BoardGlbResult {
  id: string;
  glbBytes: number;
  materials: number;
  glbUrl: string;
  patchedRecord: boolean;
  removedStep: boolean;
}

function parseArgs(argv: string[]) {
  const out = {
    outDir: '',
    manifest: 'scripts/electronics-parts.json',
    baseUrl: 'https://kernelcad-parts.pages.dev',
    seed: false,
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest') out.manifest = argv[++i];
    else if (argv[i] === '--base-url') out.baseUrl = argv[++i];
    else if (argv[i] === '--seed') out.seed = true;
    else rest.push(argv[i]);
  }
  out.outDir = rest[0] ?? '';
  return out;
}

// Optimization lives in scripts/lib/optimizeGlb.ts — ONE path shared with the
// marketing gallery build, so both surfaces ship GLBs built identically.

/**
 * Compile + decimate every authored board to a web-ready GLB under
 * `<outDir>/glb/`, then patch the catalog records to serve GLB instead of STEP.
 */
export async function buildBoardGlbs(
  manifestPath: string,
  outDir: string,
  baseUrl: string,
): Promise<BoardGlbResult[]> {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const repoRoot = resolve(dirname(manifestPath), '..');
  const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
  if (!existsSync(cliPath)) {
    throw new Error(`kernelCAD CLI not built at ${cliPath}. Run: npm run build:cli`);
  }
  gltfTransformBin(repoRoot); // fail fast before compiling any board

  const glbDir = join(outDir, 'glb');
  mkdirSync(glbDir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'kc-board-glb-'));

  const boards = manifest.parts.filter(isAuthoredBoard);
  const results: BoardGlbResult[] = [];

  for (const board of boards) {
    const scriptPath = resolve(repoRoot, board.kcad_source!);
    const rawGlb = join(tmp, `${board.id}.raw.glb`);
    const finalGlb = join(glbDir, `${board.id}.glb`);

    // 1. Compile the authored .kcad.ts to a full-resolution GLB.
    execFileSync(process.execPath, [cliPath, 'export', 'glb', scriptPath, '-o', rawGlb], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    });

    // 2-3. Decimate (uncompressed, per-component materials preserved), then
    // verify size + materials. Shared implementation; flags are load-bearing.
    const { bytes: glbBytes, materials } = await optimizeGlb(rawGlb, finalGlb, {
      repoRoot,
      label: board.id,
      maxBytes: MAX_GLB_BYTES,
      minMaterials: 2,
    });

    // 4. Serve GLB, not STEP: patch the record, drop stepUrl, remove the STEP.
    const glbUrl = `${baseUrl.replace(/\/$/, '')}/glb/${board.id}.glb`;
    const patchedRecord = patchRecordToGlb(outDir, board.id, glbUrl);
    const removedStep = removeDeployedStep(outDir, board.id);

    results.push({ id: board.id, glbBytes, materials, glbUrl, patchedRecord, removedStep });
  }

  rmSync(tmp, { recursive: true, force: true });
  return results;
}

/** Add `glbUrl` + drop `stepUrl` on the per-part record and the discovery index
 *  entry. Returns false (with a warning) if no record exists to patch — the
 *  ingest must run first. */
function patchRecordToGlb(outDir: string, id: string, glbUrl: string): boolean {
  const detailPath = join(outDir, 'v1', 'parts', `${id}.json`);
  let patched = false;
  if (existsSync(detailPath)) {
    const rec = JSON.parse(readFileSync(detailPath, 'utf8')) as Record<string, unknown>;
    rec.glbUrl = glbUrl;
    delete rec.stepUrl;
    writeFileSync(detailPath, JSON.stringify(rec, null, 2));
    patched = true;
  } else {
    console.warn(`WARN ${id}: no detail record at ${detailPath} (run ingestElectronics first); GLB written but record not patched.`);
  }

  const indexPath = join(outDir, 'v1', 'catalog', 'parts.index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
      catalog?: unknown;
      items: Record<string, unknown>[];
    };
    const item = index.items.find((r) => r.id === id);
    if (item) {
      item.glbUrl = glbUrl;
      delete item.stepUrl;
      writeFileSync(indexPath, JSON.stringify(index, null, 2));
      patched = true;
    }
  }
  return patched;
}

/** Delete `<outDir>/step/<id>.step` (and its sha entry) so no oversized authored
 *  board STEP is deployed. Returns whether a STEP was present + removed. */
function removeDeployedStep(outDir: string, id: string): boolean {
  const stepPath = join(outDir, 'step', `${id}.step`);
  let removed = false;
  if (existsSync(stepPath)) {
    rmSync(stepPath);
    removed = true;
  }
  const shaPath = join(outDir, 'sha256-manifest.json');
  if (existsSync(shaPath)) {
    try {
      const sha = JSON.parse(readFileSync(shaPath, 'utf8')) as Record<string, string>;
      if (id in sha) {
        delete sha[id];
        writeFileSync(shaPath, JSON.stringify(sha, null, 2));
      }
    } catch {
      /* leave the sha manifest as-is if unparseable */
    }
  }
  return removed;
}

/**
 * Local-testing seed: compile each authored board to `<outDir>/step/<id>.step`
 * and write a minimal `<outDir>/v1/parts/<id>.json` + index entry, so the GLB
 * build has records to patch WITHOUT running the full (network) electronics
 * ingest. Real runs use ingestElectronics; this only exists for `--seed`.
 */
function seedBoardRecords(manifestPath: string, outDir: string, baseUrl: string): void {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const repoRoot = resolve(dirname(manifestPath), '..');
  const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
  mkdirSync(join(outDir, 'step'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(outDir, 'v1', 'catalog'), { recursive: true });

  const items: Record<string, unknown>[] = [];
  for (const board of manifest.parts.filter(isAuthoredBoard)) {
    const scriptPath = resolve(repoRoot, board.kcad_source!);
    const stepOut = join(outDir, 'step', `${board.id}.step`);
    execFileSync(process.execPath, [cliPath, 'export', 'step', scriptPath, '-o', stepOut], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    });
    const rec = {
      id: board.id,
      name: board.name,
      category: 'Electronics',
      family: board.family,
      tags: board.tags ?? ['board'],
      attributes: { mpn: board.mpn },
      stepUrl: `${baseUrl.replace(/\/$/, '')}/step/${board.id}.step`,
      license: board.license ?? manifest.license,
      attribution: board.attribution ?? manifest.attribution,
    };
    writeFileSync(join(outDir, 'v1', 'parts', `${board.id}.json`), JSON.stringify(rec, null, 2));
    items.push(rec);
  }
  writeFileSync(
    join(outDir, 'v1', 'catalog', 'parts.index.json'),
    JSON.stringify({ catalog: { partCount: items.length }, items }, null, 2),
  );
  console.log(`seeded ${items.length} authored-board STEP records into ${outDir}`);
}

const invokedDirectly =
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /buildBoardGlbs\.(ts|js)$/.test(process.argv[1]);

if (invokedDirectly) {
  const { outDir, manifest, baseUrl, seed } = parseArgs(process.argv.slice(2));
  if (!outDir) {
    console.error('usage: buildBoardGlbs <outDir> [--manifest PATH] [--base-url URL] [--seed]');
    process.exit(1);
  }
  (async () => {
    if (seed) seedBoardRecords(manifest, outDir, baseUrl);
    const results = await buildBoardGlbs(manifest, outDir, baseUrl);
    console.log(`built ${results.length} board GLB(s) -> ${join(outDir, 'glb')}`);
    for (const r of results) {
      const kb = (r.glbBytes / 1024).toFixed(1);
      console.log(
        `  ${r.id}  ${kb} KB  ${r.materials} materials  glbUrl=${r.glbUrl}  ` +
          `record=${r.patchedRecord ? 'patched' : 'MISSING'}  step=${r.removedStep ? 'removed' : 'absent'}`,
      );
    }
  })().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
