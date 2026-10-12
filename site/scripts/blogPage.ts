// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The HTML around a blog post and around the blog index. The shell is the one
// the hand-written blog pages had before the build existed, kept byte for
// byte, so moving the first post onto the build changed nothing a reader sees.

import { MESHOPT_DECODER_URL } from '../../scripts/lib/meshoptAssets';
import { escapeAttr, escapeText } from './blogMarkdown';

export const SITE_ORIGIN = 'https://kernelcad.com';
export const BLOG_AUTHOR = 'Andrii Shylenko';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const INDEX_BLURB = 'Release notes and how-tos from the kernelCAD team.';

/** The 3D viewer the landing gallery and the app use, from the same CDN URL. */
export const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js';

/** File names of the built media, next to the page. */
export const POST_VIDEO_FILE = 'video.mp4';
export const POST_MODEL_FILE = 'model.glb';

const MEDIA_STYLE = {
  video: '    .legal figure video { display: block; width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper); }',
  model: '    .legal model-viewer { display: block; width: 100%; height: 440px; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper); }',
};

/**
 * The video and the 3D view of the model, shown right after the lede, with the
 * CSS lines the page needs for them. Empty for a post with neither.
 */
export function postMedia(media: { readonly video?: string; readonly model?: string; readonly modelCompression?: 'meshopt' }): { lines: string[]; style: string[] } {
  const lines: string[] = [];
  const style: string[] = [];
  if (media.video !== undefined) {
    lines.push('      <figure>', `        <video src="${POST_VIDEO_FILE}" controls playsinline preload="metadata"></video>`, '      </figure>');
    style.push(MEDIA_STYLE.video);
  }
  if (media.model !== undefined) {
    lines.push(
      '      <figure>',
      `        <model-viewer src="${POST_MODEL_FILE}" alt="${escapeAttr(`The model built from ${media.model}`)}" camera-controls auto-rotate rotation-per-second="12deg" interaction-prompt="none" touch-action="pan-y" loading="lazy"></model-viewer>`,
      `        <figcaption>The model, built from <code>${escapeText(media.model)}</code>. Drag to turn it.</figcaption>`,
      '      </figure>',
      ...(media.modelCompression === 'meshopt' ? [`      <script>self.ModelViewerElement = { ...(self.ModelViewerElement || {}), meshoptDecoderLocation: '${MESHOPT_DECODER_URL}' };</script>`] : []),
      `      <script type="module" src="${MODEL_VIEWER_SRC}"></script>`,
    );
    style.push(MEDIA_STYLE.model);
  }
  return { lines, style };
}

export interface PageHead {
  readonly title: string;
  readonly description: string;
  readonly ogType: 'article' | 'website';
  /** Absolute URL. */
  readonly image: string;
  /** Absolute URL of the page. */
  readonly url: string;
  /** Draft previews ask search engines to stay away. */
  readonly noindex: boolean;
  /** CSS lines for this page only (the viewer and video rules). */
  readonly extraStyle: readonly string[];
}

const BASE_STYLE = [
  "    .legal { max-width: 760px; margin: 0 auto; padding: 1rem 0 4rem; }",
  "    .legal h1 { font-family: 'Source Serif 4', serif; font-size: 2.2rem; line-height: 1.2; margin: 1.5rem 0 0.25rem; }",
  "    .legal .effective { color: var(--ink-faint, #8a8475); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; margin-bottom: 2rem; }",
  "    .legal h2 { font-family: 'Source Serif 4', serif; font-size: 1.35rem; margin: 2.2rem 0 0.5rem; }",
  "    .legal p, .legal li { font-family: 'Inter', sans-serif; line-height: 1.65; color: var(--ink-soft, #3a3a3a); }",
  '    .legal ul { padding-left: 1.25rem; }',
  "    .legal code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; }",
  '    .legal a { color: var(--blueprint, #2f6df0); }',
  '    .legal strong { color: var(--ink, #1a1a1a); }',
  '    .legal .lede { font-size: 1.1rem; color: var(--ink); }',
  '    .legal figure { margin: 1.5rem 0; }',
  '    .legal figure img { display: block; width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper); }',
  "    .legal figcaption { font-family: 'Inter', sans-serif; font-size: 0.85rem; color: var(--ink-faint); margin-top: 0.5rem; }",
  '    .legal pre { background: var(--code-bg); color: var(--code-text); border-radius: 6px; padding: 16px 18px; overflow-x: auto; margin: 1.25rem 0; }',
  '    .legal pre code { font-size: 0.85rem; line-height: 1.6; color: inherit; }',
  '    .legal p code, .legal li code { background: var(--vellum-soft); padding: 1px 5px; border-radius: 3px; }',
  '    .post-list { list-style: none; padding: 0; margin: 2rem 0; }',
  '    .post-list li { padding: 1.25rem 0; border-top: 1px solid var(--rule); }',
  '    .post-list li:last-child { border-bottom: 1px solid var(--rule); }',
  "    .post-list a.post-title { font-family: 'Source Serif 4', serif; font-size: 1.4rem; text-decoration: none; }",
  '    .post-list a.post-title:hover { text-decoration: underline; }',
  '    .post-list .effective { margin: 0.25rem 0 0.5rem; }',
  '    .post-list p { margin: 0; }',
];

