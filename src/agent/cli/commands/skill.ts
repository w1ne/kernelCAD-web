// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/skill.ts
import { Command } from 'commander';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkSkillTree } from '../lib/walkSkillTree';

const here = dirname(fileURLToPath(import.meta.url));

function skillRoot(): string {
  const dev = join(here, '..', '..', 'skills');
  if (existsSync(dev) && statSync(dev).isDirectory()) return dev;
  const bundled = join(here, 'skills');
  if (existsSync(bundled) && statSync(bundled).isDirectory()) return bundled;
  throw new Error(`kernelcad skill tree not found near ${here}`);
}

export async function installCommand(target: string): Promise<void> {
  const root = skillRoot();
  mkdirSync(target, { recursive: true });
  for (const entry of walkSkillTree(root)) {
    const dst = join(target, entry.relPath);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(entry.absPath, dst);
  }
  // Soft-deprecation notice (Task D6 — pointing users at the new cross-agent flow).
  if (process.env.KERNELCAD_SUPPRESS_DEPRECATION !== '1') {
    console.error(
      '[kernelcad skill install] consider `npx skills add kernelcad/skills` for cross-agent install.',
    );
  }
}

export async function renderOnefile(): Promise<string> {
  const root = skillRoot();
  return walkSkillTree(root)
    .map((e) => e.source)
    .join('\n\n---\n\n');
}

const DEFAULT_INSTALL_DIR = join(process.env.HOME ?? '.', '.claude', 'skills');
const DEFAULT_ONEFILE_PATH = './kernelcad-skills.md';

export function skillCommand(): Command {
  const cmd = new Command('skill').description(
    "Install kernelCAD's skill tree into an agent skills directory or emit it as a single context file.",
  );

  cmd
    .command('install')
    .description(`Install all kernelCAD skills into a directory (default: ${DEFAULT_INSTALL_DIR}).`)
    .argument('[dir]', 'install directory', DEFAULT_INSTALL_DIR)
    .action((dir: string) => installCommand(dir));

  cmd
    .command('onefile')
    .description(`Emit every kernelCAD skill concatenated to a single file (default: ${DEFAULT_ONEFILE_PATH}).`)
    .argument('[path]', 'output file', DEFAULT_ONEFILE_PATH)
    .action(async (path: string) => writeFileSync(path, await renderOnefile(), 'utf8'));

  return cmd;
}
