// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/buildBoardGlbs.ts
//
// Build small, web-ready GLB meshes for EVERY dev-board in the parts catalog, so
// each board serves a browser-loadable mesh AND (unless oversized) its STEP.
//
// Why a GLB: authored boards compile to 4–27 MB STEP files — far too heavy for a
// browser 3D viewer, and the biggest (nucleo-h563zi-board) exceeds Cloudflare
// Pages' 25 MiB per-file limit, which fails the catalog deploy outright.
//
// Why the STEP STAYS: it is the only artifact the CAD path can consume.
// `lib.fetchPart` needs B-rep to boolean a board against an enclosure; a GLB is
// triangles. This script used to drop `stepUrl` for every authored board
// unconditionally, which made all of them invisible to `.kcad.ts` scripts — a
// 25 MiB problem that only ONE board actually had, solved at the expense of all
// nine. The STEP is now dropped only when it genuinely exceeds
// MAX_SERVED_STEP_BYTES.
//
// ONE RULE FOR EVERY BOARD, enforced by assertBoardConsistency():
//   - always serves `glbUrl`
//   - also serves `stepUrl`, unless its STEP exceeded MAX_SERVED_STEP_BYTES
// Provenance (authored `kcad_source` vs url-sourced) changes only HOW the GLB is
// produced, never what a consumer gets. Previously it silently changed both.
//
// Pipeline, per `-board` entry:
//   1. Produce a full-resolution GLB via the bundled kernelCAD CLI. Authored
//      boards compile their `.kcad.ts`; url-sourced boards get a generated
//      wrapper script around the STEP the ingest already downloaded.
//   2. Optimize via scripts/lib/optimizeGlb.ts (shared with the marketing gallery
//      build). NOTE: the simplify pass is a measured no-op on OCCT per-face
//      meshes — see that file before trying to tune it.
//   3. Write `<outDir>/glb/<id>.glb`, assert < 1 MB and that colours survived.
//   4. Patch the ingested record: add `glbUrl`; drop `stepUrl` and delete
//      `step/<id>.step` ONLY when oversized.
//   5. assertBoardConsistency() — fail the build if any board deviates.
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
  statSync,
  mkdtempSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { optimizeGlb, gltfTransformBin } from './lib/optimizeGlb';
import { stepToColoredGlb } from './stepToColoredGlb';

/** Upper bound for a web-served board GLB. The decimation lands each board in
 *  the hundreds of KB; 1 MB is a generous ceiling that still stays far under
 *  Cloudflare Pages' 25 MiB per-file limit. */
const MAX_GLB_BYTES = 1_000_000;

/** Keep serving a board's STEP alongside its GLB when it fits comfortably under
 *  Cloudflare Pages' 25 MiB per-file limit. 20 MiB leaves headroom for a board to
 *  grow a little between catalog rebuilds without tripping the deploy.
 *
 *  Why this exists: the STEP is the ONLY artifact the CAD path can consume.
 *  `lib.fetchPart` needs B-rep to boolean a board against an enclosure; a GLB is
 *  triangles. Dropping stepUrl for every `*-board` id made authored boards
 *  invisible to `.kcad.ts` scripts — including ESP32-C3 SuperMini, whose STEP is
 *  a few hundred KB and never came close to the limit that motivated the drop. */
export const MAX_SERVED_STEP_BYTES = 20 * 1024 * 1024;

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

/** A board is any manifest entry whose stable id ends in `-board`, REGARDLESS of
 *  how its geometry is sourced.
 *
 *  This used to require `kcad_source` as well, which quietly split the catalog
 *  into three shapes: authored boards served GLB-only, url-sourced boards served
 *  STEP-only, and which one you got depended on provenance rather than on
 *  anything a consumer could reason about. Every board now gets the same
 *  treatment — GLB for the web, STEP for CAD unless oversized. */
function isBoard(p: ManifestPart): boolean {
  return p.id.endsWith('-board');
}

/** Authored boards compile from a `.kcad.ts`; url-sourced boards are wrapped
 *  from the STEP the ingest already downloaded. */
function isAuthoredBoard(p: ManifestPart): boolean {
  return typeof p.kcad_source === 'string' && p.id.endsWith('-board');
}

/** Any part with a `.kcad.ts` source, board or not. */
function isAuthored(p: ManifestPart): boolean {
  return typeof p.kcad_source === 'string';
}

