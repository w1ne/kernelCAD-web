// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, it, expect } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { OcctBackend, initOcct } from '../src/kernel/backends/occt/occtBackend';
import { ingestDirectory, measureStepReport } from './ingestParts';
import type { StepInspectReport } from '../src/agent/inspect/inspectStep';

let tinyStepBytes: Buffer;
let alternateTinyStepBytes: Buffer;
const temporaryDirectories: string[] = [];

beforeAll(async () => {
  await initOcct();
  tinyStepBytes = Buffer.from(await OcctBackend.box(4, 3, 2).exportSTEPAsync());
  alternateTinyStepBytes = Buffer.from(await OcctBackend.box(5, 3, 2).exportSTEPAsync());
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createTemporaryCatalogDirectories(): { src: string; out: string } {
  const src = mkdtempSync(join(tmpdir(), 'kc-ingest-src-'));
  const out = mkdtempSync(join(tmpdir(), 'kc-ingest-out-'));
  temporaryDirectories.push(src, out);
  return { src, out };
}

function writeStepFixture(
  src: string,
  pathParts: string[],
  name: string,
  bytes: Buffer,
  sidecar?: unknown | string,
): void {
  const partDir = join(src, ...pathParts);
  mkdirSync(partDir, { recursive: true });
  writeFileSync(join(partDir, `${name}.step`), bytes);
  if (sidecar === undefined) return;
  writeFileSync(
    join(partDir, `${name}.meta.json`),
    typeof sidecar === 'string' ? sidecar : JSON.stringify(sidecar),
  );
}

function writeTinyStepFixture(src: string, sidecar?: unknown | string): void {
  writeStepFixture(src, ['electronics', 'driver'], 'driver', tinyStepBytes, sidecar);
}

const INGEST_OPTS = {
  baseUrl: 'https://parts.test',
  license: 'CC-BY-3.0',
  attribution: 'fixture',
};

describe('ingestParts', () => {
  it('measures assembly bounds without changing dominant-solid volume semantics', () => {
    const report: StepInspectReport = {
      file: 'multi-solid-package.step',
      solidCount: 2,
      solids: [
        {
          index: 0,
          name: 'body',
          bboxExact: { min: [0, 0, 0], max: [5.9, 5.9, 0.79] },
          volumeMm3: 20,
          faceCount: 6,
          holes: [],
        },
        {
          index: 1,
          name: 'contacts-and-marker',
          bboxExact: { min: [-0.1, -0.1, 0], max: [6, 6, 0.85] },
          volumeMm3: 3,
          faceCount: 12,
          holes: [
            {
              axisOrigin: [3, 3, 0.85],
              axisDirection: [0, 0, -1],
              diameterMm: 0.4,
              depthMm: 0.5,
              kind: 'through',
              faceCount: 1,
            },
          ],
        },
      ],
    };

    expect(measureStepReport(report)).toEqual({
      bboxXmm: 6.1,
      bboxYmm: 6.1,
      bboxZmm: 0.85,
      volumeMm3: 20,
      solidCount: 2,
      holeCount: 0,
    });
  });

  it('ingests a STEP dir into a /v1/parts catalog with measured attrs + synthesized connectors', async () => {
    const { src, out } = createTemporaryCatalogDirectories();

    // A bored plate (through-hole) so synthesis emits bbox faces + a bore.
    const plate = OcctBackend.box(40, 40, 5).subtract(
      OcctBackend.cylinder(8, 4).translate(20, 20, -1),
    );
    const bytes = await plate.exportSTEPAsync();
    // Folder layout drives category/family with no sidecar: <src>/bracket/mount/.
    mkdirSync(join(src, 'bracket', 'mount'), { recursive: true });
    writeFileSync(join(src, 'bracket', 'mount', 'mount-plate.step'), Buffer.from(bytes));

    const records = await ingestDirectory(src, out, INGEST_OPTS);

    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.id).toBe('mount-plate');
    expect(r.category).toBe('bracket');
    expect(r.family).toBe('mount');
    expect(r.license).toBe('CC-BY-3.0');
    expect(r.attribution).toBe('fixture');
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.byteSize).toBeGreaterThan(0);
    expect(r.stepUrl).toBe('https://parts.test/step/mount-plate.step');
    // Measured, not guessed.
    expect(r.attributes.bboxXmm).toBeGreaterThan(39);
    expect(r.attributes.bboxZmm).toBeCloseTo(5, 0);
    // Synthesized frames from the geometry.
    expect(r.connectors.map((c) => c.name)).toEqual(
      expect.arrayContaining(['mating-face', 'top-face', 'bore']),
    );
    expect(r.connectorManifest).toBeUndefined();

    // Deployable tree.
    expect(existsSync(join(out, 'step', 'mount-plate.step'))).toBe(true);
    expect(existsSync(join(out, 'v1', 'parts', 'mount-plate.json'))).toBe(true);
    expect(existsSync(join(out, '_worker.js'))).toBe(true);
    const index = JSON.parse(
      readFileSync(join(out, 'v1', 'catalog', 'parts.index.json'), 'utf8'),
    ) as { catalog: { partCount: number }; items: Array<{ id: string }> };
    expect(index.catalog.partCount).toBe(1);
    expect(index.items[0].id).toBe('mount-plate');
    const sha = JSON.parse(readFileSync(join(out, 'sha256-manifest.json'), 'utf8'));
    expect(sha['mount-plate']).toBe(r.sha256);
  });

  it('binds an authored connector sidecar to the emitted STEP bytes', async () => {
    const { src, out } = createTemporaryCatalogDirectories();
    const connectorManifest = {
      schemaVersion: 1 as const,
      partId: 'driver',
      family: 'driver',
      connectors: [
        {
          name: 'mount-face',
          type: 'frame' as const,
          origin: [1, 2, 3] as [number, number, number],
          normal: [0, 0, 1] as [number, number, number],
        },
        {
          name: 'pin-axis',
          type: 'axis' as const,
          origin: [4, 5, 6] as [number, number, number],
          axis: [1, 0, 0] as [number, number, number],
        },
      ],
    };
    writeTinyStepFixture(src, { connectorManifest });

    const [record] = await ingestDirectory(src, out, INGEST_OPTS);

    expect(record.connectorManifest).toEqual({
      ...connectorManifest,
      geometrySha256: record.sha256,
    });
    const emittedStepSha256 = createHash('sha256')
      .update(readFileSync(join(out, 'step', 'driver.step')))
      .digest('hex');
    expect(emittedStepSha256).toBe(record.connectorManifest?.geometrySha256);
    expect(record.connectors).toEqual([
      { name: 'mount-face', origin: [1, 2, 3], axis: [0, 0, 1] },
      { name: 'pin-axis', origin: [4, 5, 6], axis: [1, 0, 0] },
    ]);
    expect(record.connectors.map((connector) => connector.name)).not.toContain('mating-face');

    const detail = JSON.parse(
      readFileSync(join(out, 'v1', 'parts', 'driver.json'), 'utf8'),
    ) as { connectorManifest?: unknown };
    const index = JSON.parse(
      readFileSync(join(out, 'v1', 'catalog', 'parts.index.json'), 'utf8'),
    ) as { items: Array<{ connectorManifest?: unknown }> };
    expect(detail.connectorManifest).toEqual(record.connectorManifest);
    expect(index.items[0].connectorManifest).toEqual(record.connectorManifest);
  });

  async function expectAuthoredSidecarFailure(sidecar: unknown | string): Promise<void> {
    const { src, out } = createTemporaryCatalogDirectories();
    writeTinyStepFixture(src, sidecar);

    await expect(ingestDirectory(src, out, INGEST_OPTS)).rejects.toMatchObject({
      name: 'AuthoredManifestError',
    });
    expect(existsSync(join(out, 'skipped.json'))).toBe(false);
  }

  it('rejects a malformed authored connector manifest instead of skipping it', async () => {
    await expectAuthoredSidecarFailure({
      connectorManifest: {
        schemaVersion: 1,
        partId: 'driver',
        family: 'driver',
        connectors: [
          {
            name: 'mount-face',
            type: 'frame',
            origin: [0, 0, 0],
            normal: [0, 0, 0],
          },
        ],
      },
    });
  });

  it.each([
    ['part id', 'other-driver', 'driver'],
    ['family', 'driver', 'other-driver'],
  ])(
    'rejects an authored connector manifest with a mismatched %s',
    async (_, partId, family) => {
      await expectAuthoredSidecarFailure({
        connectorManifest: {
          schemaVersion: 1,
          partId,
          family,
          connectors: [],
        },
      });
    },
  );

  it('rejects malformed sidecar JSON instead of skipping the part', async () => {
    await expectAuthoredSidecarFailure('{ this is not JSON }');
  });

  it('fails before writing output when different folders derive the same catalog ID', async () => {
    const { src, out } = createTemporaryCatalogDirectories();
    writeStepFixture(src, ['electronics', 'driver-a'], 'shared', tinyStepBytes);
    writeStepFixture(src, ['mechanical', 'driver-b'], 'shared', alternateTinyStepBytes);

    await expect(ingestDirectory(src, out, INGEST_OPTS)).rejects.toMatchObject({
      name: 'DuplicateCatalogIdError',
    });
    expect(existsSync(join(out, 'step'))).toBe(false);
    expect(existsSync(join(out, 'v1', 'catalog', 'parts.index.json'))).toBe(false);
  });

  it('fails before writing output when sidecars assign the same catalog ID', async () => {
    const { src, out } = createTemporaryCatalogDirectories();
    writeStepFixture(src, ['electronics', 'driver-a'], 'first', tinyStepBytes, { id: 'shared' });
    writeStepFixture(src, ['mechanical', 'driver-b'], 'second', alternateTinyStepBytes, { id: 'shared' });

    await expect(ingestDirectory(src, out, INGEST_OPTS)).rejects.toMatchObject({
      name: 'DuplicateCatalogIdError',
    });
    expect(existsSync(join(out, 'step'))).toBe(false);
    expect(existsSync(join(out, 'v1', 'catalog', 'parts.index.json'))).toBe(false);
  });

  it('skips cross-folder duplicate ids (keeping the first) when onDuplicate is "skip"', async () => {
    const { src, out } = createTemporaryCatalogDirectories();
    writeStepFixture(src, ['Bearings', 'linear'], 'lm8uu', tinyStepBytes);
    writeStepFixture(src, ['Mountings', 'lm8uu'], 'lm8uu', alternateTinyStepBytes);

    const records = await ingestDirectory(src, out, INGEST_OPTS, { onDuplicate: 'skip' });
    expect(records.filter((r) => r.id === 'lm8uu')).toHaveLength(1);
    expect(existsSync(join(out, 'v1', 'catalog', 'parts.index.json'))).toBe(true);
  });

  it('still throws on a duplicate EXPLICIT sidecar id even when onDuplicate is "skip"', async () => {
    const { src, out } = createTemporaryCatalogDirectories();
    writeStepFixture(src, ['a'], 'first', tinyStepBytes, { id: 'shared' });
    writeStepFixture(src, ['b'], 'second', alternateTinyStepBytes, { id: 'shared' });

    await expect(
      ingestDirectory(src, out, INGEST_OPTS, { onDuplicate: 'skip' }),
    ).rejects.toMatchObject({ name: 'DuplicateCatalogIdError' });
  });

  it('rejects a numeric sidecar catalog ID before it can collide with a string ID', async () => {
    const { src, out } = createTemporaryCatalogDirectories();
    writeStepFixture(src, ['electronics', 'driver-a'], 'first', tinyStepBytes, { id: 1 });
    writeStepFixture(src, ['mechanical', 'driver-b'], 'second', alternateTinyStepBytes, { id: '1' });

    await expect(ingestDirectory(src, out, INGEST_OPTS)).rejects.toMatchObject({
      name: 'AuthoredManifestError',
    });
    expect(existsSync(join(out, 'step'))).toBe(false);
    expect(existsSync(join(out, 'v1', 'catalog', 'parts.index.json'))).toBe(false);
  });
});
