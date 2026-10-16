// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// verify assembly on the shipped robot-arm examples. Neither declares a
// physicalUseCase stable root and their base is 'base-plate' (not a fallback
// root name): the reachability walk must ground the part the mate solver
// grounds (the first part) instead of calling every link "floating".
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';

interface AssemblyVerdict {
  readonly ok: boolean;
  readonly blocking?: ReadonlyArray<{ code: string; message?: string; hint?: string }>;
  readonly error?: string;
}

async function verifyAssembly(code: string): Promise<AssemblyVerdict> {
  clearActiveMcpSession();
  return await verifyTool({ check: 'assembly', code }) as AssemblyVerdict;
}

const ROOT = resolve(__dirname, '../../..');

describe('robot-arm examples: verify assembly', () => {
  for (const example of ['compact-supported-arm', 'desktop-3axis-mates']) {
    it(`${example} passes verify assembly`, async () => {
      const code = readFileSync(resolve(ROOT, `examples/robot-arm/${example}.kcad.ts`), 'utf8');
      const verdict = await verifyAssembly(code);
      expect(verdict.blocking ?? [], JSON.stringify(verdict.blocking)).toEqual([]);
      expect(verdict.ok).toBe(true);
    }, 180_000);
  }

  it('an arm whose moving links never reach the first part still fails as floating', async () => {
    const code = `
const arm = assembly('split-arm');
const z = [0, 0, 1] as [number, number, number];
const at = (x: number, zz: number) => ({ kind: 'vec3' as const, value: [x, 0, zz] as [number, number, number] });
const base = arm.part('base-plate', box(40, 40, 20, true).translate(0, 0, 10));
const link1 = arm.part('upper-link', box(96, 16, 8).translate(-8, -8, 20));
// A second chain far from the base: hub + link joined to each other only.
const hub = arm.part('wrist-hub', box(20, 20, 10).translate(200, -10, 0));
const link2 = arm.part('wrist-link', box(60, 16, 8).translate(210, -8, 10));
base.connector('shoulder', { type: 'axis', origin: at(0, 20), axis: z });
link1.connector('shoulder', { type: 'axis', origin: at(0, 20), axis: z });
hub.connector('wrist', { type: 'axis', origin: at(210, 10), axis: z });
link2.connector('wrist', { type: 'axis', origin: at(210, 10), axis: z });
arm.mate('shoulder', 'base-plate.shoulder', 'upper-link.shoulder', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('wrist', 'wrist-hub.wrist', 'wrist-link.wrist', 'revolute', { limitsDeg: [-90, 90] });
return arm.solvedModel({});
`;
    const verdict = await verifyAssembly(code);
    expect(verdict.ok).toBe(false);
    const floating = (verdict.blocking ?? []).filter((b) => b.code === 'assembly.connectivity.floating-moving-part');
    expect(floating.map((b) => b.message).join('\n')).toContain('wrist-link');
    expect(floating.map((b) => b.message).join('\n')).not.toContain('upper-link');
  }, 120_000);
});
