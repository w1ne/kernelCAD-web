// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Export one static, indexable HTML page per catalog asset for kernelcad.com.
//   npx tsx scripts/buildCatalogPages.ts [outDir]   (default: site-build/)
//
// Writes, from catalog/index.json only:
//   <outDir>/catalog/index.html                     hub listing every kit and asset
//   <outDir>/catalog/<kit>/<id>/index.html          one page per asset
//   <outDir>/catalog/<kit>/<id>/preview.png         copied from catalog/kits/<kit>/previews/
//   <outDir>/sitemap.xml                            hub + every asset page
//   <outDir>/robots.txt
// The markup reuses the marketing site's /style.css, nav and fonts; no framework.
// The sitemap matches kernelCAD-server site/scripts/build-sitemap.ts: canonical
// URLs, sorted, no <lastmod> (we do not track per-asset dates).
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ORIGIN = 'https://kernelcad.com/';
export const STUDIO = 'https://app.kernelcad.com/studio';
const DESCRIPTION_MAX = 160;

export interface CatalogParam {
    readonly name: string;
    readonly type: string;
    readonly default: string | number | boolean;
    readonly label?: string;
    readonly choices?: readonly (string | number)[];
}

export interface CatalogAsset {
    readonly id: string;
    readonly kit: string;
    readonly title: string;
    readonly description: string;
    readonly category: string;
    readonly tags?: readonly string[];
    readonly compat?: readonly string[];
    readonly license: string;
    readonly triangleBudget?: number;
    readonly params: readonly CatalogParam[];
    readonly presets?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    readonly rig?: Readonly<Record<string, unknown>>;
    readonly stats?: { readonly triangles?: number; readonly sizeM?: readonly number[] };
}

export interface CatalogKit {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly assets: readonly string[];
}

export interface CatalogIndex {
    readonly kits: readonly CatalogKit[];
    readonly assets: readonly CatalogAsset[];
}

export interface PageFile {
    readonly path: string;
    readonly content: string;
}

const LICENSES: Readonly<Record<string, { name: string; url: string }>> = {
    'CC0-1.0': { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
};

export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON safe to inline in a <script> element. */
function jsonForScript(value: unknown): string {
    return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

export function assetPath(asset: Pick<CatalogAsset, 'kit' | 'id'>): string {
    return `catalog/${asset.kit}/${asset.id}/`;
}

export function assetUrl(asset: Pick<CatalogAsset, 'kit' | 'id'>): string {
    return `${ORIGIN}${assetPath(asset)}`;
}

/** Cut at a word boundary so the snippet stays <= max characters. */
export function metaDescription(text: string, max = DESCRIPTION_MAX): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max - 1);
    const space = cut.lastIndexOf(' ');
    return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:-]+$/, '')}…`;
}

export function pageTitle(asset: CatalogAsset): string {
    return `${asset.title} - free low-poly ${asset.category} model (CC0) | kernelCAD`;
}

function licenseOf(asset: CatalogAsset): { name: string; url: string | null } {
    const known = LICENSES[asset.license];
    return known ?? { name: asset.license, url: null };
}

function triangles(asset: CatalogAsset): number | undefined {
    return asset.stats?.triangles;
}

const HEAD_COMMON = `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,500;1,500&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />`;

const NAV = `    <nav class="nav">
      <a class="nav-mark" href="/">
        <svg class="k" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
          <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
        </svg>
        <span>kernel<span class="cad">CAD</span></span>
      </a>
      <div class="nav-links">
        <a href="/catalog/">catalog</a>
        <a href="/blog/">blog</a>
        <a class="app-link" href="https://app.kernelcad.com">app ↗</a>
        <a href="https://github.com/w1ne/kernelCAD-web">github</a>
      </div>
    </nav>`;

const STYLE = `  <style>
    .catalog { max-width: 960px; margin: 0 auto; padding: 1rem 0 4rem; font-family: 'Inter', sans-serif; color: var(--ink-soft); line-height: 1.6; }
    .catalog h1 { font-family: 'Source Serif 4', serif; font-size: 2.2rem; color: var(--ink); margin: 1.5rem 0 0.5rem; }
    .catalog h2 { font-family: 'Source Serif 4', serif; font-size: 1.3rem; color: var(--ink); margin: 2rem 0 0.5rem; }
    .catalog a { color: var(--blueprint); }
    .catalog .crumbs { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--ink-faint); }
    .catalog .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; align-items: start; }
    .catalog .hero img { width: 100%; height: auto; background: var(--card-stage); border: 1px solid var(--rule); border-radius: 6px; }
    .catalog dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.3rem 1rem; margin: 1rem 0; }
    .catalog dt { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--ink-faint); }
    .catalog dd { margin: 0; }
    .catalog table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
    .catalog th, .catalog td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--rule); vertical-align: top; }
    .catalog code { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; }
    .catalog .swatch { display: inline-block; width: 0.9em; height: 0.9em; border: 1px solid var(--rule); vertical-align: -0.1em; margin-right: 0.35em; }
    .catalog .cta { display: inline-block; margin: 1rem 0; padding: 0.6rem 1.1rem; background: var(--blueprint); color: var(--on-blueprint); border-radius: 6px; text-decoration: none; }
    .catalog .grid { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }
    .catalog .grid img { width: 100%; height: auto; background: var(--card-stage); border: 1px solid var(--rule); border-radius: 6px; }
    .catalog .grid a { text-decoration: none; font-size: 0.9rem; }
    @media (max-width: 720px) { .catalog .hero { grid-template-columns: 1fr; } }
  </style>`;

function document(head: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
${HEAD_COMMON}
${head}
${STYLE}
</head>
<body>
  <div class="page-wrap">
${NAV}
    <main class="catalog">
${body}
    </main>
  </div>
</body>
</html>
`;
}

