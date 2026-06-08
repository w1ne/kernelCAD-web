// src/agent/cli/index.ts
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { animateCommand } from './commands/animate';
import { dfmCommand } from './commands/dfm';
import { evaluateCommand } from './commands/evaluate';
import { exportCommand } from './commands/export';
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

const requireFromHere = createRequire(import.meta.url);
// At source: src/agent/cli/index.ts → ../../../package.json (3 up)
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
program.addCommand(installCommand());
program.addCommand(interferenceCommand());
program.addCommand(mcpCommand());
program.addCommand(partsCommand());
program.addCommand(renderCommand());
program.addCommand(skillCommand());
program.addCommand(statsCommand());
program.addCommand(telemetryCommand());
program.addCommand(validateCommand());

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
