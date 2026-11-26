// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { getOC } from 'replicad';
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { initOcct, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { Shape } from '../capture/proxy';
import { runImportStepCli } from '../../agent/cli/commands/importStep';

const nativeFixture = resolve(
  process.cwd(),
  'tests/fixtures/native-cad-import/nist_ftc_06_asme1_rd_sw1802.SLDPRT',
);
const referenceStep = resolve(
  process.cwd(),
  'tests/fixtures/native-cad-import/nist_ftc_06_asme1_ap242-e2.stp',
);
const cadmpegPath = process.env.KERNELCAD_CADMPEG_BIN;
const canRunNativeImport = cadmpegPath !== undefined && existsSync(cadmpegPath);

function validBrep(backend: OcctBackend): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

async function loweredBackend(session: CaptureSession, shape: Shape): Promise<OcctBackend> {
  const result = await new RecomputeEngine(createOcctLowerer(session)).run(
    session.getRecords(),
    { paramTable: session.paramTable },
  );
  expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toHaveLength(0);
  const backend = result.shapes.get(shape.id);
  expect(backend).toBeDefined();
  return backend as OcctBackend;
}

describe('lib.fromNativeCAD', () => {
  beforeAll(async () => { await initOcct(); });

  it('rejects extensions outside the measured SolidWorks part support before reading a file', async () => {
    const api = createModelingApi({ session: new CaptureSession(), scriptDir: dirname(nativeFixture) });
    await expect(api.lib.fromNativeCAD('assembly.sldasm')).rejects.toMatchObject({
      code: 'feature.invalid-args',
      hint: expect.stringContaining('assemblies and other native formats are not supported'),
    });
    await expect(api.lib.fromNativeCAD('part.ipt')).rejects.toMatchObject({
      code: 'feature.invalid-args',
    });
  });

  it('returns a typed converter-unavailable error without recording partial geometry', async () => {
    const oldConverter = process.env.KERNELCAD_CADMPEG_BIN;
    process.env.KERNELCAD_CADMPEG_BIN = join(tmpdir(), 'kernelcad-cadmpeg-missing-test-binary');
    const session = new CaptureSession();
    const api = createModelingApi({ session, scriptDir: dirname(nativeFixture) });
    try {
      await expect(api.lib.fromNativeCAD(basename(nativeFixture))).rejects.toMatchObject({
        code: 'feature.kernel-failed',
        hint: expect.stringContaining('kernel-failed.lib.fromNativeCAD.converter-unavailable'),
      });
      expect(session.getRecords()).toHaveLength(0);
    } finally {
      if (oldConverter === undefined) delete process.env.KERNELCAD_CADMPEG_BIN;
      else process.env.KERNELCAD_CADMPEG_BIN = oldConverter;
    }
  });

  it.skipIf(!canRunNativeImport)(
    'returns a typed conversion error for a truncated native file without recording partial geometry',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'kernelcad-native-cad-truncated-'));
      const truncatedPath = join(dir, 'truncated.sldprt');
      await writeFile(truncatedPath, Buffer.from('not a SolidWorks document'));
      const session = new CaptureSession();
      const api = createModelingApi({ session, scriptDir: dir });
      try {
        await expect(api.lib.fromNativeCAD(basename(truncatedPath))).rejects.toMatchObject({
          code: 'feature.kernel-failed',
          hint: expect.stringContaining('kernel-failed.lib.fromNativeCAD.conversion-failed'),
        });
        expect(session.getRecords()).toHaveLength(0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!canRunNativeImport)(
    'converts a real SolidWorks part to a valid editable B-rep matching its STEP geometry twin',
    async () => {
      const nativeSession = new CaptureSession();
      const nativeApi = createModelingApi({ session: nativeSession, scriptDir: dirname(nativeFixture) });
      const fromNativeCAD = (nativeApi.lib as unknown as {
        fromNativeCAD: (path: string) => Promise<Shape>;
      }).fromNativeCAD;
      const nativeShape = await fromNativeCAD.call(nativeApi.lib, basename(nativeFixture));
      const nativeBackend = await loweredBackend(nativeSession, nativeShape);

      const stepSession = new CaptureSession();
      const stepApi = createModelingApi({ session: stepSession, scriptDir: dirname(referenceStep) });
      const stepShape = await stepApi.lib.fromSTEP(basename(referenceStep));
      const stepBackend = await loweredBackend(stepSession, stepShape);

      expect(validBrep(nativeBackend)).toBe(true);
      expect(nativeBackend.solidComponents()).toHaveLength(1);
      expect(Math.abs(nativeBackend.volume() - stepBackend.volume())).toBeLessThan(20);
      const nativeBounds = nativeBackend.boundingBox();
      const stepBounds = stepBackend.boundingBox();
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(nativeBounds.min[axis] - stepBounds.min[axis])).toBeLessThan(0.01);
        expect(Math.abs(nativeBounds.max[axis] - stepBounds.max[axis])).toBeLessThan(0.01);
      }

      const moved = nativeShape.translate(10, 0, 0);
      const movedBackend = await loweredBackend(nativeSession, moved);
      expect(validBrep(movedBackend)).toBe(true);
      expect(movedBackend.volume()).toBeCloseTo(nativeBackend.volume(), 3);
      expect(movedBackend.boundingBox().min[0]).toBeCloseTo(nativeBounds.min[0] + 10, 3);
    },
  );

  it.skipIf(!canRunNativeImport)(
    'writes a CLI project bundle with native source provenance and converted B-rep assets',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'kernelcad-native-cad-cli-'));
      const out = join(dir, 'part-import');
      try {
        const result = await runImportStepCli({ file: nativeFixture, out, json: true });
        expect(result.ok).toBe(true);
        expect(result.bundle?.partAssets).toBe(1);
        const manifest = JSON.parse(await readFile(result.bundle!.manifest, 'utf8')) as {
          input: { fileName: string; format?: string; conversionEngine?: string; sha256: string };
          definitions: Array<{ solidCount: number; validation: { valid: boolean } }>;
        };
        expect(manifest.input.fileName).toBe(basename(nativeFixture));
        expect(manifest.input.format).toBe('sldprt');
        expect(manifest.input.conversionEngine).toMatch(/^cadmpeg 0\.6\./);
        expect(manifest.input.sha256).toBe('6612f7bc9b2b15373789afe8032a153d84af7d619dbeb984c3a75cb360456bd3');
        expect(manifest.definitions).toHaveLength(1);
        expect(manifest.definitions[0]).toMatchObject({ solidCount: 1, validation: { valid: true } });
        expect(result.warnings?.join(' ')).toMatch(/feature history, PMI, and assembly relations are not preserved/);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
});
