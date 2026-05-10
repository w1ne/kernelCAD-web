// src/cli/index.ts
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { evaluateCommand } from './commands/evaluate';
import { exportCommand } from './commands/export';
import { mcpCommand } from './commands/mcp';
import { renderCommand } from './commands/render';
import { skillCommand } from './commands/skill';

const requireFromHere = createRequire(import.meta.url);
const pkg = requireFromHere('../../package.json') as { version: string };

const program = new Command();
program
  .name('kernelcad')
  .description('kernelCAD — agent-first parametric CAD CLI')
  .version(pkg.version);

program.addCommand(evaluateCommand());
program.addCommand(exportCommand());
program.addCommand(mcpCommand());
program.addCommand(renderCommand());
program.addCommand(skillCommand());

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
