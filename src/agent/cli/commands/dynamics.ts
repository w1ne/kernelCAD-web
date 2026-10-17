// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/dynamics.ts
//
// `kernelcad dynamics run <scenario.json>`
//
// Generic tank, nozzle and rigid-body checks. The scenario describes a
// mass, tanks and thrusters. It does not name a vehicle.

import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import { DynamicsError } from '../../../dynamics/gas';
import { MODEL_LIMITS, runScenario } from '../../../dynamics/run';

export function dynamicsCommand(): Command {
  const cmd = new Command('dynamics')
    .description('Tank, nozzle and rigid-body checks. The scenario is generic: no vehicle is built in.');

  cmd
    .command('run')
    .description('Run a JSON scenario (analysis: longitudinal or floating).')
    .argument('<scenario>', 'path to a scenario JSON file')
    .option('--json', 'print the result as JSON')
    .action(async (scenarioPath: string, opts: { json?: boolean }) => {
      try {
        const text = await readFile(scenarioPath, 'utf8');
        const result = runScenario(JSON.parse(text) as unknown);
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        console.log(formatResult(result));
      } catch (error) {
        if (error instanceof DynamicsError) {
          console.error(`${error.code}: ${error.message}`);
          process.exitCode = 2;
          return;
        }
        if (error instanceof SyntaxError) {
          console.error(`dynamics.scenario.invalid: ${error.message}`);
          process.exitCode = 2;
          return;
        }
        throw error;
      }
    });

  return cmd;
}

function formatResult(result: ReturnType<typeof runScenario>): string {
  const lines: string[] = [];
  if (result.analysis === 'longitudinal') {
    const run = result.result;
    lines.push(run.reached
      ? `Reached ${run.endSpeedMps.toFixed(2)} m/s in ${run.seconds.toFixed(3)} s over ${run.distanceM.toFixed(1)} m.`
      : `Stopped at ${run.endSpeedMps.toFixed(2)} m/s after ${run.seconds.toFixed(3)} s. Target not reached.`);
    lines.push(`Limit at the end of the run: ${run.limit}.`);
  } else {
    const run = result.result;
    lines.push(`Peak height ${run.peakHeightM.toFixed(3)} m, lowest ${run.minHeightM.toFixed(3)} m, max tilt ${run.maxTiltDeg.toFixed(2)} deg.`);
    lines.push(`Propellant ${run.propellantLeftKg.toFixed(3)} kg left of ${run.propellantInitialKg.toFixed(3)} kg. Worst wrench residual ${run.maxResidual.toFixed(1)}.`);
    if (run.fuelOutS !== null) lines.push(`Propellant exhausted at ${run.fuelOutS.toFixed(3)} s.`);
    for (const [id, tank] of Object.entries(result.tanks)) {
      lines.push(`Tank ${id} at the start: ${tank.pressureBar.toFixed(1)} bar (${tank.pressurePsi.toFixed(0)} psi), exit speed ${tank.exitSpeedMps.toFixed(0)} m/s.`);
    }
  }
  lines.push('Limits:');
  for (const limit of MODEL_LIMITS) lines.push(`- ${limit}`);
  return lines.join('\n');
}
