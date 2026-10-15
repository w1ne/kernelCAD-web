// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPosts, renderBlog } from '../../../site/scripts/build-blog';
import { formatBendTableCsv, type BendTable } from '../../../src/shared/tube/bendTable';

const ROOT = resolve(__dirname, '../../..');
const DOWNLOADS = resolve(ROOT, 'site/blog/rocket-engine-routing');
const read = (file: string) => readFileSync(resolve(ROOT, file));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sources = {
  'engine-routed.kcad.ts': 'b992ce2bc4068d422e3a652487a665514643ff72caf8a8891da5d5a8a7747bc4',
  'engine-routed-twin.kcad.ts': '0a9d4a28c464562eaa62ea4b893c0397858916079f31b7e2885865f6a2d1d46b',
  'engine-bare.kcad.ts': '92fdd12ad43ecca8745dd9219adef34aea288970db6cab754621152099777111',
};

describe('published tube and rocket examples', () => {
  it('publishes the tube and rocket articles and keeps their examples distinct', () => {
    const posts = readPosts(ROOT);
    const small = posts.find(p => p.slug === 'tubes-how-to')!;
    const rocket = posts.find(p => p.slug === 'rocket-engine-routing')!;
    expect(small.meta).toMatchObject({ status: 'published', model: 'examples/tube-routing-engine/engine-lines.kcad.ts' });
    expect(small.meta.video).toBeUndefined();
    expect(rocket.meta).toMatchObject({ status: 'published', kind: 'use-case', date: '2026-10-12', model: 'examples/rocket-engine-lines/engine-routed.kcad.ts', modelCompression: 'meshopt', video: 'docs/demos/rocket-engine-routing/demo.mp4' });
    const smallHtml = renderBlog([small], { repoRoot: ROOT }).files[0].html;
    expect(smallHtml).toContain('/blog/rocket-engine-routing/');
    expect(smallHtml).not.toContain('studio?script=');
  });

  it('ships exact editable sources for both examples', () => {
    for (const [name, hash] of Object.entries(sources)) {
      const download = read(`site/blog/rocket-engine-routing/${name}`);
      expect(download.equals(read(`examples/rocket-engine-lines/${name}`))).toBe(true);
      expect(sha(download)).toBe(hash);
    }
    for (const name of ['engine-lines.kcad.ts', 'engine-lines-broken.kcad.ts']) {
      expect(read(`site/blog/tubes-how-to/${name}`).equals(read(`examples/tube-routing-engine/${name}`))).toBe(true);
    }
  });

  it('retains real good/bad diagnostics and independently reported moved endpoints', () => {
    const good = JSON.parse(read('site/blog/rocket-engine-routing/engine-routed.report.json').toString());
    const bad = JSON.parse(read('site/blog/rocket-engine-routing/engine-routed-twin.report.json').toString());
    const moved = JSON.parse(read('site/blog/rocket-engine-routing/cartridge-180.report.json').toString());
    expect(good.ok).toBe(true);
    expect(good.featureCount).toBe(441);
    expect(good.ports).toHaveLength(46);
    expect(good.diagnostics.map((d: { severity: string }) => d.severity)).toEqual(['info']);
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics.filter((d: { severity: string }) => d.severity === 'error').map((d: { message: string }) => d.message)).toEqual(["tube.clearance.overlap: tube 'igniter-generator' passes through 'pneumatic-gg-valve' (14.09 mm^3 shared)."]);
    expect(bad.diagnostics).toHaveLength(2);
    expect(moved.ok).toBe(true);
    expect(moved.ports.filter((p: { part: string }) => p.part === 'igniter-cartridge').map((p: { origin: number[]; axis: number[] }) => [p.origin, p.axis])).toEqual([[[159, -330, 358], [0, 0, 1]], [[191, -330, 358], [0, 0, 1]]]);
  });

  it('supplies all 23 bend tables from the actual native report, a verified STEP and bounded manifest', () => {
    const report = JSON.parse(read('site/blog/rocket-engine-routing/engine-routed.report.json').toString());
    const files = readdirSync(resolve(DOWNLOADS, 'bend-tables')).filter(n => n.endsWith('.csv'));
    expect(files.sort()).toEqual(report.tubes.lines.map((l: { name: string }) => `${l.name}.csv`).sort());
    expect(files).toHaveLength(23);
    for (const line of report.tubes.lines) {
      const table = { ...line, lra: line.lra, xyz: line.xyz } as BendTable;
      expect(readFileSync(resolve(DOWNLOADS, 'bend-tables', `${line.name}.csv`), 'utf8')).toBe(formatBendTableCsv(line.name, line.od, line.wall, table));
    }
    expect(sha(read('site/blog/rocket-engine-routing/engine-routed.step'))).toBe('fc4b51683bb7a7db227742a217692d4fd10c9fdd824d46c114abb548220006ee');
    const manifest = JSON.parse(read('site/blog/rocket-engine-routing/manifest.json').toString());
    for (const file of manifest.files) {
      const path = resolve(DOWNLOADS, file.file);
      expect(statSync(path).size).toBe(file.bytes);
      expect(file.bytes).toBeLessThanOrEqual(25 * 1024 * 1024);
      expect(sha(readFileSync(path))).toBe(file.sha256);
    }
    expect(manifest.files.map((f: { file: string }) => f.file)).toContain('rocket-engine-routing.zip');
  });

  it('makes the curated route discoverable with honest source and video provenance', () => {
    const gallery = JSON.parse(read('site/gallery/entries.json').toString());
    const entry = gallery.entries.find((e: { slug: string }) => e.slug === 'rocket-engine-routing');
    expect(entry).toMatchObject({ source: 'curated', featured: true, codeLocal: '../../examples/rocket-engine-lines/engine-routed.kcad.ts', video: '../../docs/demos/rocket-engine-routing/demo.mp4', appUrl: 'https://app.kernelcad.com/studio?gallery=rocket-engine-routing', previewMesh: { tolerance: 2.5, angularTolerance: 0.85 }, meshopt: true, compactBridge: true, modelOrientation: '0deg -90deg 0deg' });
    expect(entry.code).toContain('/blob/develop/');
    expect(entry.tags).not.toContain('words-to-geometry');
    expect(sha(read('docs/demos/rocket-engine-routing/demo.mp4'))).toBe('0006b393b1f38a2dd9e25309b604e7a381649fdf6adb16d2d56b7bc4b6a0d937');
    for (const slug of ['tubes-how-to', 'rocket-engine-routing']) {
      expect(read('site/sitemap.xml').toString()).toContain(`https://kernelcad.com/blog/${slug}/`);
    }
  });

  it('resolves every article download and keeps the source-checkout export instructions explicit', () => {
    for (const slug of ['tubes-how-to', 'rocket-engine-routing']) {
      const source = read(`docs/guide/${slug}.md`).toString();
      const build = renderBlog(readPosts(ROOT), { repoRoot: ROOT });
      for (const match of source.matchAll(/\]\((\/blog\/[^)]+)\)/g)) {
        const target = `site${match[1]}${match[1].endsWith('/') ? 'index.html' : ''}`;
        const generated = build.assets.find(asset => asset.to === target);
        expect(statSync(resolve(ROOT, generated?.from ?? target)).isFile(), target).toBe(true);
      }
      expect(source).toContain('npm ci --ignore-scripts');
      expect(source).toContain('node dist/cli/index.js export step');
      expect(source).not.toContain('Draft for Andrii');
    }
  });
});
