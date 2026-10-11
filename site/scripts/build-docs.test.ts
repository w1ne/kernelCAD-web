// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The rendered HTML must be complete without JavaScript, and must not contain
// any API text the generator typed itself.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocsSite, renderMcpReferencePage, escapeHtml, canonicalUrl } from './build-docs';
import { buildDocsPages } from '../../src/docs/liveDocs';
import { CHEAT_SHEET_TAXONOMY } from '../../src/agent/mcp/tools/cheatSheetTaxonomy';

const HERE = dirname(fileURLToPath(import.meta.url));

// Rendered once at module scope: shiki's highlighter is the slow part and the
// output is pure, so every assertion below reads the same pages.
const rendered = await renderDocsSite();
const pages = buildDocsPages();
const byFile = new Map(rendered.map((p) => [p.file, p.html]));

describe('build-docs', () => {

  it('makes worked drawing sheets and their editable source discoverable from export docs', () => {
    const page = pages.find((p) => p.task === 'Import & export')!;
    const html = byFile.get(`docs/${page.slug}.html`)!;
    expect(html).toContain('/blog/drafting-review/');
    expect(html).toContain('/blog/drafting-review/mounting-plate-baseline.png');
    expect(html).toContain('/blog/drafting-review/mounting-plate-baseline.pdf');
    expect(html).toContain('/blog/drafting-review/mounting-plate.kcad.ts');
  });

  it('emits an index plus one page per taxonomy group', () => {
    expect(byFile.has('docs/index.html')).toBe(true);
    for (const group of CHEAT_SHEET_TAXONOMY) {
      const page = pages.find((p) => p.task === group.task)!;
      expect(byFile.has(`docs/${page.slug}.html`), `missing page for ${group.task}`).toBe(true);
    }
    expect(rendered.length).toBe(CHEAT_SHEET_TAXONOMY.length + 4);
  });

  it('gives every page a canonical link to the URL Pages serves', () => {
    expect(canonicalUrl('docs/index.html')).toBe('https://kernelcad.com/docs/');
    expect(canonicalUrl('docs/assemble.html')).toBe('https://kernelcad.com/docs/assemble');
    for (const page of rendered) {
      const tags = page.html.match(/<link rel="canonical" href="[^"]+" \/>/g) ?? [];
      expect(tags, page.file).toEqual([`<link rel="canonical" href="${canonicalUrl(page.file)}" />`]);
    }
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
            url: '/docs/models/finish-edges.kcm',
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
    expect(html).toContain('/docs/models/finish-edges.kcm');
    // Bounds and colours travel in the attribute, so the page frames the camera
    // and shades the body without fetching a manifest.
    expect(html).toContain('servo');
    expect(html).toContain('&quot;bounds&quot;');
    // Still not eagerly linked: the model is fetched by the island in JS, not
    // preloaded, so it stays off the parser's discovery path.
    expect(html).not.toMatch(/<link[^>]+\.kcm/);
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


describe('workflow discovery pages', () => {
  it('executes progressive search, caps matching results, and handles empty queries', () => {
    const html = byFile.get('docs/mcp-tools.html')!;
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    const entries = Array.from({ length: 60 }, (_, index) => ({ textContent: 'bracket hole ' + index, hidden: false }));
    const listeners = new Map<string, () => void>();
    const input = { value: '', hidden: true, addEventListener: (name: string, listener: () => void) => listeners.set(name, listener) };
    const status = { textContent: '' };
    runInNewContext(script, { document: {
      querySelector: (selector: string) => selector === '[data-workflow-search]' ? input : status,
      querySelectorAll: () => entries,
    } });
    expect(input.hidden).toBe(false);
    input.value = 'bracket hole';
    listeners.get('input')!();
    expect(entries.filter(entry => !entry.hidden)).toHaveLength(50);
    expect(status.textContent).toContain('50 shown of 60');
    input.value = 'nonexistent';
    listeners.get('input')!();
    expect(entries.every(entry => entry.hidden)).toBe(true);
    input.value = '';
    listeners.get('input')!();
    expect(entries.every(entry => !entry.hidden)).toBe(true);
  });

  it('publishes complete static local MCP schemas and existing client setup links', () => {
    const html = byFile.get('docs/mcp-tools.html')!;
    expect(html).toContain('Local MCP tools');
    expect(html).toContain('Hosted tool discovery depends on authentication');
    expect(html).toContain('/docs/mcp-tools.json');
    expect(html).toContain('Input schema');
    expect(html).toContain('Output schema');
    expect(html).toContain('readOnlyHint');
    expect(html).toContain('data-search-entry');
    for (const client of ['chatgpt', 'claude', 'claude-code', 'codex', 'cursor', 'vscode']) {
      expect(html).toContain('https://app.kernelcad.com/connect?client=' + client);
    }
    expect(byFile.get('docs/index.html')).toContain('/docs/mcp-tools');
    expect(byFile.get('docs/index.html')).toContain('/docs/design-guide');
  });

  it('escapes schema and tool text rather than injecting executable HTML', () => {
    const page = renderMcpReferencePage([{
      name: 'evil<script>', description: '</details><img src=x onerror=alert(1)>',
      inputSchema: { type: 'object', properties: { danger: { description: '</pre><script>alert(1)</script>' } } },
    }]);
    expect(page.html).not.toContain('<img src=x');
    expect(page.html).not.toContain('<script>alert(1)');
    expect(page.html).toContain('&lt;img src=x');
    expect(page.html).toContain('&lt;/pre&gt;');
  });

  it('publishes recipe content and dated cited shop snapshots without JavaScript', () => {
    const html = byFile.get('docs/design-guide.html')!;
    expect(html).toContain('lookup_cookbook');
    expect(html).toContain('2026-05-23');
    expect(html).toContain('https://sendcutsend.com/materials/');
    expect(html).toContain('Recheck the vendor');
    expect(html).toContain('Recipe source');
    expect(html).toContain('Stocked thicknesses');
    expect(html).toContain('data-search-entry');
  });
});


it('exposes readable workflow demos through native video without eager media loading', async () => {
  const pages = await renderDocsSite();
  const demo = pages.find(page => page.file === 'docs/workflows.html')!;
  expect(demo.html).toContain('preload="none"');
  expect(demo.html).toContain('/demos/agent-workflows/gcode-estimates.mp4');
  expect(demo.html).toContain('No printer contacted');
  expect(pages.find(page => page.file === 'docs/mcp-tools.html')!.html).toContain('/docs/workflows');
});