/**
 * Every part that carries geometry gets a web-loadable GLB — not just boards.
 *
 * The web 3D viewer (labwired's scene3d, kernelCAD/proto.cat 3D tabs) prefers
 * `glbUrl` and only falls back to parsing raw STEP in-browser via a 7.6 MB OCCT
 * wasm. Baking a GLB for EVERY geometry part means the browser never needs OCCT:
 * it loads a small pre-tessellated mesh through three.js. So the target is any
 * part that is authored (`kcad_source`) or has an ingested STEP on disk.
 */
function hasGeometry(p: ManifestPart, outDir: string): boolean {
  return isAuthored(p) || existsSync(join(outDir, 'step', `${p.id}.step`));
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

  const targets = manifest.parts.filter((p) => hasGeometry(p, outDir));
  const results: BoardGlbResult[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const part of targets) {
    const authored = isAuthored(part);
    const board = isBoard(part);
    const rawGlb = join(tmp, `${part.id}.raw.glb`);
    const finalGlb = join(glbDir, `${part.id}.glb`);

    // A single part failing to tessellate or exceeding the web size ceiling must
    // NOT abort the whole catalog build — it just keeps its STEP and (for the web
    // viewer) falls back to the procedural stand-in. Boards are the exception:
    // they are guaranteed below, so a board failure is still fatal.
    try {
      // 1. Produce a full-resolution GLB.
      // - Authored parts compile their `.kcad.ts` (colors come from `.color()`).
      // - url-sourced BOARDS keep the proven wrap-STEP + kernel export path
      //   (labwired recolors board solids by shape).
      // - url-sourced NON-BOARD parts (sensors/displays) go through the
      //   color-preserving OCCT converter, because the kernel's `fromSTEP` drops
      //   AP214 face colors — a sensor must keep its real colors, not go grey.
      if (authored || board) {
        const scriptPath = authored
          ? resolve(repoRoot, part.kcad_source!)
          : wrapStepAsScript(outDir, tmp, part.id);
        if (!scriptPath) {
          skipped.push({ id: part.id, reason: 'no kcad_source and no ingested STEP to wrap' });
          continue;
        }
        execFileSync(process.execPath, [cliPath, 'export', 'glb', scriptPath, '-o', rawGlb], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 300_000,
        });
      } else {
        const stepPath = join(outDir, 'step', `${part.id}.step`);
        if (!existsSync(stepPath)) {
          skipped.push({ id: part.id, reason: 'no ingested STEP to convert' });
          continue;
        }
        await stepToColoredGlb(stepPath, rawGlb);
      }

      // 2-3. Optimize (uncompressed, per-component materials preserved), then
      // verify size + materials. Authored boards are known multi-component, so a
      // fixed floor of 2 is a real signal. Imported STEP / non-board parts may
      // legitimately carry one material, so there we assert only that
      // optimization did not FLATTEN what was there.
      const { bytes: glbBytes, materials } = await optimizeGlb(rawGlb, finalGlb, {
        repoRoot,
        label: part.id,
        maxBytes: MAX_GLB_BYTES,
        ...(authored && board ? { minMaterials: 2 } : { preserveMaterials: true }),
      });

      // 4. Always serve the GLB. Keep the STEP too unless it is genuinely
      // oversized, so the CAD path (lib.fetchPart) still works for this part.
      const glbUrl = `${baseUrl.replace(/\/$/, '')}/glb/${part.id}.glb`;
      const removedStep = removeDeployedStep(outDir, part.id);
      const patchedRecord = patchRecordToGlb(outDir, part.id, glbUrl, removedStep);

      results.push({ id: part.id, glbBytes, materials, glbUrl, patchedRecord, removedStep });
    } catch (e) {
      if (board) throw e; // boards must always ship a GLB — never silently skip
      const msg = e instanceof Error ? e.message : String(e);
      skipped.push({ id: part.id, reason: msg.split('\n')[0] });
      if (existsSync(finalGlb)) rmSync(finalGlb);
    }
  }

  rmSync(tmp, { recursive: true, force: true });
  if (skipped.length > 0) {
    console.log(
      `built ${results.length} GLB(s); ${skipped.length} part(s) kept STEP only:\n` +
        skipped.map((s) => `  - ${s.id}: ${s.reason}`).join('\n'),
    );
  }
  assertBoardConsistency(outDir, results, manifest);
  return results;
}

/** Write a throwaway `.kcad.ts` that imports an already-ingested board STEP, so a
 *  url-sourced board can go through the exact same compile->optimize path as an
 *  authored one. Returns null when the ingest produced no STEP to wrap. */