function socialTags(title: string, description: string, url: string, image: string, imageAlt: string): string {
    const t = escapeHtml(title);
    const d = escapeHtml(description);
    return [
        `  <meta property="og:type" content="website" />`,
        `  <meta property="og:site_name" content="kernelCAD" />`,
        `  <meta property="og:title" content="${t}" />`,
        `  <meta property="og:description" content="${d}" />`,
        `  <meta property="og:url" content="${escapeHtml(url)}" />`,
        `  <meta property="og:image" content="${escapeHtml(image)}" />`,
        `  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
        `  <meta name="twitter:card" content="summary_large_image" />`,
        `  <meta name="twitter:site" content="@kernelcad" />`,
        `  <meta name="twitter:title" content="${t}" />`,
        `  <meta name="twitter:description" content="${d}" />`,
        `  <meta name="twitter:image" content="${escapeHtml(image)}" />`,
        `  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    ].join('\n');
}

export function productJsonLd(asset: CatalogAsset): Record<string, unknown> {
    const url = assetUrl(asset);
    const license = licenseOf(asset);
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: asset.title,
        description: asset.description,
        image: `${url}preview.png`,
        url,
        sku: `${asset.kit}/${asset.id}`,
        category: asset.category,
        ...(asset.tags?.length ? { keywords: asset.tags.join(', ') } : {}),
        offers: {
            '@type': 'Offer',
            price: 0,
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            url,
            ...(license.url ? { license: license.url } : {}),
        },
    };
}

function breadcrumbJsonLd(asset: CatalogAsset, kit: CatalogKit | undefined): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Catalog', item: `${ORIGIN}catalog/` },
            { '@type': 'ListItem', position: 2, name: kit?.title ?? asset.kit, item: `${ORIGIN}catalog/#kit-${asset.kit}` },
            { '@type': 'ListItem', position: 3, name: asset.title, item: assetUrl(asset) },
        ],
    };
}

function formatValue(param: CatalogParam, value: unknown): string {
    const text = escapeHtml(String(value));
    if (param.type === 'color' && typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) {
        return `<span class="swatch" style="background:${text}"></span><code>${text}</code>`;
    }
    return `<code>${text}</code>`;
}

export function knobTable(asset: CatalogAsset): string {
    const rows = asset.params.map((p) => {
        const choices = p.choices?.length ? p.choices.map((c) => `<code>${escapeHtml(String(c))}</code>`).join(', ') : '—';
        return `          <tr><td><code>${escapeHtml(p.name)}</code></td><td>${escapeHtml(p.label ?? p.name)}</td><td>${escapeHtml(p.type)}</td><td>${formatValue(p, p.default)}</td><td>${choices}</td></tr>`;
    });
    return `      <table>
        <thead><tr><th>Knob</th><th>Label</th><th>Type</th><th>Default</th><th>Choices</th></tr></thead>
        <tbody>
${rows.join('\n')}
        </tbody>
      </table>`;
}

