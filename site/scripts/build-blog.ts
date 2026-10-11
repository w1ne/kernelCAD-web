#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Builds the blog from docs/guide/*.md.
//
//   npx tsx site/scripts/build-blog.ts            published posts and the index
//   npx tsx site/scripts/build-blog.ts --drafts   the same, plus a preview of each draft
//
// `npm run site:build` runs the first form.
//
// POSTS
//
// A guide with front matter is a post (fields: site/scripts/blogFrontMatter.ts);
// a guide without front matter is not, and is skipped. The file name is the
// slug: docs/guide/<slug>.md becomes site/blog/<slug>/index.html, and the blog
// index, site/blog/index.html, lists the published posts newest first.
//
// A post with `video` shows it after the lede, and a post with `model` shows a
// 3D view of it there (<model-viewer>, as on the landing gallery). The build
// makes those files next to the page once every check has passed: video.mp4,
// a copy, and model.glb, through the gallery's GLB pipeline and turned Z-up to
// Y-up (site/scripts/blogModel.ts). Both are git-ignored; site:build makes
// them again on deploy. The build writes nothing outside site/blog/.
//
// A draft (status: draft) is never on the index and never in site/blog/<slug>/.
// With --drafts it is built to site/blog/drafts/<slug>/index.html, marked
// noindex. That directory is git-ignored and every build without --drafts
// deletes it, so a preview cannot be deployed. A site/blog/<slug>/ page that no
// published guide builds any more (the post went back to draft) fails the
// build until the directory is removed.
//
// MARKDOWN
//
// The body is the subset in site/scripts/blogMarkdown.ts. Its first paragraph
// is the lede. The title comes from front matter, so the body has no level-1
// heading. An image alone on its line is a figure, its "title" the caption:
// ![alt](path "caption"). The path is relative to the Markdown file, as on
// GitHub, and must point at a file under site/; width and height come from the
// PNG itself.
//
// CHECKS
//
// After writing the pages, the build checks every post it wrote and exits 1
// with file:line for each failure:
//
//   - every ```kcad block evaluates with no error and no warning. A kcad block
//     is a whole script; use ```ts for a fragment.
//   - every image exists, and so do the `model` and `video` files.
//   - every quoted value matches `kernelcad evaluate <model> --json`.
//
// A quoted value is marked by a check comment on the line right under the
// paragraph, list or code block that shows it. Rendered Markdown hides it.
//
//   Each fuel line is 309.29 mm long.
//   <!-- check: tubes.lines[name=fuel-a].cutLength = 309.29 -->
//
//   <!-- check examples/x/broken.kcad.ts: diagnostics[0].code = tube.clearance.violated -->
//   <!-- check examples/x/broken.kcad.ts: diagnostics[0].message contains needs 12.00 mm -->
//   <!-- check: tubes.lines[name=hyd-b].bendTableCsv = block -->
//
//   model  optional, a repository path; without it, the front matter `model`.
//   path   into the --json output: keys joined by dots; [n] is the nth element
//          of a list; [key=value] or [key=value,key=value] is the one element
//          that matches (none or several is a failure); .length is the size
//          of a list. `bendTableCsv` on a line of tubes.lines is the CSV that
//          `kernelcad export bend-table` writes for that tube, formatted from
//          the same line by the same function.
//   value  a number is compared at the precision written: 309.29 matches
//          309.2947. [a, b, c] compares a list of numbers the same way. `block`
//          compares the whole code block above. Anything else is text, compared
//          exactly; double quotes around it are dropped. `contains` passes when
//          the text is part of the value.
//
// The value as written must also appear in the block above the check, so what
// a reader sees is what was checked. A drifted value fails with the file, the
// line, the model and the real value.

import {
  closeSync,
  copyFileSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGuide, type BlogFrontMatter } from './blogFrontMatter';
import { MarkdownError, escapeAttr, escapeText, parseBlocks, renderInline, type Block, type FigureBlock } from './blogMarkdown';
import {
  DEFAULT_OG_IMAGE,
  POST_MODEL_FILE,
  POST_VIDEO_FILE,
  SITE_ORIGIN,
  indexPage,
  pageShell,
  postByline,
  postMedia,
} from './blogPage';
import { checkOrphanPages, checkPost, needsEvaluator, type CheckFailure, type Evaluator } from './blogChecks';

