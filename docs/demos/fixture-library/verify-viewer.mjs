// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Records what the inline viewers (Studio, model-viewer, the Claude and
// ChatGPT apps) get for this example: the same GLB export path the hosted
// export tool uses. Writes viewer-evidence.json beside this script.
// Run from the repository root:
//   node docs/demos/fixture-library/verify-viewer.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const source = 'examples/fixture/table-clamp-set.kcad.ts';
const out = join(mkdtempSync(join(tmpdir(), 'kc-viewer-')), 'model.glb');

try {
  execFileSync(
    'npx',
    ['tsx', 'src/agent/cli/index.ts', 'export', 'glb', source, '-o', out],
    { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const bytes = readFileSync(out);
  const magic = bytes.subarray(0, 4).toString('ascii');
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const evidence = {
    checkedAt: new Date().toISOString(),
    source,
    invocation: `npx tsx src/agent/cli/index.ts export glb ${source} -o <tmp>/model.glb`,
    format: magic,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    nodes: gltf.nodes.map((node) => node.name ?? null),
    meshCount: (gltf.meshes ?? []).length,
    materialCount: (gltf.materials ?? []).length,
    baseColors: (gltf.materials ?? []).map(
      (material) => material.pbrMetallicRoughness?.baseColorFactor ?? null,
    ),
    scope:
      'GLB export of the committed example through the CLI export path. The inline viewers ' +
      'consume the same glTF: named parts, one material per part. Not a capture of the hosted ' +
      'Claude or ChatGPT apps.',
  };
  writeFileSync(join(here, 'viewer-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, bytes: bytes.length, parts: evidence.nodes.length }));
} finally {
  rmSync(dirname(out), { recursive: true, force: true });
}
