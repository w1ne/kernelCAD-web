// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// verify({ check: 'load-capacity', mode: 'fea' }) answers "will it hold?"
// from the script's solid FEA study in the same shape as the beam mode:
// ok / safetyFactor / elements[] in Pa / failures[]. Skipped with a clear
// message when the external toolchain is absent.

import { describe, it, expect, beforeAll } from 'vitest';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';
import { detectFeaToolchain, requireFeaToolchainIfDemanded, type FeaToolchain } from '../../../src/kernel/fea/toolchain';

// 60 x 12 x 3 mm PLA tab, fixed at one end, 250 N on the free end: far past
// PLA's 50 MPa yield.
const TAB = (force: number) => `
const tab = box(60, 12, 3);
tab.feaStudy({
  name: 'tab',
  material: 'pla',
  fixed: { atX: 0 },
  loads: [{ faces: { atX: 60 }, force: [0, 0, -${force}] }],
  meshSize: 2,
});
return tab;
`;

type Out = {
  ok: boolean; method: string; safetyFactor: number; threshold: number;
  elements: Array<{ partName: string; stressPa: number; yieldPa: number; safetyFactor: number }>;
  failures: Array<{ element: string; elementKind: string; reason: string }>;
  fea: { peakStressPa: number; maxDisplacementMm: number; meshTrusted: boolean };
  diagnostics: Array<{ code: string; severity: string }>;
};

let toolchain: FeaToolchain;
beforeAll(async () => {
  toolchain = await detectFeaToolchain();
});

function skipped(): boolean {
  if (toolchain.ok) return false;
  requireFeaToolchainIfDemanded(toolchain);
  console.warn(`[skipped] load-capacity FEA test needs ${toolchain.missing.join(' and ')}. ${toolchain.hint}`);
  return true;
}

describe("verify({ check: 'load-capacity', mode: 'fea' })", () => {
  it('fails an overloaded part with the beam-mode result shape', async () => {
    if (skipped()) return;
    const r = (await verifyTool({ check: 'load-capacity', mode: 'fea', code: TAB(250) })) as Out;
    expect(r.method).toBe('fea');
    expect(r.ok).toBe(false);
    expect(r.threshold).toBe(1.5);
    expect(r.safetyFactor).toBeLessThan(1);
    expect(r.elements.length).toBeGreaterThan(0);
    const worst = r.elements[0]!;
    expect(worst.partName).toMatch(/^@kc\[/);
    expect(worst.yieldPa).toBe(50e6);
    expect(worst.stressPa).toBeGreaterThan(worst.yieldPa);
    expect(r.failures[0]).toMatchObject({ elementKind: 'region', reason: 'stress-exceeds-yield' });
    expect(r.diagnostics.some(d => d.code === 'fea.safety-factor.below-min' && d.severity === 'error')).toBe(true);
    expect(r.fea.peakStressPa).toBeGreaterThan(50e6);
  }, 600_000);

  it('passes a lightly loaded part and honours an explicit threshold', async () => {
    if (skipped()) return;
    const r = (await verifyTool({ check: 'load-capacity', mode: 'fea', code: TAB(5), safety_factor_threshold: 2 })) as Out;
    expect(r.threshold).toBe(2);
    expect(r.safetyFactor).toBeGreaterThan(2);
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  }, 600_000);
});
