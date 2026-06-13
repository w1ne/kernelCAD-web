// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { runScript } from './runScript';
import { runInRealm } from './realmRunner';

/**
 * Phase 1 parity gate: the browser realm runner (`runInRealm`, new Function)
 * must produce the SAME captured FeatureRecords as the default node `vm`
 * runner for a real `.kcad.ts` script — including the module-syntax form that
 * broke prod. This is the evidence the engine can move into the worker without
 * behavioural drift. Runs without OCCT (records are captured pre-lowering).
 * See kernelCAD-private docs/plans/2026-06-12-unify-script-engine-in-worker.md.
 */
describe('runScript runner parity (vm vs realm)', () => {
  const scripts = [
    { name: 'module-default', code: 'export default box(10, 20, 30);' },
    { name: 'top-level-return', code: 'const w = 12;\nreturn box(w, w, w);' },
    { name: 'export-const + default', code: 'export const s = 8;\nexport default box(s, s, s);' },
  ];

  for (const { name, code } of scripts) {
    it(`produces identical records for: ${name}`, async () => {
      const viaVm = await runScript({ code, fileName: 'm.kcad.ts' });
      const viaRealm = await runScript({ code, fileName: 'm.kcad.ts', runner: runInRealm });

      // Same number and kind of captured features.
      expect(viaRealm.records.length).toBe(viaVm.records.length);
      expect(viaRealm.records.length).toBeGreaterThan(0);
      expect(viaRealm.records.map(r => r.featureKind)).toEqual(viaVm.records.map(r => r.featureKind));
    });
  }
});
