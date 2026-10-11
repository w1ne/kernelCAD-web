// The tutorial and repository guide share one Markdown source. Drawing assets
// are generated separately by examples/drafting-review/run.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'https://kernelcad.com/blog/drafting-review/';
const TITLE = 'From model to reviewed drawing: three dimensioning styles';
const DESCRIPTION = 'Draft real mounting and bearing parts, compare baseline, chain and symmetry dimensions, and review annotations. Editable source, SVG and PDF examples included.';

export function renderDraftingPost(markdown: string, template: string): string {
  const prose = markdown.replace(/^---[\s\S]*?---\s*/, '').replace(/^# [^\n]+\n/, '');
  const body = renderToStaticMarkup(createElement(ReactMarkdown, {
    children: prose,
    components: {
      a: ({ href, children }) => createElement('a', { href, ...(/\.kcad\.ts$/.test(href ?? '') ? { download: true } : {}) }, children),
      img: ({ src, alt, title }) => createElement('img', {
      src, alt, title, width: 1680, height: 1188, loading: 'lazy',
      style: { display: 'block', width: '100%', height: 'auto', border: '1px solid var(--rule)', borderRadius: 6 },
      }),
    },
  })).replaceAll(`href="${URL}"`, 'href="/blog/drafting-review/"').replaceAll(URL, '');
  return template
    .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]+(" \/>)/g, `$1${DESCRIPTION}$2`)
    .replaceAll('kernelCAD now shows the sizes on your model', TITLE)
    .replaceAll('https://kernelcad.com/blog/dimensions-measure-drawings/bracket-dimensions.png', `${URL}mounting-plate-baseline.png`)
    .replaceAll('https://kernelcad.com/blog/dimensions-measure-drawings/', URL)
    .replace(/<article>[\s\S]*?<\/article>/, `<article>
      <p class="effective"><a href="/blog/">Blog</a> · <time datetime="2026-10-11">2026-10-11</time> · Andrii Shylenko</p>
      <h1>${TITLE}</h1>
      ${body}
      </article>`)
    .replace('</style>', '    .legal h3 { font-family: Inter, sans-serif; font-size: 1rem; margin: 1.6rem 0 0.5rem; }\n  </style>');
}

export function buildDraftingPost(): void {
  const output = resolve(ROOT, 'site/blog/drafting-review');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'index.html'), renderDraftingPost(
    readFileSync(resolve(ROOT, 'docs/guide/drafting-review.md'), 'utf8'),
    readFileSync(resolve(ROOT, 'site/blog/dimensions-measure-drawings/index.html'), 'utf8'),
  ));
  console.log('✓ drafting tutorial — guide rendered as static HTML');
}

if (import.meta.url === `file://${process.argv[1]}`) buildDraftingPost();
