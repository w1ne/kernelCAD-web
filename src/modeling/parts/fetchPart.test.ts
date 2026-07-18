// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { fetchPartHost } from './fetchPart';

describe('fetchPart orchestrator', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    // step.parts is the zero-config default; disable it so the bundled-resolution
    // tests stay offline (remote fetch is covered with mocked fetch elsewhere).
    process.env.KERNELCAD_PARTS_BASE_URL = 'off';
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
  });

  it('resolves a bundled id to a Shape (no network)', async () => {
    const session = new CaptureSession();
    const r = await fetchPartHost({ session }, 'iso-4762-m3x12', {});
    expect(r.shape).toBeDefined();
    expect(r.record.id).toBe('iso-4762-m3x12');
    expect(r.record.source).toBe('local-catalog');
  });

  it('returns parts.fetch.remote-disabled when id is unknown and the tier is disabled (off)', async () => {
    const session = new CaptureSession();
    try {
      await fetchPartHost({ session }, 'made-up-id-not-in-bundle', {});
      throw new Error('expected fetchPartHost to throw');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('parts.fetch.remote-disabled');
    }
  });
});

// ---------------------------------------------------------------------------
// GLB-only catalog records (authored `*-board` entries).
//
// scripts/buildBoardGlbs.ts deliberately swaps these boards from STEP to GLB —
// their STEP is 4–27 MB and nucleo-h563zi-board's exceeds Cloudflare Pages'
// 25 MiB per-file limit. The record therefore carries `glbUrl` and NO
// `stepUrl`. fetchPart used to report a bare `parts.fetch.api-error: Remote
// record X has no stepUrl`, which reads like a broken catalog. It must instead
// say the part is GLB-only and name a route that works.
//
// The fixture below is the verbatim live response for nucleo-h563zi-board
// (fetched July 2026), so no network is touched here.
// ---------------------------------------------------------------------------
const GLB_ONLY_RESPONSE = {
  id: 'nucleo-h563zi-board',
  name: 'ST Nucleo-144 H563ZI',
  category: 'Electronics',
  family: 'STM32',
  tags: ['nucleo', 'stm32', 'h563', 'dev-board'],
  attributes: { bboxXmm: 147, bboxYmm: 70, bboxZmm: 1.6 },
  sha256: '29b087a46fc778ebd727c6de57ba053638eae9dfecb1c14180e43ee45322842e',
  license: 'CC-BY-SA-4.0',
  glbUrl: 'https://kernelcad-parts.pages.dev/glb/nucleo-h563zi-board.glb',
};

describe('fetchPart — GLB-only authored board records', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
    process.env.KERNELCAD_PARTS_BASE_URL = 'https://parts.example';
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
    vi.restoreAllMocks();
  });

  function mockCatalog(body: unknown): void {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
  }

  it('fails with parts.fetch.geometry-not-brep, naming glbUrl and a working route', async () => {
    mockCatalog(GLB_ONLY_RESPONSE);
    const session = new CaptureSession();
    try {
      await fetchPartHost({ session }, 'nucleo-h563zi-board', {});
      throw new Error('expected fetchPartHost to throw');
    } catch (e) {
      const err = e as { code?: string; message?: string; hint?: string };
      expect(err.code).toBe('parts.fetch.geometry-not-brep');
      // The message must name the field and the actual GLB url, not just
      // "has no stepUrl".
      expect(err.message).toContain('glbUrl');
      expect(err.message).toContain(GLB_ONLY_RESPONSE.glbUrl);
      expect(err.message).not.toMatch(/^Remote record .* has no stepUrl\.$/);
      // …and the hint must point at a route that exists.
      expect(err.hint).toContain('lib.fromSTEP');
      expect(err.hint).toContain('.kcad.ts');
    }
  });

  it('still reports the generic api-error when a record has neither stepUrl nor glbUrl', async () => {
    const { glbUrl: _drop, ...noGeometry } = GLB_ONLY_RESPONSE;
    mockCatalog(noGeometry);
    const session = new CaptureSession();
    try {
      await fetchPartHost({ session }, 'nucleo-h563zi-board', {});
      throw new Error('expected fetchPartHost to throw');
    } catch (e) {
      const err = e as { code?: string; message?: string };
      expect(err.code).toBe('parts.fetch.api-error');
      expect(err.message).toContain('has no stepUrl');
    }
  });
});
