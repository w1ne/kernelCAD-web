// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The contract between the prebaked models and the pages that show them.
//
// A prebaked model is a COPY of an example's output. The failure mode that
// matters is not a broken build — it is a green one that ships a model built
// from an older version of the code printed next to it. The reader has no way
// to tell; the page looks perfect and lies.
//
// So every model records the SHA-256 of the exact example source it was built
// from, and `staleModels()` re-derives those hashes from `liveDocs.ts` at build
// time. The docs build refuses to render a page whose model is missing or was
// built from different source. Nothing about this is advisory.

import { createHash } from 'node:crypto';
import type { DocsAppearance } from '../island/docsAppearance';
import type { DocsPage } from '../../src/docs/liveDocs';

/** Where the prebaked models live, relative to `site/`. */
export const DOCS_MODEL_DIR = 'docs/models';

/** Extension for site/island/docsMesh.ts's format. Not glTF — see that file. */
export const DOCS_MODEL_EXT = '.kcm';

/** Manifest filename inside `DOCS_MODEL_DIR`. */
export const DOCS_MODEL_MANIFEST = 'manifest.json';

/** What the page needs to show a model, and what the gate needs to trust it. */
export interface DocsModel {
  readonly slug: string;
  /** Site-absolute URL of the model file. */
  readonly url: string;
  /** SHA-256 of the example source this model was built from. */
  readonly codeHash: string;
  readonly bytes: number;
  /**
   * Bounds over the raw, pre-transform vertices of the drawn features —
   * computed the same way site/island/docs-worker.ts computes them, because
   * the camera framing derived from these must land in the same place before
   * and after a Run.
   */
  readonly bounds: { readonly min: readonly number[]; readonly max: readonly number[] };
  /**
   * How each drawn feature is shaded, in file order. The page turns these into
   * materials with the same function the live renderer uses, rather than
   * reading materials baked into the model, so a prebaked body and a re-run
   * body cannot come out different shades.
   */
  readonly appearances: readonly DocsAppearance[];
}

export interface DocsModelManifest {
  readonly models: readonly DocsModel[];
}

/** SHA-256 of an example's source. The identity the staleness gate compares. */
export function hashExampleCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

/**
 * Every reason the manifest cannot be trusted for these pages, as human
 * sentences. Empty means every example page has a model built from the source
 * it will be shown beside.
 */
export function staleModels(
  pages: readonly DocsPage[],
  manifest: DocsModelManifest | null,
): string[] {
  if (manifest === null) {
    return ['no model manifest — run the prebake step before rendering the pages'];
  }
  const bySlug = new Map(manifest.models.map((m) => [m.slug, m]));
  const failures: string[] = [];
  for (const page of pages) {
    if (page.example === null) continue;
    const model = bySlug.get(page.slug);
    if (model === undefined) {
      failures.push(`${page.slug}: no prebaked model`);
      continue;
    }
    const expected = hashExampleCode(page.example.code);
    if (model.codeHash !== expected) {
      failures.push(
        `${page.slug}: model was built from different source (manifest ${model.codeHash.slice(0, 12)}, example ${expected.slice(0, 12)})`,
      );
    }
    if (model.bytes <= 0) failures.push(`${page.slug}: model is empty`);
  }
  return failures;
}
