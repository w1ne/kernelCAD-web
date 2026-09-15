// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, afterEach } from 'vitest';
import { detectSlicer } from '../../../../../src/kernel/export/gcode/slicerCli';

describe('detectSlicer', () => {
  const savedEnv = process.env.KERNELCAD_SLICER;
  const savedPath = process.env.PATH;

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.KERNELCAD_SLICER;
    else process.env.KERNELCAD_SLICER = savedEnv;
    process.env.PATH = savedPath;
  });

  it('returns undefined when no slicer is on PATH and KERNELCAD_SLICER is unset', () => {
    delete process.env.KERNELCAD_SLICER;
    process.env.PATH = '/nonexistent-bin-dir-for-test';
    expect(detectSlicer()).toBeUndefined();
  });

  it('returns undefined when KERNELCAD_SLICER points at a nonexistent binary and PATH has none either', () => {
    process.env.KERNELCAD_SLICER = '/nonexistent-slicer-binary';
    process.env.PATH = '/nonexistent-bin-dir-for-test';
    expect(detectSlicer()).toBeUndefined();
  });
});
