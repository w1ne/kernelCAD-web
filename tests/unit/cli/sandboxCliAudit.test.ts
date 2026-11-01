// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox audit over the whole `kernelcad` command tree: every path/URL-like
// positional argument or option is classified in CLI_SANDBOX_ARGS
// (src/agent/cli/lib/sandboxCli.ts) or exempted here, every classified one is
// refused when it escapes the workspace, and the online-only commands are
// refused outright.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import { buildProgram } from '../../../src/agent/cli/program';
import { CLI_SANDBOX_ARGS, CLI_SANDBOX_REFUSED, commandPath, guardCliCommand } from '../../../src/agent/cli/lib/sandboxCli';
import { disableSandboxForTest, enableSandbox, parseSandboxArgv } from '../../../src/shared/sandbox/enable';
import { isSandboxError } from '../../../src/shared/sandbox/errors';

const NOT_A_PATH: Record<string, string> = {
  'mcp --api-base-url': 'only used with --cloud, which is refused in sandbox mode',
  'sandbox check <path>': 'the probe itself — it reports the verdict instead of acting on the path',
  'print send --filename': 'name the file is uploaded under on the printer (command refused anyway)',
  'cfd run --mesh-size': 'a cell size in mm or a preset name, not a mesh file',
  'collab check --base': 'git revision',
  'export --part': 'assembly part name',
  'export --manifest-part-id': 'catalog part id',
  'export --manifest-family': 'catalog family name',
  'reconstruct --solid': 'STEP solid index',
  'collab check --head': 'git revision',
};

const PATH_WORDS = /(^|-)(file|path|dir|outdir|out|output|url|environment|baseline|manifest|frames|mesh|scenario|step|yours|3mf)(-|$)/i;

function allCommands(root: Command): Command[] {
  const out: Command[] = [];
  const visit = (c: Command): void => { out.push(c); c.commands.forEach(visit); };
  root.commands.forEach(visit);
  return out;
}

function pathLike(cmd: Command): Array<{ key: string; kind: 'arg' | 'option'; name: string }> {
  const where = commandPath(cmd);
  const out: Array<{ key: string; kind: 'arg' | 'option'; name: string }> = [];
  for (const a of cmd.registeredArguments) {
    if (PATH_WORDS.test(a.name().replace(/[.]/g, '-')) || /path|file|dir/i.test(a.description)) out.push({ key: `${where} <${a.name()}>`, kind: 'arg', name: a.name() });
  }
  for (const o of cmd.options) {
    const long = (o.long ?? '').replace(/^--/, '');
    if (!o.required && !o.optional) continue; // boolean flag
    if (PATH_WORDS.test(long) || /\bpath\b|\bfile\b|director|url/i.test(o.description)) out.push({ key: `${where} --${long}`, kind: 'option', name: o.attributeName() });
  }
  return out;
}

const program = buildProgram();
const commands = allCommands(program);

