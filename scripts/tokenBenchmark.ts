// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getEncoding } from 'js-tiktoken';
import * as ts from 'typescript';

export const TOKENIZER_ENCODING = 'o200k_base';
export const TOKENIZER_PACKAGE = 'js-tiktoken';
export const TOKENIZER_PACKAGE_VERSION = '1.0.21';
export const MAX_SOURCE_BYTES = 1_000_000;

const encoder = getEncoding(TOKENIZER_ENCODING);

export interface TokenCounts {
  withMeta: number;
  withoutMeta: number;
  programOnly: number;
}

export interface SourceRecord {
  path: string;
  bytes: number;
  sha256: string;
  tokens: TokenCounts;
}

export interface Distribution {
  n: number;
  min: number;
  median: number;
  mean: number;
  max: number;
  p90: number;
}

export function removeTopLevelMeta(source: string, fileName = 'asset.kcad.ts'): string {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const metaStatements = sourceFile.statements.filter((statement) => {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return false;
    const callee = statement.expression.expression;
    return ts.isIdentifier(callee) && callee.text === 'meta';
  });

  if (metaStatements.length !== 1) {
    throw new Error(`${fileName}: expected exactly one top-level meta({...}) statement; found ${metaStatements.length}`);
  }

  const statement = metaStatements[0];
  return source.slice(0, statement.getStart(sourceFile)) + source.slice(statement.end);
}

export function removeComments(source: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
  const commentRanges: Array<[number, number]> = [];

  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    const token = scanner.getToken();
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia ||
      token === ts.SyntaxKind.ShebangTrivia
    ) {
      commentRanges.push([scanner.getTokenPos(), scanner.getTextPos()]);
    }
  }

  let result = source;
  for (let i = commentRanges.length - 1; i >= 0; i -= 1) {
    const [start, end] = commentRanges[i];
    const blanked = source.slice(start, end).replace(/[^\r\n]/g, ' ');
    result = result.slice(0, start) + blanked + result.slice(end);
  }
  return result;
}

export function countSource(source: string, fileName = 'asset.kcad.ts'): TokenCounts {
  const withoutMeta = removeTopLevelMeta(source, fileName);
  const programOnly = removeComments(withoutMeta);
  return {
    withMeta: encoder.encode(source).length,
    withoutMeta: encoder.encode(withoutMeta).length,
    programOnly: encoder.encode(programOnly).length,
  };
}

export function summarize(values: number[]): Distribution {
  if (values.length === 0) throw new Error('Cannot summarize an empty sample');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return {
    n: sorted.length,
    min: sorted[0],
    median,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    max: sorted[sorted.length - 1],
    // Nearest-rank percentile: the item at 1-based rank ceil(0.90 * n).
    p90: sorted[Math.ceil(0.9 * sorted.length) - 1],
  };
}

async function findKcadFiles(directory: string, root: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...await findKcadFiles(absolute, root));
    } else if (entry.isFile() && entry.name.endsWith('.kcad.ts')) {
      found.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  return found;
}

async function gitHead(root: string): Promise<string> {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unavailable';
  }
}

export async function measureCatalogue(root = process.cwd()) {
  const catalogueRoot = path.join(root, 'catalog', 'kits');
  const paths = (await findKcadFiles(catalogueRoot, root)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const included: SourceRecord[] = [];
  const excluded: Array<{ path: string; bytes: number }> = [];

  for (const relativePath of paths) {
    const absolutePath = path.join(root, relativePath);
    const [source, fileStat] = await Promise.all([
      readFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ]);
    const bytes = fileStat.size;
    if (bytes > MAX_SOURCE_BYTES) {
      excluded.push({ path: relativePath, bytes });
      continue;
    }
    included.push({
      path: relativePath,
      bytes,
      sha256: createHash('sha256').update(source, 'utf8').digest('hex'),
      tokens: countSource(source, relativePath),
    });
  }

  const largest = [...included].sort((a, b) => b.bytes - a.bytes)[0] ?? null;
  const output = {
    generatedAt: new Date().toISOString(),
    sourceCommit: await gitHead(root),
    catalogueRoot: 'catalog/kits',
    sampleDefinition: 'Every regular file matching catalog/kits/**/*.kcad.ts, sorted by repository-relative path.',
    exclusionRule: `Exclude source files larger than ${MAX_SOURCE_BYTES} bytes; list every exclusion in the manifest and output.`,
    tokenizer: {
      encoding: TOKENIZER_ENCODING,
      implementation: `${TOKENIZER_PACKAGE}@${TOKENIZER_PACKAGE_VERSION}`,
      implementationLicense: 'MIT',
    },
    includedCount: included.length,
    excludedLargeSources: excluded,
    largestIncludedSource: largest ? { path: largest.path, bytes: largest.bytes } : null,
    distributions: {
      withMeta: summarize(included.map((record) => record.tokens.withMeta)),
      withoutMeta: summarize(included.map((record) => record.tokens.withoutMeta)),
      programOnly: summarize(included.map((record) => record.tokens.programOnly)),
    },
    records: included,
  };
  return output;
}

function focusPathArguments(args: string[]): string[] {
  return args.filter((arg) => arg.startsWith('--focus=')).map((arg) => arg.slice('--focus='.length));
}

function manifestPathArgument(args: string[]): string | undefined {
  const arg = args.find((candidate) => candidate.startsWith('--write-manifest='));
  return arg?.slice('--write-manifest='.length);
}

export async function runTokenBenchmark(args = process.argv.slice(2), root = process.cwd()): Promise<string> {
  const result = await measureCatalogue(root);
  const focusPaths = focusPathArguments(args);
  const focusAssets = [];
  for (const relativePath of focusPaths) {
    if (!relativePath.startsWith('catalog/kits/') || !relativePath.endsWith('.kcad.ts')) {
      throw new Error(`Focus path must be a catalogue .kcad.ts path: ${relativePath}`);
    }
    const source = await readFile(path.join(root, relativePath), 'utf8');
    focusAssets.push({
      path: relativePath,
      bytes: Buffer.byteLength(source, 'utf8'),
      ...countSource(source, relativePath),
    });
  }

  const manifest = {
    generatedAt: result.generatedAt,
    sourceCommit: result.sourceCommit,
    tokenizer: result.tokenizer,
    sampleDefinition: result.sampleDefinition,
    exclusionRule: result.exclusionRule,
    excludedLargeSources: result.excludedLargeSources,
    assets: result.records.map(({ path: assetPath, bytes, sha256 }) => ({ path: assetPath, bytes, sha256 })),
  };
  const manifestPath = manifestPathArgument(args);
  if (manifestPath) {
    const absoluteManifestPath = path.resolve(root, manifestPath);
    await mkdir(path.dirname(absoluteManifestPath), { recursive: true });
    await writeFile(absoluteManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const summary = {
    generatedAt: result.generatedAt,
    sourceCommit: result.sourceCommit,
    catalogueRoot: result.catalogueRoot,
    sampleDefinition: result.sampleDefinition,
    exclusionRule: result.exclusionRule,
    tokenizer: result.tokenizer,
    includedCount: result.includedCount,
    excludedLargeSources: result.excludedLargeSources,
    largestIncludedSource: result.largestIncludedSource,
    distributions: result.distributions,
  };
  return JSON.stringify({ ...summary, focusAssets, sampleManifest: manifestPath ?? null }, null, 2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runTokenBenchmark().then((output) => process.stdout.write(`${output}\n`)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
