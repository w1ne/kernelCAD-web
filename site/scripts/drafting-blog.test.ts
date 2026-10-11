import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { postFromSource, renderBlog } from './build-blog';

describe('drafting guide in the shared blog pipeline', () => {
  it('publishes the worked sheets, source and Studio video without losing the review guidance', () => {
    const repoRoot = resolve('.');
    const post = postFromSource('docs/guide/drafting-review.md', readFileSync(resolve('docs/guide/drafting-review.md'), 'utf8'));
    expect(post).not.toBeNull();
    const build = renderBlog([post!], { repoRoot });
    const html = build.files.find((file) => file.path === 'site/blog/drafting-review/index.html')!.html;
    for (const name of ['mounting-plate-baseline', 'mounting-plate-chain', 'mounting-plate-symmetry', 'bearing-mount']) {
      expect(html).toContain(`src="${name}.png"`);
      expect(html).toContain(`href="/blog/drafting-review/${name}.pdf"`);
      expect(html).toContain(`href="/blog/drafting-review/${name}.svg"`);
      for (const ext of ['png', 'pdf', 'svg', 'report.json']) {
        expect(existsSync(resolve(`site/blog/drafting-review/${name}.${ext}`))).toBe(true);
      }
    }
    for (const name of ['mounting-plate.kcad.ts', 'bearing-mount.kcad.ts', 'manifest.json', 'bearing-mount-review.json']) {
      expect(html).toContain(`href="/blog/drafting-review/${name}"`);
      expect(existsSync(resolve(`site/blog/drafting-review/${name}`))).toBe(true);
    }
    for (const name of ['mounting-plate.kcad.ts', 'bearing-mount.kcad.ts']) {
      expect(readFileSync(resolve(`site/blog/drafting-review/${name}`), 'utf8')).toBe(readFileSync(resolve(`examples/drafting-review/${name}`), 'utf8'));
    }
    expect(html).toContain('0.01 mm boolean allowance');
    expect(html).toContain('not automatically printed fabrication notes');
    expect(html).toContain('Mark reviewed');
    expect(html).toContain('exact source fingerprint');
    expect(html).not.toContain('oblique sections are rejected');
    expect(html).not.toContain('Drawing settings');
    expect(html).not.toMatch(/<link rel="preload"[^>]+\.png/);
    expect(html).toContain('<video src="video.mp4" controls playsinline preload="metadata"></video>');
    expect(build.assets).toContainEqual({ kind: 'copy', from: 'docs/demos/drafting-review/demo.mp4', to: 'site/blog/drafting-review/video.mp4' });
    expect(build.posts[0].images).toHaveLength(4);
    expect(build.posts[0].images.every((image) => image.inRepo && image.underSite)).toBe(true);
    const index = build.files.find((file) => file.path === 'site/blog/index.html')!.html;
    expect(index.match(/class="post-title" href="\/blog\/drafting-review\/"/g)).toHaveLength(1);
  });
});
