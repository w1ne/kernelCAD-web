import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { postFromSource, renderBlog } from './build-blog';
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const json = (file: string) => JSON.parse(readFileSync(resolve(file), 'utf8'));

describe('functional drawing tutorials and their actual deliverables', () => {
  it('preserves the existing one-click article byte-for-byte', () => {
    expect(hash(readFileSync('docs/guide/drafting-review.md'))).toBe('5df573e3df9988f63c66a2928f0fd39ee430a51007bf14d6c19e3f654f6a698b');
  });
  it.each(['functional-drafting', 'drawing-decisions'])('publishes %s with native video, figures, source and valid local downloads', slug => {
    const file = `docs/guide/${slug}.md`; const source = readFileSync(file, 'utf8');
    const post = postFromSource(file, source); expect(post).not.toBeNull();
    const built = renderBlog([post!], { repoRoot: resolve('.') });
    const html = built.files.find(f => f.path === `site/blog/${slug}/index.html`)!.html;
    expect(html).toContain('<video'); expect(html).toContain('video.mp4');
    expect(html).toContain('Mark reviewed'); expect(html).toContain('Export reviewed PDF');
    expect(html).toContain('source checkout'); expect(html).toContain('physical');
    expect(built.posts[0].images.length).toBeGreaterThanOrEqual(3);
    expect(built.posts[0].images.every(i => i.inRepo && i.underSite)).toBe(true);
    const links = [...source.matchAll(/\]\((\/blog\/[^)]+)\)/g)].map(m => m[1]);
    for (const url of links) if (!url.endsWith('/')) expect(existsSync(resolve('site'+url)),url).toBe(true);
    const manifest = json(`site/blog/${slug}/manifest.json`);
    for (const entry of manifest.files) {
      const bytes = readFileSync(`site/blog/${slug}/${entry.path}`); expect(bytes.length).toBe(entry.bytes); expect(hash(bytes)).toBe(entry.sha256);
    }
    const kind = slug === 'functional-drafting' ? 'plate' : 'bearing';
    const receipt = json(`docs/demos/functional-drafting/${kind}/receipt.json`);
    expect(receipt.success).toBe(true); expect(receipt.projectCleanup).toBe(true); expect(receipt.ownedTabClosed).toBe(true);
    expect(receipt.transport.every((r: { status: number; sourceSha256:string }) => r.status === 200 && r.sourceSha256 === receipt.exportSourceSha256)).toBe(true);
    expect(receipt.sourceSha256).toBe(hash(readFileSync(`examples/functional-drafting/${kind==='plate'?'fixture-plate':'bearing-seat'}.kcad.ts`)));
    expect(source).toContain('ISO2768-mK');
    expect(receipt.transport.some((r: { options?: {requireCompleteReview?: boolean} }) => r.options?.requireCompleteReview)).toBe(true);
    expect(receipt.pdfs.length).toBeGreaterThanOrEqual(1);
    const movie = readFileSync(`docs/demos/functional-drafting/${kind}/demo.mp4`); expect(movie.subarray(4,8).toString()).toBe('ftyp');
  });
  it('retains equal SVG/PDF reviews and strict outcomes for the five independently generated cases', () => {
    for (const [slug,name,status] of [
      ['functional-drafting','plate-complete','complete'], ['functional-drafting','plate-missing','incomplete'], ['functional-drafting','plate-hidden','incomplete'],
      ['drawing-decisions','bearing-pending','incomplete'], ['drawing-decisions','bearing-resolved','complete'],
    ]) {
      const report = json(`site/blog/${slug}/${name}.report.json`);
      expect(report.svg).toEqual(report.pdf); expect(report.svg.review.status).toBe(status);
      expect(report.strict).toHaveLength(2);
      for (const entry of report.strict) {
        expect(entry.status).toBe(status === 'complete' ? 'emitted' : 'refused');
        if(status === 'incomplete') {expect(entry.bytes).toBe(0);expect(entry.code).toBe('feature.invalid-args');}
        else expect(entry.bytes).toBeGreaterThan(0);
      }
    }
    const complete = json('site/blog/functional-drafting/plate-complete.report.json').svg.review;
    expect(complete.coveredCriticalCount).toBe(4); expect(complete.requirements.find((r:{role:string})=>r.role==='reference').status).toBe('missing');
    expect(json('site/blog/functional-drafting/plate-missing.report.json').svg.review.requirements[0].status).toBe('missing');
    expect(json('site/blog/functional-drafting/plate-hidden.report.json').svg.review.requirements[0].status).toBe('hidden');
    expect(json('site/blog/drawing-decisions/bearing-pending.report.json').svg.review.unresolvedDecisionCount).toBe(1);
    expect(json('site/blog/drawing-decisions/bearing-resolved.report.json').svg.review.unresolvedDecisionCount).toBe(0);
  });
  it('includes both published slugs in sitemap discovery', () => {
    const map=readFileSync('site/sitemap.xml','utf8');for(const slug of ['functional-drafting','drawing-decisions'])expect(map).toContain(`https://kernelcad.com/blog/${slug}/`);
  });
});
