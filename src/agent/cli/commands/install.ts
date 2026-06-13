// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/install.ts
//
// `kernelcad install <target> [--token X] [--dry-run]` — auto-configures
// one of four MCP-client targets to talk to kernelCAD.
//
// Targets:
//   --claude-desktop : writes <ConfigDir>/claude_desktop_config.json directly
//                      (file is dedicated to MCP entries; safe to merge).
//   --cursor         : writes ~/.cursor/mcp.json directly (dedicated MCP file).
//   --claude-code    : delegates to `claude mcp add ... --scope user`.
//                      `~/.claude.json` mixes MCP entries with OAuth and
//                      project state; editing it directly is unsafe.
//   --codex          : delegates to `codex mcp add ...`.
//                      `~/.codex/config.toml` is TOML and shared with other
//                      Codex config; the CLI is the supported edit path.
//
// `--token <X>` (optional): if provided, the generated server entry runs
// `kernelcad mcp --cloud --token <X>`; otherwise local stdio (`kernelcad mcp`).
//
// `--dry-run`: print the resulting config (or the CLI command we would
// invoke) without touching the filesystem.
//
// Idempotency: re-running with identical args is a no-op. Re-running with a
// new token replaces the kernelcad entry's token but preserves other
// `mcpServers` entries. For delegated targets we run the CLI's `remove`-then-
// `add` so the entry ends up matching the requested token.

import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

export type InstallTarget = 'claude-desktop' | 'claude-code' | 'codex' | 'cursor';

export interface InstallOptions {
  token?: string;
  dryRun?: boolean;
  /** Override the OS-detected config directory. Used by tests. */
  configDir?: string;
  /** Override `process.platform`. Used by tests. */
  platformOverride?: NodeJS.Platform;
  /** Override `process.env.HOME` / `os.homedir()`. Used by tests. */
  homeOverride?: string;
  /** Override APPDATA on Windows. Used by tests. */
  appDataOverride?: string;
  /**
   * For delegated targets, an injectable shell-runner used by tests. Default
   * runs the real command via `spawnSync`.
   */
  runCommand?: (cmd: string, args: string[]) => { status: number; stdout: string; stderr: string };
  /**
   * Stream sink for status messages. Defaults to `console.log` / `process.stderr`.
   * Pulled out for testability.
   */
  log?: (msg: string) => void;
  errorLog?: (msg: string) => void;
}

interface MergeResult {
  /** Absolute path of the file we updated (or would update under --dry-run). */
  path: string;
  /** Whether anything actually changed on disk. */
  changed: boolean;
  /** The final JSON we wrote (or would write). */
  config: Record<string, unknown>;
  /** Human-readable summary line printed on success. */
  summary: string;
}

interface DelegateResult {
  /** The command line we ran (or would run). */
  command: string;
  /** Whether the delegated CLI was invoked successfully. */
  changed: boolean;
  /** Human-readable summary line printed on success. */
  summary: string;
}

const KERNELCAD_SERVER_KEY = 'kernelcad';

// ---------------------------------------------------------------------------
// OS / path helpers
// ---------------------------------------------------------------------------

export function detectHome(opts: Pick<InstallOptions, 'homeOverride'> = {}): string {
  return opts.homeOverride ?? homedir() ?? process.env.HOME ?? '.';
}

export function detectPlatform(opts: Pick<InstallOptions, 'platformOverride'> = {}): NodeJS.Platform {
  return opts.platformOverride ?? platform();
}

/**
 * Default config directory for a given target on the current OS.
 * Returned path is the directory; the caller appends the filename.
 */
export function defaultConfigDir(target: InstallTarget, opts: InstallOptions = {}): string {
  const home = detectHome(opts);
  const plat = detectPlatform(opts);
  const appData = opts.appDataOverride ?? process.env.APPDATA ?? join(home, 'AppData', 'Roaming');

  switch (target) {
    case 'claude-desktop':
      if (plat === 'darwin') return join(home, 'Library', 'Application Support', 'Claude');
      if (plat === 'win32') return join(appData, 'Claude');
      return join(home, '.config', 'Claude');
    case 'cursor':
      return join(home, '.cursor');
    case 'claude-code':
      // ~/.claude.json is the actual file; the directory is the home dir.
      // We only need the home dir to check the parent exists.
      return home;
    case 'codex':
      return join(home, '.codex');
  }
}

export function configFilePath(target: InstallTarget, opts: InstallOptions = {}): string {
  const dir = opts.configDir ?? defaultConfigDir(target, opts);
  switch (target) {
    case 'claude-desktop':
      return join(dir, 'claude_desktop_config.json');
    case 'cursor':
      return join(dir, 'mcp.json');
    case 'claude-code':
      return join(dir, '.claude.json');
    case 'codex':
      return join(dir, 'config.toml');
  }
}

// ---------------------------------------------------------------------------
// Server-entry shape (Claude Desktop, Claude Code, Cursor all use this
// roughly-compatible JSON shape).
// ---------------------------------------------------------------------------

