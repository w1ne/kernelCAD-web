// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/registry/feaTools.ts
//
// Structural-FEA family: the solver-backed answer to "will this part hold
// this load?" (`run_fea`) and its read-only companion (`fea_summary`).
//
// Its own registry module, appended LAST in the composition, because
// TOOL_REGISTRY order is a public contract consumed by kernelCAD-server —
// inserting into an existing family would renumber every tool after it.

import { feaSummaryTool } from '../tools/feaSummary';
import { runFeaTool } from '../tools/runFea';
import type { ToolRegistryEntry } from './types';

const runFeaToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'run_fea',
    description:
      'Use this when you need to know whether a part will hold a load. Runs the linear-static structural study a script declares with `shape.feaStudy({ material, fixed, loads, meshSize?, minSafetyFactor? })`: meshes the solid with quadratic tetrahedra, solves it with CalculiX, and returns evidence — peak von Mises stress (MPa), peak displacement (mm), the minimum safety factor against the material yield, per-region hot spots named by @kc[...] face ref, mesh-quality trust flags, an equilibrium residual, and stress-heatmap PNG paths.\n' +
      'Requires the external solver toolchain (CalculiX `ccx` plus the gmsh Python module). When it is absent the call fails with `fea.solver.unavailable` and the exact install command — never a silent pass.\n' +
      'Pass { file | code }, optional `study` (defaults to the last declared study), `output_dir` (keeps the .inp/.frd deck for reproduction), `mesh_size` (mm, overrides the study for this run), and `heatmaps: false` for a fast numbers-only run.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script declaring at least one feaStudy.' },
        code: { type: 'string', description: 'Inline kernelCAD script source (mutually exclusive with file).' },
        study: { type: 'string', description: 'Name of the study to run; defaults to the last declared one.' },
        output_dir: { type: 'string', description: 'Directory for the solver deck, results, summary JSON and heatmap PNGs.' },
        mesh_size: { type: 'number', description: 'Target element size in mm, overriding the study for this run.' },
        heatmaps: { type: 'boolean', description: 'Render stress heatmap PNGs (default true).' },
        mesh_timeout_ms: { type: 'number', description: 'Wall-clock budget for meshing (default 120000).' },
        solve_timeout_ms: { type: 'number', description: 'Wall-clock budget for the solve (default 300000).' },
      },
    },
  },
  handler: input => runFeaTool(input as unknown as Parameters<typeof runFeaTool>[0]),
};

const feaSummaryToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'fea_summary',
    description:
      "Use this when you need a structural check's context without paying for a solve. Read-only: returns the stored summary of a previous run_fea (pass the same `output_dir`), whether the CalculiX + gmsh toolchain is available on this machine (with the install command when it is not), and the FEA material table with real E / Poisson / yield numbers so a grade is chosen against data rather than from memory. Never meshes, solves, or writes.",
    inputSchema: {
      type: 'object',
      properties: {
        output_dir: {
          type: 'string',
          description: 'Directory a previous run_fea wrote to; omit for toolchain status + material table only.',
        },
      },
    },
  },
  handler: input => feaSummaryTool(input as unknown as Parameters<typeof feaSummaryTool>[0]),
};

export const feaToolEntries: ToolRegistryEntry[] = [runFeaToolEntry, feaSummaryToolEntry];
