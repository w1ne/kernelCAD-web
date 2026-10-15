// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { exportModelTool } from './exportModel';
import { fetchPartModelTool } from './fetchPartModel';
import { setFetchDepsForTest, type FetchDeps } from './importStepFetch';
import { setFetchPartModelDepsForTest } from './fetchPartModel';
import * as importStepModule from './importStep';

function glbWithBox(size: [number, number, number]): Buffer {
  const json = Buffer.from(JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ min: [0, 0, 0], max: size }],
  }));
  const paddedLength = Math.ceil(json.byteLength / 4) * 4;
  const padded = Buffer.alloc(paddedLength, 0x20);
  json.copy(padded);
  const header = Buffer.alloc(20);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + paddedLength, 8);
  header.writeUInt32LE(paddedLength, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded]);
}

function glbWithCombinedBoxes(): Buffer {
  const sizes: Array<[number, number, number]> = [[0.03, 0.02, 0.01], [0.1, 0.02, 0.01], [0.2, 0.02, 0.01]];
  const json = Buffer.from(JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, children: [1] }, { mesh: 1 }],
    meshes: [
      { primitives: [0, 1].map(index => ({ attributes: { POSITION: index } })) },
      { primitives: [{ attributes: { POSITION: 2 } }] },
    ],
    accessors: sizes.map(size => ({ min: [0, 0, 0], max: size })),
  }));
  const paddedLength = Math.ceil(json.byteLength / 4) * 4;
  const padded = Buffer.alloc(paddedLength, 0x20);
  json.copy(padded);
  const header = Buffer.alloc(20);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + paddedLength, 8);
  header.writeUInt32LE(paddedLength, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded]);
}

