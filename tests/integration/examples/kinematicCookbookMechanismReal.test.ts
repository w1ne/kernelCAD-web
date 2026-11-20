// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// An agent copies the kinematic skill cookbook scripts, so each one must pass
// the gate the agent's own work is held to: evaluate_script with `ok: true`
// and `mechanism: 'real'`. Snippet 1 failed it with 10 errors: the base wall
// was 100 mm from the shoulder pivot, the forearm butted the upper arm on the
// elbow axis, and the ±180° shoulder limit put the arm inside the wall. The
// arm is now seated on a pedestal, the forearm laps the upper arm, and the
// shoulder limit stops short of the band the sweep reports.
//
// Snippet 2 failed it with 27 errors: no link of the 6-DOF arm touched the
// next one. Each mated pair now shares a face square to the joint axis.
//
// Snippet 5 failed it with 4 errors: the table had no mate, and the -15°
// hinge limit put the lid inside the base and the table. The table is now
// fastened under the base, the lid sits between two hinge ears, and the hinge
// limit starts at 0°.
//
// Snippet 7 failed it with 4 errors: the beam was inside the wall block and
// inside the bracket through the ±90° shoulder travel. The beam now laps the
// bracket in the adjacent Y slab, with the joint origin on the shared face.
//
// Snippet 6 failed it with 16 errors: the latch parts sat in separate Y
// layers 4 mm apart, the keeper had no bearing face on the housing, and the
// [-60°, 130°] handle limit ran through the over-center point, where the
// pinned loop cannot close. Mated parts now share a face on the pin plane,
// the keeper rides a housing rail, and the mate limits are the latched-side
// travel.
//
// Snippet 9 failed it: the four-bar links sat in separate Y layers joined by
// pins that touched no mating part, the stop was fastened at the world
// origin, and the full-turn limits ran through the stop and the poses where
// the rocker reverses. Mated parts now share a face on the pin plane, the
// stop is seated on the ground bar, and the mate limits are the crank travel
// short of the stop.
//
// VERIFIED_REAL only grows. Add a snippet here when it is rebuilt.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const COOKBOOK_DIR = 'src/agent/skills/kernelcad-kinematic/cookbook';
const VERIFIED_REAL = [
  '01-swept-collision-shoulder.kcad.ts',
  '02-reachable-with-seed.kcad.ts',
  '03-cantilever-beam-stress.kcad.ts',
  '04-scissor-jack-swept.kcad.ts',
  '05-clamshell-hinge-swept.kcad.ts',
  '06-over-center-latch-reachable.kcad.ts',
  '07-static-hold-servo-arm.kcad.ts',
  '09-four-bar-loop-swept.kcad.ts',
];

describe('kinematic skill cookbook scripts pass evaluate_script', () => {
  for (const name of VERIFIED_REAL) {
    it(`${name} is ok with a real mechanism`, async () => {
      const out = (await callMcpTool('evaluate_script', { file: `${COOKBOOK_DIR}/${name}`, autosave: false } as never)) as {
        ok: boolean;
        mechanism?: string;
        diagnostics: { code: string; severity: string; message: string }[];
      };
      const errors = out.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => `${d.code}: ${d.message}`);
      expect(errors, name).toEqual([]);
      expect(out.ok, name).toBe(true);
      expect(out.mechanism, name).toBe('real');
    }, 120_000);
  }
});
