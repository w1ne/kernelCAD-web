// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The plant-scale rack row exported to GLB through the real export path:
// one glTF mesh per shared geometry and one node per assembly part. Every
// part of a given shape carries the same colour and material, so there is
// no per-material split: 12 unique geometries -> 12 meshes, 1,066 parts ->
// 1,066 mesh nodes.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeIO, type Document } from '@gltf-transform/core';
import { REPO_ROOT } from '../physics-loop/exampleSweepShared';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';

const FILE = join(REPO_ROOT, 'examples/plant/rack-row.kcad.ts');
const PARTS = 1066;
const UNIQUE_GEOMETRIES = 12;

describe('rack-row GLB export shares meshes', () => {
  let doc: Document;
  beforeAll(async () => {
    await initOcct();
    const r = await runAndExport({ code: readFileSync(FILE, 'utf8'), fileName: FILE, scriptDir: dirname(FILE), format: 'glb' });
    expect(r.bytes.length).toBeGreaterThan(0);
    doc = await new NodeIO().readBinary(r.bytes);
  }, 600_000);

  it('inspect reports the part and unique-geometry counts the GLB is checked against', async () => {
    const r = await inspectAssemblyTool({ file: FILE });
    if (!r.ok) throw new Error(String(r.error));
    expect(r.partCount).toBe(PARTS);
    expect(r.uniqueGeometries).toBe(UNIQUE_GEOMETRIES);
  }, 600_000);

  it('writes one mesh per unique geometry and one node per part', () => {
    expect(doc.getRoot().listMeshes()).toHaveLength(UNIQUE_GEOMETRIES);
    const meshNodes = doc.getRoot().listNodes().filter((n) => n.getMesh() !== null);
    expect(meshNodes).toHaveLength(PARTS);
    expect(new Set(meshNodes.map((n) => n.getName())).size).toBe(PARTS);
  });
});
