// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assetPath, assetUrl, escapeHtml, metaDescription, ORIGIN, writeCatalogSite, type CatalogIndex } from './buildCatalogPages';

const repoRoot = resolve(import.meta.dirname, '..');
const index = JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')) as CatalogIndex;

function first(html: string, re: RegExp): string | undefined {
    return re.exec(html)?.[1];
}

function jsonLd(html: string): Record<string, unknown>[] {
    return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as Record<string, unknown>);
}

/** Root-relative hrefs into the catalog tree, as files under outDir. */
function catalogLinks(html: string): string[] {
    return [...html.matchAll(/(?:href|src)="(\/catalog\/[^"#]*)/g)].map((m) => m[1].slice(1) + (m[1].endsWith('/') ? 'index.html' : ''));
}

describe('catalog SEO page export', () => {
    let out = '';
    let written = 0;
    beforeAll(() => {
        out = mkdtempSync(join(tmpdir(), 'kcad-catalog-pages-'));
        written = writeCatalogSite(repoRoot, out);
    });
    afterAll(() => rmSync(out, { recursive: true, force: true }));

    it('writes one page and one preview for every asset in catalog/index.json', () => {
        expect(index.assets.length).toBeGreaterThan(0);
        expect(written).toBe(index.assets.length);
        const missing = index.assets.filter((a) => !existsSync(join(out, assetPath(a), 'index.html')) || !existsSync(join(out, assetPath(a), 'preview.png')));
        expect(missing.map((a) => `${a.kit}/${a.id}`)).toEqual([]);
    });

    it('gives every page a unique title, canonical URL, bounded description and valid Product JSON-LD', () => {
        const titles = new Set<string>();
        for (const a of index.assets) {
            const html = readFileSync(join(out, assetPath(a), 'index.html'), 'utf8');
            const title = first(html, /<title>([^<]+)<\/title>/);
            expect(title, `${a.kit}/${a.id} title`).toBe(escapeHtml(`${a.title} - free low-poly ${a.category} model (CC0) | kernelCAD`));
            titles.add(title!);
            expect(first(html, /<link rel="canonical" href="([^"]+)"/)).toBe(assetUrl(a));
            const description = first(html, /<meta name="description" content="([^"]*)"/)!;
            expect(description).toBe(escapeHtml(metaDescription(a.description)));
            expect(metaDescription(a.description).length).toBeLessThanOrEqual(160);
            expect(first(html, /<meta property="og:image" content="([^"]+)"/)).toBe(`${assetUrl(a)}preview.png`);
            expect(first(html, /<meta name="twitter:card" content="([^"]+)"/)).toBe('summary_large_image');
            expect(html).toContain(`<h1>${escapeHtml(a.title)}</h1>`);
            expect(html).toContain(`https://app.kernelcad.com/studio?catalog=${a.kit}/${a.id}`);
            for (const p of a.params) expect(html, `${a.kit}/${a.id} knob ${p.name}`).toContain(`<td><code>${escapeHtml(p.name)}</code></td>`);

            const product = jsonLd(html).find((d) => d['@type'] === 'Product');
            expect(product, `${a.kit}/${a.id} Product JSON-LD`).toBeDefined();
            expect(product).toMatchObject({
                '@context': 'https://schema.org',
                name: a.title,
                description: a.description,
                image: `${assetUrl(a)}preview.png`,
                offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
            });
        }
        expect(titles.size).toBe(index.assets.length);
    });

    it('makes every asset crawlable from the hub and every internal catalog link resolve', () => {
        const hub = readFileSync(join(out, 'catalog', 'index.html'), 'utf8');
        expect(first(hub, /<link rel="canonical" href="([^"]+)"/)).toBe(`${ORIGIN}catalog/`);
        for (const a of index.assets) expect(hub).toContain(`href="/${assetPath(a)}"`);
        const pages = [hub, ...index.assets.map((a) => readFileSync(join(out, assetPath(a), 'index.html'), 'utf8'))];
        const broken = new Set(pages.flatMap(catalogLinks).filter((file) => !existsSync(join(out, file))));
        expect([...broken]).toEqual([]);
    });

    it('lists the hub and every asset page in sitemap.xml, and robots.txt allows them', () => {
        const sitemap = readFileSync(join(out, 'sitemap.xml'), 'utf8');
        const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        expect(locs.sort()).toEqual([`${ORIGIN}catalog/`, ...index.assets.map(assetUrl)].sort());
        const robots = readFileSync(join(out, 'robots.txt'), 'utf8');
        expect(robots).not.toMatch(/Disallow:\s*\/(catalog\/?)?\s*$/m);
        expect(robots).toContain(`Sitemap: ${ORIGIN}sitemap.xml`);
    });
});
