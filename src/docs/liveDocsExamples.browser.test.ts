// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// GATE: every docs example must run through the BROWSER path.
//
// This is the test that decides whether the Run button works. The node runners
// (`runScript` + `runIsolated`, `evaluateAndBuildScript`) exercise a different
// artifact: node:vm instead of `new Function`, and the full TypeScript compiler
// instead of the JS pass-through. An example can pass there and still fail for
// every reader — TS syntax being the obvious way, since `transpileBrowser`
// refuses it by name.
//
// So these run `runScriptInBrowser`, the exact entry point site/island/
// docs-worker.ts calls, and then mesh the result, because a script that
// captures records but produces no triangles renders an empty canvas and looks
// like a broken page rather than a broken example.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocsPages } from './liveDocs';
import { appearanceOf } from '../../site/island/docsAppearance';
import {
  DOCS_MODEL_DIR,
  DOCS_MODEL_MANIFEST,
  type DocsModelManifest,
} from '../../site/scripts/docsModels';
import { runScriptInBrowser } from '../modeling/runtime/browserRuntime';
import {
  meshFeaturesPerFeature,
  selectTerminalFeatures,
} from '../modeling/capture/featureMeshing';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { detectTypeScriptSyntax } from '../modeling/runtime/browserTranspile';

const pagesWithExamples = buildDocsPages().filter((p) => p.example !== null);

// The prebaked models, when a docs build has produced them. They are build
// artifacts (site/docs/ is gitignored), so on a clean checkout there is nothing
// to compare against and the hash gate in site/scripts/docsModels.test.ts is
// what holds. Where they DO exist, comparing them here is the strongest check
// available: it runs the example through the browser path and asserts the model
// the page shows has the same extent and the same shading as what Run produces.
const MANIFEST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../site',
  DOCS_MODEL_DIR,
  DOCS_MODEL_MANIFEST,
);
const manifest: DocsModelManifest | null = existsSync(MANIFEST_PATH)
  ? (JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as DocsModelManifest)
  : null;

describe('docs examples run in the browser runtime', () => {
  it('there is more than one example, so the loop below is not vacuous', () => {
    expect(pagesWithExamples.length).toBeGreaterThan(5);
  });

  for (const page of pagesWithExamples) {
    const example = page.example!;

    it(`${page.task}: is plain JavaScript`, () => {
      // TS syntax fails at Run time, not at build time — the browser ships no
      // compiler. Catch it here, where the message can name the page.
      expect(
        detectTypeScriptSyntax(example.code),
        `${page.task} example uses TypeScript syntax; the docs page has no TS compiler`,
      ).toBeNull();
    });

    it(`${page.task}: produces records and meshes`, async () => {
      await initOcct();
      const result = await runScriptInBrowser({
        code: example.code,
        fileName: `${page.slug}.kcad.js`,
      });
      expect(result.records.length, `${page.task} captured no feature records`).toBeGreaterThan(0);

      const meshed = await meshFeaturesPerFeature(
        result.records,
        result.paramTable,
        result.session as unknown as Parameters<typeof meshFeaturesPerFeature>[2],
      );
      // A failed feature id means the reader sees a hole in the model with no
      // error. That is the silent-fallback failure mode this repo keeps hitting,
      // so it fails the build instead.
      expect(
        meshed.failedFeatureIds,
        `${page.task} example had features that failed to mesh`,
      ).toEqual([]);

      // What the page actually draws. Meshing every DAG node and rendering all
      // of them looks fine on a primitive and hides the result on anything with
      // a modifier, which is how a live example can go dead without a test
      // noticing: the canvas still shows a shape.
      const drawn = selectTerminalFeatures(meshed.features).filter((f) => f.faces.length > 0);
      expect(drawn.length, `${page.task} example draws nothing`).toBeGreaterThan(0);

      const triangles = drawn
        .flatMap((f) => f.faces)
        .reduce((n, face) => n + face.indices.length / 3, 0);
      expect(triangles, `${page.task} example meshed to nothing`).toBeGreaterThan(0);

      const model = manifest?.models.find((m) => m.slug === page.slug);
      if (model) {
        // Body count and shading must match, or pressing Run visibly changes
        // the picture — the exact thing prebaking is supposed to avoid.
        expect(
          drawn.map((f) => appearanceOf(f.color, f.material)),
          `${page.task}: prebaked shading differs from what Run produces`,
        ).toEqual(model.appearances);

        // Same extent, so the camera lands in the same place. Computed the way
        // docs-worker.ts computes it: raw vertices, before any transform.
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (const face of drawn.flatMap((f) => f.faces)) {
          for (let i = 0; i < face.vertices.length; i += 3) {
            for (let axis = 0; axis < 3; axis++) {
              const v = face.vertices[i + axis];
              if (v < min[axis]) min[axis] = v;
              if (v > max[axis]) max[axis] = v;
            }
          }
        }
        const span = Math.max(1, ...max.map(Math.abs), ...min.map(Math.abs));
        for (let axis = 0; axis < 3; axis++) {
          expect(
            Math.abs(min[axis] - model.bounds.min[axis]),
            `${page.task}: prebaked model starts somewhere else on axis ${axis}`,
          ).toBeLessThan(span * 1e-4);
          expect(
            Math.abs(max[axis] - model.bounds.max[axis]),
            `${page.task}: prebaked model ends somewhere else on axis ${axis}`,
          ).toBeLessThan(span * 1e-4);
        }
      }
    }, 120_000);
  }
});
