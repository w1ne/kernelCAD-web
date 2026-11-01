// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox guard for CLI ARGUMENTS, plus the `kernelcad sandbox` command.
//
// One commander `preAction` hook (installed on the root program) checks the
// path/URL arguments and options of whichever subcommand is about to run,
// using the table below and the same shared decision as the MCP guard
// (src/agent/mcp/sandboxArgs.ts). The node:fs and network chokepoints back it
// up for every path a command derives itself.
// tests/unit/cli/sandboxCliAudit.test.ts enumerates the command tree and fails
// when a path-like argument/option is not classified here.

import { Command } from 'commander';
import { getSandboxConfig } from '../../../shared/sandbox/config';
import { checkSandboxPath, describeRefusal, shortRefusal } from '../../../shared/sandbox/pathGuard';
import { networkAllowed } from '../../../shared/sandbox/networkGuard';
import {
  isSandboxError,
  sandboxCommandRefused,
  sandboxNetworkError,
  sandboxPathArgError,
} from '../../../shared/sandbox/errors';
import { sandboxStatus } from '../../../shared/sandbox/status';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import type { KernelError } from '../../../shared/intent/kernelError';

export type CliSandboxKind = 'read' | 'write' | 'url' | 'environment';

export interface CliSandboxSpec {
  /** Positional argument name → kind. */
  args?: Readonly<Record<string, CliSandboxKind>>;
  /** Option attribute name (commander camelCase) → kind. */
  options?: Readonly<Record<string, CliSandboxKind>>;
}

/** Keyed by the full command path, e.g. `render inspect`. */
export const CLI_SANDBOX_ARGS: Readonly<Record<string, CliSandboxSpec>> = {
  'cfd run': { args: { file: 'read' }, options: { out: 'write' } },
  'cfd status': { options: { out: 'read' } },
  animate: { args: { file: 'read', out: 'write' }, options: { frames: 'write', environment: 'environment', baseUrl: 'url' } },
  'collab check': { options: { file: 'read', yours: 'read', out: 'write' } },
  dfm: { args: { file: 'read' } },
  'dynamics run': { args: { scenario: 'read' } },
  evaluate: { args: { file: 'read' }, options: { baseline: 'read', traceOut: 'write' } },
  export: { args: { file: 'read' }, options: { out: 'write', connectorManifest: 'write' } },
  'import-step': { args: { 'input.step': 'read' }, options: { out: 'write' } },
  'inspect step': { args: { file: 'read' } },
  'inspect continuity': { args: { file: 'read' } },
  'inspect curvature': { args: { file: 'read' } },
  interference: { args: { file: 'read' } },
  parts: { args: { file: 'read' } },
  'print send': { args: { 'gcode-file': 'read' }, options: { model3mf: 'read' } },
  reconstruct: { args: { mesh: 'read' }, options: { out: 'write' } },
  render: { args: { file: 'read' }, options: { out: 'write', baseUrl: 'url', environment: 'environment' } },
  'render inspect': { args: { file: 'read', outDir: 'write' }, options: { baseUrl: 'url', environment: 'environment' } },
  'skill install': { args: { dir: 'write' } },
  'skill onefile': { args: { path: 'write' } },
  validate: { args: { file: 'read' } },
};

/** Commands that cannot work in sandbox mode, with the reason. */
export const CLI_SANDBOX_REFUSED: Readonly<Record<string, string>> = {
  install: 'it writes MCP client configs in your home directory and runs other agent CLIs',
  stats: 'it fetches the admin telemetry API over the network',
  'print send': 'it uploads G-code to a network printer',
  'telemetry enable': 'telemetry is forced off in sandbox mode',
  'telemetry reset': 'telemetry is forced off in sandbox mode',
};

export function commandPath(cmd: Command): string {
  const names: string[] = [];
  for (let c: Command | null = cmd; c !== null && c.parent !== null; c = c.parent) names.unshift(c.name());
  return names.join(' ');
}

const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

function checkValue(where: string, arg: string, kind: CliSandboxKind, value: string): void {
  const cfg = getSandboxConfig()!;
  if (kind === 'url' || kind === 'environment') {
    if (kind === 'environment' && !URL_RE.test(value)) return;
    let host = '?';
    try { host = new URL(value).hostname; } catch { /* unparsable → refused */ }
    if (!networkAllowed(host)) throw sandboxNetworkError(`kernelcad ${where} ${arg}`, value);
    return;
  }
  const verdict = checkSandboxPath(value, kind, cfg);
  if (verdict.allowed) return;
  throw sandboxPathArgError({
    api: `kernelcad ${where}`,
    arg,
    got: value,
    detail: shortRefusal(verdict),
    workspaceRoot: cfg.workspaceRoot,
  });
}

function stringsOf(v: unknown): string[] {
  if (typeof v === 'string' && v !== '') return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x !== '');
  return [];
}