describe('CLI sandbox audit — coverage', () => {
  it('every path/URL-like argument and option is classified or exempted', () => {
    const missing: string[] = [];
    for (const cmd of commands) {
      const spec = CLI_SANDBOX_ARGS[commandPath(cmd)];
      for (const p of pathLike(cmd)) {
        const ok = p.kind === 'arg' ? spec?.args?.[p.name] !== undefined : spec?.options?.[p.name] !== undefined;
        if (!ok && NOT_A_PATH[p.key] === undefined && CLI_SANDBOX_REFUSED[commandPath(cmd)] === undefined) missing.push(p.key);
      }
    }
    expect(missing, `Classify in CLI_SANDBOX_ARGS (src/agent/cli/lib/sandboxCli.ts) or exempt:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every classified command, argument and option exists', () => {
    const byPath = new Map(commands.map(c => [commandPath(c), c]));
    for (const [where, spec] of Object.entries(CLI_SANDBOX_ARGS)) {
      const cmd = byPath.get(where);
      expect(cmd, where).toBeDefined();
      for (const name of Object.keys(spec.args ?? {})) expect(cmd!.registeredArguments.some(a => a.name() === name), `${where} <${name}>`).toBe(true);
      for (const attr of Object.keys(spec.options ?? {})) expect(cmd!.options.some(o => o.attributeName() === attr), `${where} --${attr}`).toBe(true);
    }
    for (const where of Object.keys(CLI_SANDBOX_REFUSED)) expect(byPath.has(where), where).toBe(true);
  });

  it('a `sandbox` command and the sandbox help are registered', () => {
    expect(commands.map(commandPath)).toEqual(expect.arrayContaining(['sandbox', 'sandbox status', 'sandbox check']));
  });
});

describe('CLI sandbox audit — enforcement', () => {
  let base: string;
  let ws: string;
  let cwd: string;
  beforeAll(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'kc-sbx-cli-')));
    ws = join(base, 'ws');
    mkdirSync(ws, { recursive: true });
    cwd = process.cwd();
    process.chdir(ws);
    enableSandbox({ workspace: ws, env: { ...process.env }, installGuards: false });
  });
  afterAll(() => {
    disableSandboxForTest();
    process.chdir(cwd);
    rmSync(base, { recursive: true, force: true });
  });

  const byPath = new Map(commands.map(c => [commandPath(c), c]));
  const cases = Object.entries(CLI_SANDBOX_ARGS)
    .filter(([where]) => CLI_SANDBOX_REFUSED[where] === undefined)
    .flatMap(([where, spec]) => [
      ...Object.entries(spec.args ?? {}).map(([name, kind]) => ({ where, kind, arg: name, option: false })),
      ...Object.entries(spec.options ?? {}).map(([name, kind]) => ({ where, kind, arg: name, option: true })),
    ]);

  it.each(cases)('$where $arg ($kind) refuses an escaping value', ({ where, kind, arg, option }) => {
    const cmd = byPath.get(where)!;
    const bad = kind === 'url' || kind === 'environment' ? 'https://example.com/x' : '../../outside/x';
    const good = kind === 'url' ? '' : kind === 'environment' ? 'studio' : 'models/x';
    const set = (value: string): void => {
      if (option) {
        cmd.setOptionValue(arg, value);
        (cmd as unknown as { processedArgs: unknown[] }).processedArgs = [];
      } else {
        const idx = cmd.registeredArguments.findIndex(a => a.name() === arg);
        const args: unknown[] = cmd.registeredArguments.map(() => undefined);
        args[idx] = value;
        (cmd as unknown as { processedArgs: unknown[] }).processedArgs = args;
      }
    };
    set(bad);
    let err: unknown;
    try { guardCliCommand(cmd); } catch (e) { err = e; }
    expect(isSandboxError(err), `${where} ${arg}`).toBe(true);
    expect((err as { code: string }).code).toBe(kind === 'url' || kind === 'environment' ? 'cli.sandbox-network-denied' : 'cli.sandbox-path-denied');
    if (good !== '') {
      set(good);
      expect(() => guardCliCommand(cmd)).not.toThrow();
    }
    if (option) cmd.setOptionValue(arg, undefined);
  });

  it.each(Object.keys(CLI_SANDBOX_REFUSED))('%s is refused outright', where => {
    expect(() => guardCliCommand(byPath.get(where)!)).toThrow(expect.objectContaining({ code: 'cli.sandbox-command-refused' }));
  });
});

describe('sandbox argv parsing', () => {
  it('strips --sandbox / --workspace anywhere before --', () => {
    expect(parseSandboxArgv(['export', 'step', 'a.kcad.ts', '--sandbox', '-o', 'x.step'])).toEqual({ sandbox: true, workspace: undefined, rest: ['export', 'step', 'a.kcad.ts', '-o', 'x.step'] });
    expect(parseSandboxArgv(['mcp', '--workspace=/srv/ws'])).toEqual({ sandbox: false, workspace: '/srv/ws', rest: ['mcp'] });
    expect(parseSandboxArgv(['--workspace', 'w', 'mcp'])).toMatchObject({ workspace: 'w', rest: ['mcp'] });
    expect(parseSandboxArgv(['evaluate', '--', '--sandbox'])).toMatchObject({ sandbox: false, rest: ['evaluate', '--', '--sandbox'] });
  });
});
