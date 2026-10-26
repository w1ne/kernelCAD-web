#!/usr/bin/env node
// Exact-surface identity check for the roboto-01 gallery entry.
//
// The entry deliberately reimports the upstream RoboParty visual STLs as
// display bodies. This script proves that:
//   1. every one of the 25 link files is a byte-for-byte copy of the pinned
//      upstream mesh recorded in MESH-SOURCES.txt;
//   2. the model loads every link from its matching file;
//   3. the only operations applied to a loaded body are the metre->millimetre
//      scale and the PBR finish (no translate/rotate/boolean/fillet/etc.).
//
// Run from anywhere: node examples/gallery/roboto-01/verify-identity.mjs

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findGeometryOperationIssues } from './verify-identity-operations.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const modelPath = join(here, '..', 'roboto-01.kcad.ts');
const manifestPath = join(here, 'MESH-SOURCES.txt');

const FORBIDDEN_SHAPE_OPS = [
  'translate', 'rotate', 'alongAxis', 'union', 'subtract', 'intersect',
  'fillet', 'chamfer', 'holes', 'hole', 'boolean', 'mirror', 'clone',
  'scale3d', 'transform', 'extrude', 'revolve', 'loft', 'sweep',
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseManifest(text) {
  const entries = new Map();
  const re = /^(\S+\.STL)\r?\n\s+sha256 ([0-9a-f]{64})\r?\n\s+bytes (\d+)\r?\n\s+triangles (\d+)/gm;
  for (const match of text.matchAll(re)) {
    entries.set(match[1], {
      sha256: match[2],
      bytes: Number(match[3]),
      triangles: Number(match[4]),
    });
  }
  return entries;
}

function linkNamesFromModel(source) {
  const names = new Set();
  for (const match of source.matchAll(/child: '([^']+)'/g)) names.add(match[1]);
  if (/rp1\.part\('base_link'/.test(source)) names.add('base_link');
  return [...names].sort();
}

function loadLinkBody(source) {
  const start = source.indexOf('const loadLink');
  const end = source.indexOf('const refs', start);
  if (start < 0 || end < 0) throw new Error('could not locate the loadLink block');
  return source.slice(start, end);
}

const [modelSource, manifestText] = await Promise.all([
  readFile(modelPath, 'utf8'),
  readFile(manifestPath, 'utf8'),
]);
const manifest = parseManifest(manifestText);
const links = linkNamesFromModel(modelSource);
const loadBody = loadLinkBody(modelSource);

const failures = [];
const rows = [];
failures.push(...findGeometryOperationIssues(modelSource));

if (manifest.size !== 25) failures.push(`MESH-SOURCES.txt lists ${manifest.size} meshes, expected 25`);
if (links.length !== 25) failures.push(`model declares ${links.length} links, expected 25`);

if (!loadBody.includes('lib.meshFromSTL(`./roboto-01/meshes/${name}.STL`)')) {
  failures.push('loadLink does not load ./roboto-01/meshes/${name}.STL');
}
if (!loadBody.includes('.scale(1000)')) {
  failures.push('loadLink is missing the metre->millimetre .scale(1000)');
}
if (!loadBody.includes('.material({')) {
  failures.push('loadLink is missing the PBR .material({...}) finish');
}
for (const op of FORBIDDEN_SHAPE_OPS) {
  if (new RegExp(`\\.${op}\\s*\\(`).test(loadBody)) {
    failures.push(`loadLink applies a shape operation: .${op}(`);
  }
}
if (!/rp1\.part\('base_link'/.test(modelSource)) failures.push('base_link is not added as an assembly part');
if (!/rp1\.part\(j\.child/.test(modelSource)) failures.push('joint child links are not added as assembly parts');

for (const name of links) {
  const file = `${name}.STL`;
  const expected = manifest.get(file);
  const path = join(here, 'meshes', file);
  let actual = null;
  let bytes = null;
  try {
    const buffer = await readFile(path);
    actual = sha256(buffer);
    bytes = (await stat(path)).size;
  } catch (error) {
    failures.push(`${file}: cannot read bundled mesh (${error.code ?? error.message})`);
  }
  const hashOk = expected !== undefined && actual === expected.sha256;
  const sizeOk = expected !== undefined && bytes === expected.bytes;
  const exported = actual !== null && bytes !== null;
  const result = exported && hashOk && sizeOk ? 'PASS' : 'FAIL';
  if (result === 'FAIL') failures.push(`${file}: bundled mesh does not match the pinned manifest`);
  rows.push({
    part: name,
    sha256: actual ? actual.slice(0, 12) : '-'.repeat(12),
    bytes: bytes ?? 0,
    triangles: expected?.triangles ?? 0,
    source: hashOk && sizeOk ? 'exact' : 'mismatch',
    ops: 'scale+finish',
    result,
  });
}

const header = ['part'.padEnd(26), 'sha256'.slice(0, 12).padEnd(12), 'bytes'.padStart(9), 'tris'.padStart(8), 'source'.padEnd(9), 'ops'.padEnd(12), 'result'];
console.log('Roboto-01 exact-surface identity check');
console.log(header.join('  '));
for (const row of rows) {
  console.log([
    row.part.padEnd(26),
    row.sha256.padEnd(12),
    String(row.bytes).padStart(9),
    String(row.triangles).padStart(8),
    row.source.padEnd(9),
    row.ops.padEnd(12),
    row.result,
  ].join('  '));
}

if (failures.length > 0) {
  console.error(`\nFAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS: ${rows.length}/${rows.length} parts are byte-identical to the pinned upstream meshes; only unit scale and PBR finish are applied.`);
}
