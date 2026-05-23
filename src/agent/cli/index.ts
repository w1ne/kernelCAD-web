// src/agent/cli/index.ts
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { evaluateCommand } from './commands/evaluate';
import { exportCommand } from './commands/export';
import { installCommand } from './commands/install';
import { interferenceCommand } from './commands/interference';
import { mcpCommand } from './commands/mcp';
import { renderCommand } from './commands/render';
import { skillCommand } from './commands/skill';
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
  .version(pkg.version);

program.addCommand(evaluateCommand());
program.addCommand(exportCommand());
program.addCommand(installCommand());
program.addCommand(interferenceCommand());
program.addCommand(mcpCommand());
program.addCommand(renderCommand());
program.addCommand(skillCommand());
program.addCommand(validateCommand());

program.parseAsync(process.argv).catch(err => {
  console.error(err);
  process.exit(1);
});
