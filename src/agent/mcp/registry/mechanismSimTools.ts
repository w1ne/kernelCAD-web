// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// New-tool tail slice — appended after every pre-existing registry family
// so the public tool order (and per-module slice indices, a
// kernelCAD-server contract) is stable for existing tools; a new tool is
// always appended here, never inserted mid-list.
import { sweepToleranceTool } from '../tools/sweepTolerance';
import type { ToolRegistryEntry } from './types';

const sweepToleranceToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'sweep_tolerance',
    description:
      "Use this when you need to check whether a mechanism stays buildable across a tolerance/dimension range, not just at one nominal value. Declares one or more param() names with a { values: [...] } list or a { min, max, steps } range, re-evaluates the script once per cartesian-product combination (capped at 64 combos — exceeding it truncates to the first 64 and emits kinematic.sweep-tolerance.combo-cap-exceeded), and runs the standard gates on each combo: interference, mounting-hole diameter agreement, and joint-axis binding (all three, default on); reachability only when gates.reachable names a tip_link + target. Returns the pass/fail envelope table (one row per combo) plus firstFailure per gate — the fastest way to find the first param value at which a design breaks.",
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
        params: {
          type: 'object',
          description: "param() name -> { values: [number|string, ...] } or { min, max, steps }.",
        },
        gates: {
          type: 'object',
          description: "Which standard gates to run per combo.",
          properties: {
            interference: { type: 'boolean', description: 'Default true.' },
            mountingHoles: { type: 'boolean', description: 'Default true.' },
            jointAxis: { type: 'boolean', description: 'Default true.' },
            reachable: {
              type: 'object',
              description: 'Runs the reachability gate when set.',
              properties: {
                tipLink: { type: 'string' },
                targetPosition: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                targetOrientation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              },
              required: ['tipLink', 'targetPosition'],
            },
          },
        },
      },
      required: ['params'],
    },
  },
  handler: input => sweepToleranceTool(input as unknown as Parameters<typeof sweepToleranceTool>[0]),
};

export const mechanismSimToolEntries: ToolRegistryEntry[] = [sweepToleranceToolEntry];
