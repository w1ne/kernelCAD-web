// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { __setHostFsForTest, type HostFs } from '../../shared/runtime/hostFs';
import { importIdentity } from './importIdentity';

describe('warm import identity', () => {
  it('includes bytes read by lib.from3MF', async () => {
    let content = 1;
    const hostFs: HostFs = {
      fileExists: () => true,
      imageDimensions: () => ({ width: 0, height: 0 }),
      resolveScriptRelative: (_scriptDir, path) => `/workspace/${path}`,
      readFileBytes: () => new Uint8Array([content]),
    };
    const previous = __setHostFsForTest(hostFs);
    try {
      const code = "return await lib.from3MF('mesh.3mf');";
      const before = await importIdentity(code, '/workspace');
      content = 2;
      const after = await importIdentity(code, '/workspace');
      expect(before).not.toBe(after);
    } finally {
      __setHostFsForTest(previous);
    }
  });
});
