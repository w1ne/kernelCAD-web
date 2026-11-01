// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/registry/cfdTools.ts
//
// CFD family: steady incompressible flow through an external OpenFOAM
// (`run_cfd`) and its read-only companion (`cfd_summary`). Appended LAST in
// the composition: TOOL_REGISTRY order is a public contract.

import { cfdSummaryTool } from '../tools/cfdSummary';
import { runCfdTool } from '../tools/runCfd';
import type { ToolRegistryEntry } from './types';

const runCfdToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'run_cfd',
    description:
      'Use this when you need to know the pressure drop through a duct, pipe or manifold, how flow splits between outlets, or the drag on a part in a stream. Runs a steady incompressible CFD study with OpenFOAM (snappyHexMesh mesh from the model, simpleFoam solve) and returns evidence: pressure drop inlet to outlet (Pa), per-patch volume and mass flow with the mass balance, drag / lift (N) with Cd / Cl on a reference area (external flow), max velocity, the Reynolds number and the laminar or k-omega SST model it implied, the residual history with a convergence verdict, checkMesh quality, and a mid-plane velocity PNG.\n' +
      "The study is EITHER declared in the script with `shape.cfdStudy({ flow, ... })` OR passed on the call against the shape the script returns: { code, flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002 }. " +
      "Internal flow: the fluid fills the part's channels, which must open flush onto its bounding box (fluid_volume 'interior', default), or the solid itself is the fluid (fluid_volume 'solid'); inlet / outlet are FaceQuery selectors on the FLUID volume (the openings), and an outlet array gives one patch per outlet so the flow split is reported. Give velocity (m/s, normal to the inlet) or flow_rate_lpm. External flow: a box of fluid around the part with velocity (m/s) along direction ('+X' default). " +
      "Fluids: 'water' | 'air' or { rho (kg/m^3), nu (m^2/s) }. outlet_pressure_pa (gauge, default 0), mesh_size (surface cell mm, or 'coarse' | 'medium' | 'fine'), iterations (default 400), residual_target (default 1e-4), turbulence ('auto' picks from Re: laminar below 2300 in a pipe / 1000 around a body).\n" +
      "ok is false unless the solve CONVERGED; an unconverged run returns provisional numbers with cfd.solve.not-converged. Needs OpenFOAM (native or the opencfd Docker image); its absence fails with cfd.solver.unavailable and the install command, never as a pass. Results are an engineering estimate, not a certification. Runs take tens of seconds to minutes: the run directory is keyed by a hash of the case, so calling again with the same inputs returns the finished result or joins the live run instead of starting a second solver.",
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script (with a cfdStudy, or pass the study on the call).' },
        code: { type: 'string', description: 'Inline kernelCAD script source (mutually exclusive with file).' },
        study: { type: ['string', 'object'], description: 'Name of a declared cfdStudy (default: the last), or an inline study object.' },
        flow: { type: 'string', enum: ['internal', 'external'], description: 'Inline study: internal (duct / pipe / manifold) or external (flow around the part).' },
        fluid: { type: ['string', 'object'], description: "'water' (internal default), 'air' (external default), or { rho, nu } in SI." },
        fluid_volume: { type: 'string', enum: ['interior', 'solid'], description: "Internal flow: 'interior' fills the part's channels (default); 'solid' treats the solid as the fluid." },
        inlet: { type: ['object', 'string'], description: 'Internal flow: inlet opening, a FaceQuery like { atX: 0 } on the fluid volume.' },
        outlet: { type: ['object', 'string', 'array'], description: 'Internal flow: outlet opening(s); an array reports each outlet separately.' },
        velocity: { type: 'number', description: 'Inlet speed normal to the inlet (internal) or free-stream speed (external), m/s.' },
        flow_rate_lpm: { type: 'number', description: 'Internal flow alternative to velocity: volumetric flow rate, L/min.' },
        outlet_pressure_pa: { type: 'number', description: 'Outlet static pressure, Pa gauge (default 0).' },
        direction: { type: 'string', enum: ['+X', '-X', '+Y', '-Y', '+Z', '-Z'], description: "External flow direction (default '+X')." },
        mesh_size: { type: ['number', 'string'], description: "Surface cell size in mm, or 'coarse' | 'medium' (default) | 'fine'." },
        iterations: { type: 'number', description: 'SIMPLE iteration cap (default 400, max 5000).' },
        residual_target: { type: 'number', description: 'Initial-residual convergence target (default 1e-4).' },
        turbulence: { type: 'string', enum: ['auto', 'laminar', 'kOmegaSST'], description: "'auto' (default) chooses from the Reynolds number." },
        reference_area_mm2: { type: 'number', description: 'External flow: Cd / Cl reference area in mm^2 (default: projected frontal area).' },
        cores: { type: 'number', description: 'Solver processes (default 1, capped by KERNELCAD_CFD_MAX_CORES, default cap 2).' },
        output_dir: { type: 'string', description: 'Run directory (case, logs, summary JSON, PNG). Default: a temp dir keyed by the case hash.' },
        export_vtk: { type: 'boolean', description: 'Also write the solved fields as VTK (foamToVTK) under <output_dir>/case/VTK.' },
        preview: { type: 'boolean', description: 'Render the mid-plane velocity PNG (default true).' },
        mesh_timeout_ms: { type: 'number', description: 'Wall-clock budget for meshing (default 300000).' },
        solve_timeout_ms: { type: 'number', description: 'Wall-clock budget for the solve (default 1200000).' },
      },
    },
  },
  handler: input => runCfdTool(input as unknown as Parameters<typeof runCfdTool>[0]),
};

const cfdSummaryToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'cfd_summary',
    description:
      "Use this when you need a flow study's context without paying for a solve. Read-only: returns the stored summary of a previous run_cfd (pass the same `output_dir`; while that run is still going it returns its progress stage instead), whether OpenFOAM is available on this machine and how (native or Docker image), with the install command when it is not, and the fluid presets with their density and kinematic viscosity. Never meshes, solves, or writes.",
    inputSchema: {
      type: 'object',
      properties: {
        output_dir: { type: 'string', description: 'Directory a previous run_cfd wrote to; omit for toolchain status + fluid table only.' },
      },
    },
  },
  handler: input => cfdSummaryTool(input as unknown as Parameters<typeof cfdSummaryTool>[0]),
};

export const cfdToolEntries: ToolRegistryEntry[] = [runCfdToolEntry, cfdSummaryToolEntry];
