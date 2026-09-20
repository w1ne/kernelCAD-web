// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/reviewPaint.test.ts
//
// Characterisation of reviewPaintPeekLatestTool before the complexity split:
// pins the scan result shape, the packet fields, base64 inline vs paths-only,
// and the stale / malformed / partial packet fallbacks against a temp home.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { HOME } = vi.hoisted(() => ({ HOME: `${process.env.TMPDIR ?? '/tmp'}/kc-review-paint-peek-${process.pid}` }));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: () => HOME };
});

import { reviewPaintPeekLatestTool } from './reviewPaint';

const ROOT_A = join(HOME, 'projects', 'kernelCAD-web');
const ROOT_B = join(HOME, 'projects', 'kernelCAD-web-worktrees');

const DEFAULT_META = '{"note":"thicker here","tags":["too thick"],"scriptPath":"examples/x.kcad.ts","ts":"2026-09-20T10:00:00.000Z","struckParts":["lens"]}';

let seq = 0;

interface PacketOptions {
  meta?: string | null;
  mask?: boolean;
  screenshot?: boolean;
  mtimeMs?: number;
}

function writePacket(root: string, name: string, opts: PacketOptions = {}): string {
  const dir = join(root, `${name}.review-paint`, `packet-${++seq}`);
  mkdirSync(dir, { recursive: true });
  symlinkSync(dir, join(root, `${name}.review-paint`, 'latest'));
  if (opts.meta !== null) writeFileSync(join(dir, 'meta.json'), opts.meta ?? DEFAULT_META);
  if (opts.mask ?? true) writeFileSync(join(dir, 'mask.png'), 'mask-bytes');
  if (opts.screenshot ?? true) writeFileSync(join(dir, 'screenshot.png'), 'shot-bytes');
  if (opts.mtimeMs !== undefined) utimesSync(dir, new Date(opts.mtimeMs), new Date(opts.mtimeMs));
  return dir;
}

beforeAll(() => {
  mkdirSync(ROOT_A, { recursive: true });
  mkdirSync(ROOT_B, { recursive: true });
});

beforeEach(() => {
  for (const root of [ROOT_A, ROOT_B]) {
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
  }
});

afterAll(() => {
  rmSync(HOME, { recursive: true, force: true });
});

describe('reviewPaintPeekLatestTool characterisation', () => {
  it('returns the empty result when no candidate is found', async () => {
    await expect(reviewPaintPeekLatestTool()).resolves.toEqual({
      ok: true,
      empty: true,
      scanned_roots: [ROOT_A, ROOT_B],
      scanned_candidates: 0,
    });
  });

  it('returns paths and metadata without inlining PNGs when paths_only is set', async () => {
    const dir = writePacket(ROOT_A, 'sample.kcad.ts');
    const extra = join(HOME, 'elsewhere');
    mkdirSync(extra, { recursive: true });
    writePacket(extra, 'other.kcad.ts', { mtimeMs: Math.floor(Date.now() / 1000) * 1000 - 60_000 });

    await expect(reviewPaintPeekLatestTool({ extra_roots: [extra], paths_only: true })).resolves.toEqual({
      ok: true,
      packet: {
        packet_dir: dir,
        screenshot_path: join(dir, 'screenshot.png'),
        mask_path: join(dir, 'mask.png'),
        meta_path: join(dir, 'meta.json'),
        ts: '2026-09-20T10:00:00.000Z',
        note: 'thicker here',
        tags: ['too thick'],
        script_path: 'examples/x.kcad.ts',
        struck_parts: ['lens'],
      },
      scanned_roots: [ROOT_A, ROOT_B, extra],
      scanned_candidates: 2,
    });
  });

  it('inlines the PNGs as base64 by default and tolerates a missing screenshot', async () => {
    const dir = writePacket(ROOT_B, 'sample.kcad.ts', { screenshot: false });

    const r = await reviewPaintPeekLatestTool();
    expect(r).toEqual({
      ok: true,
      packet: {
        packet_dir: dir,
        screenshot_path: join(dir, 'screenshot.png'),
        mask_path: join(dir, 'mask.png'),
        meta_path: join(dir, 'meta.json'),
        ts: '2026-09-20T10:00:00.000Z',
        note: 'thicker here',
        tags: ['too thick'],
        script_path: 'examples/x.kcad.ts',
        struck_parts: ['lens'],
        mask_b64: Buffer.from('mask-bytes').toString('base64'),
      },
      scanned_roots: [ROOT_A, ROOT_B],
      scanned_candidates: 1,
    });
  });

  it('skips packets missing mask.png or meta.json', async () => {
    writePacket(ROOT_A, 'no-mask.kcad.ts', { mask: false });
    writePacket(ROOT_A, 'no-meta.kcad.ts', { meta: null });

    await expect(reviewPaintPeekLatestTool()).resolves.toEqual({
      ok: true,
      empty: true,
      scanned_roots: [ROOT_A, ROOT_B],
      scanned_candidates: 2,
    });
  });

  it('falls back to packet metadata defaults when meta.json is malformed', async () => {
    const mtimeMs = Math.floor(Date.now() / 1000) * 1000 - 60_000;
    const dir = writePacket(ROOT_A, 'broken.kcad.ts', { meta: '{not json', mtimeMs });

    await expect(reviewPaintPeekLatestTool({ paths_only: true })).resolves.toEqual({
      ok: true,
      packet: {
        packet_dir: dir,
        screenshot_path: join(dir, 'screenshot.png'),
        mask_path: join(dir, 'mask.png'),
        meta_path: join(dir, 'meta.json'),
        ts: new Date(mtimeMs).toISOString(),
        note: '',
        tags: [],
        script_path: null,
        struck_parts: [],
      },
      scanned_roots: [ROOT_A, ROOT_B],
      scanned_candidates: 1,
    });
  });

  it('ignores packets older than the freshness window', async () => {
    writePacket(ROOT_A, 'stale.kcad.ts', { mtimeMs: Date.now() - 2 * 60 * 60 * 1000 });

    await expect(reviewPaintPeekLatestTool({ freshness_sec: 60 })).resolves.toEqual({
      ok: true,
      empty: true,
      scanned_roots: [ROOT_A, ROOT_B],
      scanned_candidates: 1,
    });
  });
});