function presetsSection(asset: CatalogAsset): string {
    const names = Object.keys(asset.presets ?? {});
    if (names.length === 0) return '';
    const byName = new Map(asset.params.map((p) => [p.name, p]));
    const items = names.map((name) => {
        const values = Object.entries(asset.presets![name]).map(([knob, value]) => {
            const param = byName.get(knob) ?? { name: knob, type: 'string', default: '' };
            return `${escapeHtml(param.label ?? knob)} ${formatValue(param, value)}`;
        });
        return `        <li><strong>${escapeHtml(name)}</strong>: ${values.join('; ')}</li>`;
    });
    return `      <h2>Presets</h2>
      <ul>
${items.join('\n')}
      </ul>`;
}

function factsList(asset: CatalogAsset, kit: CatalogKit | undefined): string {
    const license = licenseOf(asset);
    const tri = triangles(asset);
    const size = asset.stats?.sizeM;
    const rigJoints = Object.keys(asset.rig ?? {});
    const facts: [string, string][] = [
        ['Kit', `<a href="/catalog/#kit-${escapeHtml(asset.kit)}">${escapeHtml(kit?.title ?? asset.kit)}</a>`],
        ['Category', escapeHtml(asset.category)],
        ['Triangles', tri === undefined ? '—' : `${tri.toLocaleString('en-US')}${asset.triangleBudget ? ` (budget ${asset.triangleBudget.toLocaleString('en-US')})` : ''}`],
        ['Licence', license.url ? `<a href="${license.url}" rel="license">${escapeHtml(license.name)}</a>` : escapeHtml(license.name)],
        ['Price', 'Free'],
    ];
    if (size?.length === 3) facts.push(['Size', `${size.map((n) => n.toString()).join(' × ')} m`]);
    if (rigJoints.length) facts.push(['Rigged joints', `${rigJoints.length}: ${rigJoints.map((j) => `<code>${escapeHtml(j)}</code>`).join(', ')}`]);
    if (asset.compat?.length) facts.push(['Fits', asset.compat.map(escapeHtml).join(', ')]);
    if (asset.tags?.length) facts.push(['Tags', asset.tags.map(escapeHtml).join(', ')]);
    return `      <dl>
${facts.map(([k, v]) => `        <dt>${k}</dt><dd>${v}</dd>`).join('\n')}
      </dl>`;
}

function siblingList(asset: CatalogAsset, siblings: readonly CatalogAsset[]): string {
    const others = siblings.filter((s) => s.id !== asset.id);
    if (others.length === 0) return '';
    const items = others.map((s) => `        <li><a href="/${assetPath(s)}">${escapeHtml(s.title)}</a></li>`);
    return `      <h2>More in this kit</h2>
      <ul>
${items.join('\n')}
      </ul>`;
}

export function previewAlt(asset: CatalogAsset): string {
    return `${asset.title}: low-poly ${asset.category} 3D model preview`;
}

export function renderAssetPage(asset: CatalogAsset, kit: CatalogKit | undefined, siblings: readonly CatalogAsset[]): string {
    const url = assetUrl(asset);
    const title = pageTitle(asset);
    const description = metaDescription(asset.description);
    const image = `${url}preview.png`;
    const alt = previewAlt(asset);
    const studio = `${STUDIO}?catalog=${encodeURIComponent(asset.kit)}/${encodeURIComponent(asset.id)}`;
    const head = `  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${url}" />
${socialTags(title, description, url, image, alt)}
  <script type="application/ld+json">
${jsonForScript(productJsonLd(asset))}
  </script>
  <script type="application/ld+json">
${jsonForScript(breadcrumbJsonLd(asset, kit))}
  </script>`;
    const body = `      <p class="crumbs"><a href="/catalog/">Catalog</a> / <a href="/catalog/#kit-${escapeHtml(asset.kit)}">${escapeHtml(kit?.title ?? asset.kit)}</a> / ${escapeHtml(asset.title)}</p>
      <h1>${escapeHtml(asset.title)}</h1>
      <div class="hero">
        <img src="preview.png" alt="${escapeHtml(alt)}" width="512" height="512" />
        <div>
          <p>${escapeHtml(asset.description)}</p>
          <a class="cta" href="${studio}">Open in Studio</a>
${factsList(asset, kit)}
        </div>
      </div>
      <h2>Knobs</h2>
      <p>${asset.params.length} parameter${asset.params.length === 1 ? '' : 's'} you can change in Studio before export.</p>
${knobTable(asset)}
${presetsSection(asset)}
${siblingList(asset, siblings)}
      <p><a href="/catalog/">← Back to the full catalog</a></p>`;
    return document(head, body);
}

