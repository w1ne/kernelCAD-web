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
import type { ConnectorEntry } from '../../shared/parts/connectorManifestSchema';
import { inspectStepFile } from '../../agent/inspect/inspectStep';
import { synthesizeConnectorsFromReport } from './synthesizeConnectors';
import { fetchPartHost } from './fetchPart';

const PART_ID = 'max30102-optical';
const PART_FAMILY = 'Sensor';
const BASE_URL = 'https://parts.example';
const STEP_URL = `${BASE_URL}/step/${PART_ID}.step`;
const STEP_BYTES = Buffer.from('ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n');
const STEP_SHA256 = createHash('sha256').update(STEP_BYTES).digest('hex');
const AUTHORED_CONNECTORS: ConnectorEntry[] = [
  {
    name: 'pwm-contact',
    type: 'frame',
    origin: [1, 2, 3],
    normal: [1, 0, 0],
  },
  {
    name: 'shaft-axis',
    type: 'axis',
    origin: [4, 5, 6],
    axis: [0, 1, 0],
  },
];
const AUTHORED_MANIFEST = {
  schemaVersion: 1 as const,
  partId: PART_ID,
  family: PART_FAMILY,
  geometrySha256: STEP_SHA256,
  connectors: AUTHORED_CONNECTORS,
};
const SYNTHESIZED_CONNECTOR = {
  name: 'mating-face',
  ref: '@kc[shape:synthetic]/connector:mating-face',
  origin: [0, 0, 0] as [number, number, number],
  axis: [0, 0, 1] as [number, number, number],
  type: 'frame' as const,
};

function remoteRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PART_ID,
    name: 'Analog Devices MAX30102 optical biosensor module',
    category: 'Electronics',
    family: PART_FAMILY,
    tags: ['sensor', 'optical'],
    attributes: { package: 'optical module' },
    stepUrl: STEP_URL,
    sha256: STEP_SHA256,
    ...overrides,
  };
}

function mockRemotePart(body: unknown, stepBytes: Buffer = STEP_BYTES): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === `${BASE_URL}/v1/parts/${PART_ID}`) {
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (url === STEP_URL) return new Response(stepBytes, { status: 200 });
    return new Response('not found', { status: 404 });
  });
}

describe('lib.fetchPart catalog semantic identity', () => {
  let cacheDir: string;
  let previousCacheDir: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    previousCacheDir = process.env.KERNELCAD_CACHE_DIR;
    cacheDir = mkdtempSync(join(tmpdir(), 'kc-fetch-part-metadata-'));
    process.env.KERNELCAD_CACHE_DIR = cacheDir;
    __resetUserCacheForTests();
    vi.mocked(inspectStepFile).mockImplementation(async (path: string) => ({
      file: path,
      solidCount: 1,
      solids: [],
    }));
    vi.mocked(synthesizeConnectorsFromReport).mockReturnValue([]);
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
            family: PART_FAMILY,
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

  it('stores exact catalog connector entries as detached frozen data', () => {
    const session = new CaptureSession();
    const connectors: ConnectorEntry[] = [
      {
        name: 'mount-face',
        type: 'frame',
        origin: [1, 2, 3],
        normal: [0, 0, 1],
      },
    ];

    session.attachCatalogConnectors('imported_1', connectors);
    connectors[0].origin[0] = 99;

    const stored = session.catalogConnectors.get('imported_1');
    expect(stored).toEqual([
      {
        name: 'mount-face',
        type: 'frame',
        origin: [1, 2, 3],
        normal: [0, 0, 1],
      },
    ]);
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored?.[0])).toBe(true);
    expect(Object.isFrozen(stored?.[0]?.origin)).toBe(true);
  });

  it('attaches a verified remote manifest exactly and skips generic synthesis', async () => {
    mockRemotePart(remoteRecord({ connectorManifest: AUTHORED_MANIFEST }));
    const session = new CaptureSession();

    const { shape, record } = await fetchPartHost(
      { session },
      PART_ID,
      { partsBaseUrl: BASE_URL },
    );

    expect(inspectStepFile).not.toHaveBeenCalled();
    expect(synthesizeConnectorsFromReport).not.toHaveBeenCalled();
    expect(record.connectors).toEqual(['pwm-contact', 'shaft-axis']);
    const exact = session.catalogConnectors.get(shape.id);
    expect(exact).toEqual(AUTHORED_CONNECTORS);
    expect(Object.isFrozen(exact)).toBe(true);
    expect(Object.isFrozen(exact?.[0])).toBe(true);
    expect(Object.isFrozen(exact?.[0]?.origin)).toBe(true);
    expect(session.autoConnectors.get(shape.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'pwm-contact',
          origin: [1, 2, 3],
          axis: [1, 0, 0],
          type: 'frame',
        }),
        expect.objectContaining({
          name: 'shaft-axis',
          origin: [4, 5, 6],
          axis: [0, 1, 0],
          type: 'frame',
        }),
      ]),
    );
  });

  it('keeps generic synthesis for remote records without an authored manifest', async () => {
    mockRemotePart(remoteRecord());
    vi.mocked(synthesizeConnectorsFromReport).mockReturnValue([SYNTHESIZED_CONNECTOR]);
    const session = new CaptureSession();

    const { shape, record } = await fetchPartHost(
      { session },
      PART_ID,
      { partsBaseUrl: BASE_URL },
    );

    expect(inspectStepFile).toHaveBeenCalledTimes(1);
    expect(synthesizeConnectorsFromReport).toHaveBeenCalledTimes(1);
    expect(record.connectors).toEqual(['mating-face']);
    expect(session.autoConnectors.get(shape.id)).toEqual([SYNTHESIZED_CONNECTOR]);
    expect(session.catalogConnectors.get(shape.id)).toBeUndefined();
  });

  it.each([
    [
      'malformed',
      {
        ...AUTHORED_MANIFEST,
        connectors: [
          {
            name: 'pwm-contact',
            type: 'frame',
            origin: [1, 2, 3],
            normal: [0, 0, 0],
          },
        ],
      },
      /normal/,
    ],
    [
      'hash-mismatched',
      { ...AUTHORED_MANIFEST, geometrySha256: 'f'.repeat(64) },
      /geometrySha256/,
    ],
  ])('rejects a %s remote manifest without synthesis', async (_, connectorManifest, error) => {
    mockRemotePart(remoteRecord({ connectorManifest }));
    const session = new CaptureSession();

    await expect(
      fetchPartHost({ session }, PART_ID, { partsBaseUrl: BASE_URL }),
    ).rejects.toThrow(error);
    expect(inspectStepFile).not.toHaveBeenCalled();
    expect(synthesizeConnectorsFromReport).not.toHaveBeenCalled();
  });
});
