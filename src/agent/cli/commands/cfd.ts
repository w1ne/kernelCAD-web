// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/cfd.ts
//
// `kernelcad cfd run <file>`    — the run_cfd MCP tool from the shell.
// `kernelcad cfd status [--out]` — the cfd_summary tool: OpenFOAM availability,
//                                  fluid presets, a stored run's summary.
//
// Exit codes: 0 converged, 1 solved but not converged, 2 no result (bad
// arguments, missing OpenFOAM, failed mesh, diverged).

import { Command } from 'commander';
import { cfdSummaryTool } from '../../mcp/tools/cfdSummary';
import { runCfdTool, type RunCfdInput, type RunCfdOutput } from '../../mcp/tools/runCfd';
import type { CfdSummary } from '../../../kernel/cfd/types';

interface CfdRunOpts {
  study?: string;
  flow?: string;
  fluid?: string;
  fluidVolume?: string;
  inlet?: string;
  outlet?: string;
  velocity?: string;
  flowRateLpm?: string;
  outletPressure?: string;
  direction?: string;
  meshSize?: string;
  iterations?: string;
  residualTarget?: string;
  turbulence?: string;
  referenceArea?: string;
  cores?: string;
  out?: string;
  vtk?: boolean;
  preview?: boolean;
  json?: boolean;
}

/** A selector flag: JSON ('{"atX":0}', '[{...},{...}]') or a bare ref/label. */
function selectorArg(v: string | undefined): unknown {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t) as unknown;
  return t;
}

function fluidArg(v: string | undefined): unknown {
  if (v === undefined) return undefined;
  return v.trim().startsWith('{') ? (JSON.parse(v) as unknown) : v;
}

const numArg = (v: string | undefined): number | undefined => (v === undefined ? undefined : Number(v));

function meshArg(v: string | undefined): unknown {
  if (v === undefined) return undefined;
  return Number.isFinite(Number(v)) ? Number(v) : v;
}

export function cfdRunInput(file: string, o: CfdRunOpts): RunCfdInput {
  const fields: Record<string, unknown> = {
    study: o.study,
    flow: o.flow,
    fluid: fluidArg(o.fluid),
    fluid_volume: o.fluidVolume,
    inlet: selectorArg(o.inlet),
    outlet: selectorArg(o.outlet),
    velocity: numArg(o.velocity),
    flow_rate_lpm: numArg(o.flowRateLpm),
    outlet_pressure_pa: numArg(o.outletPressure),
    direction: o.direction,
    mesh_size: meshArg(o.meshSize),
    iterations: numArg(o.iterations),
    residual_target: numArg(o.residualTarget),
    turbulence: o.turbulence,
    reference_area_mm2: numArg(o.referenceArea),
    cores: numArg(o.cores),
    output_dir: o.out,
    export_vtk: o.vtk === true ? true : undefined,
    preview: o.preview === false ? false : undefined,
  };
  const input: RunCfdInput = { file };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) input[k] = v;
  return input;
}

const sig = (v: number | undefined, d = 4): string => (v === undefined || !Number.isFinite(v) ? '-' : v.toPrecision(d));

function summaryLines(s: CfdSummary, reused: RunCfdOutput['reused']): string[] {
  const lines = [
    `${s.study}: ${s.flow} flow of ${s.fluid.name}, Re ${s.reynolds.value.toFixed(0)} (${s.reynolds.basis}) -> ${s.turbulence.model}.`,
    `Mesh: ${s.mesh.cells} cells, checkMesh ${s.mesh.ok ? 'OK' : `FAILED ${s.mesh.failedChecks}`}, max non-orthogonality ${sig(s.mesh.maxNonOrthogonality, 3)} deg.`,
  ];
  if (s.pressureDropPa !== undefined) lines.push(`Pressure drop inlet -> outlet: ${sig(s.pressureDropPa)} Pa.`);
  for (const p of s.patches) lines.push(`  ${p.patch}: ${sig(p.flowM3s * 60_000)} L/min, ${sig(p.pressurePa)} Pa`);
  lines.push(`Mass balance: in ${sig(s.massBalance.inflowKgs)} kg/s, out ${sig(s.massBalance.outflowKgs)} kg/s (${(s.massBalance.imbalance * 100).toFixed(3)}%).`);
  const f = s.forces;
  if (f !== undefined) lines.push(`Drag ${sig(f.dragN)} N (Cd ${sig(f.cd, 3)}), lift ${sig(f.liftN)} N (Cl ${sig(f.cl, 3)}) on ${sig(f.referenceAreaMm2)} mm^2.`);
  lines.push(
    `Max velocity ${sig(s.maxVelocity)} m/s. ${s.iterations} iterations: ${s.convergence.verdict} (${s.convergence.reason}).`,
    `Mesh ${(s.meshMs / 1000).toFixed(1)} s, solve ${(s.solveMs / 1000).toFixed(1)} s.${reused !== undefined ? ` Reused (${reused}).` : ''}`,
    s.disclaimer,
  );
  return lines;
}

