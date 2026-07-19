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
import { buildDocsPages } from './liveDocs';
import { runScriptInBrowser } from '../modeling/runtime/browserRuntime';
import {
  meshFeaturesPerFeature,
  selectTerminalFeatures,
} from '../modeling/capture/featureMeshing';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { detectTypeScriptSyntax } from '../modeling/runtime/browserTranspile';

const pagesWithExamples = buildDocsPages().filter((p) => p.example !== null);

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
    }, 120_000);
  }
});
