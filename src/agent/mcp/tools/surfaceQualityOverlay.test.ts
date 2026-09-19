// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/surfaceQualityOverlay.test.ts
//
// Characterisation test for `buildSurfaceQualityOverlay`: pins the generated
// overlay script bytes and every band STL (sha256 + size) for zebra /
// curvature / continuity on representative shapes, plus the load-failure
// envelope. Added before the function's phase split so the split can be
// verified as behaviour-preserving.

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { buildSurfaceQualityOverlay, type SurfaceQualityOverlay } from './surfaceQualityOverlay';

const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');

interface ExpectedFile {
  size: number;
  sha: string;
}

interface Expected {
  scriptSha: string;
  files: Record<string, ExpectedFile>;
}

const CASES: Array<{ name: string; overlay: SurfaceQualityOverlay; code: string; expected: Expected }> = [
  {
    name: 'zebra on a box',
    overlay: 'zebra',
    code: 'return box(20, 20, 20);',
    expected: {
      scriptSha: '824375e07ff432f4459f8288cb0b166e63d904f1681bd2cf074eb7a05556e4e3',
      files: {
        'overlay.kcad.ts': { size: 411, sha: '824375e07ff432f4459f8288cb0b166e63d904f1681bd2cf074eb7a05556e4e3' },
        'zebra-2.stl': { size: 284, sha: '8b029cfcb5ed5eb771b4061f56e889878a239c2d2de5e10b4433201e4ad4dc13' },
        'zebra-4.stl': { size: 284, sha: '3dfe4bf26332aba90b95a7c3b7ba24316c102a5dac48a9852c820654bf3cadfb' },
        'zebra-5.stl': { size: 284, sha: 'f3bfc8a1f6a43625a8ef0a4116cd51192f85dd4810f4553076e915c93dcee82d' },
      },
    },
  },
  {
    name: 'zebra on a sphere',
    overlay: 'zebra',
    code: 'return sphere(10);',
    expected: {
      scriptSha: 'dc226a580bd84ba9b9fb8f75d2772b8585b4cdc9945e18ddc0c8051e3ca5b6fd',
      files: {
        'overlay.kcad.ts': { size: 896, sha: 'dc226a580bd84ba9b9fb8f75d2772b8585b4cdc9945e18ddc0c8051e3ca5b6fd' },
        'zebra-0.stl': { size: 11484, sha: 'b7c991473f33c2e7a3ce84ebb103a84a4373d2d64a74f2397c17a66fc431095f' },
        'zebra-1.stl': { size: 4184, sha: 'bb6c1735b9fbe68d78728b43bf458087aa954a5fc47d05dde4e4d38548a1f0aa' },
        'zebra-2.stl': { size: 5334, sha: '0487d048c3cd0567815d39875d938b2220139eac84460e9b0a04d4399f884cb5' },
        'zebra-3.stl': { size: 3184, sha: 'ec33e74fd91d9088b073a7e721e76771d0903accb09008a41655aba6380b30a8' },
        'zebra-4.stl': { size: 4834, sha: '566f4ee0546820c1fb7e4700d761f5c8d2737256d224b8302a8a555b042a8131' },
        'zebra-5.stl': { size: 5284, sha: '8d63140ac201a58fef0b6f7ca3e20f97258ac7d5df33bf92acf7705219110019' },
        'zebra-6.stl': { size: 3834, sha: '911ef4677d1b68418130416b9e5ca1d38f8080a07fa954ca7e86cdd98749c6ad' },
        'zebra-7.stl': { size: 11934, sha: '1af92fd3d3dd7238e84862478fea1959e10161881daab138cc0c732ca24c337b' },
      },
    },
  },
  {
    name: 'curvature on a sphere',
    overlay: 'curvature',
    code: 'return sphere(10);',
    expected: {
      scriptSha: 'e3a706667eeede0f827fd535e17586bacae0c2340c75934432c1c5ae93d3736b',
      files: {
        'overlay.kcad.ts': { size: 215, sha: 'e3a706667eeede0f827fd535e17586bacae0c2340c75934432c1c5ae93d3736b' },
        'curv-7.stl': { size: 49484, sha: 'ff2c29752a7c967f80ec7f4af7fd97c60f8264051b7ffc2465a9fdcabd0bf2f3' },
      },
    },
  },
  {
    name: 'continuity on a filleted box',
    overlay: 'continuity',
    code: 'return box(20, 20, 20).fillet(3);',
    expected: {
      scriptSha: 'c23b01676f767ef2ef4461ff881ab2544e6331e6191e81d8519822fb8a7c6440',
      files: {
        'overlay.kcad.ts': { size: 300, sha: 'c23b01676f767ef2ef4461ff881ab2544e6331e6191e81d8519822fb8a7c6440' },
        'g1.stl': { size: 153684, sha: 'c4ac52dac856a0567a268022b94845d5995111626571b5a66b5412212583d90f' },
        'ghost.stl': { size: 69084, sha: '708011b4c72ed58d3a41141e846cfb23a34e87bf848492c7beaed2cc1b7ec96d' },
      },
    },
  },
];

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('buildSurfaceQualityOverlay — characterisation', () => {
  for (const c of CASES) {
    it(`pins the overlay bytes for ${c.name}`, async () => {
      const outDir = await mkdtemp(join(tmpdir(), 'sqo-char-'));
      const r = await buildSurfaceQualityOverlay({ code: c.code, overlay: c.overlay, outDir });
      expect(r.ok, r.ok ? '' : r.error).toBe(true);
      if (!r.ok) return;

      const script = await readFile(r.scriptPath, 'utf8');
      expect(sha256(script)).toBe(c.expected.scriptSha);

      const overlayDir = join(outDir, 'overlay');
      const names = (await readdir(overlayDir)).sort();
      expect(names).toEqual(Object.keys(c.expected.files).sort());
      for (const name of names) {
        const bytes = await readFile(join(overlayDir, name));
        expect(bytes.length, name).toBe(c.expected.files[name].size);
        expect(sha256(bytes), name).toBe(c.expected.files[name].sha);
      }
    }, 120_000);
  }

  it('propagates a script load failure in the result envelope', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sqo-char-'));
    const r = await buildSurfaceQualityOverlay({ code: 'return nope();', overlay: 'zebra', outDir });
    expect(r).toEqual({ ok: false, error: 'ReferenceError: nope is not defined', errorCode: 'cli.script-exception' });
  }, 60_000);
});
