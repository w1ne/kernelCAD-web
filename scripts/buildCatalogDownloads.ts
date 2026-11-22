// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build the static catalog downloads from the original .kcad.ts sources.
// Meshes from third-party sources are never read by this script.

import { createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as ts from 'typescript';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../src/agent/script-runtime/export';
import { buildCatalogAssetWithGlb } from '../src/agent/catalog/buildCatalog';
import { CatalogIndexSchema, type CatalogAsset } from '../src/shared/assets/catalogSchema';
import { assetGlbPath, assetStepPath, catalogPresetVariantPath, catalogPresetVariants } from './buildCatalogPages';

const HEADER_START = '# BEGIN KERNELCAD CATALOG DOWNLOAD HEADERS';
const HEADER_END = '# END KERNELCAD CATALOG DOWNLOAD HEADERS';

export interface DownloadArtifactRecord {
  readonly path: string;
  readonly format: 'glb' | 'step';
  readonly preset: string;
  readonly bytes: number;
  readonly sha256: string;
  /** Triangle count of the matching generated GLB. STEP is exact CAD geometry. */
  readonly triangles: number | null;
  readonly triangleBudget: number;
}

export interface CatalogDownloadsSummary {
  readonly assets: number;
  readonly glbFiles: number;
  readonly stepFiles: number;
  readonly records: readonly DownloadArtifactRecord[];
}

export function glbTriangleCount(bytes: Uint8Array): number {
  if (bytes.byteLength < 20) throw new Error('GLB is shorter than its header and JSON chunk.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Invalid GLB magic.');
  if (view.getUint32(4, true) !== 2) throw new Error('Only GLB version 2 is supported.');
  if (view.getUint32(8, true) !== bytes.byteLength) throw new Error('GLB header length does not match file size.');
  const jsonLength = view.getUint32(12, true);
  if (jsonLength + 20 > bytes.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('Invalid GLB JSON chunk.');
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as {
    accessors?: readonly { count?: number }[];
    meshes?: readonly { primitives?: readonly { mode?: number; indices?: number; attributes?: { POSITION?: number } }[] }[];
  };
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if ((primitive.mode ?? 4) !== 4) throw new Error('Catalog GLB contains a non-triangle primitive.');
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count = accessorIndex === undefined ? undefined : json.accessors?.[accessorIndex]?.count;
      if (count === undefined) throw new Error('Catalog GLB primitive has no readable triangle accessor.');
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

/** Replace only declared param() defaults, preserving the rest of the source. */
export function sourceWithParamValues(code: string, values: Readonly<Record<string, unknown>>, fileName: string): string {
  if (Object.keys(values).length === 0) return code;
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits: Array<{ start: number; end: number; replacement: string }> = [];
  const found = new Set<string>();
  const isParamCall = (node: ts.CallExpression) =>
    (ts.isIdentifier(node.expression) && node.expression.text === 'param')
    || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'param');
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isParamCall(node)) {
      const [nameNode, defaultNode] = node.arguments;
      if (nameNode && (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode)) && Object.hasOwn(values, nameNode.text)) {
        if (!defaultNode) throw new Error(`${fileName}: param('${nameNode.text}') has no default value to override.`);
        found.add(nameNode.text);
        edits.push({ start: defaultNode.getStart(source), end: defaultNode.getEnd(), replacement: JSON.stringify(values[nameNode.text]) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const missing = Object.keys(values).filter((name) => !found.has(name));
  if (missing.length) throw new Error(`${fileName}: preset names undeclared param(s): ${missing.join(', ')}.`);
  let output = code;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  }
  return output;
}

function verifyGlb(asset: CatalogAsset, bytes: Uint8Array, path: string): number {
  if (bytes.byteLength === 0) throw new Error(`${path}: generated GLB is empty.`);
  const triangles = glbTriangleCount(bytes);
  if (triangles <= 0) throw new Error(`${path}: generated GLB has no triangles.`);
  if (triangles > asset.triangleBudget) {
    throw new Error(`${path}: ${triangles} triangles exceeds triangleBudget ${asset.triangleBudget}.`);
  }
  return triangles;
}

function record(
  relativePath: string,
  format: 'glb' | 'step',
  preset: string,
  bytes: Uint8Array,
  triangles: number | null,
  triangleBudget: number,
): DownloadArtifactRecord {
  return {
    path: relativePath,
    format,
    preset,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    triangles,
    triangleBudget,
  };
}

function emitHeaders(outDir: string, paths: readonly string[]): void {
  const headerPath = join(outDir, '_headers');
  let existing = '';
  try { existing = readFileSync(headerPath, 'utf8'); } catch { /* no existing host rules */ }
  const start = existing.indexOf(HEADER_START);
  const end = existing.indexOf(HEADER_END);
  if ((start >= 0) !== (end >= 0) || (start >= 0 && end < start)) throw new Error(`${headerPath}: incomplete catalog header markers.`);
  if (start >= 0) existing = `${existing.slice(0, start)}${existing.slice(end + HEADER_END.length)}`;
  const rules = paths.flatMap((path) => {
    const filename = basename(path);
    return [`/${path}`, `  Content-Disposition: attachment; filename="${filename}"`, '  X-Content-Type-Options: nosniff', ''];
  }).join('\n');
  const block = `${HEADER_START}\n${rules}${HEADER_END}\n`;
  writeFileSync(headerPath, `${existing.trimEnd()}${existing.trim().length ? '\n\n' : ''}${block}`);
}

export async function writeCatalogDownloads(repoRoot: string, outDir: string): Promise<CatalogDownloadsSummary> {
  const index = CatalogIndexSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'catalog', 'index.json'), 'utf8')));
  await initOcct();
  const records: DownloadArtifactRecord[] = [];
  const servedPaths: string[] = [];
  let glbFiles = 0;
  let stepFiles = 0;

  for (const [assetIndex, asset] of index.assets.entries()) {
    const sourcePath = join(repoRoot, asset.source);
    const code = readFileSync(sourcePath, 'utf8');
    const outputDir = join(outDir, 'catalog', asset.kit, asset.id);
    mkdirSync(outputDir, { recursive: true });

    const built = await buildCatalogAssetWithGlb(repoRoot, asset.source);
    if (built.asset.sourceSha256 !== asset.sourceSha256) {
      throw new Error(`${asset.kit}/${asset.id}: catalog index is stale; rebuild catalog/index.json from its source.`);
    }
    const defaultPath = assetGlbPath(asset);
    const defaultTriangles = verifyGlb(asset, built.glb, defaultPath);
    if (asset.stats?.triangles !== undefined && asset.stats.triangles !== defaultTriangles) {
      throw new Error(`${defaultPath}: index records ${asset.stats.triangles} triangles but the generated GLB has ${defaultTriangles}.`);
    }
    writeFileSync(join(outDir, defaultPath), built.glb);
    records.push(record(defaultPath, 'glb', 'default', built.glb, defaultTriangles, asset.triangleBudget));
    servedPaths.push(defaultPath);
    glbFiles++;

    const step = await runAndExport({
      code,
      fileName: basename(sourcePath),
      scriptDir: dirname(sourcePath),
      format: 'step',
    });
    const stepErrors = step.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (step.bytes.byteLength === 0 || stepErrors.length > 0) {
      const details = stepErrors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join('; ') || 'empty STEP export';
      throw new Error(`${asset.kit}/${asset.id}: deterministic STEP export failed: ${details}.`);
    }
    const stepPath = assetStepPath(asset);
    writeFileSync(join(outDir, stepPath), step.bytes);
    records.push(record(stepPath, 'step', 'default', step.bytes, defaultTriangles, asset.triangleBudget));
    servedPaths.push(stepPath);
    stepFiles++;

    for (const variantConfig of catalogPresetVariants(asset).slice(1)) {
      const variantCode = sourceWithParamValues(code, variantConfig.values, sourcePath);
      const variant = await runAndExport({
        code: variantCode,
        fileName: basename(sourcePath),
        scriptDir: dirname(sourcePath),
        format: 'glb',
        options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
      });
      const errors = variant.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
      if (variant.bytes.byteLength === 0 || errors.length > 0) {
        const details = errors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join('; ') || 'empty preset GLB';
        throw new Error(`${asset.kit}/${asset.id} preset '${variantConfig.name}' failed: ${details}.`);
      }
      const variantPath = catalogPresetVariantPath(asset, variantConfig);
      const variantTriangles = verifyGlb(asset, variant.bytes, variantPath);
      writeFileSync(join(outDir, variantPath), variant.bytes);
      records.push(record(variantPath, 'glb', variantConfig.name, variant.bytes, variantTriangles, asset.triangleBudget));
      servedPaths.push(variantPath);
      glbFiles++;
    }

    if ((assetIndex + 1) % 25 === 0 || assetIndex + 1 === index.assets.length) {
      console.log(`built downloads for ${assetIndex + 1}/${index.assets.length} assets`);
    }
  }

  emitHeaders(outDir, servedPaths);
  return { assets: index.assets.length, glbFiles, stepFiles, records };
}

