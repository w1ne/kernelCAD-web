// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../../..');
const current = JSON.parse(readFileSync(resolve(repoRoot, 'catalog/index.json'), 'utf8'));
const qualityGateLog = readFileSync(resolve(import.meta.dirname, 'quality-kit.log'), 'utf8');
const qualityGateMatch = qualityGateLog.match(/(\d+)\/(\d+) assets pass \(([\d.]+%)/);
const before = JSON.parse(execFileSync('git', ['show', 'HEAD:catalog/index.json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
}));

function assetRows(value, rows = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => assetRows(item, rows));
  } else if (value && typeof value === 'object') {
    if (typeof value.id === 'string' && typeof value.kit === 'string' && typeof value.source === 'string') {
      rows.push(value);
    }
    Object.values(value).forEach((item) => assetRows(item, rows));
  }
  return rows;
}

const key = (row) => `${row.kit}/${row.id}`;
const beforeMap = new Map(assetRows(before).map((row) => [key(row), JSON.stringify(row)]));
const currentRows = assetRows(current);
const currentMap = new Map(currentRows.map((row) => [key(row), JSON.stringify(row)]));
const allKeys = new Set([...beforeMap.keys(), ...currentMap.keys()]);
const changedRows = [...allKeys].filter((assetKey) => beforeMap.get(assetKey) !== currentMap.get(assetKey)).sort();
const target = currentRows.find((row) => key(row) === 'recycling-facility/glass-screening-deck');
const sourcePath = resolve(repoRoot, target?.source ?? '');
const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
const previewPath = resolve(repoRoot, 'catalog/kits/recycling-facility/previews/glass-screening-deck.png');
const result = {
  assetCountBefore: beforeMap.size,
  assetCountAfter: currentMap.size,
  structuralQualityGate: qualityGateMatch ? {
    kit: 'recycling-facility',
    passed: Number(qualityGateMatch[1]),
    total: Number(qualityGateMatch[2]),
    passRate: qualityGateMatch[3],
  } : null,
  changedAssetRows: changedRows,
  source: target?.source,
  sourceSha256,
  indexedSourceSha256: target?.sourceSha256,
  preview: target?.preview,
  previewExists: existsSync(previewPath),
};

console.log(JSON.stringify(result, null, 2));
if (beforeMap.size !== currentMap.size
  || changedRows.length !== 1
  || changedRows[0] !== 'recycling-facility/glass-screening-deck'
  || !qualityGateMatch
  || !target
  || target.sourceSha256 !== sourceSha256
  || !target.preview
  || !existsSync(previewPath)) {
  process.exitCode = 1;
}
