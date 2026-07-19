// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The rendered HTML must be complete without JavaScript, and must not contain
// any API text the generator typed itself.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocsSite, escapeHtml } from './build-docs';
import { buildDocsPages } from '../../src/docs/liveDocs';
import { CHEAT_SHEET_TAXONOMY } from '../../src/agent/mcp/tools/cheatSheetTaxonomy';

const HERE = dirname(fileURLToPath(import.meta.url));

// Rendered once at module scope: shiki's highlighter is the slow part and the
// output is pure, so every assertion below reads the same pages.
const rendered = await renderDocsSite();
const pages = buildDocsPages();
const byFile = new Map(rendered.map((p) => [p.file, p.html]));

describe('build-docs', () => {

  it('emits an index plus one page per taxonomy group', () => {
    expect(byFile.has('docs/index.html')).toBe(true);
    for (const group of CHEAT_SHEET_TAXONOMY) {
      const page = pages.find((p) => p.task === group.task)!;
      expect(byFile.has(`docs/${page.slug}.html`), `missing page for ${group.task}`).toBe(true);
    }
    expect(rendered.length).toBe(CHEAT_SHEET_TAXONOMY.length + 1);
  });

  it('renders every listApi row into its page', () => {
    for (const page of pages) {
      const html = byFile.get(`docs/${page.slug}.html`)!;
      for (const entry of page.entries) {
        expect(html, `${page.task} is missing the row for ${entry.call}`).toContain(
          escapeHtml(entry.call),
        );
      }
    }
  });

  it('is fully readable with JavaScript disabled', () => {
    // Everything a reader needs — prose, signatures, the example source — must
    // be in the served HTML. The island only adds the editor and the canvas.
    // If this regresses, the page becomes a spinner for anyone without JS and
    // for everyone during the ~11 MB engine download.
    for (const page of pages) {
      const html = byFile.get(`docs/${page.slug}.html`)!;
      expect(html).toContain(escapeHtml(page.task));
      expect(html).toContain(escapeHtml(page.blurb));
      if (page.example) {
        expect(html).toContain(escapeHtml(page.example.caption));
        // The raw source lives in the textarea; the highlighted copy is markup.
        expect(html).toContain(escapeHtml(page.example.code));
      }
    }
  });

  it('never puts the engine on the page-load path', () => {
    for (const [file, html] of byFile) {
      // No eager <script src> and no preload/prefetch of the bundles: the only
      // script is the inline bootstrap, and it reaches the island through a
      // dynamic import fired by a reader interaction.
      expect(html, `${file} eagerly loads a script`).not.toMatch(/<script[^>]+src=/);
      expect(html, `${file} preloads the engine`).not.toMatch(/rel="(?:preload|prefetch|modulepreload)"/);
      expect(html, `${file} references the wasm directly`).not.toContain('replicad_single.wasm');
    }
    const example = byFile.get('docs/finish-edges.html')!;
    expect(example).toContain("import('/docs-island.js')");
  });

  it('shows the Run button only once JavaScript is running', () => {
    // A dead Run button on a no-JS page is a broken promise; the bootstrap
    // unhides it, so its absence is the honest default.
    const html = byFile.get('docs/finish-edges.html')!;
    expect(html).toMatch(/<button class="docs-run" type="button" hidden>/);
    expect(html).toContain('button.hidden = false');
  });

  it('escapes example source rather than injecting it into markup', () => {
    const html = byFile.get('docs/parametrize.html')!;
    // The example contains `<` in no place today, but a future one will. Prove
    // the textarea path escapes rather than trusting the current corpus.
    expect(escapeHtml('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d');
    expect(html).not.toContain('</textarea><');
  });

  it('carries the prebaked model on the stage, and nothing when there is none', () => {
    // Rendered above without a manifest, which is how the harness runs it: no
    // model attribute rather than a broken URL. main() is what refuses to ship
    // a page in that state.
    for (const [file, html] of byFile) {
      expect(html, `${file} invented a model reference`).not.toContain('data-docs-model');
    }
  });

  it('inlines the model so showing it costs no second request', async () => {
    const page = pages.find((p) => p.slug === 'finish-edges')!;
    const withModel = await renderDocsSite(
      new Map([
        [
          page.slug,
          {
            slug: page.slug,
            url: '/docs/models/finish-edges.glb',
            codeHash: 'x',
            bytes: 1,
            bounds: { min: [0, 0, 0], max: [1, 2, 3] },
            appearances: [{ color: 'servo' }],
          },
        ],
      ]),
    );
    const html = new Map(withModel.map((p) => [p.file, p.html])).get('docs/finish-edges.html')!;
    expect(html).toContain('data-docs-model=');
    expect(html).toContain('/docs/models/finish-edges.glb');
    // Bounds and colours travel in the attribute, so the page frames the camera
    // and shades the body without fetching a manifest.
    expect(html).toContain('servo');
    expect(html).toContain('&quot;bounds&quot;');
    // Still not on the page-load path: the GLB is fetched by the island, and
    // the island is still reached through a dynamic import.
    expect(html).not.toMatch(/<link[^>]+\.glb/);
  });

  it('authors no API text of its own', () => {
    // Every signature and description on the page comes from listApi via
    // liveDocs.ts. The generator holds layout, nothing else.
    const source = readFileSync(resolve(HERE, 'build-docs.ts'), 'utf8');
    for (const name of ['fillet', 'patternCircular', 'nurbsSurface', 'boundingBox']) {
      expect(source, `build-docs.ts hardcodes the API name ${name}`).not.toContain(name);
    }
  });
});
