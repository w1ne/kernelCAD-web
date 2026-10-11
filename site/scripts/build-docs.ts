#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Renders site/docs/ from the same data scripts/buildCheatSheet.ts renders
// docs/cheat-sheet.md from: one page per CHEAT_SHEET_TAXONOMY group, rows read
// out of listApi. No API prose is authored here — if a signature changes in
// listApi, these pages change with it or the drift test fails.
//
// The output is static HTML with no build-time JavaScript beyond a ~20-line
// inline bootstrap. The code listings are syntax-highlighted at build time with
// shiki, so a reader with JavaScript disabled gets the complete page: prose,
// signatures, examples, everything except the ability to press Run.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import { buildDocsPages, type DocsPage } from '../../src/docs/liveDocs';
import {
  DOCS_MODEL_DIR,
  DOCS_MODEL_MANIFEST,
  staleModels,
  type DocsModel,
  type DocsModelManifest,
} from './docsModels';

import { TOOLS, type McpToolDefinition } from '../../src/agent/mcp/toolRegistry';
import { CONNECT_CLIENTS } from '../../src/studio/connect/connectClients';
import { loadSnippets } from '../../src/agent/cookbook/loader';
import { buildMcpReference, buildDesignGuide, type GuideEntry } from '../../src/docs/workflowDocs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Accent hues, in taxonomy order. The taxonomy is ordered as a build — start a
 * shape, add and remove material, then finish, select, place, assemble — so
 * neighbouring groups are genuinely related and a hue per run of three reads as
 * a section rather than as decoration. Deriving it from the index means a new
 * taxonomy group gets a colour without anyone maintaining a list.
 *
 * All four clear WCAG AA (>= 4.5:1) as text on the --vellum page background.
 */
const ACCENTS = ['blueprint', 'copper', 'viridian', 'plum'] as const;

function accentFor(index: number): string {
  return ACCENTS[Math.floor(index / 3) % ACCENTS.length];
}

