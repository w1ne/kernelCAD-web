// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/embedExclusion.test.ts
//
// The embed/studio-lib build must not ship the ~11 MB kernel worker chunk.
// `vite.studio.config.ts` strips the `new Worker(new URL('./studioKernelWorker.ts',
// import.meta.url), { type: 'module' })` spawn before Vite's worker scanner
// sees it — the same treatment the legacy in-browser geometry worker gets.
// These tests run the real plugin transform against the real source files so
// a moved/renamed spawn fails here loudly instead of silently re-bundling
// the worker.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stripEmbedWorkers } from '../../../vite.studio.config';

const kernelSingletonId = fileURLToPath(new URL('./kernelSingleton.ts', import.meta.url));
const kernelSingletonSource = readFileSync(kernelSingletonId, 'utf-8');
const geometryEngineId = fileURLToPath(new URL('../../shared/worker/geometryEngine.ts', import.meta.url));

function runTransform(
  code: string,
  id: string,
): { code: string | null; warnings: string[] } {
  const warnings: string[] = [];
  const plugin = stripEmbedWorkers() as unknown as {
    transform: (
      this: { warn: (message: string) => void },
      code: string,
      id: string,
    ) => string | null;
  };
  const transformed = plugin.transform.call(
    { warn: (message) => warnings.push(message) },
    code,
    id,
  );
  return { code: transformed, warnings };
}

describe('embed build worker exclusion', () => {
  it('replaces the kernel worker spawn with a throwing stub', () => {
    const { code, warnings } = runTransform(kernelSingletonSource, kernelSingletonId);

    expect(warnings).toEqual([]);
    expect(code).not.toBeNull();
    expect(code).not.toBe(kernelSingletonSource);
    expect(code).toContain("throw new Error('browser kernel is not available in the embed build');");
    // The spawn disappears — only prose mentions in comments remain. What
    // matters is that the quoted specifier and the URL resolution Vite's
    // worker scanner follows are gone from the code.
    expect(code).not.toContain("'./studioKernelWorker.ts'");
    expect(code).not.toContain('import.meta.url');
    // The stub is `never`-typed, so the `Worker` return contract survives.
    expect(code).toContain('function spawnKernelWorker(): Worker');
  });

  it('leaves the kernel source untouched when it is not the target module', () => {
    const { code, warnings } = runTransform(kernelSingletonSource, '/somewhere/else/kernelSingleton.ts');

    expect(code).toBeNull();
    expect(warnings).toEqual([]);
  });

  it('leaves an unrelated module with a kernel-like spawn untouched', () => {
    const source =
      "const worker = new Worker(new URL('./studioKernelWorker.ts', import.meta.url), { type: 'module' });\n";
    const { code } = runTransform(source, '/app/src/other/thing.ts');

    expect(code).toBeNull();
  });

  it('warns when the kernel spawn pattern has moved', () => {
    const moved = kernelSingletonSource.replace(
      "return new Worker(new URL('./studioKernelWorker.ts', import.meta.url), { type: 'module' });",
      '',
    );
    const { code, warnings } = runTransform(moved, kernelSingletonId);

    expect(code).toBe(moved);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('kernel worker');
  });

  it('still strips the legacy geometry worker', () => {
    const source = readFileSync(geometryEngineId, 'utf-8');
    const { code, warnings } = runTransform(source, geometryEngineId);

    expect(warnings).toEqual([]);
    expect(code).not.toBeNull();
    expect(code).not.toBe(source);
    expect(code).toContain('route geometry through StudioConfig.backendUrl');
  });
});
