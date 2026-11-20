// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/kinematic/tendon-finger.kcad.ts is the worked example the
// assemblies skill names for tendon routing, so it must pass evaluate_script
// with `ok: true` and `mechanism: 'real'`. It failed with 5 errors. Each
// phalanx was as wide as the fork that held it, so at the flexed limit it ran
// into the 0.1 mm of carrier material that `joint.clevis` leaves on each fork
// plate; and both strap anchors were inside the palm block. Each phalanx is
// now 2 mm narrower than its fork, the pins are on the finger centre line,
// and the palm anchors are 2 mm off the palm faces.

import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';

const EXAMPLE = 'examples/kinematic/tendon-finger.kcad.ts';

// The mechanism probe samples one joint at a time. These poses flex the
// joints together, up to every joint at its limit.
const CURL_POSES: Record<string, Record<string, number>> = {
  'half curl': { mcpDeg: 40, pipDeg: 50, dipDeg: 35 },
  'tip curl': { mcpDeg: 0, pipDeg: 100, dipDeg: 70 },
  'full curl': { mcpDeg: 85, pipDeg: 100, dipDeg: 70 },
};

describe('tendon-finger example passes evaluate_script', () => {
  it('is ok with a real mechanism and no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', { file: EXAMPLE, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 180_000);

  it('stays collision-free when the joints flex together', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE });
    expect(result.evaluation.exitCode).toBe(0);
    expect(result.model).toBeDefined();
    for (const [name, pose] of Object.entries(CURL_POSES)) {
      const edited = await updateModelParams(
        result.model!,
        Object.entries(pose).map(([param, value]) => ({ name: param, value })),
      );
      const scene = edited.model.rootShape;
      if (scene === undefined || !isSceneBackend(scene)) throw new Error(`${name}: the model root is not a scene`);
      const clash = detectInterferences(scene, 0.01, new Set<string>(), []);
      expect(clash.partCount, name).toBe(4);
      expect(clash.uncheckedPairs, name).toEqual([]);
      expect(clash.pairs.map((pair) => `${pair.a} x ${pair.b}`), name).toEqual([]);
    }
  }, 300_000);
});
