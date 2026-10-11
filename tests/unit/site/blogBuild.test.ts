// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The blog build turns docs/guide/*.md pages with front matter into
// site/blog/<slug>/index.html and the blog index. These tests pin what it
// writes and where, and the Markdown it accepts.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BlogSourceError, postFromSource, readPosts, renderBlog, type BlogPost } from '../../../site/scripts/build-blog';

const REPO_ROOT = resolve(__dirname, '../../..');
const REFERENCE = join(__dirname, 'fixtures/blog-reference');

function guide(fields: Record<string, string>, body: string): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n\n${body}`;
}

const FIELDS = { title: 'First post', summary: 'What the first post is about.', date: '2026-10-01', kind: 'guide' };

function post(file: string, fields: Record<string, string>, body: string): BlogPost {
  const parsed = postFromSource(file, guide(fields, body));
  if (parsed === null) throw new Error('expected a post');
  return parsed;
}

/** A PNG header is all the build reads: the size sits in the IHDR chunk. */
function png(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

let repo: string;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'kc-blog-'));
  mkdirSync(join(repo, 'site/blog/first-post'), { recursive: true });
  writeFileSync(join(repo, 'site/blog/first-post/view.png'), png(640, 480));
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

function page(posts: readonly BlogPost[], path: string): string {
  const file = renderBlog(posts, { repoRoot: repo }).files.find((f) => f.path === path);
  if (!file) throw new Error(`no output at ${path}`);
  return file.html;
}

describe('renderBlog', () => {
  const first = post('docs/guide/first-post.md', FIELDS, 'The lede.\n');
  const second = post(
    'docs/guide/second-post.md',
    { ...FIELDS, title: 'Second post', date: '2026-10-05' },
    'Another lede.\n',
  );

  it('writes one page per published guide and the index, and nothing outside site/blog/', () => {
    const paths = renderBlog([first, second], { repoRoot: repo }).files.map((f) => f.path);
    expect(paths.sort()).toEqual([
      'site/blog/first-post/index.html',
      'site/blog/index.html',
      'site/blog/second-post/index.html',
    ]);
  });

  it('lists published posts newest first in the index', () => {
    const index = page([first, second], 'site/blog/index.html');
    expect(index.indexOf('/blog/second-post/')).toBeGreaterThan(-1);
    expect(index.indexOf('/blog/second-post/')).toBeLessThan(index.indexOf('/blog/first-post/'));
    expect(index).toContain('<time datetime="2026-10-05">2026-10-05</time>');
    expect(index).toContain('<p>What the first post is about.</p>');
  });

  it('keeps drafts out of the pages and the index', () => {
    const draft = post('docs/guide/not-yet.md', { ...FIELDS, status: 'draft' }, 'Draft lede.\n');
    const build = renderBlog([first, draft], { repoRoot: repo });
    expect(build.files.map((f) => f.path).sort()).toEqual(['site/blog/first-post/index.html', 'site/blog/index.html']);
    expect(build.files.some((f) => f.html.includes('not-yet'))).toBe(false);
  });

  it('shows the video and the model after the lede, and builds their files next to the page', () => {
    const useCase = post(
      'docs/guide/first-post.md',
      { ...FIELDS, kind: 'use-case', model: 'examples/demo/model.kcad.ts', video: 'docs/demos/demo/demo.mp4' },
      'The lede.\n\n## Next\n\nText.\n',
    );
    const build = renderBlog([useCase], { repoRoot: repo });
    const html = build.files.find((f) => f.path === 'site/blog/first-post/index.html')!.html;
    const lede = html.indexOf('<p class="lede">');
    const video = html.indexOf('<video src="video.mp4" controls playsinline preload="metadata"></video>');
    const viewer = html.indexOf('<model-viewer src="model.glb"');
    expect(lede).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(lede);
    expect(viewer).toBeGreaterThan(video);
    expect(viewer).toBeLessThan(html.indexOf('<h2>Next</h2>'));
    expect(html).toContain('<code>examples/demo/model.kcad.ts</code>');
    expect(html).toContain('<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js"></script>');
    expect(html).toContain('    .legal model-viewer {');
    expect(build.assets).toEqual([
      { kind: 'copy', from: 'docs/demos/demo/demo.mp4', to: 'site/blog/first-post/video.mp4' },
      { kind: 'glb', from: 'examples/demo/model.kcad.ts', to: 'site/blog/first-post/model.glb' },
    ]);
  });

  it('gives a post without a model or video no viewer, no script and no files to build', () => {
    const build = renderBlog([first], { repoRoot: repo });
    expect(build.assets).toEqual([]);
    expect(build.files[0].html).not.toContain('model-viewer');
    expect(build.files[0].html).not.toContain('<video');
  });

  it('puts the title, summary and canonical URL in the head', () => {
    const html = page([first], 'site/blog/first-post/index.html');
    expect(html).toContain('<title>First post</title>');
    expect(html).toContain('<meta name="description" content="What the first post is about." />');
    expect(html).toContain('<link rel="canonical" href="https://kernelcad.com/blog/first-post/" />');
    expect(html).toContain('<meta property="og:image" content="https://kernelcad.com/og-image.png" />');
    expect(html).toContain('<h1>First post</h1>');
  });

  it('renders the Markdown a post may use', () => {
    const body = [
      'The lede with `code`, a [link](https://example.com/?a=1&b=2) and **bold** text.',
      '',
      '## A section',
      '',
      'A paragraph',
      'over two lines.',
      '',
      '![A screenshot](../../site/blog/first-post/view.png "What the screenshot shows.")',
      '',
      '### A step',
      '',
      '- one item',
      '- two `items`',
      '',
      '1. first',
      '2. second',
      '',
      '```ts',
      'const a = b < c && d > e;',
      '```',
      '',
      '<!-- a note for the author, not rendered -->',
      '',
    ].join('\n');
    const html = page([post('docs/guide/first-post.md', FIELDS, body)], 'site/blog/first-post/index.html');
    expect(html).toContain(
      '<p class="lede">The lede with <code>code</code>, a <a href="https://example.com/?a=1&amp;b=2">link</a> and <strong>bold</strong> text.</p>',
    );
    expect(html).toContain('\n\n      <h2>A section</h2>\n      <p>A paragraph over two lines.</p>');
    expect(html).toContain(
      '      <figure>\n        <img src="view.png" alt="A screenshot" width="640" height="480" loading="lazy" />\n' +
        '        <figcaption>What the screenshot shows.</figcaption>\n      </figure>',
    );
    expect(html).toContain('<meta property="og:image" content="https://kernelcad.com/blog/first-post/view.png" />');
    expect(html).toContain('      <h3>A step</h3>');
    expect(html).toContain('      <ul>\n        <li>one item</li>\n        <li>two <code>items</code></li>\n      </ul>');
    expect(html).toContain('      <ol>\n        <li>first</li>\n        <li>second</li>\n      </ol>');
    expect(html).toContain('      <pre><code>const a = b &lt; c &amp;&amp; d &gt; e;</code></pre>');
    expect(html).not.toContain('a note for the author');
  });

  it('escapes text and attribute values', () => {
    const html = page(
      [post('docs/guide/first-post.md', { ...FIELDS, title: `'"Quotes" & <tags>'` }, 'Less < more & "quoted".\n')],
      'site/blog/first-post/index.html',
    );
    expect(html).toContain('<title>"Quotes" &amp; &lt;tags&gt;</title>');
    expect(html).toContain('<meta property="og:title" content="&quot;Quotes&quot; &amp; &lt;tags&gt;" />');
    expect(html).toContain('<p class="lede">Less &lt; more &amp; "quoted".</p>');
  });

  // The front matter takes lines 1-6 and line 7 is blank, so the body text
  // starts on line 8 of the file.
  it.each([
    ['a table', 'The lede.\n\n| a | b |\n', 10],
    ['a quote', 'The lede.\n\n> quoted\n', 10],
    ['raw HTML', 'The lede.\n\n<div>x</div>\n', 10],
    ['a level-1 heading', '# Title again\n', 8],
    ['a fence that is never closed', 'The lede.\n\n```ts\nconst a = 1;\n', 10],
    ['a body that does not start with a paragraph', '## Section first\n', 8],
    ['a check comment over two lines', 'The lede.\n<!-- check: a = 1\n-->\n', 9],
    ['an image inside a paragraph', 'The lede.\n\nSee ![a view](view.png) here.\n', 10],
    ['an image inside a list item', 'The lede.\n\n- see ![a view](view.png)\n', 10],
  ])('rejects %s with the file and line', (_name, body, line) => {
    let error: unknown;
    try {
      postFromSource('docs/guide/first-post.md', guide(FIELDS, body));
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(BlogSourceError);
    expect((error as BlogSourceError).message).toMatch(new RegExp(`^docs/guide/first-post\\.md:${line}: `));
  });

  it('rejects a file name that cannot be a URL slug', () => {
    expect(() => postFromSource('docs/guide/Bad Name.md', guide(FIELDS, 'Lede.\n'))).toThrow(/slug/);
    expect(() => postFromSource('docs/guide/drafts.md', guide(FIELDS, 'Lede.\n'))).toThrow(/drafts/);
  });

  it('skips a guide without front matter', () => {
    expect(postFromSource('docs/guide/plain.md', '# A plain guide\n\nText.\n')).toBeNull();
  });
});