function wrapStepAsScript(outDir: string, tmpDir: string, id: string): string | null {
  const stepPath = join(outDir, 'step', `${id}.step`);
  if (!existsSync(stepPath)) return null;
  const scriptPath = join(tmpDir, `${id}.wrap.kcad.ts`);
  writeFileSync(
    scriptPath,
    `// Generated by buildBoardGlbs — wraps an ingested board STEP for GLB export.\n` +
      `const shape = await lib.fromSTEP(${JSON.stringify(resolve(stepPath))});\n` +
      `const asm = assembly(${JSON.stringify(id)});\n` +
      `asm.part(${JSON.stringify(id)}, shape);\n` +
      `return asm.model();\n`,
  );
  return scriptPath;
}

/** Every board must end up in the SAME shape: a glbUrl always, and a stepUrl
 *  unless its STEP was dropped for size. Enforce it rather than assume it — the
 *  bug this replaces was precisely a rule that held for some boards and not
 *  others, silently, for months. */
export function assertBoardConsistency(
  outDir: string,
  results: BoardGlbResult[],
  manifest?: Manifest,
): void {
  const problems: string[] = [];
  // Boards carry the strongest guarantee: every board MUST have produced a GLB.
  // Non-board geometry parts may fall back to STEP-only, but a missing board GLB
  // is the regression this whole file exists to prevent.
  if (manifest) {
    const built = new Set(results.map((r) => r.id));
    for (const p of manifest.parts.filter(isBoard)) {
      if (!built.has(p.id)) problems.push(`${p.id}: board produced no GLB`);
    }
  }
  for (const r of results) {
    const detailPath = join(outDir, 'v1', 'parts', `${r.id}.json`);
    if (!existsSync(detailPath)) {
      problems.push(`${r.id}: no detail record`);
      continue;
    }
    const rec = JSON.parse(readFileSync(detailPath, 'utf8')) as Record<string, unknown>;
    if (!rec.glbUrl) problems.push(`${r.id}: missing glbUrl`);
    if (!r.removedStep && !rec.stepUrl) {
      problems.push(`${r.id}: STEP kept on disk but record has no stepUrl (CAD path broken)`);
    }
    if (r.removedStep && rec.stepUrl) {
      problems.push(`${r.id}: STEP removed but record still advertises stepUrl (404 for consumers)`);
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `board catalog is inconsistent:\n  - ${problems.join('\n  - ')}\n` +
        `Every board must serve glbUrl, plus stepUrl unless its STEP exceeded ` +
        `${(MAX_SERVED_STEP_BYTES / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
}

/** Add `glbUrl` on the per-part record and the discovery index entry, and drop
 *  `stepUrl` ONLY when the STEP is actually being removed (i.e. it is oversized).
 *
 *  A board that keeps its STEP is served with BOTH urls: `stepUrl` for the CAD
 *  path (`lib.fetchPart` needs B-rep — a GLB is triangles and cannot be booleaned
 *  against an enclosure), `glbUrl` for the web viewer. Dropping stepUrl
 *  unconditionally is what made every authored board unusable from a `.kcad.ts`.
 *
 *  Returns false (with a warning) if no record exists to patch — ingest must run
 *  first. */
function patchRecordToGlb(
  outDir: string,
  id: string,
  glbUrl: string,
  dropStep: boolean,
): boolean {
  const detailPath = join(outDir, 'v1', 'parts', `${id}.json`);
  let patched = false;
  if (existsSync(detailPath)) {
    const rec = JSON.parse(readFileSync(detailPath, 'utf8')) as Record<string, unknown>;
    rec.glbUrl = glbUrl;
    if (dropStep) delete rec.stepUrl;
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
      if (dropStep) delete item.stepUrl;
      writeFileSync(indexPath, JSON.stringify(index, null, 2));
      patched = true;
    }
  }
  return patched;
}

/** Delete `<outDir>/step/<id>.step` (and its sha entry) ONLY when it exceeds
 *  MAX_SERVED_STEP_BYTES. Returns whether a STEP was present + removed.
 *
 *  Previously unconditional, which cost every authored board its CAD geometry to
 *  solve a problem only the biggest board actually had. */
export function removeDeployedStep(outDir: string, id: string): boolean {
  const stepPath = join(outDir, 'step', `${id}.step`);
  let removed = false;
  if (existsSync(stepPath)) {
    const bytes = statSync(stepPath).size;
    if (bytes <= MAX_SERVED_STEP_BYTES) {
      console.log(
        `  ${id}: keeping STEP (${(bytes / 1024 / 1024).toFixed(1)} MB) — serving stepUrl + glbUrl`,
      );
      return false;
    }
    console.log(
      `  ${id}: dropping STEP (${(bytes / 1024 / 1024).toFixed(1)} MB > ` +
        `${(MAX_SERVED_STEP_BYTES / 1024 / 1024).toFixed(0)} MB) — GLB only`,
    );
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
