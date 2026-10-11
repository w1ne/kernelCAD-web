#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Builds the blog from docs/guide/*.md.
//
//   npx tsx site/scripts/build-blog.ts
//
// A guide with front matter is a post (fields: site/scripts/blogFrontMatter.ts);
// a guide without front matter is not, and is skipped. The file name is the
// slug: docs/guide/<slug>.md becomes site/blog/<slug>/index.html, and the blog
// index, site/blog/index.html, lists the published posts newest first. The
// build writes nothing else.
//
// The body is the Markdown subset in site/scripts/blogMarkdown.ts. Its first
// paragraph is the lede. The title comes from front matter, so the body has no
// level-1 heading. An image alone on its line is a figure, its "title" the
// caption: ![alt](path "caption"). The path is relative to the Markdown file,
// as on GitHub, and must point at a file under site/; the page links it from
// there, and width and height come from the PNG itself.

import { mkdirSync, readFileSync, readdirSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGuide, type BlogFrontMatter } from './blogFrontMatter';
import { MarkdownError, escapeAttr, escapeText, parseBlocks, renderInline, type Block, type FigureBlock } from './blogMarkdown';
import { DEFAULT_OG_IMAGE, SITE_ORIGIN, indexPage, pageShell, postByline } from './blogPage';

export const GUIDE_DIR = 'docs/guide';
export const BLOG_DIR = 'site/blog';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A problem in a post's source, at a file and (when known) a line. */
export class BlogSourceError extends Error {
  readonly file: string;
  readonly line: number | null;

  constructor(file: string, line: number | null, detail: string) {
    super(line === null ? `${file}: ${detail}` : `${file}:${line}: ${detail}`);
    this.name = 'BlogSourceError';
    this.file = file;
    this.line = line;
  }
}

export interface BlogPost {
  /** Repository path of the Markdown source. */
  readonly file: string;
  readonly slug: string;
  readonly meta: BlogFrontMatter;
  readonly blocks: readonly Block[];
}

/** The post a guide describes, or null for a guide without front matter. */
export function postFromSource(file: string, source: string): BlogPost | null {
  const parsed = parseGuide(file, source);
  if (parsed === null) return null;
  const slug = path.posix.basename(file, '.md');
  if (!SLUG.test(slug)) {
    throw new BlogSourceError(file, null, `the file name is the URL slug: lower-case letters and digits joined by hyphens, not "${slug}"`);
  }
  if (slug === 'drafts') {
    throw new BlogSourceError(file, null, 'site/blog/drafts/ is where draft previews go; choose another file name');
  }
  try {
    return { file, slug, meta: parsed.meta, blocks: parseBlocks(parsed.body, parsed.bodyLine) };
  } catch (err) {
    if (err instanceof MarkdownError) throw new BlogSourceError(file, err.line, err.detail);
    throw err;
  }
}

/** Every post in docs/guide, in file-name order. */
export function readPosts(repoRoot: string): BlogPost[] {
  const dir = path.join(repoRoot, GUIDE_DIR);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => postFromSource(`${GUIDE_DIR}/${name}`, readFileSync(path.join(dir, name), 'utf8')))
    .filter((post): post is BlogPost => post !== null);
}

export interface OutputFile {
  /** Repository path, always under site/blog/. */
  readonly path: string;
  readonly html: string;
}

/** A figure's image as the page links it. */
export interface PostImage {
  readonly line: number;
  /** As written in the Markdown. */
  readonly src: string;
  /** Absolute path on disk. */
  readonly file: string;
  /** False when the path leaves site/, so the page cannot link it. */
  readonly underSite: boolean;
}

export interface RenderedPost {
  readonly post: BlogPost;
  /** Repository path of the page. */
  readonly path: string;
  readonly images: readonly PostImage[];
}

export interface BlogBuild {
  readonly files: readonly OutputFile[];
  readonly posts: readonly RenderedPost[];
}

export interface RenderOptions {
  readonly repoRoot: string;
}

/** Newest first; same day by slug, so the order never depends on the disk. */
function newestFirst(a: BlogPost, b: BlogPost): number {
  return b.meta.date.localeCompare(a.meta.date) || a.slug.localeCompare(b.slug);
}

/** Every page of the blog, as files to write. Reads the images for their size. */
export function renderBlog(posts: readonly BlogPost[], opts: RenderOptions): BlogBuild {
  const published = posts.filter((post) => post.meta.status === 'published').sort(newestFirst);
  const rendered = published.map((post) => renderPost(post, opts.repoRoot));
  const index: OutputFile = {
    path: `${BLOG_DIR}/index.html`,
    html: indexPage(published.map((post) => ({ slug: post.slug, ...post.meta }))),
  };
  return { files: [...rendered.map((r) => r.file), index], posts: rendered.map((r) => r.rendered) };
}

