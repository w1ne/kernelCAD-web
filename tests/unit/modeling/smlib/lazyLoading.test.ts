// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, it, vi } from 'vitest';
import { buildKernelCapabilities, createLowerer } from '../../../../src/modeling/backends/kernelRegistry';

vi.mock('@classcad/smlibwasm', () => { throw new Error('Eager WASM import'); });

it('default/opt-in factory creation and capability discovery never load SMLib WASM', () => {
  expect(createLowerer().target).toBe('export-occt');
  expect(createLowerer('smlib').target).toBe('export-smlib');
  expect(buildKernelCapabilities().kernels.smlib.available).toBe(true);
});