export interface McpServerEntry {
  command: string;
  args: string[];
  /** Optional env block (Claude Desktop / Cursor honour this). */
  env?: Record<string, string>;
}

export function buildServerEntry(token?: string): McpServerEntry {
  const args = ['-y', 'kernelcad', 'mcp'];
  if (token) {
    args.push('--cloud', '--token', token);
  }
  return { command: 'npx', args };
}

function entriesEqual(a: McpServerEntry, b: McpServerEntry): boolean {
  if (a.command !== b.command) return false;
  if (a.args.length !== b.args.length) return false;
  for (let i = 0; i < a.args.length; i++) {
    if (a.args[i] !== b.args[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// JSON merge (Claude Desktop, Cursor)
// ---------------------------------------------------------------------------

interface JsonConfig {
  mcpServers?: Record<string, McpServerEntry>;
  [k: string]: unknown;
}

function readJsonConfig(filePath: string): JsonConfig {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, 'utf8');
  if (raw.trim() === '') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not a JSON object');
    }
    return parsed as JsonConfig;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Config file at ${filePath} is malformed (${msg}). Refusing to overwrite — please fix or remove it and re-run.`,
    );
  }
}

function mergeJsonConfig(existing: JsonConfig, entry: McpServerEntry): { config: JsonConfig; changed: boolean } {
  const next: JsonConfig = { ...existing };
  const servers: Record<string, McpServerEntry> = { ...(existing.mcpServers ?? {}) };
  const prior = servers[KERNELCAD_SERVER_KEY];
  const changed = !prior || !entriesEqual(prior, entry);
  servers[KERNELCAD_SERVER_KEY] = entry;
  next.mcpServers = servers;
  return { config: next, changed };
}

function writeJsonTarget(target: InstallTarget, opts: InstallOptions): MergeResult {
  const filePath = configFilePath(target, opts);
  const dir = dirname(filePath);

  // Refuse to silently create the parent directory for desktop targets —
  // if Claude Desktop / Cursor isn't installed, the parent won't exist and
  // we should error so the user sees a clear "install <X> first" message.
  if (!existsSync(dir)) {
    const link = target === 'claude-desktop'
      ? 'https://claude.ai/download'
      : 'https://cursor.com/';
    throw new Error(
      `Target directory ${dir} does not exist. ${target} is not installed. ` +
      `Install it first from ${link}, or pass --config-dir to override.`,
    );
  }

  const existing = readJsonConfig(filePath);
  const entry = buildServerEntry(opts.token);
  const { config, changed } = mergeJsonConfig(existing, entry);

  const formatted = JSON.stringify(config, null, 2) + '\n';

  if (changed && !opts.dryRun) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, formatted, 'utf8');
  }

  const restartHint = target === 'claude-desktop'
    ? 'Restart Claude Desktop to load kernelCAD tools.'
    : 'Restart Cursor to load kernelCAD tools.';

  let summary: string;
  if (!changed) {
    summary = `kernelCAD MCP entry already up to date at ${filePath}. (no-op)`;
  } else if (opts.dryRun) {
    summary = `Would write kernelCAD MCP entry to ${filePath} (dry-run; no changes made).`;
  } else {
    summary = `Wrote kernelCAD MCP entry to ${filePath}. ${restartHint}`;
  }

  return {
    path: filePath,
    changed,
    config: config as Record<string, unknown>,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Delegated targets (Claude Code, Codex)
// ---------------------------------------------------------------------------

function defaultRunCommand(cmd: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  return {
    status: res.status ?? (res.error ? 127 : 1),
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? (res.error ? res.error.message : ''),
  };
}

function whichBinary(
  cmd: string,
  runner: (cmd: string, args: string[]) => { status: number },
  plat: NodeJS.Platform,
): boolean {
  const which = plat === 'win32' ? 'where' : 'which';
  const res = runner(which, [cmd]);
  return res.status === 0;
}

function delegateCli(
  target: InstallTarget,
  binary: 'claude' | 'codex',
  opts: InstallOptions,
): DelegateResult {
  const runner = opts.runCommand ?? defaultRunCommand;
  const plat = detectPlatform(opts);

  if (!whichBinary(binary, runner, plat)) {
    const installHint = binary === 'claude'
      ? 'Install Claude Code from https://claude.ai/code, then re-run.'
      : 'Install OpenAI Codex CLI from https://developers.openai.com/codex/, then re-run.';
    throw new Error(
      `${binary} CLI not found on PATH. kernelcad install --${target} delegates to the ${binary} CLI. ${installHint}`,
    );
  }

  // Build the `<bin> mcp add` argv.
  //
  // Claude Code: `claude mcp add kernelcad --scope user -- npx -y kernelcad mcp [...]`
  // Codex:       `codex mcp add kernelcad -- npx -y kernelcad mcp [...]`
  //
  // We `remove`-then-`add` to keep idempotency in the face of a previously
  // configured (possibly token-stale) entry. `remove` is allowed to fail
  // (entry may not exist yet); `add` is the authoritative step.
  const serverArgs = ['-y', 'kernelcad', 'mcp'];
  if (opts.token) serverArgs.push('--cloud', '--token', opts.token);

  const removeArgs = binary === 'claude'
    ? ['mcp', 'remove', KERNELCAD_SERVER_KEY, '--scope', 'user']
    : ['mcp', 'remove', KERNELCAD_SERVER_KEY];

  const addArgs = binary === 'claude'
    ? ['mcp', 'add', KERNELCAD_SERVER_KEY, '--scope', 'user', '--', 'npx', ...serverArgs]
    : ['mcp', 'add', KERNELCAD_SERVER_KEY, '--', 'npx', ...serverArgs];

  // Build a printable command line for dry-run / logging. We deliberately
  // redact the token in the printed form (the real argv keeps it).
  const printableServerArgs = ['-y', 'kernelcad', 'mcp'];
  if (opts.token) printableServerArgs.push('--cloud', '--token', '<redacted>');
  const printableAddArgs = binary === 'claude'
    ? ['mcp', 'add', KERNELCAD_SERVER_KEY, '--scope', 'user', '--', 'npx', ...printableServerArgs]
    : ['mcp', 'add', KERNELCAD_SERVER_KEY, '--', 'npx', ...printableServerArgs];
  const commandLine = `${binary} ${printableAddArgs.join(' ')}`;

  if (opts.dryRun) {
    return {
      command: commandLine,
      changed: false,
      summary: `Would run: ${commandLine}`,
    };
  }

  // `remove` is best-effort.
  runner(binary, removeArgs);

  const res = runner(binary, addArgs);
  if (res.status !== 0) {
    throw new Error(
      `${binary} mcp add failed (exit ${res.status}). stderr: ${res.stderr.trim() || '<empty>'}`,
    );
  }

  const restartHint = binary === 'claude'
    ? 'Restart Claude Code (or open a fresh session) to load kernelCAD tools.'
    : 'Restart Codex (or open a fresh session) to load kernelCAD tools.';
  return {
    command: commandLine,
    changed: true,
    summary: `Configured kernelCAD MCP entry via ${binary} CLI. ${restartHint}`,
  };
}

// ---------------------------------------------------------------------------
// Public entry points (also exported for tests)
// ---------------------------------------------------------------------------

export function runInstall(target: InstallTarget, opts: InstallOptions = {}): MergeResult | DelegateResult {
  switch (target) {
    case 'claude-desktop':
    case 'cursor':
      return writeJsonTarget(target, opts);
    case 'claude-code':
      return delegateCli(target, 'claude', opts);
    case 'codex':
      return delegateCli(target, 'codex', opts);
  }
}

// ---------------------------------------------------------------------------
// Commander wiring
// ---------------------------------------------------------------------------

export function installCommand(): Command {
  const cmd = new Command('install')
    .description(
      'Auto-configure an MCP client to talk to kernelCAD. Pass exactly one ' +
      'target flag.',
    )
    .option('--claude-desktop', 'install into Claude Desktop config')
    .option('--claude-code', 'install into Claude Code (via `claude mcp add`)')
    .option('--codex', 'install into OpenAI Codex CLI (via `codex mcp add`)')
    .option('--cursor', 'install into Cursor config (~/.cursor/mcp.json)')
    .option('--token <token>', 'kernelCAD cloud token; if omitted, local stdio mode is used')
    .option('--dry-run', 'print the resulting config without writing it')
    .option('--config-dir <dir>', 'override the target config directory (advanced; mainly for tests)')
    .action((opts: {
      claudeDesktop?: boolean;
      claudeCode?: boolean;
      codex?: boolean;
      cursor?: boolean;
      token?: string;
      dryRun?: boolean;
      configDir?: string;
    }) => {
      const picks: InstallTarget[] = [];
      if (opts.claudeDesktop) picks.push('claude-desktop');
      if (opts.claudeCode) picks.push('claude-code');
      if (opts.codex) picks.push('codex');
      if (opts.cursor) picks.push('cursor');

      if (picks.length === 0) {
        process.stderr.write(
          'Error: pass exactly one target — --claude-desktop, --claude-code, --codex, or --cursor.\n',
        );
        process.exitCode = 1;
        return;
      }
      if (picks.length > 1) {
        process.stderr.write(
          `Error: pass exactly one target; got ${picks.length} (${picks.join(', ')}).\n`,
        );
        process.exitCode = 1;
        return;
      }

      const target = picks[0];
      try {
        const result = runInstall(target, {
          ...(opts.token ? { token: opts.token } : {}),
          ...(opts.dryRun ? { dryRun: true } : {}),
          ...(opts.configDir ? { configDir: opts.configDir } : {}),
        });

        if (opts.dryRun && 'config' in result) {
          process.stdout.write(JSON.stringify(result.config, null, 2) + '\n');
        }
        process.stdout.write(result.summary + '\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`kernelcad install --${target}: ${msg}\n`);
        process.exitCode = 1;
      }
    });

  return cmd;
}