const NAV = `  <div class="page-wrap">
    <nav class="nav">
      <a class="nav-mark" href="/">
        <svg class="k" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
          <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
        </svg>
        <span>kernel<span class="cad">CAD</span></span>
      </a>
      <div class="nav-links">
        <a href="/blog/">blog</a>
        <a class="app-link" href="https://app.kernelcad.com">app ↗</a>
        <a href="https://github.com/w1ne/kernelCAD-web">github</a>
        <a href="https://www.npmjs.com/package/kernelcad">npm</a>
        <a href="https://x.com/kernelcad">@kernelcad</a>
      </div>
    </nav>`;

const FOOTER = `    <footer class="footer">
      <div>kernelCAD · MIT</div>
      <div class="footer-links">
        <a href="/terms.html">terms</a>
        <a href="/privacy.html">privacy</a>
        <a href="https://github.com/w1ne/kernelCAD-web">github</a>
        <a href="https://www.npmjs.com/package/kernelcad">npm</a>
        <a href="https://x.com/kernelcad">x</a>
        <a href="https://app.kernelcad.com">app</a>
      </div>
    </footer>
    <div class="footer-stack" style="border-top: 1px solid var(--stroke, rgba(255,255,255,0.08)); padding: 14px 0 28px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; color: var(--mute, #888); font-size: 0.78rem;">
      <span style="opacity: 0.7;">part of the engineer stack</span>
      <nav style="display: flex; gap: 18px;">
        <a href="https://labwired.com" style="color: inherit;">LabWired</a>
        <a href="https://kernelcad.com" style="color: inherit;">kernelCAD</a>
        <a href="https://koamtachi.com" style="color: inherit;">koamtachi</a>
        <a href="https://shylenko.com" style="color: inherit;">shylenko.com</a>
      </nav>
    </div>
  </div>`;

/** A whole page: head, nav, `<main class="legal">` holding `main`, footer. */
export function pageShell(head: PageHead, main: string): string {
  const meta = [
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '  <meta name="color-scheme" content="light" />',
    ...(head.noindex ? ['  <meta name="robots" content="noindex" />'] : []),
    `  <meta name="description" content="${escapeAttr(head.description)}" />`,
    `  <meta property="og:type" content="${head.ogType}" />`,
    `  <meta property="og:title" content="${escapeAttr(head.title)}" />`,
    `  <meta property="og:description" content="${escapeAttr(head.description)}" />`,
    `  <meta property="og:image" content="${escapeAttr(head.image)}" />`,
    `  <meta property="og:url" content="${escapeAttr(head.url)}" />`,
    '  <meta name="twitter:card" content="summary_large_image" />',
    `  <meta name="twitter:title" content="${escapeAttr(head.title)}" />`,
    `  <meta name="twitter:description" content="${escapeAttr(head.description)}" />`,
    `  <meta name="twitter:image" content="${escapeAttr(head.image)}" />`,
    `  <link rel="canonical" href="${escapeAttr(head.url)}" />`,
    '  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    '  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,500;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />',
    '  <link rel="stylesheet" href="/style.css" />',
    `  <title>${escapeText(head.title)}</title>`,
    `  <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "e5f5f4c6464f456d8f5376411e77f545"}'></script>`,
    '  <style>',
    ...BASE_STYLE,
    ...head.extraStyle,
    '  </style>',
  ];
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    ...meta,
    '</head>',
    '<body>',
    NAV,
    '',
    '    <main class="legal">',
    main,
    '    </main>',
    '',
    FOOTER,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** The line under a post's title: blog link, date, author. */
export function postByline(date: string, draft: boolean): string {
  const tail = draft ? ' · draft preview, not on the blog index' : '';
  return `      <p class="effective"><a href="/blog/">Blog</a> · <time datetime="${escapeAttr(date)}">${escapeText(date)}</time> · ${BLOG_AUTHOR}${tail}</p>`;
}

export interface IndexEntry {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly date: string;
}

/** The blog index page, posts in the order given. */
export function indexPage(entries: readonly IndexEntry[]): string {
  const items = entries.map((entry) =>
    [
      '        <li>',
      `          <a class="post-title" href="/blog/${escapeAttr(entry.slug)}/">${escapeText(entry.title)}</a>`,
      `          <p class="effective"><time datetime="${escapeAttr(entry.date)}">${escapeText(entry.date)}</time> · ${BLOG_AUTHOR}</p>`,
      `          <p>${escapeText(entry.summary)}</p>`,
      '        </li>',
    ].join('\n'),
  );
  const main = [
    '      <h1>Blog</h1>',
    `      <p class="effective">${INDEX_BLURB}</p>`,
    '      <ul class="post-list">',
    ...items,
    '      </ul>',
  ].join('\n');
  return pageShell(
    {
      title: 'kernelCAD blog',
      description: INDEX_BLURB,
      ogType: 'website',
      image: DEFAULT_OG_IMAGE,
      url: `${SITE_ORIGIN}/blog/`,
      noindex: false,
      extraStyle: [],
    },
    main,
  );
}
