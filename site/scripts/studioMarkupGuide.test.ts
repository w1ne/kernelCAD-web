// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { postFromSource, renderBlog } from './build-blog';
import { parseMarkupSnapshot } from '../../src/studio/markup/markupSnapshot';

describe('Studio markup guide page', () => {
  it('renders the versioned snapshot format and links the local verification bundle', () => {
    const repoRoot = resolve('.');
    const source = readFileSync(resolve('docs/guide/studio-markup-snapshot.md'), 'utf8');
    const example = parseMarkupSnapshot(readFileSync(resolve('docs/demos/studio-markup/snapshot-v1.json'), 'utf8'));
    const post = postFromSource('docs/guide/studio-markup-snapshot.md', source);
    expect(post).not.toBeNull();
    expect(example.measurements[0]?.value).toBe(5);

    const build = renderBlog([post!], { repoRoot });
    const html = build.files.find((file) => file.path === 'site/blog/studio-markup-snapshot/index.html')!.html;
    expect(html).toContain('<h1>Studio markup snapshots</h1>');
    expect(html).toContain('schemaVersion');
    expect(html).toContain('topologyRefs');
    expect(html).toContain('https://github.com/w1ne/kernelCAD-web/tree/develop/docs/demos/studio-markup');
    expect(build.assets).toEqual([]);
    expect(build.files.find((file) => file.path === 'site/blog/index.html')!.html).toContain('/blog/studio-markup-snapshot/');
  });
});
