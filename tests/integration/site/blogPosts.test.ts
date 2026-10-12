// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Every post in docs/guide, drafts included, checked against the real
// `kernelcad evaluate --json` output with the kernel. site:build runs these
// checks only for the posts it publishes, and only when it builds the site;
// this runs them in the PR test job, so a change to an example or to the
// kernel that makes a post wrong fails the PR instead of the next deploy.

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readPosts, renderBlog } from '../../../site/scripts/build-blog';
import { checkOrphanPages, checkPost } from '../../../site/scripts/blogChecks';
import { createEvaluator } from '../../../site/scripts/blogEvaluator';

const REPO_ROOT = resolve(__dirname, '../../..');
const build = renderBlog(readPosts(REPO_ROOT), { repoRoot: REPO_ROOT, drafts: true });
// One evaluator for the file: each model is evaluated once and shared.
const evaluator = createEvaluator(REPO_ROOT);

describe('docs/guide posts against the real model output', () => {
  for (const rendered of build.posts) it(
    `${rendered.post.file} passes every check`,
    async () => {
      const report = await checkPost(rendered, evaluator, REPO_ROOT);
      expect(report.failures).toEqual([]);
      // Every kcad block was evaluated and every check comment matched, so
      // the pass is not an empty one.
      const blocks = rendered.post.blocks;
      expect(report.kcadBlocks).toBe(blocks.filter((b) => b.kind === 'code' && b.lang === 'kcad').length);
      expect(report.quotes).toBe(blocks.filter((b) => b.kind === 'check').length);
    },
    rendered.post.slug === 'rocket-engine-routing' ? 240_000 : 120_000,
  );

  it('covers both published tube articles', () => {
    const slugs = build.posts.map((r) => `${r.post.slug} (${r.post.meta.status})`);
    expect(slugs).toEqual(expect.arrayContaining(['dimensions-measure-drawings (published)', 'tubes-how-to (published)', 'rocket-engine-routing (published)']));
  });

  it('leaves no page in site/blog that no published guide builds', () => {
    const published = build.posts.filter((r) => r.post.meta.status === 'published').map((r) => r.post.slug);
    expect(checkOrphanPages(REPO_ROOT, published)).toEqual([]);
  });
});
