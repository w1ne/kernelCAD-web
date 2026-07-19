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

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import { buildDocsPages, type DocsPage } from '../../src/docs/liveDocs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

function shell(title: string, description: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,500;1,500&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/docs.css" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div class="page-wrap docs-wrap">

    <nav class="nav">
      <a class="nav-mark" href="/">
        <svg class="k" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
          <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
        </svg>
        <span>kernel<span class="cad">CAD</span></span>
      </a>
      <div class="nav-links">
        <a href="/docs/">docs</a>
        <a class="app-link" href="https://app.kernelcad.com">app ↗</a>
        <a href="https://github.com/w1ne/kernelCAD-web">github</a>
        <a href="https://www.npmjs.com/package/kernelcad">npm</a>
      </div>
    </nav>

${body}

    <footer class="footer">
      <div>kernelCAD · MIT</div>
      <div class="footer-links">
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
 * The bootstrap. Deliberately inline and dependency-free: its only job is to
 * reveal the Run button and pull in the island on the first interaction, so the
 * 10.8 MB engine is never on the page-load path. It also owns the Run clicks
 * for the lifetime of the page, which means a click that lands while the island
 * is still downloading is queued on the same promise rather than dropped.
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

function renderExample(page: DocsPage, highlighted: string): string {
  const example = page.example;
  if (!example) return '';
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
        <div class="docs-stage" hidden><canvas></canvas></div>
      </section>`;
}

export interface RenderedPage {
  /** Path relative to site/, e.g. `docs/finish-edges.html`. */
  readonly file: string;
  readonly html: string;
}

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

function renderPage(page: DocsPage, highlighter: Highlighter): RenderedPage {
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
${renderExample(page, highlighted)}
${note}
      <h2 class="docs-h2">Calls</h2>
${renderEntries(page)}
    </main>

    <script type="module">${BOOTSTRAP}</script>`;

  return {
    file: `docs/${page.slug}.html`,
    html: shell(`${page.task} — kernelCAD`, page.blurb, body),
  };
}

function renderIndex(pages: DocsPage[]): RenderedPage {
  const cards = pages
    .map(
      (page) => `        <li class="docs-card">
          <a href="/docs/${page.slug}.html"><span class="docs-card-task">${escapeHtml(page.task)}</span></a>
          <span class="docs-card-blurb">${inlineCode(page.blurb)}</span>
          <span class="docs-card-count">${page.entries.length} calls</span>
        </li>`,
    )
    .join('\n');

  const body = `    <main class="docs-main">
      <h1 class="docs-title">Script API</h1>
      <p class="docs-blurb">The kernelCAD script API, grouped by what you're doing rather than what you call
        it on. Every page has an example you can edit and run.</p>
      <ul class="docs-cards">
${cards}
      </ul>
      <p class="docs-note">Same tables in one file:
        <a href="https://github.com/w1ne/kernelCAD-web/blob/develop/docs/cheat-sheet.md">docs/cheat-sheet.md</a>.
        Agents should call <code>lookup_api(query)</code> over the MCP server.</p>
    </main>`;

  return { file: 'docs/index.html', html: shell('Script API — kernelCAD', 'The kernelCAD script API, with runnable examples that rebuild geometry in your browser.', body) };
}

/** Every page the docs site is made of. Pure — main() is what touches disk. */
export async function renderDocsSite(): Promise<RenderedPage[]> {
  const pages = buildDocsPages();
  const highlighter = await createHighlighter({
    themes: ['github-light'],
    langs: ['javascript'],
  });
  return [renderIndex(pages), ...pages.map((page) => renderPage(page, highlighter))];
}

async function main(): Promise<void> {
  const rendered = await renderDocsSite();
  mkdirSync(path.join(REPO_ROOT, 'site/docs'), { recursive: true });
  for (const page of rendered) {
    writeFileSync(path.join(REPO_ROOT, 'site', page.file), page.html);
  }
  console.log(`✓ site/docs — ${rendered.length} pages`);
}

// Run only when invoked directly, not when imported by the generator test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('build-docs failed:', err);
    process.exit(1);
  });
}