describe('fetch_part_model', () => {
  let cacheDir: string | undefined;
  afterEach(async () => {
    setFetchDepsForTest();
    setFetchPartModelDepsForTest();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
    cacheDir = undefined;
  });

  it('caches explicit model URL bytes by content hash and returns provenance', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const bytes = glbWithBox([0.0544, 0.0279, 0.01]);
    let calls = 0;
    const deps: Partial<FetchDeps> = {
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200;
          res.headers = {};
          cb(res);
          calls++;
          res.end(bytes);
        };
        return req as never;
      }) as FetchDeps['request'],
    };
    setFetchDepsForTest(deps);
    const input = {
      url: 'https://models.example/board.glb', ref: 'U1', catalog_id: 'esp32', mpn: 'ESP32-DevKitC',
      expected_sha256: createHash('sha256').update(bytes).digest('hex'),
      source: 'KiCad Packages3D', license: 'CC-BY-SA-4.0', attribution: 'KiCad library', bbox_mm: [54.4, 27.9, 10],
    };
    const first = await fetchPartModelTool(input);
    const second = await fetchPartModelTool(input);
    expect(first).toMatchObject({ ok: true, format: 'glb', cache_hit: false, bbox_check: { status: 'within_tolerance', expected_mm: input.bbox_mm } });
    expect(second).toMatchObject({ ok: true, cache_hit: true, sha256: first.sha256, attribution: { source: input.source, license: input.license, url: input.url } });
    expect(calls).toBe(1);
    expect(await readFile(first.model_path!)).toEqual(bytes);
  });

  it('rejects non-public and non-model URLs before fetching', async () => {
    const result = await fetchPartModelTool({ url: 'https://127.0.0.1/model.step', expected_sha256: '0'.repeat(64), source: 'test', license: 'MIT' });
    expect(result).toMatchObject({ ok: false });
    expect(result.error).toContain('public');
  });

  it('rejects an explicit model whose bytes do not match the handoff hash', async () => {
    setFetchDepsForTest({
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200; res.headers = {}; cb(res); res.end(Buffer.from('different bytes'));
        };
        return req as never;
      }) as FetchDeps['request'],
    });
    const result = await fetchPartModelTool({ url: 'https://models.example/model.glb', expected_sha256: '0'.repeat(64), source: 'fixture', license: 'MIT' });
    expect(result).toMatchObject({ ok: false, errorCode: 'model.hash-mismatch' });
  });

  it('measures GLB POSITION accessor bounds against the handoff bbox', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-glb-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    // Standard glTF coordinates are meters; a 30 x 20 x 10 mm part is
    // represented as 0.03 x 0.02 x 0.01 in POSITION bounds.
    const bytes = glbWithBox([0.03, 0.02, 0.01]);
    const expectedHash = createHash('sha256').update(bytes).digest('hex');
    setFetchDepsForTest({
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200; res.headers = {}; cb(res); res.end(bytes);
        };
        return req as never;
      }) as FetchDeps['request'],
    });
    const result = await fetchPartModelTool({ url: 'https://models.example/model.glb', expected_sha256: expectedHash, source: 'fixture', license: 'MIT', bbox_mm: [30, 20, 10] });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(result).toMatchObject({ bbox_check: { status: 'within_tolerance', actual_mm: [30, 20, 10] } });
  });

  it('reports standard glTF meter bounds as millimeters and applies tolerance in millimeters', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-glb-meters-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const bytes = glbWithBox([0.03, 0.02, 0.01]);
    const expectedHash = createHash('sha256').update(bytes).digest('hex');
    setFetchDepsForTest({
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200; res.headers = {}; cb(res); res.end(bytes);
        };
        return req as never;
      }) as FetchDeps['request'],
    });
    const result = await fetchPartModelTool({ url: 'https://models.example/model.glb', expected_sha256: expectedHash, source: 'fixture', license: 'MIT', bbox_mm: [30, 20, 10], tolerance_ratio: 0 });
    expect(result).toMatchObject({ ok: true, bbox_check: { status: 'within_tolerance', actual_mm: [30, 20, 10] } });
  });

  it('accumulates GLB bounds from every primitive and child node', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-glb-union-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const bytes = glbWithCombinedBoxes();
    const expectedHash = createHash('sha256').update(bytes).digest('hex');
    setFetchDepsForTest({
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200; res.headers = {}; cb(res); res.end(bytes);
        };
        return req as never;
      }) as FetchDeps['request'],
    });
    const result = await fetchPartModelTool({ url: 'https://models.example/assembly.glb', expected_sha256: expectedHash, source: 'fixture', license: 'MIT', bbox_mm: [200, 20, 10], tolerance_ratio: 0 });
    expect(result).toMatchObject({ ok: true, bbox_check: { status: 'within_tolerance', actual_mm: [200, 20, 10] } });
  });

  it('rejects malformed GLB data instead of reporting an unchecked bbox', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-invalid-glb-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const bytes = Buffer.from('not a GLB file');
    const modelPath = join(cacheDir, 'invalid.glb');
    await writeFile(modelPath, bytes);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const fetchPart = vi.fn(async () => ({
      ok: true as const,
      record: { id: 'invalid-glb', name: 'Invalid GLB', category: 'electronics', family: 'board', tags: [], attributes: {}, sha256, source: 'fixture' as const, license: 'MIT', connectors: [] },
      cachePath: modelPath,
      sha256,
      source: 'local' as const,
    }));
    setFetchPartModelDepsForTest({ fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool });
    const result = await fetchPartModelTool({ catalog_id: 'invalid-glb', bbox_mm: [10, 10, 10] });
    expect(result).toMatchObject({ ok: false, errorCode: 'model.invalid-glb' });
  });

  it('compares measured STEP bounds with a handoff bbox', async () => {
    await initOcct();
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-step-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const stepPath = join(cacheDir, 'fixture.step');
    expect(await exportModelTool({ code: 'return box(30, 20, 10);', output_path: stepPath, format: 'step' })).toMatchObject({ ok: true });
    const bytes = await readFile(stepPath);
    const evaluator = vi.spyOn(importStepModule, 'importStepTool').mockResolvedValue({ ok: false, diagnostics: [], error: 'model evaluator rejected the imported model' });
    setFetchDepsForTest({
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200; res.headers = {}; cb(res); res.end(bytes);
        };
        return req as never;
      }) as FetchDeps['request'],
    });
    const common = { url: 'https://models.example/case.step', expected_sha256: createHash('sha256').update(bytes).digest('hex'), source: 'fixture', license: 'MIT' };
    expect(await fetchPartModelTool({ ...common, bbox_mm: [30, 20, 10] })).toMatchObject({ ok: true, format: 'step', bbox_check: { status: 'within_tolerance' } });
    expect(await fetchPartModelTool({ ...common, bbox_mm: [100, 20, 10], tolerance_ratio: 0.1 })).toMatchObject({ ok: true, bbox_check: { status: 'outside_tolerance' } });
    expect(evaluator).not.toHaveBeenCalled();
  });

  it('resolves catalog ids and MPNs through fetch_part and measures the returned STEP', async () => {
    await initOcct();
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-catalog-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const stepPath = join(cacheDir, 'catalog.step');
    expect(await exportModelTool({ code: 'return box(30, 20, 10);', output_path: stepPath, format: 'step' })).toMatchObject({ ok: true });
    const bytes = await readFile(stepPath);
    const fetchPart = vi.fn(async () => ({
      ok: true as const,
      record: { id: 'esp32-devkitc', name: 'ESP32 DevKitC', category: 'electronics', family: 'board', tags: [], attributes: {}, sha256: createHash('sha256').update(bytes).digest('hex'), source: 'local-catalog' as const, license: 'CC-BY-SA-4.0', connectors: [] },
      cachePath: stepPath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      source: 'local' as const,
    }));
    setFetchPartModelDepsForTest({ fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool });
    const byId = await fetchPartModelTool({ catalog_id: 'esp32-devkitc', ref: 'U1', bbox_mm: [30, 20, 10] });
    expect(byId).toMatchObject({ ok: true, format: 'step', bbox_check: { status: 'within_tolerance' }, attribution: { license: 'CC-BY-SA-4.0' } });
    expect(fetchPart).toHaveBeenCalledWith({ id: 'esp32-devkitc' });
    fetchPart.mockClear();
    await fetchPartModelTool({ mpn: 'ESP32-DevKitC-32E', ref: 'U1' });
    expect(fetchPart).toHaveBeenCalledWith({ query: 'ESP32-DevKitC-32E' });
  });

  it('resolves mesh catalog records through GLB and rejects mesh cache paths as STEP', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-mesh-record-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const bytes = glbWithBox([0.03, 0.02, 0.01]);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const meshRecord = {
      id: 'mesh-board', name: 'Mesh board', category: 'electronics', family: 'board', tags: [],
      attributes: { geometryKind: 'mesh', cachePath: '/cache/mesh-board.step', glbSha256: sha256 }, sha256: 'a'.repeat(64),
      source: 'remote' as const, license: 'MIT', connectors: [],
    };
    const fetchPart = vi.fn(async () => ({ ok: true as const, record: meshRecord, cachePath: '/cache/mesh-board.step', sha256, source: 'remote' as const }));
    const fetchBytes = vi.fn(async () => bytes);
    setFetchPartModelDepsForTest({
      fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool,
      fetchBytes: fetchBytes as unknown as typeof import('./importStepFetch').fetchPublicBytes,
    });
    const missingGlb = await fetchPartModelTool({ catalog_id: 'mesh-board' });
    expect(missingGlb).toMatchObject({ ok: false, errorCode: 'model_not_found' });
    expect(fetchBytes).not.toHaveBeenCalled();

    const meshWithGlb = { ...meshRecord, glbUrl: 'https://models.example/mesh-board.glb' };
    const fetchPartWithGlb = vi.fn(async () => ({ ok: true as const, record: meshWithGlb, cachePath: '/cache/mesh-board.step', sha256, source: 'remote' as const }));
    setFetchPartModelDepsForTest({
      fetchPart: fetchPartWithGlb as unknown as typeof import('./fetchPart').fetchPartTool,
      fetchBytes: fetchBytes as unknown as typeof import('./importStepFetch').fetchPublicBytes,
    });
    const resolvedGlb = await fetchPartModelTool({ catalog_id: 'mesh-board', bbox_mm: [30, 20, 10] });
    expect(resolvedGlb).toMatchObject({ ok: true, format: 'glb', sha256, bbox_check: { status: 'within_tolerance' }, attribution: { url: 'https://models.example/mesh-board.glb' } });
    expect(fetchBytes).toHaveBeenCalledTimes(1);
  });

  it('requires a GLB-specific digest instead of using the catalog STEP digest', async () => {
    const bytes = glbWithBox([0.03, 0.02, 0.01]);
    const glbSha256 = createHash('sha256').update(bytes).digest('hex');
    const stepSha256 = 'a'.repeat(64);
    const meshRecord = {
      id: 'mesh-board', name: 'Mesh board', category: 'electronics', family: 'board', tags: [],
      attributes: { geometryKind: 'mesh' }, sha256: stepSha256,
      source: 'remote' as const, license: 'MIT', connectors: [], glbUrl: 'https://models.example/mesh-board.glb',
    };
    const fetchPart = vi.fn(async () => ({ ok: true as const, record: meshRecord, cachePath: '/cache/board.step', sha256: stepSha256, source: 'remote' as const }));
    const fetchBytes = vi.fn(async () => bytes);
    setFetchDepsForTest({ resolve: async () => [{ address: '93.184.216.34', family: 4 }], request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
      const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
      req.destroy = () => undefined;
      req.end = () => { const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> }; res.statusCode = 200; res.headers = {}; cb(res); res.end(bytes); };
      return req as never;
    }) as FetchDeps['request'] });
    setFetchPartModelDepsForTest({ fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool });

    const missingDigest = await fetchPartModelTool({ catalog_id: 'mesh-board' });
    expect(missingDigest).toMatchObject({ ok: false, errorCode: 'model.catalog-glb-hash-required' });
    expect(missingDigest.error).toContain('catalog sha256 may identify the STEP asset');
    // A missing digest is rejected before network access.

    const explicitDigest = await fetchPartModelTool({ catalog_id: 'mesh-board', expected_sha256: glbSha256 });
    expect(explicitDigest).toMatchObject({ ok: true, format: 'glb', sha256: glbSha256 });
  });

  it('matches bbox dimensions independent of model axis order', async () => {
    await initOcct();
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-axis-order-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const stepPath = join(cacheDir, 'permuted.step');
    expect(await exportModelTool({ code: 'return box(30, 20, 10);', output_path: stepPath, format: 'step' })).toMatchObject({ ok: true });
    const bytes = await readFile(stepPath);
    setFetchPartModelDepsForTest({ fetchBytes: vi.fn(async () => bytes) as unknown as typeof import('./importStepFetch').fetchPublicBytes });
    const result = await fetchPartModelTool({ url: 'https://models.example/permuted.step', expected_sha256: createHash('sha256').update(bytes).digest('hex'), source: 'fixture', license: 'MIT', bbox_mm: [20, 10, 30], tolerance_ratio: 0 });
    expect(result).toMatchObject({ ok: true, bbox_check: { status: 'within_tolerance' } });
  });

  it('resolves catalog GLB assets through find_part when fetch_part has no STEP geometry', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-catalog-glb-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    const bytes = glbWithBox([0.015, 0.012, 0.008]);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const fetchPart = vi.fn(async () => ({ ok: false as const, error: 'GLB-only record', errorCode: 'parts.fetch.geometry-not-brep', errorHint: '' }));
    const findPart = vi.fn(async () => ({
      ok: true as const,
      results: [{ id: 'board-glb', name: 'Board GLB', category: 'electronics', family: 'board', tags: [], attributes: { glbSha256: sha256 }, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'CC-BY-SA-4.0', connectors: [], stepUrl: 'https://models.example/board.step', glbUrl: 'https://models.example/board.glb' }],
      totalMatches: 1,
      source: 'remote' as const,
      remoteEnabled: true,
    }));
    setFetchPartModelDepsForTest({ fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool, findPart: findPart as unknown as typeof import('./findPart').findPartTool });
    setFetchDepsForTest({
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: ((opts: { hostname?: string; path?: string }, cb: (res: unknown) => void) => {
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
        req.destroy = () => undefined;
        req.end = () => {
          const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
          res.statusCode = 200; res.headers = {}; cb(res); res.end(bytes);
        };
        return req as never;
      }) as FetchDeps['request'],
    });
    const result = await fetchPartModelTool({ catalog_id: 'board-glb', ref: 'U2', bbox_mm: [15, 12, 8] });
    expect(result).toMatchObject({ ok: true, format: 'glb', sha256, bbox_check: { status: 'within_tolerance' }, attribution: { license: 'CC-BY-SA-4.0' } });
    expect(findPart).toHaveBeenCalledWith({ query: 'board-glb', limit: 5 });
  });

  it('does not fall through to find_part after a fetch_part allowlist or API error', async () => {
    const fetchPart = vi.fn(async () => ({ ok: false as const, error: 'url_host_not_allowed' as const, host: 'vendor.example' }));
    const findPart = vi.fn(async () => ({
      ok: true as const,
      results: [{ id: 'exact-id', name: 'Exact catalog record', category: 'electronics', family: 'board', tags: [], attributes: {}, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'MIT', connectors: [], stepUrl: 'https://vendor.example/model.step' }],
      totalMatches: 1,
      source: 'remote' as const,
      remoteEnabled: true,
    }));
    setFetchPartModelDepsForTest({ fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool, findPart: findPart as unknown as typeof import('./findPart').findPartTool });
    const result = await fetchPartModelTool({ catalog_id: 'exact-id' });
    expect(result).toMatchObject({ ok: false, errorCode: 'model.lookup-failed' });
    expect(findPart).not.toHaveBeenCalled();

    const apiErrorFetch = vi.fn(async () => ({ ok: false as const, error: 'catalog API unavailable', errorCode: 'parts.fetch.api-error', errorHint: '' }));
    setFetchPartModelDepsForTest({ fetchPart: apiErrorFetch as unknown as typeof import('./fetchPart').fetchPartTool, findPart: findPart as unknown as typeof import('./findPart').findPartTool });
    const apiError = await fetchPartModelTool({ catalog_id: 'exact-id' });
    expect(apiError).toMatchObject({ ok: false, errorCode: 'parts.fetch.api-error' });
    expect(findPart).not.toHaveBeenCalled();
  });

  it('preserves link-out behavior and allows evidenced fetch-only catalog models', async () => {
    const findPart = vi.fn(async () => ({
      ok: true as const,
      results: [{ id: 'exact-id', name: 'Exact catalog record', category: 'electronics', family: 'board', tags: [], attributes: {}, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'vendor terms', connectors: [], glbUrl: 'https://vendor.example/model.glb', redistribution: 'fetch-only' as const }],
      totalMatches: 1,
      source: 'remote' as const,
      remoteEnabled: true,
    }));
    const linkOutFetch = vi.fn(async () => ({ ok: true as const, kind: 'link_out' as const, url: 'https://vendor.example/configurator', instruction: 'Download the model manually.' }));
    setFetchPartModelDepsForTest({ fetchPart: linkOutFetch as unknown as typeof import('./fetchPart').fetchPartTool, findPart: findPart as unknown as typeof import('./findPart').findPartTool });
    const linkOut = await fetchPartModelTool({ catalog_id: 'exact-id' });
    expect(linkOut).toMatchObject({ ok: false, errorCode: 'model.link-out-required' });
    expect(findPart).not.toHaveBeenCalled();

    const noBrepFetch = vi.fn(async () => ({ ok: false as const, error: 'GLB-only record', errorCode: 'parts.fetch.geometry-not-brep', errorHint: '' }));
    setFetchPartModelDepsForTest({ fetchPart: noBrepFetch as unknown as typeof import('./fetchPart').fetchPartTool, findPart: findPart as unknown as typeof import('./findPart').findPartTool });
    const glb = glbWithBox([0.03, 0.02, 0.01]);
    const glbHash = createHash('sha256').update(glb).digest('hex');
    const evidencedFetchOnly = vi.fn(async () => ({
      ok: true as const,
      record: { id: 'exact-id', name: 'Exact catalog record', category: 'electronics', family: 'board', tags: [], attributes: { geometryKind: 'mesh', glbSha256: glbHash }, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'vendor terms', connectors: [], glbUrl: 'https://vendor.example/model.glb', redistribution: 'fetch-only' as const },
      cachePath: '', sha256: 'a'.repeat(64), source: 'remote' as const,
    }));
    const fetchOnlyRecord = vi.fn(async () => ({
      ok: true as const,
      results: [{ id: 'exact-id', name: 'Exact catalog record', category: 'electronics', family: 'board', tags: [], attributes: { glbSha256: glbHash }, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'vendor terms', connectors: [], glbUrl: 'https://vendor.example/model.glb', redistribution: 'fetch-only' as const }],
      totalMatches: 1, source: 'remote' as const, remoteEnabled: true,
    }));
    setFetchPartModelDepsForTest({
      fetchPart: evidencedFetchOnly as unknown as typeof import('./fetchPart').fetchPartTool,
      findPart: fetchOnlyRecord as unknown as typeof import('./findPart').findPartTool,
      fetchBytes: vi.fn(async () => glb) as unknown as typeof import('./importStepFetch').fetchPublicBytes,
    });
    const fetched = await fetchPartModelTool({ catalog_id: 'exact-id', bbox_mm: [30, 20, 10] });
    expect(fetched).toMatchObject({ ok: true, format: 'glb', sha256: glbHash, attribution: { source: 'remote', license: 'vendor terms', url: 'https://vendor.example/model.glb' } });
    expect(evidencedFetchOnly).toHaveBeenCalledTimes(1);

    const stepUrlRecord = vi.fn(async () => ({
      ok: true as const,
      results: [{ id: 'exact-id', name: 'Exact catalog record', category: 'electronics', family: 'board', tags: [], attributes: {}, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'MIT', connectors: [], stepUrl: 'https://vendor.example/model.step' }],
      totalMatches: 1,
      source: 'remote' as const,
      remoteEnabled: true,
    }));
    setFetchPartModelDepsForTest({ fetchPart: noBrepFetch as unknown as typeof import('./fetchPart').fetchPartTool, findPart: stepUrlRecord as unknown as typeof import('./findPart').findPartTool });
    const stepUrl = await fetchPartModelTool({ catalog_id: 'exact-id' });
    expect(stepUrl).toMatchObject({ ok: false, errorCode: 'model_not_found' });
    expect(stepUrlRecord).toHaveBeenCalledTimes(1);
  });

  it('requires provenance and a valid asset digest before fetching a fetch-only catalog model', async () => {
    const fetchPart = vi.fn(async () => ({ ok: false as const, error: 'GLB-only record', errorCode: 'parts.fetch.geometry-not-brep', errorHint: '' }));
    const findPart = vi.fn(async () => ({
      ok: true as const,
      results: [{ id: 'fetch-only-glb', name: 'Restricted GLB', category: 'electronics', family: 'board', tags: [], attributes: {}, sha256: 'a'.repeat(64), source: 'remote' as const, license: 'vendor terms', connectors: [], glbUrl: 'https://vendor.example/model.glb', redistribution: 'fetch-only' as const }],
      totalMatches: 1, source: 'remote' as const, remoteEnabled: true,
    }));
    const fetchBytes = vi.fn();
    setFetchPartModelDepsForTest({ fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool, findPart: findPart as unknown as typeof import('./findPart').findPartTool, fetchBytes: fetchBytes as unknown as typeof import('./importStepFetch').fetchPublicBytes });
    const result = await fetchPartModelTool({ catalog_id: 'fetch-only-glb' });
    expect(result).toMatchObject({ ok: false, errorCode: 'model.catalog-glb-hash-required' });
    expect(fetchBytes).not.toHaveBeenCalled();
  });

  it('uses the Argon LabWired handoff fixture and reports unresolved part models', async () => {
    const handoff = JSON.parse(await readFile(new URL('../../../../tests/fixtures/argon/handoff-drawbot.json', import.meta.url), 'utf8')) as {
      schema: string;
      parts: Array<{ ref: string; catalog_id?: string; mpn?: { value?: string | null }; physical: { bbox_mm?: number[] | null; step_url?: string | null; expected_sha256?: string | null; source?: string | null; license?: string | null } }>;
    };
    expect(handoff.schema).toBe('labwired-kernelcad-handoff/0.1');
    const fetchPart = vi.fn(async () => ({ ok: false as const, error: 'no catalog model found', errorCode: 'parts.not-found', errorHint: '' }));
    const findPart = vi.fn(async () => ({ ok: true as const, results: [], totalMatches: 0, source: 'local' as const, remoteEnabled: false }));
    const fixtureStep = await readFile(new URL('../../../../scripts/parts/authored/components/barrel_jack.step', import.meta.url));
    cacheDir = await mkdtemp(join(tmpdir(), 'fetch-part-model-handoff-'));
    vi.stubEnv('KERNELCAD_CACHE_DIR', cacheDir);
    setFetchPartModelDepsForTest({
      fetchPart: fetchPart as unknown as typeof import('./fetchPart').fetchPartTool,
      findPart: findPart as unknown as typeof import('./findPart').findPartTool,
      fetchBytes: vi.fn(async () => fixtureStep) as unknown as typeof import('./importStepFetch').fetchPublicBytes,
    });
    const results = await Promise.all(handoff.parts.map(part => fetchPartModelTool({
      ref: part.ref,
      ...(part.physical.step_url ? { url: part.physical.step_url } : {}),
      ...(part.physical.expected_sha256 ? { expected_sha256: part.physical.expected_sha256 } : {}),
      ...(part.physical.source ? { source: part.physical.source } : {}),
      ...(part.physical.license ? { license: part.physical.license } : {}),
      ...(part.catalog_id ? { catalog_id: part.catalog_id } : {}),
      ...(part.mpn?.value ? { mpn: part.mpn.value } : {}),
      ...(part.physical.bbox_mm ? { bbox_mm: part.physical.bbox_mm } : {}),
    })));
    expect(fetchPart).toHaveBeenCalledTimes(handoff.parts.length - handoff.parts.filter(part => part.physical.step_url).length);
    expect(findPart).not.toHaveBeenCalled();
    expect(results.filter(result => result.ref !== 'J1').every(result => !result.ok)).toBe(true);
    expect(results.find(result => result.ref === 'J1')).toMatchObject({ ok: true, format: 'step', sha256: 'b7ce6d1a3c3c351ebf2fe143053b8de575da2270a7d3a1b5d08eec4caad5d4df', attribution: { source: expect.stringContaining('KiCad Packages3D'), license: 'CC-BY-SA-4.0' } });
    expect(results.filter(result => result.ref !== 'J1').every(result => result.errorCode === 'parts.not-found')).toBe(true);
    expect(results.map(result => result.ref)).toEqual(handoff.parts.map(part => part.ref));
  });
});
