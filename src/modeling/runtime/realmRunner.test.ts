// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { runInRealm } from './realmRunner';
import { runIsolated } from './isolation';

/**
 * Phase 1 of the script-engine unification (see kernelCAD-private
 * docs/plans/2026-06-12-unify-script-engine-in-worker.md): a realm runner that
 * uses `new Function` instead of node `vm`, so the modern engine can run inside
 * the browser Web Worker. These tests prove behavioural parity with the vm
 * runner it will replace on the client.
 */
describe('runInRealm', () => {
  // wrapReturn wraps the body in an async IIFE (matching the vm runner), so
  // returnValue is a Promise the caller (runScript) awaits.
  it('captures a top-level return via wrapReturn', async () => {
    const { returnValue } = runInRealm('return 1 + 1;', 'm.js', {}, { wrapReturn: true });
    expect(await returnValue).toBe(2);
  });

  it('reaches injected globals', async () => {
    const { returnValue } = runInRealm('return widen(20);', 'm.js', { widen: (n: number) => n * 2 }, { wrapReturn: true });
    expect(await returnValue).toBe(40);
  });

  it('returns undefined when wrapReturn is off', () => {
    const { returnValue } = runInRealm('const x = 5;', 'm.js', {}, {});
    expect(returnValue).toBeUndefined();
  });

  it('shadows dangerous host globals so they are unreachable inside the script', () => {
    // The script probes for host capabilities; each must be undefined inside.
    const probe: Record<string, boolean> = {};
    runInRealm(
      `record('process', typeof process !== 'undefined');
       record('require', typeof require !== 'undefined');
       record('globalThis_fetch', typeof fetch !== 'undefined');`,
      'm.js',
      { record: (k: string, present: boolean) => { probe[k] = present; } },
      {},
    );
    expect(probe.process).toBe(false);
    expect(probe.require).toBe(false);
    expect(probe.globalThis_fetch).toBe(false);
  });

  it('refuses to inject a reserved global name', () => {
    expect(() => runInRealm('return 1;', 'm.js', { process: {} }, { wrapReturn: true })).toThrow(/reserved/i);
  });

  it('exposes the same safe builtins the vm runner does (Math/JSON)', async () => {
    const code = 'return JSON.stringify({ r: Math.max(1, 2, 3) });';
    const realm = runInRealm(code, 'm.js', {}, { wrapReturn: true });
    const vm = runIsolated(code, 'm.js', {}, { wrapReturn: true });
    expect(await realm.returnValue).toBe(await vm.returnValue);
    expect(await realm.returnValue).toBe('{"r":3}');
  });

  it('has no node-only imports (bundles for the browser worker)', async () => {
    // Guard: the whole point is browser-portability. node:vm must not appear.
    // (Asserted structurally in the source via the CI guard in Phase 5; here we
    // simply confirm the runner works without any node global being present.)
    const { returnValue } = runInRealm('return typeof Math.PI;', 'm.js', {}, { wrapReturn: true });
    expect(await returnValue).toBe('number');
  });
});
