// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// main() is what `npm run site:build` runs. These tests run it on a throwaway
// repository: it writes the pages, exits 1 before building any file when a
// check fails, builds draft previews only when asked, and writes through the
// guard that keeps the build inside site/blog/.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { blogTarget, checkBuild, main, postFromSource, renderBlog } from '../../../site/scripts/build-blog';
import type { EvaluateJson, Evaluator } from '../../../site/scripts/blogChecks';

const FIELDS: Record<string, string> = { title: 'A post', summary: 'One line.', date: '2026-10-11', kind: 'guide' };

function guide(fields: Record<string, string>, body: string): string {
  return `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${body}`;
}

/** The PNG signature and IHDR chunk: all the build reads from an image. */
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
let errors: string[];

function write(repoPath: string, content: string | Buffer): void {
  mkdirSync(dirname(join(repo, repoPath)), { recursive: true });
  writeFileSync(join(repo, repoPath), content);
}

const exists = (repoPath: string): boolean => existsSync(join(repo, repoPath));

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'kc-blog-main-'));
  write('docs/demos/clip.mp4', 'video bytes');
  errors = [];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation((...parts: unknown[]) => {
    errors.push(parts.join(' '));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(repo, { recursive: true, force: true });
});

/** A guide with a video and one figure; the figure's PNG exists only when asked. */
function postWithVideo(withImage: boolean): void {
  write('docs/guide/a-post.md', guide({ ...FIELDS, video: 'docs/demos/clip.mp4' }, 'The lede.\n\n![A view](../../site/blog/a-post/view.png "Caption.")\n'));
  if (withImage) write('site/blog/a-post/view.png', png(64, 48));
}

describe('main', () => {
  it('writes the pages and the index, removes old draft previews and exits 0', async () => {
    write('docs/guide/a-post.md', guide(FIELDS, 'The lede.\n'));
    write('site/blog/drafts/old/index.html', 'stale preview');

    expect(await main([], repo)).toBe(0);
    expect(exists('site/blog/a-post/index.html')).toBe(true);
    expect(readFileSync(join(repo, 'site/blog/index.html'), 'utf8')).toContain('/blog/a-post/');
    expect(exists('site/blog/drafts')).toBe(false);
  });

  it('builds the files a page shows once every check has passed', async () => {
    postWithVideo(true);
    expect(await main([], repo)).toBe(0);
    expect(readFileSync(join(repo, 'site/blog/a-post/video.mp4'), 'utf8')).toBe('video bytes');
  });

  it('exits 1 on a failed check, names the file and line, and builds no file for the page', async () => {
    postWithVideo(false);
    // Without the early `return 1` main would go on, copy the video and exit 0.
    expect(await main([], repo)).toBe(1);
    expect(exists('site/blog/a-post/video.mp4')).toBe(false);
    // Five front matter fields: the image is on line 11.
    expect(errors).toContain('docs/guide/a-post.md:11: image ../../site/blog/a-post/view.png does not exist');
    expect(errors).toContain('build-blog: 1 check(s) failed');
  });

  it('builds draft previews only with --drafts', async () => {
    write('docs/guide/later.md', guide({ ...FIELDS, status: 'draft' }, 'The lede.\n'));
    expect(await main(['--drafts'], repo)).toBe(0);
    expect(exists('site/blog/drafts/later/index.html')).toBe(true);
    expect(readFileSync(join(repo, 'site/blog/index.html'), 'utf8')).not.toContain('later');

    expect(await main([], repo)).toBe(0);
    expect(exists('site/blog/drafts')).toBe(false);
    expect(exists('site/blog/later')).toBe(false);
  });

  it('copies a draft image kept outside site/ next to the preview, and puts nothing in site/blog/<slug>/', async () => {
    write('docs/guide/later/view.png', png(64, 48));
    write('docs/guide/later.md', guide({ ...FIELDS, status: 'draft' }, 'The lede.\n\n![A view](later/view.png "Caption.")\n'));
    expect(await main(['--drafts'], repo)).toBe(0);
    expect(exists('site/blog/drafts/later/view.png')).toBe(true);
    expect(exists('site/blog/later')).toBe(false);
  });

  it('refuses an unknown argument', async () => {
    await expect(main(['--draft'], repo)).rejects.toThrow('unknown argument --draft; the only option is --drafts');
  });
});

describe('blogTarget', () => {
  it.each(['site/blog/index.html', 'site/blog/a-post/index.html', 'site/blog/drafts/a-post/model.glb'])('allows %s', (path) => {
    expect(blogTarget(repo, path)).toBe(join(repo, path));
  });

  it.each([
    'site/index.html',
    'site/blogger/index.html',
    'site/blog/../index.html',
    'site/blog/a/../../../outside.txt',
    '/etc/passwd',
    'docs/guide/a-post.md',
  ])('refuses %s', (path) => {
    expect(() => blogTarget(repo, path)).toThrow(`refusing to write ${path}: the blog build writes only under site/blog/`);
  });
});

describe('checkBuild', () => {
  const ok: EvaluateJson = { ok: true, featureCount: 1, diagnostics: [] };
  const evaluator: Evaluator = { file: async () => ok, code: async () => ok };

  it('reports orphaned pages with the posts\' failures and makes no evaluator when no post needs one', async () => {
    write('site/blog/old-post/index.html', 'left behind');
    const post = postFromSource('docs/guide/a-post.md', guide(FIELDS, 'The lede.\n\n![A view](../../site/blog/a-post/gone.png)\n'))!;
    const makeEvaluator = vi.fn(async () => evaluator);

    const { failures, summary } = await checkBuild(renderBlog([post], { repoRoot: repo }), repo, makeEvaluator);
    expect(makeEvaluator).not.toHaveBeenCalled();
    expect(failures.map((f) => `${f.file}:${f.line}`)).toEqual(['site/blog/old-post/index.html:1', 'docs/guide/a-post.md:10']);
    expect(summary).toEqual(['  site/blog/a-post/index.html: 0 kcad block(s) evaluated, 0 quoted value(s) match']);
  });

  it('makes one evaluator for all posts when any post has a check', async () => {
    write('examples/m.kcad.ts', 'return box(1, 1, 1);\n');
    const checked = (name: string) =>
      postFromSource(`docs/guide/${name}.md`, guide({ ...FIELDS, model: 'examples/m.kcad.ts' }, 'It prints true.\n<!-- check: ok = true -->\n'))!;
    const makeEvaluator = vi.fn(async () => evaluator);

    const { failures, summary } = await checkBuild(renderBlog([checked('one'), checked('two')], { repoRoot: repo }), repo, makeEvaluator);
    expect(makeEvaluator).toHaveBeenCalledTimes(1);
    expect(failures).toEqual([]);
    expect(summary).toEqual([
      '  site/blog/one/index.html: 0 kcad block(s) evaluated, 1 quoted value(s) match',
      '  site/blog/two/index.html: 0 kcad block(s) evaluated, 1 quoted value(s) match',
    ]);
  });
});
