import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { postFromSource, renderBlog } from './build-blog';

describe('drafting guide in the shared blog pipeline', () => {
  it('publishes a visual GUI walkthrough with working drawing downloads', () => {
    const repoRoot = resolve('.');
    const post = postFromSource('docs/guide/drafting-review.md', readFileSync(resolve('docs/guide/drafting-review.md'), 'utf8'));
    expect(post).not.toBeNull();
    const build = renderBlog([post!], { repoRoot });
    const html = build.files.find((file) => file.path === 'site/blog/drafting-review/index.html')!.html;
    for (const name of ['mounting-plate-baseline', 'mounting-plate-chain', 'mounting-plate-symmetry']) {
      expect(html).toContain(`src="${name}.png"`);
      expect(html).toContain(`href="/blog/drafting-review/${name}.pdf"`);
      for (const ext of ['png', 'pdf', 'svg', 'report.json']) {
        expect(existsSync(resolve(`site/blog/drafting-review/${name}.${ext}`))).toBe(true);
      }
    }
    for (const name of ['mounting-plate.kcad.ts', 'bearing-mount.kcad.ts']) {
      expect(readFileSync(resolve(`site/blog/drafting-review/${name}`), 'utf8')).toBe(readFileSync(resolve(`examples/drafting-review/${name}`), 'utf8'));
    }
    expect(html).toContain('studio-preview.png');
    expect(html).toContain('studio-edited.png');
    expect(html).toContain('Generate preview');
    expect(html).toContain('Refresh preview');
    expect(html).toContain('Export reviewed PDF');
    expect(html).not.toContain('<pre>');
    expect(html).not.toContain('.kcad.ts');
    expect(html).not.toContain('.json');
    expect(html).toContain('Mark reviewed');
    expect(html).toContain('review the new preview again');
    expect(html).not.toContain('oblique sections are rejected');
    expect(html).not.toContain('Drawing settings');
    expect(html).not.toMatch(/<link rel="preload"[^>]+\.png/);
    expect(html).not.toContain('<video');
    expect(html).toContain('href="/blog/drafting-review/walkthrough.mp4"');
    expect(readFileSync(resolve('site/blog/drafting-review/walkthrough.mp4'))).toEqual(readFileSync(resolve('docs/demos/drafting-review/demo.mp4')));
    expect(build.posts[0].images).toHaveLength(5);
    expect(build.posts[0].images.every((image) => image.inRepo && image.underSite)).toBe(true);
    const index = build.files.find((file) => file.path === 'site/blog/index.html')!.html;
    expect(index.match(/class="post-title" href="\/blog\/drafting-review\/"/g)).toHaveLength(1);
  });
});
