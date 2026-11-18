// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { kernelErrorToDiagnostic } from '../../shared/diagnostics/kernelErrorToDiagnostic';
import * as stlImport from '../../kernel/backends/occt/importStl';
import { fromSTL, meshFromSTL } from './fromMeshFormats';

const tmpDir = mkdtempSync(join(tmpdir(), 'kcad-mesh-import-'));
afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

describe('lib.meshFromSTL file limits', () => {
  it('preserves all facets in a dense binary display STL', async () => {
    const path = join(tmpDir, 'dense.stl');
    const triangles = 1_450_000;
    const bytes = Buffer.alloc(84 + 50 * triangles);
    bytes.writeUInt32LE(triangles, 80);
    for (let offset = 84; offset < bytes.length; offset += 50) {
      bytes.writeFloatLE(1, offset + 24);
      bytes.writeFloatLE(1, offset + 40);
    }
    writeFileSync(path, bytes);
    const session = new CaptureSession();
    const mesh = await meshFromSTL({ session, scriptDir: tmpDir }, 'dense.stl');
    expect(session.getRecords().find(record => record.id === mesh.id)?.metadata?.triangleCount).toBe(triangles);
  });

  it('rejects a file larger than 80 MiB with a clear diagnostic', async () => {
    const path = join(tmpDir, 'large.stl');
    writeFileSync(path, new Uint8Array());
    truncateSync(path, 80 * 1024 * 1024 + 1);
    await expect(meshFromSTL({ session: new CaptureSession(), scriptDir: tmpDir }, 'large.stl'))
      .rejects.toThrow(/per-file limit is 80 MiB/i);
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

describe('lib.fromSTL error reporting', () => {

  it('points open-shell recovery at the STL input', async () => {
    writeFileSync(join(tmpDir, 'open.stl'), 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid t');
    const diagnostic = await fromSTL({ session: new CaptureSession(), scriptDir: tmpDir }, 'open.stl')
      .catch(error => kernelErrorToDiagnostic(error));
    expect(diagnostic).toMatchObject({
      hint: expect.stringContaining('fromSTL.open-mesh'),
      nextAction: { kind: 'fix-arg', field: 'path' },
    });
  });

  it('distinguishes a numeric OCCT failure from invalid input', async () => {
    writeFileSync(join(tmpDir, 'kernel-failure.stl'), 'fixture');
    const importer = vi.spyOn(stlImport, 'importStlBytes').mockImplementationOnce(() => { throw 24; });
    try {
      await expect(fromSTL({ session: new CaptureSession(), scriptDir: tmpDir }, 'kernel-failure.stl'))
        .rejects.toMatchObject({
          code: 'feature.kernel-failed',
          message: expect.stringContaining('OCCT exception 24'),
          hint: expect.stringContaining('fromSTL.kernel'),
        });
    } finally {
      importer.mockRestore();
    }
  });

  it('still gives a parse diagnostic for malformed STL bytes', async () => {
    writeFileSync(join(tmpDir, 'broken.stl'), 'not an STL');
    await expect(fromSTL({ session: new CaptureSession(), scriptDir: tmpDir }, 'broken.stl'))
      .rejects.toMatchObject({ hint: expect.stringContaining('fromSTL.parse') });
  });
});
