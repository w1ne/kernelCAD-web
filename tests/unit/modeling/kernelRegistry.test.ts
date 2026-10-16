// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  availableKernels,
  buildKernelCapabilities,
  createLowerer,
  KernelUnavailableError,
  resolveKernel,
  __setKernelFactoryForTest,
} from '../../../src/modeling/backends/kernelRegistry';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { HeadlessKernel } from '../../../src/modeling/HeadlessKernel';
import {
  BACKEND_TARGETS,
  DEFAULT_KERNEL,
  KERNEL_IDS,
  isKernelId,
} from '../../../src/shared/types/backendTarget';
import { DIAGNOSTIC_CODES, DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry/index';
import {
  KERNEL_CAPABILITIES_PATH,
  renderKernelCapabilities,
} from '../../../scripts/buildKernelCapabilities';

describe('kernel ids and backend targets', () => {
  it('declares occt (default) and smlib, plus the export-smlib target', () => {
    expect(KERNEL_IDS).toEqual(['occt', 'smlib']);
    expect(DEFAULT_KERNEL).toBe('occt');
    expect(BACKEND_TARGETS).toContain('export-smlib');
    expect(BACKEND_TARGETS[0]).toBe('export-occt');
    expect(isKernelId('smlib')).toBe(true);
    expect(isKernelId('parasolid')).toBe(false);
  });
});

describe('kernel registry', () => {
  it('defaults to occt and returns the OCCT lowerer', () => {
    expect(resolveKernel()).toBe('occt');
    expect(resolveKernel(undefined)).toBe('occt');
    const lowerer = createLowerer();
    expect(lowerer).toBeInstanceOf(OcctLowerer);
    expect(lowerer.target).toBe('export-occt');
    expect(createLowerer('occt')).toBeInstanceOf(OcctLowerer);
  });

  it('pre-wires the session exactly like createOcctLowerer', () => {
    const importedGeometry = new Map();
    const lowerer = createLowerer('occt', { importedGeometry, scriptDir: '/tmp/x' }) as OcctLowerer;
    expect(lowerer.importedGeometry).toBe(importedGeometry);
    expect(lowerer.scriptDir).toBe('/tmp/x');
  });

  it('occt and opt-in smlib are registered', () => {
    expect(availableKernels()).toEqual(['occt', 'smlib']);
  });

  it('a disabled smlib factory fails with a typed unavailable error', () => {
    const restore = __setKernelFactoryForTest('smlib', undefined);
    try {
      let caught: unknown;
      try {
        createLowerer('smlib');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(KernelUnavailableError);
      const err = caught as KernelUnavailableError;
      expect(err.code).toBe('recompute.kernel.unavailable');
      expect(err.requested).toBe('smlib');
      expect(err.diagnostic).toMatchObject({
        code: 'recompute.kernel.unavailable',
        severity: 'error',
        target: 'export-smlib',
        nextAction: { kind: 'fix-arg', field: 'kernel' },
      });
      expect(err.message).toMatch(/Kernel 'smlib' is not available/);
    } finally { restore(); }
  });

  it('rejects unknown kernels with the same error', () => {
    expect(() => resolveKernel('parasolid')).toThrow(KernelUnavailableError);
    expect(() => resolveKernel(42)).toThrow(/Unknown kernel '42'/);
  });

  it('a registered factory makes a kernel selectable (seam for the SMLib backend)', () => {
    const fake = { target: 'export-smlib' as const, supports: new Set<never>(), lower: async () => { throw new Error('x'); } };
    const restore = __setKernelFactoryForTest('smlib', () => fake);
    try {
      expect(resolveKernel('smlib')).toBe('smlib');
      expect(createLowerer('smlib')).toBe(fake);
      // HeadlessKernel runs raw replicad scripts: OCCT only, even when smlib is registered.
      expect(() => new HeadlessKernel({ kernel: 'smlib' })).toThrow(KernelUnavailableError);
    } finally {
      restore();
    }
    expect(availableKernels()).toEqual(['occt', 'smlib']);
  });

  it('registers the diagnostic code', () => {
    expect(DIAGNOSTIC_CODES).toContain('recompute.kernel.unavailable');
    expect(DIAGNOSTIC_REGISTRY['recompute.kernel.unavailable'].group).toBe('recompute');
  });
});

describe('HeadlessKernel kernel option', () => {
  it('defaults to occt', () => {
    expect(new HeadlessKernel().kernel).toBe('occt');
    expect(new HeadlessKernel({ kernel: 'occt' }).kernel).toBe('occt');
  });
  it('throws KernelUnavailableError for smlib', () => {
    expect(() => new HeadlessKernel({ kernel: 'smlib' })).toThrow(KernelUnavailableError);
  });
});

describe('kernel capabilities list', () => {
  it('SMLib capabilities list only kinds with native attempts', () => {
    const caps = buildKernelCapabilities();
    expect(caps.defaultKernel).toBe('occt');
    expect(caps.kernels.occt.available).toBe(true);
    expect(caps.kernels.occt.features).toEqual([...new OcctLowerer().supports].sort());
    expect(caps.kernels.occt.features.length).toBeGreaterThan(10);
    expect(caps.kernels.smlib).toEqual({
      available: true,
      target: 'export-smlib',
      features: ['boolean', 'box', 'cylinder', 'extrude', 'fillet', 'importedStep', 'sphere'],
    });
  });

  it('the checked-in generated file is up to date (run `npm run kernel:capabilities`)', () => {
    expect(readFileSync(KERNEL_CAPABILITIES_PATH, 'utf8')).toBe(renderKernelCapabilities());
  });
});
