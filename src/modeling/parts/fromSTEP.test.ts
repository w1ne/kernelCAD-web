// src/lib/parts/fromSTEP.test.ts
//
// Round-trip smoke for the `lib.fromSTEP(path)` global. Generates a STEP
// blob in-process (export a box from OcctBackend), writes it to a tmp file,
// then imports it via the runtime API and asserts the resulting Shape
// composes with translate / color / volume.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { OcctLowerer } from '../backends/occt/occtLowerer';

let stepPath: string;
let tmpDir: string;

beforeAll(async () => {
  await initOcct();
  const box = OcctBackend.box(20, 30, 40, false);
  const bytes = await box.exportSTEPAsync();
  tmpDir = mkdtempSync(join(tmpdir(), 'kcad-fromstep-'));
  stepPath = join(tmpDir, 'box.step');
  writeFileSync(stepPath, bytes);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('lib.fromSTEP', () => {
  it('imports a STEP file and returns a Shape with positive volume', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

    const shape = await api.lib.fromSTEP('box.step');
    expect(shape).toBeDefined();

    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe('importedStep');

    const lowerer = new OcctLowerer();
    lowerer.importedGeometry = session.importedGeometry;
    const engine = new RecomputeEngine(lowerer);
    const result = await engine.run(records, { paramTable: session.paramTable });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);

    const lowered = result.shapes.get(records[0].id);
    expect(lowered).toBeDefined();
    const backend = lowered as OcctBackend;
    expect(backend.volume()).toBeGreaterThan(0);
    // 20 * 30 * 40 = 24000 mm³ — leave headroom for STEP rounding.
    expect(backend.volume()).toBeGreaterThan(23000);
    expect(backend.volume()).toBeLessThan(25000);
  });

  it('composes with .translate and .color', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });

    const shape = await api.lib.fromSTEP('box.step');
    const moved = shape.translate(10, 20, 30).color('servo');
    expect(moved).toBeDefined();

    const lowerer = new OcctLowerer();
    lowerer.importedGeometry = session.importedGeometry;
    const engine = new RecomputeEngine(lowerer);
    const result = await engine.run(session.getRecords(), { paramTable: session.paramTable });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });

  it('accepts absolute paths', async () => {
    const session = new CaptureSession();
    // Note: scriptDir omitted on purpose — abs path should work without it.
    const api = createApi({ session });
    const shape = await api.lib.fromSTEP(stepPath);
    expect(shape).toBeDefined();
  });

  it('emits a structured diagnostic for missing files', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });
    await expect(api.lib.fromSTEP('does-not-exist.step')).rejects.toThrowError(/cannot read STEP/);
  });

  it('rejects empty path', async () => {
    const session = new CaptureSession();
    const api = createApi({ session, scriptDir: tmpDir });
    await expect(api.lib.fromSTEP('')).rejects.toThrowError(/non-empty string/);
  });
});