export function formatCfdResult(r: RunCfdOutput): string {
  const lines = r.summary !== undefined ? summaryLines(r.summary, r.reused) : [];
  const diags = r.diagnostics ?? [];
  for (const d of diags) lines.push(`${d.severity} ${d.code}: ${d.message}`);
  if (r.summary === undefined && r.error !== undefined && !diags.some(d => d.message === r.error)) lines.push(`error ${r.errorCode ?? ''}: ${r.error}`);
  if (r.images !== undefined) lines.push(`Preview: ${r.images.join(', ')}`);
  if (r.out_dir !== undefined) lines.push(`Run directory: ${r.out_dir}`);
  return lines.join('\n');
}

export function cfdCommand(): Command {
  const cmd = new Command('cfd').description('Steady incompressible CFD (OpenFOAM simpleFoam) on a kernelCAD model.');
  cmd
    .command('run')
    .description("Run a cfdStudy declared in the script, or the study given by flags. Example: kernelcad cfd run pipe.kcad.ts --flow internal --inlet '{\"atX\":0}' --outlet '{\"atX\":200}' --velocity 0.002")
    .argument('<file>', 'path to a .kcad.ts script')
    .option('--study <name>', 'declared cfdStudy name (default: the last one)')
    .option('--flow <kind>', 'internal | external (sets an inline study)')
    .option('--fluid <fluid>', "water | air | JSON {\"rho\":..,\"nu\":..} (SI)")
    .option('--fluid-volume <mode>', 'internal: interior (default) | solid')
    .option('--inlet <selector>', 'inlet face: FaceQuery JSON or face ref')
    .option('--outlet <selector>', 'outlet face(s): FaceQuery JSON, JSON array, or face ref')
    .option('--velocity <m/s>', 'inlet (internal) or free-stream (external) speed, m/s')
    .option('--flow-rate-lpm <L/min>', 'internal: volumetric flow rate instead of velocity')
    .option('--outlet-pressure <Pa>', 'outlet gauge pressure, Pa (default 0)')
    .option('--direction <axis>', 'external flow direction: +X (default) | -X | +Y | -Y | +Z | -Z')
    .option('--mesh-size <mm|preset>', 'surface cell size in mm, or coarse | medium | fine')
    .option('--iterations <n>', 'SIMPLE iteration cap (default 400)')
    .option('--residual-target <r>', 'initial-residual target (default 1e-4)')
    .option('--turbulence <model>', 'auto (default) | laminar | kOmegaSST')
    .option('--reference-area <mm2>', 'external: Cd/Cl reference area, mm^2')
    .option('--cores <n>', 'solver processes (default 1, cap KERNELCAD_CFD_MAX_CORES or 2)')
    .option('--out <dir>', 'run directory (case, logs, cfd-summary.json, PNG)')
    .option('--vtk', 'also export the solved fields as VTK')
    .option('--no-preview', 'skip the mid-plane velocity PNG')
    .option('--json', 'print the result as JSON')
    .action(async (file: string, opts: CfdRunOpts) => {
      let input: RunCfdInput;
      try {
        input = cfdRunInput(file, opts);
      } catch (e) {
        console.error(`cli.invalid-args: a selector or fluid flag is not valid JSON (${(e as Error).message}).`);
        process.exitCode = 2;
        return;
      }
      const r = await runCfdTool(input);
      console.log(opts.json ? JSON.stringify(r, null, 2) : formatCfdResult(r));
      process.exitCode = r.ok ? 0 : r.summary !== undefined && r.summary.convergence.verdict === 'not-converged' ? 1 : 2;
    });
  cmd
    .command('status')
    .description('OpenFOAM availability, fluid presets, and the summary stored in a run directory.')
    .option('--out <dir>', 'run directory of a previous `cfd run`')
    .option('--json', 'print as JSON')
    .action(async (opts: { out?: string; json?: boolean }) => {
      const r = await cfdSummaryTool(opts.out !== undefined ? { output_dir: opts.out } : {});
      if (opts.json) {
        console.log(JSON.stringify(r, null, 2));
      } else {
        const t = r.toolchain;
        console.log(t.available ? `OpenFOAM: available (${t.mode}${t.image ? ` ${t.image}` : ''}${t.version ? `, ${t.version}` : ''}).` : `OpenFOAM: not found. ${t.hint ?? ''}`);
        console.log(`Fluids: ${Object.entries(r.fluids).map(([n, f]) => `${n} (rho ${f.rho} kg/m^3, nu ${f.nu} m^2/s)`).join('; ')}.`);
        if (r.summary !== undefined) console.log(formatCfdResult({ ok: r.summary.convergence.verdict === 'converged', summary: r.summary }));
        if (r.progress !== undefined) console.log(`In progress: ${JSON.stringify(r.progress)}`);
        if (r.error !== undefined) console.log(`${r.errorCode}: ${r.error}`);
      }
      process.exitCode = r.ok ? 0 : 2;
    });
  return cmd;
}
