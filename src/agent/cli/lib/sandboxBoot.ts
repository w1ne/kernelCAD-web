// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// FIRST import of the CLI entry point (src/agent/cli/index.ts). Switches
// sandbox mode on from KERNELCAD_SANDBOX=1 or the --sandbox / --workspace
// flags (wherever they appear in argv) BEFORE any other kernelCAD module is
// evaluated, so the fs + network chokepoints are installed before anything
// can capture an unguarded `fetch` or open a file. The flags are removed from
// process.argv so commander and the heap re-exec never see them; the mode
// reaches child processes through the exported env instead.
import { bootSandboxFromProcess } from '../../../shared/sandbox/enable';
import { isSandboxError } from '../../../shared/sandbox/errors';

try {
  const rest = bootSandboxFromProcess(process.argv.slice(2));
  process.argv.splice(2, process.argv.length - 2, ...rest);
} catch (e) {
  if (!isSandboxError(e)) throw e;
  process.stderr.write(`ERROR [${e.code}] ${e.message}\n  Hint: ${e.hint ?? ''}\n`);
  process.exit(2);
}