export const HUB_TITLE = 'Free low-poly 3D model catalog (CC0) | kernelCAD';

export function renderHub(index: CatalogIndex): string {
    const byKey = new Map(index.assets.map((a) => [`${a.kit}/${a.id}`, a]));
    const total = index.assets.length;
    const description = metaDescription(
        `${total} free CC0 low-poly 3D models in ${index.kits.length} kits: ${index.kits.map((k) => k.title).join(', ')}. Every model has editable knobs.`,
    );
    const url = `${ORIGIN}catalog/`;
    const firstImage = index.assets[0] ? `${assetUrl(index.assets[0])}preview.png` : `${ORIGIN}og-image.png`;
    const head = `  <title>${escapeHtml(HUB_TITLE)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${url}" />
${socialTags(HUB_TITLE, description, url, firstImage, 'kernelCAD low-poly asset catalog')}`;
    const kits = index.kits.map((kit) => {
        const cards = kit.assets.map((id) => byKey.get(`${kit.id}/${id}`)).filter((a): a is CatalogAsset => a !== undefined).map((a) =>
            `          <li><a href="/${assetPath(a)}"><img src="/${assetPath(a)}preview.png" alt="${escapeHtml(previewAlt(a))}" width="512" height="512" loading="lazy" />${escapeHtml(a.title)}</a></li>`,
        );
        return `      <section id="kit-${escapeHtml(kit.id)}">
        <h2>${escapeHtml(kit.title)} <small>(${cards.length})</small></h2>
        <p>${escapeHtml(kit.description)}</p>
        <ul class="grid">
${cards.join('\n')}
        </ul>
      </section>`;
    });
    const body = `      <h1>Low-poly 3D model catalog</h1>
      <p>${escapeHtml(description)}</p>
${kits.join('\n')}`;
    return document(head, body);
}

/** Same shape as kernelCAD-server site/scripts/build-sitemap.ts renderSitemap. */
export function renderSitemap(urls: readonly string[]): string {
    const sorted = [...new Set(urls)].sort((a, b) => a.localeCompare(b));
    return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...sorted.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`), '</urlset>', ''].join('\n');
}

export const ROBOTS = `User-agent: *
Allow: /
Allow: /catalog/

Sitemap: ${ORIGIN}sitemap.xml
`;

/** Every text file of the export, relative to the output directory. */
export function renderCatalogSite(index: CatalogIndex): PageFile[] {
    const kits = new Map(index.kits.map((k) => [k.id, k]));
    const byKit = new Map<string, CatalogAsset[]>();
    for (const a of index.assets) byKit.set(a.kit, [...(byKit.get(a.kit) ?? []), a]);
    const files: PageFile[] = [{ path: 'catalog/index.html', content: renderHub(index) }];
    for (const a of index.assets) {
        files.push({ path: `${assetPath(a)}index.html`, content: renderAssetPage(a, kits.get(a.kit), byKit.get(a.kit) ?? []) });
    }
    files.push({ path: 'sitemap.xml', content: renderSitemap([`${ORIGIN}catalog/`, ...index.assets.map(assetUrl)]) });
    files.push({ path: 'robots.txt', content: ROBOTS });
    return files;
}

export function writeCatalogSite(repoRoot: string, outDir: string): number {
    const index = JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')) as CatalogIndex;
    rmSync(join(outDir, 'catalog'), { recursive: true, force: true });
    for (const file of renderCatalogSite(index)) {
        const target = join(outDir, file.path);
        mkdirSync(resolve(target, '..'), { recursive: true });
        writeFileSync(target, file.content);
    }
    for (const a of index.assets) {
        copyFileSync(join(repoRoot, 'catalog', 'kits', a.kit, 'previews', `${a.id}.png`), join(outDir, assetPath(a), 'preview.png'));
    }
    return index.assets.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const repoRoot = resolve(import.meta.dirname, '..');
    const outDir = resolve(process.argv[2] ?? join(repoRoot, 'site-build'));
    const count = writeCatalogSite(repoRoot, outDir);
    console.log(`wrote ${count} asset page(s) + hub, sitemap.xml and robots.txt to ${outDir}`);
}
