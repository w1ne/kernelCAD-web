// src/cli/commands/skill.ts
import { Command } from 'commander';
import { mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function skillRoot(): string {
  const dev = join(here, '..', '..', 'skills');
  if (existsSync(dev) && statSync(dev).isDirectory()) return dev;
  const bundled = join(here, 'skills');
  if (existsSync(bundled) && statSync(bundled).isDirectory()) return bundled;
  throw new Error(`kernelcad skill tree not found near ${here}`);
}

function listSkills(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
}

export async function installCommand(target: string): Promise<void> {
  const root = skillRoot();
  mkdirSync(target, { recursive: true });
  for (const name of listSkills(root)) {
    const dst = join(target, name);
    mkdirSync(dst, { recursive: true });
    copyFileSync(join(root, name, 'SKILL.md'), join(dst, 'SKILL.md'));
  }
}

export async function renderOnefile(): Promise<string> {
  const root = skillRoot();
  const parts: string[] = [];
  for (const name of listSkills(root)) {
    parts.push(readFileSync(join(root, name, 'SKILL.md'), 'utf8'));
  }
  return parts.join('\n\n---\n\n');
}

const DEFAULT_INSTALL_DIR = join(process.env.HOME ?? '.', '.claude', 'skills');
const DEFAULT_ONEFILE_PATH = './kernelcad-skills.md';

export function skillCommand(): Command {
  const cmd = new Command('skill').description("Install kernelCAD's skill tree into an agent skills directory or emit it as a single context file.");

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