/** Escape for HTML text and double-quoted attribute values. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `code spans` in a blurb — the taxonomy uses backticks the way markdown does. */
function inlineCode(s: string): string {
  return escapeHtml(s).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Canonical URL for a page under site/. Cloudflare Pages serves `x.html` at the
 * extensionless path `x` (it 308-redirects `x.html`), and `docs/index.html` at
 * `docs/`. The canonical must name the URL that returns 200.
 */
export function canonicalUrl(file: string): string {
  return `https://kernelcad.com/${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;
}

function shell(title: string, description: string, body: string, accent: string, file: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl(file))}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,500;1,500&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/docs.css" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div class="page-wrap docs-wrap" data-accent="${escapeHtml(accent)}">

    <nav class="nav">
      <a class="nav-mark" href="/">
        <svg class="k" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
          <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
        </svg>
        <span>kernel<span class="cad">CAD</span></span>
      </a>
      <div class="nav-links">
        <a href="/docs/">docs</a>
        <a href="/docs/mcp-tools">MCP</a>
        <a href="/docs/design-guide">design guide</a>
        <a href="/gallery">gallery</a>
        <a class="app-link" href="https://app.kernelcad.com">app ↗</a>
        <a href="https://github.com/w1ne/kernelCAD-web">github</a>
        <a href="https://www.npmjs.com/package/kernelcad">npm</a>
      </div>
    </nav>

${body}

    <footer class="footer">
      <div>kernelCAD · MIT</div>
      <div class="footer-links">
        <a href="/docs/mcp-tools">MCP tools</a>
        <a href="/docs/design-guide">design guide</a>
        <a href="/terms.html">terms</a>
        <a href="/privacy.html">privacy</a>
        <a href="https://github.com/w1ne/kernelCAD-web">github</a>
        <a href="https://www.npmjs.com/package/kernelcad">npm</a>
        <a href="https://app.kernelcad.com">app</a>
      </div>
    </footer>

  </div>
</body>
</html>
`;
}

/**
 * The bootstrap. Deliberately inline and dependency-free.
 *
 * It reveals the Run button, then pulls in the island once the page has
 * finished loading so each example can draw its prebaked model. That import is
 * three.js and OrbitControls; the 10.8 MB engine is a separate module the
 * island does not touch until someone presses Run, so "show the model" and
 * "download the kernel" stay on different schedules.
 *
 * Waiting for `load` (and idle after it) is what keeps the picture off the
 * critical path: text, code and tables are painted from the served HTML before
 * a byte of three.js is requested.
 *
 * It also owns the Run clicks for the lifetime of the page, which means a click
 * that lands while the island is still downloading is queued on the same
 * promise rather than dropped.
 */
const BOOTSTRAP = `
    (function () {
      var island = null;
      function activate() {
        if (!island) island = import('/docs-island.js').then(function (m) { return m.mount(); });
        return island;
      }
      var examples = document.querySelectorAll('[data-docs-example]');
      for (var i = 0; i < examples.length; i++) {
        (function (root) {
          var button = root.querySelector('.docs-run');
          var status = root.querySelector('.docs-status');
          button.hidden = false;
          status.textContent = '';
          root.addEventListener('pointerdown', activate, { once: true });
          button.addEventListener('click', function () {
            activate().then(function (api) { api.run(root); });
          });
        })(examples[i]);
      }
      if (examples.length) {
        var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1); };
        // The { timeout } bounds the wait: without it a backgrounded or idle-
        // starved tab can defer activate() indefinitely, so the model never
        // appears until the tab is focused. 2s guarantees boot regardless.
        if (document.readyState === 'complete') idle(activate, { timeout: 2000 });
        else window.addEventListener('load', function () { idle(activate, { timeout: 2000 }); });
      }
    })();
`;

function renderEntries(page: DocsPage): string {
  const rows = page.entries
    .map(
      (entry) =>
        `        <tr><td><code>${escapeHtml(entry.call)}</code></td><td>${inlineCode(entry.summary)}</td></tr>`,
    )
    .join('\n');
  return `      <table class="docs-api">
        <thead><tr><th>Call</th><th>What it does</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>`;
}

function renderExample(page: DocsPage, highlighted: string, model: DocsModel | undefined): string {
  const example = page.example;
  if (!example) return '';
  // The model this example was baked into, inline rather than in a second
  // fetch. Absent when the pages are rendered without a prebake — the test
  // harness does that; the build refuses to (see main()).
  const stageData = model
    ? ` data-docs-model="${escapeHtml(
        JSON.stringify({
          url: model.url,
          bounds: model.bounds,
          appearances: model.appearances,
        }),
      )}"`
    : '';
  return `      <section class="docs-example" data-docs-example>
        <p class="docs-caption">${inlineCode(example.caption)}</p>
        <div class="docs-code">
          <div class="docs-highlight">${highlighted}</div>
          <textarea class="docs-editor" spellcheck="false" aria-label="Editable example source" hidden>${escapeHtml(example.code)}</textarea>
        </div>
        <div class="docs-bar">
          <button class="docs-run" type="button" hidden>Run ▸</button>
          <span class="docs-status" data-state="idle">JavaScript is off — the listing above is the whole example.</span>
        </div>
        <p class="docs-error" role="alert" hidden></p>
        <div class="docs-stage"${stageData} hidden><canvas></canvas></div>
      </section>`;
}

export interface RenderedPage {
  /** Path relative to site/, e.g. `docs/finish-edges.html`. */
  readonly file: string;
  readonly html: string;
}

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

function renderPage(
  page: DocsPage,
  index: number,
  highlighter: Highlighter,
  model: DocsModel | undefined,
): RenderedPage {
  const highlighted = page.example
    ? highlighter.codeToHtml(page.example.code, { lang: 'javascript', theme: 'github-light' })
    : '';
  const note = page.note
    ? `      <p class="docs-note">${inlineCode(page.note)}</p>`
    : '';

  const body = `    <main class="docs-main">
      <p class="docs-crumb"><a href="/docs/">docs</a> / ${escapeHtml(page.task)}</p>
      <h1 class="docs-title">${escapeHtml(page.task)}</h1>
      <p class="docs-blurb">${inlineCode(page.blurb)}</p>
${renderExample(page, highlighted, model)}
${note}
      <h2 class="docs-h2">Calls</h2>
${renderEntries(page)}
    </main>

    <script type="module">${BOOTSTRAP}</script>`;

  const file = `docs/${page.slug}.html`;
  return {
    file,
    html: shell(`${page.task} — kernelCAD`, page.blurb, body, accentFor(index), file),
  };
}

function renderIndex(pages: DocsPage[]): RenderedPage {
  const cards = pages
    .map(
      (page, index) => `        <li class="docs-card" data-accent="${escapeHtml(accentFor(index))}">
          <a href="/docs/${page.slug}.html"><span class="docs-card-task">${escapeHtml(page.task)}</span></a>
          <span class="docs-card-blurb">${inlineCode(page.blurb)}</span>
          <span class="docs-card-count">${page.entries.length} calls</span>
        </li>`,
    )
    .join('\n');

  const body = `    <main class="docs-main">
      <h1 class="docs-title">Script API</h1>
      <p class="docs-blurb">The kernelCAD script API, grouped by the task you're doing. Every page has
        an example you can edit and run.</p>
      <p class="docs-note"><a href="/docs/mcp-tools">MCP tool reference and client setup</a> ·
        <a href="/docs/design-guide">Search recipes and manufacturing guidance</a></p>
      <ul class="docs-cards">
${cards}
      </ul>
      <p class="docs-note">Same tables in one file:
        <a href="https://github.com/w1ne/kernelCAD-web/blob/develop/docs/cheat-sheet.md">docs/cheat-sheet.md</a>.
        Agents should call <code>lookup_api(query)</code> over the MCP server.</p>
    </main>`;

  return { file: 'docs/index.html', html: shell('Script API — kernelCAD', 'The kernelCAD script API, with runnable examples that rebuild geometry in your browser.', body, 'blueprint', 'docs/index.html') };
}


/** Progressive search: every entry remains available when JavaScript is off. */
const SEARCH_BOOTSTRAP = `
(function () {
  var input = document.querySelector('[data-workflow-search]');
  var status = document.querySelector('[data-search-status]');
  var entries = Array.from(document.querySelectorAll('[data-search-entry]'));
  var texts = entries.map(function (entry) { return entry.textContent.toLowerCase(); });
  input.hidden = false;
  input.addEventListener('input', function () {
    var words = input.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
    var matched = 0;
    var shown = 0;
    entries.forEach(function (entry, index) {
      var match = words.every(function (word) { return texts[index].includes(word); });
      if (match) matched++;
      var visible = match && (!words.length || shown < 50);
      entry.hidden = !visible;
      if (visible) shown++;
    });
    status.textContent = shown + ' shown of ' + matched + ' matching entries' +
      (matched > shown ? ' — refine your search to see other matches.' : '.');
  });
})();
`;

function searchBox(label: string): string {
  return `<label>${escapeHtml(label)} <input type="search" data-workflow-search hidden
    aria-label="${escapeHtml(label)}" placeholder="Search names, descriptions, or fields" /></label>
    <p data-search-status role="status">All entries are listed below. Browser Find also works without JavaScript.</p>
    <style>.workflow-entry { margin: 1.5rem 0; }
    .workflow-entry pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .8rem; }
    .workflow-entry summary { cursor: pointer; }
    [data-workflow-search] { width: min(100%, 32rem); padding: .6rem; }</style>`;
}

/** Public reference is the local registry; hosted discovery has a separate contract. */
export function renderMcpReferencePage(tools: readonly McpToolDefinition[] = TOOLS): RenderedPage {
  const clients = CONNECT_CLIENTS.map(client =>
    `<li><a href="https://app.kernelcad.com/connect?client=${escapeHtml(client.id)}">${escapeHtml(client.label)}</a></li>`,
  ).join('\n');
  const entries = buildMcpReference(tools).tools.map(tool => `<section class="workflow-entry" data-search-entry>
    <h2 class="docs-h2" id="${escapeHtml(tool.name)}"><code>${escapeHtml(tool.name)}</code></h2>
    <p>${escapeHtml(tool.description)}</p>
    <details><summary>Input schema</summary><pre>${escapeHtml(JSON.stringify(tool.inputSchema, null, 2))}</pre></details>
    ${tool.outputSchema ? `<details><summary>Output schema</summary><pre>${escapeHtml(JSON.stringify(tool.outputSchema, null, 2))}</pre></details>` : ''}
    ${tool.annotations ? `<details><summary>Behavior annotations</summary><pre>${escapeHtml(JSON.stringify(tool.annotations, null, 2))}</pre></details>` : ''}
  </section>`).join('\n');
  const body = `<main class="docs-main">
    <p class="docs-crumb"><a href="/docs/">docs</a> / MCP tools</p>
    <h1 class="docs-title">Local MCP tools</h1>
    <p class="docs-blurb">${tools.length} tools from the local kernelCAD MCP registry. Input and output schemas and
      behavior annotations below are generated from the same definitions the server discovers.</p>
    <p class="docs-note">Scope: local <code>kernelcad mcp</code>. Hosted tool discovery depends on authentication,
      the selected profile, and server-native tools; this page does not promise the hosted tool set.
      Ask your connected server for its current tools.</p>
    <p><a href="/docs/mcp-tools.json" download>Download the complete local contract (JSON)</a> ·
      <a href="/docs/design-guide">Design guide</a> · <a href="/docs/workflows">Short workflow demos</a></p>
    <h2 class="docs-h2">Connect your client</h2>
    <p>Use the existing sign-in and setup guide for your client:</p><ul>${clients}</ul>
    <p>For a local stdio server, use <code>npx -y kernelcad mcp</code> in your client's MCP configuration.</p>
    ${searchBox('Search local tools')}
    ${entries}
  </main><script>${SEARCH_BOOTSTRAP}</script>`;
  return { file: 'docs/mcp-tools.html', html: shell('Local MCP tools — kernelCAD', 'Search the local MCP tool contract, schemas and client setup.', body, 'blueprint', 'docs/mcp-tools.html') };
}

function readDesignGuide(): GuideEntry[] {
  const root = path.join(REPO_ROOT, 'src/agent/skills/kernelcad-shopcheck/catalogs');
  const json = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  return buildDesignGuide(
    loadSnippets(path.join(REPO_ROOT, 'cookbook/snippets'), path.join(REPO_ROOT, 'cookbook/tags.json')),
    json('vendors/sendcutsend/rules.json'), json('vendors/sendcutsend/catalog.json'), json('sources-manifest.json'),
  );
}

export function renderDesignGuidePage(entries: readonly GuideEntry[] = readDesignGuide()): RenderedPage {
  const content = entries.map(entry => `<section class="workflow-entry" data-search-entry>
    <h2 class="docs-h2" id="${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</h2>
    <p>${escapeHtml(entry.kind)} · ${escapeHtml(entry.summary)}</p>
    <p>${entry.keywords.map(escapeHtml).join(' · ')}</p>
    <p><a href="${escapeHtml(entry.sourceUrl)}">${entry.kind === 'recipe' ? 'Recipe source' : 'Versioned catalog source'}</a>
      ${entry.snapshotDate ? ` · Snapshot: ${escapeHtml(entry.snapshotDate)}. Recheck the vendor before ordering.` : ''}</p>
    ${entry.sourceUrls ? `<p>Snapshot source pages: ${entry.sourceUrls.map(url => `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`).join(' · ')}</p>` : ''}
    <details><summary>${entry.kind === 'recipe' ? 'Recipe code' : entry.kind === 'material' ? 'Stocked thicknesses and services (snapshot)' : 'Recorded rule and limits'}</summary>
      <pre>${escapeHtml(entry.content)}</pre></details>
  </section>`).join('\n');
  const body = `<main class="docs-main">
    <p class="docs-crumb"><a href="/docs/">docs</a> / Design guide</p>
    <h1 class="docs-title">Design guide</h1>
    <p class="docs-blurb">Find native cookbook recipes, recorded shop checks, and material catalog snapshots.
      Read the source, adapt the recipe, and verify your model before manufacture.</p>
    <p class="docs-note">Agents can use the existing <a href="/docs/mcp-tools#lookup_cookbook"><code>lookup_cookbook</code></a>
      tool to retrieve recipes. Shop rows are dated snapshots of our local rule/catalog data,
      not current vendor acceptance or a guarantee of manufacturing suitability.</p>
    <p><a href="/docs/mcp-tools">MCP tool reference and setup</a> · <a href="/docs/workflows">Short workflow demos</a></p>
    ${searchBox('Search design guidance')}
    ${content}
  </main><script>${SEARCH_BOOTSTRAP}</script>`;
  return { file: 'docs/design-guide.html', html: shell('Design guide — kernelCAD', 'Search native cookbook recipes and dated manufacturing guidance.', body, 'copper', 'docs/design-guide.html') };
}

/** Native playback for short demonstrations captured from executed workflows. */
export function renderWorkflowDemosPage(): RenderedPage {
  const demos = [
    ['reference-and-setup', 'Discover tools and connect', 'Search the local contract, open its exact arguments, then use the existing client setup. The reference is a local preview; the Claude setup is a public website readback.'],
    ['design-guidance', 'Retrieve guidance and check geometry', 'Find an existing recipe, retain dated manufacturing sources, evaluate it, and inspect its actual mesh. Guidance retrieval is separate from geometry verification.'],
    ['gcode-estimates', 'Export G-code with slicer predictions', 'Executed OrcaSlicer 2.4.2 export: retained G-code and structured estimated time/material. No printer contacted.'],
    ['fastener-installation', 'Find and repair a fastener installation fault', 'Audit explicit stations on actual BREP geometry, repair a lifted screw, rerun the measurements, and retain source, STEP, drawing and reports. Simplified threads do not certify torque, preload or strength.'],
  ];
  const body = `<main class="docs-main"><p class="docs-crumb"><a href="/docs/">docs</a> / workflow demos</p>
    <h1 class="docs-title">Agent workflow demos</h1>
    <p>Short replays of actual local captures and tool results. Source changes and local tests do not prove a hosted release or physical acceptance.</p>
    ${demos.map(([id, title, description]) => `<section><h2 class="docs-h2">${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p><video controls preload="none" style="width:100%;height:auto" src="/demos/agent-workflows/${escapeHtml(id)}.mp4"></video>
      <p><a href="/demos/agent-workflows/${escapeHtml(id)}.mp4">Open video</a></p></section>`).join('')}
    <p><a href="/demos/agent-workflows/fastener-evidence.zip" download>Download the fastener source, STEP, drawing and reports</a></p>
    <p><a href="/docs/mcp-tools">Exact tool schemas and client setup</a> · <a href="/docs/design-guide">Design guide</a></p>
  </main>`;
  return { file: 'docs/workflows.html', html: shell('Agent workflow demos — kernelCAD', 'Short demonstrations of tool discovery, design guidance and manufacturing evidence.', body, 'blueprint', 'docs/workflows.html') };
}

/**
 * Every page the docs site is made of. Pure — main() is what touches disk.
 *
 * `models` is optional so tests can render the markup without a prebake on
 * disk. The build does not get that freedom: main() below refuses to write a
 * page whose model is missing or was baked from different source.
 */
export async function renderDocsSite(
  models?: ReadonlyMap<string, DocsModel>,
): Promise<RenderedPage[]> {
  const pages = buildDocsPages();
  const highlighter = await createHighlighter({
    themes: ['github-light'],
    langs: ['javascript'],
  });
  return [
    renderIndex(pages),
    renderMcpReferencePage(),
    renderDesignGuidePage(),
    renderWorkflowDemosPage(),
    ...pages.map((page, index) => renderPage(page, index, highlighter, models?.get(page.slug))),
  ];
}

function readManifest(): DocsModelManifest | null {
  const file = path.join(REPO_ROOT, 'site', DOCS_MODEL_DIR, DOCS_MODEL_MANIFEST);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as DocsModelManifest;
}

async function main(): Promise<void> {
  // The staleness gate. A page whose model was baked from older source is a page
  // that shows geometry which does not match the code beside it, and looks
  // completely fine doing it. Refusing to build is the only honest response.
  const manifest = readManifest();
  const stale = staleModels(buildDocsPages(), manifest);
  if (stale.length > 0) {
    throw new Error(
      `prebaked models are missing or stale — run site/scripts/prebake-docs-models.ts:\n  - ${stale.join('\n  - ')}`,
    );
  }

  const models = new Map(manifest!.models.map((m) => [m.slug, m]));
  const rendered = await renderDocsSite(models);
  mkdirSync(path.join(REPO_ROOT, 'site/docs'), { recursive: true });
  for (const page of rendered) {
    writeFileSync(path.join(REPO_ROOT, 'site', page.file), page.html);
  }
  writeFileSync(path.join(REPO_ROOT, 'site/docs/mcp-tools.json'), JSON.stringify(buildMcpReference(TOOLS), null, 2) + '\n');
  console.log(`✓ site/docs — ${rendered.length} pages, ${models.size} prebaked models`);
}

// Run only when invoked directly, not when imported by the generator test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('build-docs failed:', err);
    process.exit(1);
  });
}
