#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-build gate on the artifacts `vite.docs-island.config.ts` emits.
//
// This exists because the build was green while producing a 160-byte
// docs-island.js: rollup treats the entry as an app root, saw no live import of
// `mount()`, and tree-shook the module and three.js with it. Nothing failed —
// the bundle was simply empty, and the Run button would have thrown
// "mount is not a function" for every reader.
//
// A unit test cannot catch that; it has to look at what was actually emitted.

import { statSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCS_MODEL_DIR,
  DOCS_MODEL_EXT,
  DOCS_MODEL_MANIFEST,
  type DocsModelManifest,
} from './docsModels';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * What one docs page costs a first-time reader before they can see and rotate
 * the model, gzipped — which is how everything is served, so it is the honest
 * unit. Runnable example pages eagerly load the viewer; static reference and
 * index pages do not. Count the viewer and model only when the HTML references
 * them, without exempting any page from the budget.
 *
 * Per page: the HTML, the two stylesheets, any referenced island bundle, and
 * any referenced prebaked model. The 11 MB kernel is NOT here — it stays behind Run, and a
 * reader who never edits never fetches it.
 *
 * The budget sits just above the current worst page (~166.8 KB, curves &
 * surfaces, which carries the largest model). The point is not the exact
 * number; it is that dropping a heavy dependency back in trips the build. The
 * glTF loader this branch removed was 26.5 KB gzipped — six times this headroom
 * — so a regression to it, or anything its size, fails here rather than shipping.
 */
const PER_PAGE_BUDGET = 172_000;

function gzippedBytes(file: string): number {
  return gzipSync(readFileSync(path.join(SITE, file)), { level: 9 }).length;
}

/**
 * The critical-path budget. Fails the build if any page's first-view payload
 * exceeds `PER_PAGE_BUDGET`, so the win this branch bought cannot silently rot.
 */
export function docsPagePayloadBytes(
  html: string,
  sizes: { html: number; styles: number; viewer: number; model: number },
): number {
  return sizes.html + sizes.styles +
    (html.includes('/docs-island.js') ? sizes.viewer : 0) +
    (html.includes('data-docs-model=') ? sizes.model : 0);
}

function verifyBudget(failures: string[]): { worst: number; page: string } {
  const styles = gzippedBytes('docs.css') + gzippedBytes('style.css');
  const viewer = gzippedBytes('docs-island.js');

  let worst = 0;
  let worstPage = '';
  for (const html of readdirSync(path.join(SITE, 'docs')).filter((f) => f.endsWith('.html'))) {
    const slug = html.replace(/\.html$/, '');
    const modelFile = path.join(SITE, DOCS_MODEL_DIR, `${slug}${DOCS_MODEL_EXT}`);
    const model = existsSync(modelFile)
      ? gzipSync(readFileSync(modelFile), { level: 9 }).length
      : 0;
    const total = docsPagePayloadBytes(readFileSync(path.join(SITE, 'docs', html), 'utf8'), {
      html: gzippedBytes(`docs/${html}`), styles, viewer, model,
    });
    if (total > worst) {
      worst = total;
      worstPage = slug;
    }
    if (total > PER_PAGE_BUDGET) {
      failures.push(
        `docs/${html}: ${total} B gzipped on the critical path, budget ${PER_PAGE_BUDGET} — see PER_PAGE_BUDGET in verify-docs-bundle.ts`,
      );
    }
  }
  return { worst, page: worstPage };
}

interface Check {
  file: string;
  /** Smallest size that could possibly be the real artifact. */
  minBytes: number;
  /** Substrings that must survive bundling. */
  contains?: string[];
}

const CHECKS: Check[] = [
  {
    file: 'docs-island.js',
    // three.js alone is ~450 KB unminified-in, ~500 KB out. Anything under
    // 100 KB means the module was shaken away again.
    minBytes: 100_000,
    contains: ['mount', '/docs-worker.js'],
  },
  {
    file: 'docs-worker.js',
    minBytes: 100_000,
    // The worker resolves the wasm explicitly; Emscripten's default resolution
    // would look beside the *page* and 404 on every docs URL.
    contains: ['replicad_single.wasm'],
  },
  {
    file: 'replicad_single.wasm',
    minBytes: 5_000_000,
  },
];

/**
 * The prebaked models, checked against the manifest the pages were rendered
 * from. build-docs.ts already refuses to render a stale manifest; this catches
 * the other half — a manifest entry whose model never reached disk, or reached
 * it truncated. Either one is a page that silently shows nothing.
 */
function verifyModels(failures: string[]): number {
  const manifestPath = path.join(SITE, DOCS_MODEL_DIR, DOCS_MODEL_MANIFEST);
  if (!existsSync(manifestPath)) {
    failures.push(`${DOCS_MODEL_DIR}/${DOCS_MODEL_MANIFEST}: not emitted`);
    return 0;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as DocsModelManifest;
  if (manifest.models.length === 0) failures.push('model manifest is empty');
  for (const model of manifest.models) {
    const name = `${model.slug}${DOCS_MODEL_EXT}`;
    const full = path.join(SITE, DOCS_MODEL_DIR, name);
    if (!existsSync(full)) {
      failures.push(`${name}: in the manifest but not on disk`);
      continue;
    }
    const size = statSync(full).size;
    if (size !== model.bytes) {
      failures.push(`${name}: ${size} bytes on disk, manifest says ${model.bytes}`);
    }
  }
  return manifest.models.length;
}

function main(): void {
  const failures: string[] = [];
  const modelCount = verifyModels(failures);
  const budget = verifyBudget(failures);

  for (const check of CHECKS) {
    const full = path.join(SITE, check.file);
    if (!existsSync(full)) {
      failures.push(`${check.file}: not emitted`);
      continue;
    }
    const size = statSync(full).size;
    if (size < check.minBytes) {
      failures.push(
        `${check.file}: ${size} bytes, expected at least ${check.minBytes} — the bundle was probably tree-shaken away`,
      );
      continue;
    }
    if (check.contains) {
      const text = readFileSync(full, 'utf8');
      for (const needle of check.contains) {
        if (!text.includes(needle)) failures.push(`${check.file}: missing ${needle}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('verify-docs-bundle FAILED:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(
    `✓ docs bundles verified (${CHECKS.length} artifacts, ${modelCount} prebaked models; ` +
      `worst page ${budget.worst.toLocaleString()} B gzipped of ${PER_PAGE_BUDGET.toLocaleString()} — ${budget.page})`,
  );
}

// Keep imports side-effect free so the payload gate can be regression-tested.
if (import.meta.url === `file://${process.argv[1]}`) main();
