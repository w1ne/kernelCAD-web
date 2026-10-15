// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { meshFromSTL } from './fromMeshFormats';

const tmpDir = mkdtempSync(join(tmpdir(), 'kcad-mesh-import-'));
afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

describe('lib.meshFromSTL file limits', () => {
  it('rejects a file larger than 50 MiB with a clear diagnostic', async () => {
    const path = join(tmpDir, 'large.stl');
    writeFileSync(path, new Uint8Array());
    truncateSync(path, 50 * 1024 * 1024 + 1);
    await expect(meshFromSTL({ session: new CaptureSession(), scriptDir: tmpDir }, 'large.stl'))
      .rejects.toThrow(/per-file limit is 50 MiB/i);
  });

  it('stops a fillet with display mesh inputs before OCCT lowering', async () => {
    const path = join(tmpDir, 'triangle.stl');
    writeFileSync(path, 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t');
    const session = new CaptureSession();
    const mesh = await meshFromSTL({ session, scriptDir: tmpDir }, 'triangle.stl');
    const combined = mesh.fillet(0.1);
    const lowerer = createOcctLowerer(session);
    const result = await new RecomputeEngine(lowerer).run(session.getRecords(), { paramTable: session.paramTable });
    expect(result.diagnostics.some(d => /requires BRep geometry/.test(d.message))).toBe(true);
    expect(result.shapes.get(combined.id)).toBeUndefined();
  });
});
