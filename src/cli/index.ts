// src/cli/index.ts
import { Command } from 'commander';
import { evaluateCommand } from './commands/evaluate';
import { exportCommand } from './commands/export';
import { mcpCommand } from './commands/mcp';
import { skillCommand } from './commands/skill';

const program = new Command();
program
  .name('kernelcad')
  .description('kernelCAD — agent-first parametric CAD CLI (v0.1)')
  .version('0.1.0');

program.addCommand(evaluateCommand());
program.addCommand(exportCommand());
program.addCommand(mcpCommand());
program.addCommand(skillCommand());

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
