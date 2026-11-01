// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/program.ts — the kernelcad command tree.
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { animateCommand } from './commands/animate';
import { dfmCommand } from './commands/dfm';
import { evaluateCommand } from './commands/evaluate';
import { exportCommand } from './commands/export';
import { importStepCommand } from './commands/importStep';
import { printCommand } from './commands/print';
import { reconstructCommand } from './commands/reconstruct';
import { inspectCommand } from './commands/inspect';
import { installCommand } from './commands/install';
import { interferenceCommand } from './commands/interference';
import { mcpCommand } from './commands/mcp';
import { partsCommand } from './commands/parts';
import { renderCommand } from './commands/render';
import { skillCommand } from './commands/skill';
import { statsCommand } from './commands/stats';
import { telemetryCommand } from './commands/telemetry';
import { validateCommand } from './commands/validate';
import { dynamicsCommand } from './commands/dynamics';
import { collabCheckCommand } from './commands/collabCheck';
import { cfdCommand } from './commands/cfd';
import { installCliSandboxHook, sandboxCommand, SANDBOX_HELP } from './lib/sandboxCli';

const requireFromHere = createRequire(import.meta.url);
// At source: src/agent/cli/program.ts → ../../../package.json (3 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const pkg = loadPkg();

/** Build the full `kernelcad` command tree (no parsing). Exported for the sandbox CLI audit test. */
export function buildProgram(): Command {
  const program = new Command();
  program
    .name('kernelcad')
    .description('kernelCAD — agent-first parametric CAD CLI')
    // Positional options: required so `render` (which has both its own
    // options and an `inspect` subcommand sharing flag names like --width /
    // --focus) routes options written after the subcommand name to the
    // subcommand instead of greedily claiming them for the parent.
    .enablePositionalOptions()
    .version(pkg.version);

  program.addCommand(animateCommand());
  program.addCommand(dfmCommand());
  program.addCommand(evaluateCommand());
  program.addCommand(exportCommand());
  program.addCommand(inspectCommand());
  program.addCommand(importStepCommand());
  program.addCommand(installCommand());
  program.addCommand(interferenceCommand());
  program.addCommand(mcpCommand());
  program.addCommand(partsCommand());
  program.addCommand(printCommand());
  program.addCommand(reconstructCommand());
  program.addCommand(renderCommand());
  program.addCommand(skillCommand());
  program.addCommand(statsCommand());
  program.addCommand(telemetryCommand());
  program.addCommand(validateCommand());
  program.addCommand(dynamicsCommand());
  program.addCommand(collabCheckCommand());
  program.addCommand(cfdCommand());

  program.addCommand(sandboxCommand());
  program.addHelpText('after', SANDBOX_HELP);
  installCliSandboxHook(program);
  return program;
}