interface PageContext {
  readonly repoRoot: string;
  readonly post: BlogPost;
  /** Site path of the page's directory, e.g. `/blog/<slug>/`. */
  readonly pageDir: string;
  readonly images: PostImage[];
}

function renderPost(post: BlogPost, repoRoot: string): { file: OutputFile; rendered: RenderedPost } {
  const pageDir = `/blog/${post.slug}/`;
  const ctx: PageContext = { repoRoot, post, pageDir, images: [] };
  const [lede, ...rest] = post.blocks;
  const main = [
    '      <article>',
    postByline(post.meta.date, false),
    `      <h1>${escapeText(post.meta.title)}</h1>`,
    '',
    `      <p class="lede">${renderInline((lede as { text: string }).text)}</p>`,
    ...rest.flatMap((block) => renderBlock(block, ctx)),
    '      </article>',
  ].join('\n');
  const firstImage = ctx.images.find((image) => image.underSite);
  const html = pageShell(
    {
      title: post.meta.title,
      description: post.meta.summary,
      ogType: 'article',
      image: firstImage ? `${SITE_ORIGIN}${siteUrl(repoRoot, firstImage.file)}` : DEFAULT_OG_IMAGE,
      url: `${SITE_ORIGIN}${pageDir}`,
      noindex: false,
      extraStyle: [],
    },
    main,
  );
  const pagePath = `${BLOG_DIR}/${post.slug}/index.html`;
  return { file: { path: pagePath, html }, rendered: { post, path: pagePath, images: ctx.images } };
}

/** One block as lines of the article; a `##` heading opens with a blank line. */
function renderBlock(block: Block, ctx: PageContext): string[] {
  switch (block.kind) {
    case 'heading':
      return block.level === 2 ? ['', `      <h2>${renderInline(block.text)}</h2>`] : [`      <h3>${renderInline(block.text)}</h3>`];
    case 'paragraph':
      return [`      <p>${renderInline(block.text)}</p>`];
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      return [`      <${tag}>`, ...block.items.map((item) => `        <li>${renderInline(item)}</li>`), `      </${tag}>`];
    }
    case 'code':
      return [`      <pre><code>${escapeText(block.code)}</code></pre>`];
    case 'figure':
      return renderFigure(block, ctx);
    case 'check':
      return [];
  }
}

function renderFigure(block: FigureBlock, ctx: PageContext): string[] {
  const file = path.resolve(ctx.repoRoot, path.posix.dirname(ctx.post.file), block.src);
  const url = siteUrl(ctx.repoRoot, file);
  ctx.images.push({ line: block.line, src: block.src, file, underSite: url !== null });
  const src = url === null ? block.src : url.startsWith(ctx.pageDir) ? url.slice(ctx.pageDir.length) : url;
  const size = pngSize(file);
  const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
  return [
    '      <figure>',
    `        <img src="${escapeAttr(src)}" alt="${escapeAttr(block.alt)}"${dims} loading="lazy" />`,
    ...(block.caption === null ? [] : [`        <figcaption>${renderInline(block.caption)}</figcaption>`]),
    '      </figure>',
  ];
}

/** Site path (`/blog/x/y.png`) of a file under site/, or null for any other file. */
function siteUrl(repoRoot: string, file: string): string | null {
  const rel = path.relative(path.join(repoRoot, 'site'), file);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return `/${rel.split(path.sep).join('/')}`;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Pixel size from a PNG's header; null when the file is missing or not a PNG. */
export function pngSize(file: string): { width: number; height: number } | null {
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const head = Buffer.alloc(24);
    if (readSync(fd, head, 0, 24, 0) < 24) return null;
    if (!head.subarray(0, 8).equals(PNG_SIGNATURE) || head.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function writeOutputs(repoRoot: string, files: readonly OutputFile[]): void {
  for (const file of files) {
    // The one place the build touches disk: refuse anything outside site/blog/.
    if (!file.path.startsWith(`${BLOG_DIR}/`) || file.path.includes('..')) {
      throw new Error(`refusing to write ${file.path}: the blog build writes only under ${BLOG_DIR}/`);
    }
    const target = path.join(repoRoot, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.html);
  }
}

function main(): void {
  const posts = readPosts(REPO_ROOT);
  const build = renderBlog(posts, { repoRoot: REPO_ROOT });
  writeOutputs(REPO_ROOT, build.files);
  console.log(`✓ ${BLOG_DIR} — ${build.posts.length} published post(s) and the index`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (err) {
    console.error(`build-blog failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
