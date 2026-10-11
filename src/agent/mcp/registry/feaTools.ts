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
      'Use this when you need to know whether a part will hold a load. Runs a linear-static structural study and returns evidence — peak von Mises stress (MPa), peak displacement (mm), the minimum safety factor against the material yield (taken away from the clamp-singular edges of the fixed faces; the raw clamp-edge peak is reported separately as peakAtSupportMPa), per-region hot spots named by @kc[...] face ref, mesh trust flags, an equilibrium residual, and (CalculiX only) stress-heatmap PNG paths.\n' +
      'The study is EITHER declared in the script with `shape.feaStudy({ material, fixed, loads, meshSize?, minSafetyFactor? })` OR passed on the call against the shape the script returns: ' +
      "{ code: 'return box(100, 20, 10);', material: 'aluminum-6061', fixed: { atX: 0 }, loads: [{ faces: { atX: 100 }, force: [0, 0, -200] }] }. " +
      "Faces are a FaceQuery ({ atX | atY | atZ, byNormal: 'Z', near: [x,y,z], ... }), a face label ('top', 'bottom', 'left', 'right', 'front', 'back') or an @kc[...] ref. Force is the TOTAL [Fx, Fy, Fz] in N on those faces (a scalar force + direction is accepted). Materials: mild-steel, aluminum-6061, pla, petg, abs, nylon (aliases steel, aluminum), or { E, nu, yield } in MPa.\n" +
      "Solver (`solver`, default 'auto'): CalculiX + gmsh quadratic tets when that toolchain is installed; otherwise the built-in in-process voxel solver (8-node incompatible-mode bricks), which needs nothing installed and is marked summary.solver 'in-process-voxel' with trust.meshTrusted false — an estimate (accurate for prismatic bending, approximate at curved faces and notches), never a verified pass. solver: 'calculix' fails up front with fea.solver.unavailable and the install command when the toolchain is absent.\n" +
      'Also: `study` (a declared study name; default the last), `output_dir` (keeps the deck / summary JSON), `mesh_size` (mm, overrides the study for this run), `heatmaps: false` for a numbers-only run. ' +
      "CalculiX mesh refinement is automatic: when the stress is untrusted only because the solver's error estimate is high, it re-solves once at 0.75x the element size (inside the element budget), with summary.refinement listing each pass. `refine: false` solves once.",
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script declaring at least one feaStudy.' },
        code: { type: 'string', description: 'Inline kernelCAD script source (mutually exclusive with file).' },
        study: { type: 'string', description: 'Name of the declared study to run; defaults to the last declared one.' },
        material: { description: "Inline study: material grade name (e.g. 'aluminum-6061') or { E, nu, yield } in MPa." },
        fixed: { description: "Inline study: faces held fixed — a FaceQuery like { atX: 0 }, a face label like 'bottom', or an @kc[...] ref." },
        loads: {
          type: 'array',
          description: 'Inline study: loads, each { faces, force: [Fx, Fy, Fz] } — total force in N on those faces.',
          items: { type: 'object' },
        },
        min_safety_factor: { type: 'number', description: 'Inline study: required minimum safety factor; below it the call fails with fea.safety-factor.below-min.' },
        solver: { type: 'string', enum: ['auto', 'calculix', 'in-process'], description: "'auto' (default): CalculiX when installed, else in-process. 'calculix': require it. 'in-process': always the built-in voxel solver." },
        output_dir: { type: 'string', description: 'Directory for the solver deck, results, summary JSON and heatmap PNGs.' },
        mesh_size: { type: 'number', description: 'Target element size in mm, overriding the study for this run.' },
        heatmaps: { type: 'boolean', description: 'Render stress heatmap PNGs (default true).' },
        refine: { type: 'boolean', description: 'One automatic finer pass (0.75x element size) when the stress is untrusted, inside the element budget (default true). false: one solve at mesh_size.' },
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
      "Use this when you need a structural check's context without paying for a solve. Read-only: returns the stored summary of a previous run_fea (pass the same `output_dir`), whether the CalculiX + gmsh toolchain is available on this machine (with the install command when it is not; run_fea then uses its in-process voxel solver — toolchain.default_solver says which), and the FEA material table with real E / Poisson / yield numbers so a grade is chosen against data rather than from memory. Never meshes, solves, or writes.",
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