export const GUIDE_DIR = 'docs/guide';
export const BLOG_DIR = 'site/blog';
export const DRAFTS_DIR = 'site/blog/drafts';

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
  /** File line of each front matter key, for messages about its value. */
  readonly fieldLines: Readonly<Record<string, number>>;
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
    return { file, slug, meta: parsed.meta, fieldLines: parsed.fieldLines, blocks: parseBlocks(parsed.body, parsed.bodyLine) };
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

/** A file a page shows that the build makes: the model as GLB, or the video copied. */
export interface AssetJob {
  readonly kind: 'glb' | 'copy';
  /** Repository path of the source: the model script or the video. */
  readonly from: string;
  /** Repository path of the output, next to the page. */
  readonly to: string;
}

export interface BlogBuild {
  readonly files: readonly OutputFile[];
  /** Published posts newest first, then drafts when they were asked for. */
  readonly posts: readonly RenderedPost[];
  readonly assets: readonly AssetJob[];
}

export interface RenderOptions {
  readonly repoRoot: string;
  /** Also build each draft to site/blog/drafts/<slug>/. Never adds it to the index. */
  readonly drafts?: boolean;
}

/** Newest first; same day by slug, so the order never depends on the disk. */
function newestFirst(a: BlogPost, b: BlogPost): number {
  return b.meta.date.localeCompare(a.meta.date) || a.slug.localeCompare(b.slug);
}

/** Every page of the blog, as files to write. Reads the images for their size. */
export function renderBlog(posts: readonly BlogPost[], opts: RenderOptions): BlogBuild {
  const published = posts.filter((post) => post.meta.status === 'published').sort(newestFirst);
  const drafts = opts.drafts ? posts.filter((post) => post.meta.status === 'draft').sort(newestFirst) : [];
  const rendered = [
    ...published.map((post) => renderPost(post, opts.repoRoot, false)),
    ...drafts.map((post) => renderPost(post, opts.repoRoot, true)),
  ];
  const index: OutputFile = {
    path: `${BLOG_DIR}/index.html`,
    html: indexPage(published.map((post) => ({ slug: post.slug, ...post.meta }))),
  };
  return {
    files: [...rendered.map((r) => r.file), index],
    posts: rendered.map((r) => r.rendered),
    assets: rendered.flatMap((r) => r.assets),
  };
}

interface PageContext {
  readonly repoRoot: string;
  readonly post: BlogPost;
  /** Site path of the page's directory, e.g. `/blog/<slug>/`. */
  readonly pageDir: string;
  readonly images: PostImage[];
}

