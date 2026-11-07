// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAsset, buildCatalogAssetWithGlb, serializeCatalogIndex } from '../src/agent/catalog/buildCatalog';
import { runAndExport } from '../src/agent/script-runtime/export';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { CatalogIndexSchema } from '../src/shared/assets/catalogSchema';
import { glbTriangles, renderTrianglesPng } from './lib/glbSoftwareRender';
import { glbTriangleCount, sourceWithParamValues } from './buildCatalogDownloads';
import { catalogPresetVariants } from './buildCatalogPages';
import { buildCatalogSite } from './buildCatalogSite';

const repoRoot = resolve(import.meta.dirname, '..');

beforeAll(async () => { await initOcct(); }, 120_000);

describe('static catalog download generation', () => {
    it('overrides only declared parameter defaults in the original source', () => {
        const code = `const size = param('size', 'adult', { choices: ['cub', 'adult'] });\nreturn box(1, 1, size.value);`;
        expect(sourceWithParamValues(code, { size: 'cub' }, 'sample.kcad.ts')).toBe(
            `const size = param('size', "cub", { choices: ['cub', 'adult'] });\nreturn box(1, 1, size.value);`,
        );
        expect(() => sourceWithParamValues(code, { unknown: 'value' }, 'sample.kcad.ts')).toThrow(/undeclared param/);
    });

    it('builds a nonempty preset GLB from the original asset source inside its triangle budget', async () => {
        const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')));
        const asset = index.assets.find((row) => row.id === 'bear' && row.kit === 'characters')!;
        const sourcePath = join(repoRoot, asset.source);
        const code = readFileSync(sourcePath, 'utf8');
        const defaultAsset = await buildCatalogAssetWithGlb(repoRoot, asset.source);
        const variantCode = sourceWithParamValues(code, { size: 'cub' }, sourcePath);
        const variant = await runAndExport({
            code: variantCode,
            fileName: basename(sourcePath),
            scriptDir: dirname(sourcePath),
            format: 'glb',
            options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
        });

        expect(variant.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        expect(variant.bytes.byteLength).toBeGreaterThan(0);
        const triangles = glbTriangleCount(variant.bytes);
        expect(triangles).toBeGreaterThan(0);
        expect(triangles).toBeLessThanOrEqual(asset.triangleBudget);
        expect(createHash('sha256').update(variant.bytes).digest('hex')).not.toBe(
            createHash('sha256').update(defaultAsset.glb).digest('hex'),
        );
    }, 120_000);

    it('builds the supplemental choice-param variant from source for the three one-preset assets', async () => {
        const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')));
        const onePresetAssets = index.assets.filter((asset) => Object.keys(asset.presets ?? {}).length === 1);
        expect(onePresetAssets.map((asset) => asset.id).sort()).toEqual(['reeds', 'seesaw', 'speed-bump']);
        for (const asset of onePresetAssets) {
            const sourcePath = join(repoRoot, asset.source);
            const code = readFileSync(sourcePath, 'utf8');
            const variant = catalogPresetVariants(asset)[2]!;
            const result = await runAndExport({
                code: sourceWithParamValues(code, variant.values, sourcePath),
                fileName: basename(sourcePath),
                scriptDir: dirname(sourcePath),
                format: 'glb',
                options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
            });
            expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), asset.id).toEqual([]);
            expect(glbTriangleCount(result.bytes), asset.id).toBeGreaterThan(0);
            expect(glbTriangleCount(result.bytes), asset.id).toBeLessThanOrEqual(asset.triangleBudget);
        }
    }, 180_000);

    it('exports the mailbox roof to a valid STEP after removing its duplicate profile vertex', async () => {
        const source = join(repoRoot, 'catalog/kits/city-street/mailbox.kcad.ts');
        const step = await runAndExport({
            code: readFileSync(source, 'utf8'),
            fileName: basename(source),
            scriptDir: dirname(source),
            format: 'step',
        });
        expect(step.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        expect(step.bytes.byteLength).toBeGreaterThan(0);
    }, 120_000);

    if (process.env.KCAD_CATALOG_BUILD === '1') {
        it('writes complete static catalog site', async () => {
            const outDir = resolve(process.env.KCAD_CATALOG_OUT_DIR ?? join(repoRoot, 'site-build'));
            await buildCatalogSite(repoRoot, outDir);
        }, 1_800_000);
    }

    if (process.env.KCAD_REBUILD_MAILBOX_INDEX === '1') {
        it('regenerates the changed mailbox index row and preview from its source', async () => {
            const indexPath = join(repoRoot, 'catalog/index.json');
            const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(indexPath, 'utf8')));
            const generated = await buildCatalogAssetWithGlb(repoRoot, 'catalog/kits/city-street/mailbox.kcad.ts');
            const next = CatalogIndexSchema.parse({ ...index, assets: index.assets.map((asset) => asset.id === 'mailbox' && asset.kit === 'city-street' ? generated.asset : asset) });
            writeFileSync(indexPath, serializeCatalogIndex(next));
            const preview = await renderTrianglesPng(await glbTriangles(generated.glb), { label: `${generated.asset.title} · ${generated.asset.stats.triangles} tris` });
            writeFileSync(join(repoRoot, 'catalog/kits/city-street/previews/mailbox.png'), preview);
            expect(generated.asset.sourceSha256).toBeTruthy();
        }, 120_000);
    }

    if (process.env.KCAD_CATALOG_PREFLIGHT_STEPS === '1') {
        it('preflights deterministic STEP export for every catalog source', async () => {
            const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')));
            const failures: string[] = [];
            for (const [indexInCatalog, asset] of index.assets.entries()) {
                const source = join(repoRoot, asset.source);
                const result = await runAndExport({
                    code: readFileSync(source, 'utf8'),
                    fileName: basename(source),
                    scriptDir: dirname(source),
                    format: 'step',
                });
                const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
                if (result.bytes.byteLength === 0 || errors.length > 0) {
                    failures.push(`${asset.kit}/${asset.id}: ${errors.map((error) => `${error.code}: ${error.message}`).join('; ') || 'empty STEP export'}`);
                }
                if ((indexInCatalog + 1) % 25 === 0 || indexInCatalog + 1 === index.assets.length) {
                    console.log(`preflighted STEP for ${indexInCatalog + 1}/${index.assets.length} assets`);
                }
            }
            expect(failures, failures.join('\n')).toEqual([]);
        }, 1_800_000);
    }
});