// The words a reader sees: no tags, no styles or scripts, entities decoded,
// whitespace collapsed.
function visibleText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// The dimensions post was a hand-written page before the build existed. The
// fixtures are copies of that page and of the hand-written index, taken before
// the post moved onto the build. They are the reference: the build must
// reproduce them, not the other way round.
describe('the dimensions post on the blog build', () => {
  const posts = readPosts(REPO_ROOT);
  const dimensions = posts.find((p) => p.slug === 'dimensions-measure-drawings');
  const referencePost = readFileSync(join(REFERENCE, 'dimensions-measure-drawings.html'), 'utf8');
  const referenceIndex = readFileSync(join(REFERENCE, 'index.html'), 'utf8');

  function built(only: readonly BlogPost[], path: string): string {
    const file = renderBlog(only, { repoRoot: REPO_ROOT }).files.find((f) => f.path === path);
    if (!file) throw new Error(`no output at ${path}`);
    return file.html;
  }

  it('is a published guide', () => {
    expect(dimensions?.meta).toMatchObject({ kind: 'guide', status: 'published', date: '2026-10-06' });
  });

  it('renders the same text as the hand-written page', () => {
    const html = built([dimensions!], 'site/blog/dimensions-measure-drawings/index.html');
    expect(visibleText(html)).toBe(visibleText(referencePost));
  });

  it('differs from the hand-written page only in the image height the build reads from the PNG', () => {
    // The page said height="1286"; bracket-drawing-pdf.png is 1819 x 1287.
    const html = built([dimensions!], 'site/blog/dimensions-measure-drawings/index.html');
    expect(html).toBe(referencePost.replace('width="1819" height="1286"', 'width="1819" height="1287"'));
  });

  it('builds the hand-written index from that one post', () => {
    expect(built([dimensions!], 'site/blog/index.html')).toBe(referenceIndex);
  });
});

describe('the committed blog pages', () => {
  it('are what the build writes from docs/guide', () => {
    // Run `npx tsx site/scripts/build-blog.ts` and commit site/blog/ when this fails.
    for (const file of renderBlog(readPosts(REPO_ROOT), { repoRoot: REPO_ROOT }).files) {
      expect(readFileSync(join(REPO_ROOT, file.path), 'utf8'), file.path).toBe(file.html);
    }
  });
});