/** Throw a sandbox KernelError when `cmd`'s parsed arguments break the sandbox. */
export function guardCliCommand(cmd: Command): void {
  if (getSandboxConfig() === null) return;
  const where = commandPath(cmd);
  const refused = CLI_SANDBOX_REFUSED[where];
  if (refused !== undefined) throw sandboxCommandRefused(`kernelcad ${where}`, refused);
  const spec = CLI_SANDBOX_ARGS[where];
  if (spec === undefined) return;
  cmd.registeredArguments.forEach((arg, i) => {
    const kind = spec.args?.[arg.name()];
    if (kind !== undefined) for (const v of stringsOf(cmd.processedArgs[i])) checkValue(where, `<${arg.name()}>`, kind, v);
  });
  const opts = cmd.opts() as Record<string, unknown>;
  for (const [attr, kind] of Object.entries(spec.options ?? {})) {
    for (const v of stringsOf(opts[attr])) checkValue(where, `--${attr}`, kind, v);
  }
}

/** Print a sandbox refusal the way CLI diagnostics print, and set exit code 2. */
export function reportSandboxRefusal(err: KernelError, json: boolean): void {
  const diag = {
    target: 'export-occt',
    code: err.code,
    severity: 'error',
    message: err.message,
    hint: err.hint ?? HINT_TEMPLATES[err.code].template,
  };
  if (json) process.stdout.write(`${JSON.stringify([diag], null, 2)}\n`);
  else process.stderr.write(`ERROR [${diag.code}] ${diag.message}\n  Hint: ${diag.hint}\n`);
  process.exitCode = 2;
}

/** Root-program hook: guard every subcommand before its action runs. */
export function installCliSandboxHook(program: Command): void {
  program.hook('preAction', (_root, actionCommand) => {
    try {
      guardCliCommand(actionCommand);
    } catch (e) {
      if (!isSandboxError(e)) throw e;
      reportSandboxRefusal(e, Boolean((actionCommand.opts() as { json?: boolean }).json));
      process.exit(2);
    }
  });
}

function printStatus(json: boolean): void {
  const s = sandboxStatus();
  if (json) {
    process.stdout.write(`${JSON.stringify(s, null, 2)}\n`);
    return;
  }
  if (!s.enabled) {
    process.stdout.write('sandbox: off\n  enable with --sandbox [--workspace <dir>] or KERNELCAD_SANDBOX=1 [KERNELCAD_WORKSPACE=<dir>]\n');
    return;
  }
  const lines = [
    `sandbox: ON (via ${s.source})`,
    `  workspace (read/write): ${s.workspaceRoot}`,
    `  scratch (tmp/cache/config): ${s.scratch!.tmp}, ${s.scratch!.cache}, ${s.scratch!.config}`,
    `  read-only runtime roots: ${s.readOnlyRoots!.length} (package, node_modules, browser cache, PATH; --json lists them)`,
    `  network: outbound ${s.network.outbound}, loopback ${s.network.loopback}`,
    `  telemetry: ${s.telemetry}`,
    `  refusal codes: ${s.diagnostics.join(', ')}`,
    `  docs: ${s.docs}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

/** Exit 0 when `path` is allowed for `access`, 2 (with the diagnostic) when refused. */
function checkPathCommand(path: string, opts: { write?: boolean; json?: boolean }): void {
  const cfg = getSandboxConfig();
  const access = opts.write ? 'write' : 'read';
  const verdict = checkSandboxPath(path, access, cfg);
  if (opts.json) process.stdout.write(`${JSON.stringify({ sandbox: cfg !== null, access, ...verdict })}\n`);
  else process.stdout.write(`${verdict.allowed ? 'allowed' : 'REFUSED'} (${access}): ${verdict.resolved}${cfg && !verdict.allowed ? ` — ${describeRefusal(verdict, cfg)}` : ''}\n`);
  if (!verdict.allowed) process.exitCode = 2;
}

export const SANDBOX_HELP = `
Sandbox mode (regulated / air-gapped deployments):
  --sandbox            keep file access inside the workspace and refuse all outbound network
  --workspace <dir>    workspace root for --sandbox (default: cwd; implies --sandbox)
  env: KERNELCAD_SANDBOX=1, KERNELCAD_WORKSPACE=<dir>, KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1,
       KERNELCAD_SANDBOX_READ_PATHS=<dir>[:<dir>…] (extra read-only roots)
  Both flags work before or after any subcommand (kernelcad --sandbox export …, kernelcad mcp --sandbox).
  Check with: kernelcad sandbox status   ·   docs/sandbox.md`;

export function sandboxCommand(): Command {
  const cmd = new Command('sandbox').description('Report sandbox mode (workspace-confined files, no outbound network) and test paths against it');
  cmd.command('status')
    .description('Show whether sandbox mode is on, the workspace root, network and telemetry policy')
    .option('--json', 'emit the status as JSON')
    .action((opts: { json?: boolean }) => printStatus(Boolean(opts.json)));
  cmd.command('check')
    .description('Report whether a path is allowed by the sandbox (exit 2 when refused)')
    .argument('<path>', 'path to test (relative to the cwd)')
    .option('--write', 'test write access (default: read)')
    .option('--json', 'emit the verdict as JSON')
    .action((path: string, opts: { write?: boolean; json?: boolean }) => checkPathCommand(path, opts));
  return cmd;
}
