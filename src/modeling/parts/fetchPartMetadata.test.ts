// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A catalog fetch must not become an anonymous imported STEP feature just
// because lib.fetchPart() returns Shape rather than fetchPartHost's internal
// { shape, record } wrapper. Keep this test fully offline: the STEP importer
// is mocked while the remote metadata and public facade remain real.
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./fromSTEP', () => ({
  fromStepBytes: vi.fn(
    async (
      ctx: { session: { createShape: (spec: unknown) => { id: string } } },
      _bytes: Buffer,
      sourceLabel: string,
    ) =>
      ctx.session.createShape({
        kind: 'importedStep',
        params: {},
        inputs: {},
        metadata: { sourcePath: sourceLabel },
      }),
  ),
}));

vi.mock('../../agent/inspect/inspectStep', () => ({
  inspectStepFile: vi.fn(async (path: string) => ({ file: path, solidCount: 1, solids: [] })),
}));

vi.mock('./synthesizeConnectors', () => ({
  synthesizeConnectorsFromReport: vi.fn(() => []),
}));

import '../runtime/hostFsNode';
import { listFeaturesTool } from '../../agent/mcp/tools/listFeatures';
import { createApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import { __resetUserCacheForTests } from '../../shared/cache/userCache';

const PART_ID = 'max30102-optical';
const BASE_URL = 'https://parts.example';
const STEP_URL = `${BASE_URL}/step/${PART_ID}.step`;
const STEP_BYTES = Buffer.from('ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n');
const STEP_SHA256 = createHash('sha256').update(STEP_BYTES).digest('hex');

describe('lib.fetchPart catalog semantic identity', () => {
  let cacheDir: string;
  let previousCacheDir: string | undefined;

  beforeEach(() => {
    previousCacheDir = process.env.KERNELCAD_CACHE_DIR;
    cacheDir = mkdtempSync(join(tmpdir(), 'kc-fetch-part-metadata-'));
    process.env.KERNELCAD_CACHE_DIR = cacheDir;
    __resetUserCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (previousCacheDir === undefined) delete process.env.KERNELCAD_CACHE_DIR;
    else process.env.KERNELCAD_CACHE_DIR = previousCacheDir;
    rmSync(cacheDir, { recursive: true, force: true });
    __resetUserCacheForTests();
  });

  it('preserves remote package attributes through the public Shape facade and into an assembly Scene', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === `${BASE_URL}/v1/parts/${PART_ID}`) {
        return new Response(
          JSON.stringify({
            id: PART_ID,
            name: 'Analog Devices MAX30102 optical biosensor module',
            category: 'Electronics',
            family: 'Sensor',
            tags: ['sensor', 'optical'],
            attributes: {
              package: 'optical module',
              pinCount: 14,
              pinPitchMm: 0.8,
            },
            stepUrl: STEP_URL,
            sha256: STEP_SHA256,
          }),
          { status: 200 },
        );
      }
      if (url === STEP_URL) {
        return new Response(STEP_BYTES, { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });

    const session = new CaptureSession();
    const api = createApi({ session });
    const sensor = await api.lib.fetchPart(PART_ID, { partsBaseUrl: BASE_URL });

    const imported = session.getRecords().find((record) => record.id === sensor.id);
    expect(imported?.metadata).toMatchObject({
      sourcePath: STEP_URL,
      catalogPart: {
        id: PART_ID,
        category: 'Electronics',
        family: 'Sensor',
        source: 'remote',
        attributes: { package: 'optical module', pinCount: 14, pinPitchMm: 0.8 },
      },
    });
    const catalogPart = imported?.metadata?.catalogPart;
    expect(Object.isFrozen(catalogPart)).toBe(true);
    expect(Object.isFrozen(catalogPart?.attributes)).toBe(true);

    const scene = api.assembly('catalog-identity').part('sensor', sensor).model();
    expect(scene.part('sensor').metadata).toMatchObject({
      catalogPart: {
        id: PART_ID,
        attributes: { package: 'optical module', pinCount: 14, pinPitchMm: 0.8 },
      },
    });

    const inspected = await listFeaturesTool({
      code: `
        const sensor = await lib.fetchPart('${PART_ID}', { partsBaseUrl: '${BASE_URL}' });
        return sensor;
      `,
    });
    const inspectedPart = inspected.features.find((feature) => feature.kind === 'importedStep');
    expect(inspectedPart?.catalogPart).toMatchObject({
      id: PART_ID,
      attributes: { package: 'optical module', pinCount: 14, pinPitchMm: 0.8 },
    });
  });
});