function renderPost(
  post: BlogPost,
  repoRoot: string,
  draft: boolean,
): { file: OutputFile; rendered: RenderedPost; assets: AssetJob[] } {
  const pageDir = draft ? `/blog/drafts/${post.slug}/` : `/blog/${post.slug}/`;
  const ctx: PageContext = { repoRoot, post, pageDir, images: [] };
  const [lede, ...rest] = post.blocks;
  const note = draft && post.meta.note !== undefined ? [`      <p class="effective">${escapeText(post.meta.note)}</p>`] : [];
  const media = postMedia(post.meta);
  const main = [
    '      <article>',
    postByline(post.meta.date, draft),
    ...note,
    `      <h1>${escapeText(post.meta.title)}</h1>`,
    '',
    `      <p class="lede">${renderInline((lede as { text: string }).text)}</p>`,
    ...media.lines,
    ...rest.flatMap((block) => renderBlock(block, ctx)),
    '      </article>',
  ].join('\n');
  const outDir = `site${pageDir}`;
  const assets: AssetJob[] = [
    ...(post.meta.video === undefined ? [] : [{ kind: 'copy' as const, from: post.meta.video, to: `${outDir}${POST_VIDEO_FILE}` }]),
    ...(post.meta.model === undefined ? [] : [{ kind: 'glb' as const, from: post.meta.model, to: `${outDir}${POST_MODEL_FILE}` }]),
  ];
  const firstImage = ctx.images.find((image) => image.underSite);
  const html = pageShell(
    {
      title: post.meta.title,
      description: post.meta.summary,
      ogType: 'article',
      image: firstImage ? `${SITE_ORIGIN}${siteUrl(repoRoot, firstImage.file)}` : DEFAULT_OG_IMAGE,
      url: `${SITE_ORIGIN}${pageDir}`,
      noindex: draft,
      extraStyle: media.style,
    },
    main,
  );
  const pagePath = `site${pageDir}index.html`;
  return { file: { path: pagePath, html }, rendered: { post, path: pagePath, images: ctx.images }, assets };
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

/** Absolute path of an output, refusing anything outside site/blog/. Every write goes through it. */
export function blogTarget(repoRoot: string, repoPath: string): string {
  if (!repoPath.startsWith(`${BLOG_DIR}/`) || repoPath.split('/').includes('..')) {
    throw new Error(`refusing to write ${repoPath}: the blog build writes only under ${BLOG_DIR}/`);
  }
  const target = path.join(repoRoot, repoPath);
  mkdirSync(path.dirname(target), { recursive: true });
  return target;
}

function writeOutputs(repoRoot: string, files: readonly OutputFile[]): void {
  for (const file of files) writeFileSync(blogTarget(repoRoot, file.path), file.html);
}

/**
 * The video copied, and the model as GLB (site/scripts/blogModel.ts, loaded
 * only when a post has a model). Its raw export goes to the system temp
 * directory, not next to the page.
 */
async function buildAssets(repoRoot: string, jobs: readonly AssetJob[]): Promise<string[]> {
  const built: string[] = [];
  for (const job of jobs) {
    const target = blogTarget(repoRoot, job.to);
    if (job.kind === 'copy') {
      copyFileSync(path.join(repoRoot, job.from), target);
    } else {
      const { buildPostGlb } = await import('./blogModel');
      await buildPostGlb(repoRoot, path.join(repoRoot, job.from), target, job.to);
    }
    built.push(`  ${job.to}: ${statSync(target).size.toLocaleString('en')} bytes from ${job.from}`);
  }
  return built;
}

/** Stands in when no post needs the kernel, so the build never loads it. */
const NO_EVALUATOR: Evaluator = {
  file: () => Promise.reject(new Error('no post needs an evaluation')),
  code: () => Promise.reject(new Error('no post needs an evaluation')),
};

/** Makes the evaluator the checks use; the default runs `evaluate --json` in this process. */
export type EvaluatorFactory = (repoRoot: string) => Promise<Evaluator>;

const loadEvaluator: EvaluatorFactory = async (repoRoot) => (await import('./blogEvaluator')).createEvaluator(repoRoot);

/**
 * Every check on what was built, orphaned pages included; returns the
 * failures and a line per page. The evaluator is made only when a post needs it.
 */
export async function checkBuild(
  build: BlogBuild,
  repoRoot: string,
  makeEvaluator: EvaluatorFactory = loadEvaluator,
): Promise<{ failures: CheckFailure[]; summary: string[] }> {
  const published = build.posts.filter((r) => r.post.meta.status === 'published').map((r) => r.post.slug);
  const failures = checkOrphanPages(repoRoot, published);
  const evaluator = build.posts.some(needsEvaluator) ? await makeEvaluator(repoRoot) : NO_EVALUATOR;
  const summary: string[] = [];
  for (const rendered of build.posts) {
    const report = await checkPost(rendered, evaluator, repoRoot);
    failures.push(...report.failures);
    summary.push(`  ${rendered.path}: ${report.kcadBlocks} kcad block(s) evaluated, ${report.quotes} quoted value(s) match`);
  }
  return { failures, summary };
}

/**
 * The command: write the pages, run the checks, and only when every check has
 * passed build the media files. Returns the exit code: 1 when a check failed.
 */
export async function main(args: readonly string[], repoRoot: string = REPO_ROOT): Promise<number> {
  const unknown = args.filter((arg) => arg !== '--drafts');
  if (unknown.length > 0) throw new Error(`unknown argument ${unknown.join(' ')}; the only option is --drafts`);
  const drafts = args.includes('--drafts');

  const build = renderBlog(readPosts(repoRoot), { repoRoot, drafts });
  // Previews are rebuilt from nothing each time, and removed when not asked for.
  rmSync(path.join(repoRoot, DRAFTS_DIR), { recursive: true, force: true });
  writeOutputs(repoRoot, build.files);

  const { failures, summary } = await checkBuild(build, repoRoot);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`${failure.file}:${failure.line}: ${failure.message}`);
    console.error(`build-blog: ${failures.length} check(s) failed`);
    return 1;
  }
  // The heavy part, once every check has passed.
  const assets = await buildAssets(repoRoot, build.assets);
  const previews = build.posts.filter((r) => r.post.meta.status === 'draft').length;
  console.log([...summary, ...assets].join('\n'));
  console.log(`✓ ${BLOG_DIR}: ${build.posts.length - previews} published post(s), the index${drafts ? `, ${previews} draft preview(s)` : ''}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(`build-blog failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    },
  );
}
