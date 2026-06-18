// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/fetchPartUrl.test.ts
//
// FETCH-BY-URL mode: allowlist + vendor-configurator classification (pure),
// and the host fetch path with an injected fetchImpl so no network / OCCT is
// touched. The geometry modules (fromStepBytes / inspectStepFile /
// synthesizeConnectorsFromReport) are mocked so the STEP path stays
// deterministic without an OCCT init — mirroring how the catalog STEP flow is
// kept offline elsewhere.

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// --- Mock the geometry dependencies of fetchPart's URL STEP path. ----------
// fromStepBytes registers a real Shape on the passed session so connector
// attachment + the { shape, record } contract work without importing STEP.
vi.mock('./fromSTEP', () => ({
  fromStepBytes: vi.fn(
    async (
      ctx: { session: { createShape: (s: unknown) => { id: string } } },
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
  inspectStepFile: vi.fn(async (path: string) => ({
    file: path,
    solidCount: 1,
    solids: [],
  })),
}));

vi.mock('./synthesizeConnectors', () => ({
  synthesizeConnectorsFromReport: vi.fn(
    (_report: unknown, partName: string) => [
      {
        name: 'mating-face',
        ref: `${partName}#connector:mating-face`,
        origin: [0, 0, 0],
        axis: [0, 0, -1],
        type: 'frame' as const,
      },
    ],
  ),
}));

import {
  isAllowedPartUrl,
  classifyPartUrl,
  fetchPartFromUrlHost,
} from './fetchPart';
import { __resetUserCacheForTests } from '../../shared/cache/userCache';
import { CaptureSession } from '../capture/captureSession';

const STEP_FIXTURE = Buffer.from(
  "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n",
  'utf8',
);
const MESH_FIXTURE = Buffer.from('solid x\nendsolid x\n', 'utf8');

function fetchOf(bytes: Buffer, ok = true, status = 200): typeof fetch {
  return vi.fn(async () => ({
    ok,
    status,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  })) as unknown as typeof fetch;
}

describe('isAllowedPartUrl', () => {
  it('accepts the trusted host allowlist', () => {
    expect(
      isAllowedPartUrl('https://raw.githubusercontent.com/o/r/main/p.step'),
    ).toBe(true);
    expect(
      isAllowedPartUrl('https://objects.githubusercontent.com/x/p.step'),
    ).toBe(true);
    expect(
      isAllowedPartUrl('https://github.com/o/r/releases/download/v1/p.step'),
    ).toBe(true);
    expect(isAllowedPartUrl('https://gitlab.com/o/r/-/raw/main/p.step')).toBe(
      true,
    );
    expect(isAllowedPartUrl('https://api.step.parts/v1/p.step')).toBe(true);
  });

  it('rejects unknown / untrusted hosts and garbage', () => {
    expect(isAllowedPartUrl('https://evil.example.com/p.step')).toBe(false);
    expect(isAllowedPartUrl('https://igus.partcommunity.com/p.step')).toBe(
      false,
    );
    // host-suffix spoofing must not pass.
    expect(
      isAllowedPartUrl('https://raw.githubusercontent.com.evil.com/p.step'),
    ).toBe(false);
    expect(isAllowedPartUrl('not a url')).toBe(false);
  });
});

describe('classifyPartUrl', () => {
  it("returns 'link_out' for vendor configurators", () => {
    expect(classifyPartUrl('https://igus.partcommunity.com/x')).toBe(
      'link_out',
    );
    expect(classifyPartUrl('https://us.misumi-ec.com/x')).toBe('link_out');
    expect(classifyPartUrl('https://www.pololu.com/product/1/cad')).toBe(
      'link_out',
    );
    expect(classifyPartUrl('https://www.traceparts.com/x')).toBe('link_out');
  });

  it("returns 'fetch' for an allowed-host STEP url", () => {
    expect(
      classifyPartUrl('https://raw.githubusercontent.com/o/r/main/p.step'),
    ).toBe('fetch');
  });

  it("returns 'blocked' for disallowed hosts", () => {
    expect(classifyPartUrl('https://evil.example.com/p.step')).toBe('blocked');
    expect(classifyPartUrl('garbage')).toBe('blocked');
  });
});

describe('fetchPartFromUrlHost', () => {
  let cacheDir: string;
  let prevCacheDir: string | undefined;

  beforeEach(() => {
    prevCacheDir = process.env.KERNELCAD_CACHE_DIR;
    cacheDir = mkdtempSync(join(tmpdir(), 'kc-parts-url-'));
    process.env.KERNELCAD_CACHE_DIR = cacheDir;
    __resetUserCacheForTests();
  });
  afterEach(() => {
    if (prevCacheDir === undefined) delete process.env.KERNELCAD_CACHE_DIR;
    else process.env.KERNELCAD_CACHE_DIR = prevCacheDir;
    rmSync(cacheDir, { recursive: true, force: true });
    __resetUserCacheForTests();
  });

  it('STEP url on an allowed host → fetch-only PartRecord with stepUrl + connectors', async () => {
    const session = new CaptureSession();
    const url = 'https://raw.githubusercontent.com/o/r/main/bracket.step';
    const outcome = await fetchPartFromUrlHost({ session }, url, {
      fetchImpl: fetchOf(STEP_FIXTURE),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok || outcome.kind !== 'part') throw new Error('expected part');
    const { record, shape } = outcome.result;
    expect(shape).toBeDefined();
    expect(record.redistribution).toBe('fetch-only');
    expect(record.source).toBe('remote');
    expect(record.stepUrl).toBe(url);
    expect(record.connectors).toContain('mating-face');
    expect(record.sha256.length).toBeGreaterThan(0);
    expect(record.license).toBe('unknown');
  });

  it('mesh url → mesh-flagged fetch-only record (non-BREP)', async () => {
    const session = new CaptureSession();
    const url = 'https://raw.githubusercontent.com/o/r/main/gizmo.stl';
    const outcome = await fetchPartFromUrlHost({ session }, url, {
      fetchImpl: fetchOf(MESH_FIXTURE),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok || outcome.kind !== 'part') throw new Error('expected part');
    const { record } = outcome.result;
    expect(record.redistribution).toBe('fetch-only');
    expect(record.attributes.geometryKind).toBe('mesh');
    expect(record.tags).toContain('mesh-import');
    expect(record.stepUrl).toBe(url);
  });

  it('disallowed host → url_host_not_allowed structured error', async () => {
    const session = new CaptureSession();
    const outcome = await fetchPartFromUrlHost(
      { session },
      'https://evil.example.com/p.step',
      { fetchImpl: fetchOf(STEP_FIXTURE) },
    );
    expect(outcome).toEqual({
      ok: false,
      error: 'url_host_not_allowed',
      host: 'evil.example.com',
    });
  });

  it('vendor configurator host → link_out (never fetched)', async () => {
    const session = new CaptureSession();
    const fetchImpl = fetchOf(STEP_FIXTURE);
    const outcome = await fetchPartFromUrlHost(
      { session },
      'https://igus.partcommunity.com/portal/x',
      { fetchImpl },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok || outcome.kind !== 'link_out')
      throw new Error('expected link_out');
    expect(outcome.url).toContain('partcommunity.com');
    expect(outcome.instruction).toMatch(/fetch_part\(\{ file \}\)/);
    // The configurator must never be fetched.
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
