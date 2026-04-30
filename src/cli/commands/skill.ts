// src/cli/commands/skill.ts
import { Command } from 'commander';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

/**
 * Load the bundled SKILL.md content. Two candidate paths:
 *   - Dev (vitest):   `<source dir>/../../skill/SKILL.md` — relative to this source file
 *   - Built CLI bundle: `<bundle dir>/SKILL.md` — copied alongside `dist/cli/index.js` by build:cli
 *
 * Order matters — try dev path first because the bundled location only exists post-build,
 * but at dev time the bundle dir doesn't exist anyway, so a single try/catch chain works.
 */
function loadSkillContent(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const devPath = join(here, '..', '..', 'skill', 'SKILL.md');
  try {
    return readFileSync(devPath, 'utf8');
  } catch {
    const buildPath = join(here, 'SKILL.md');
    return readFileSync(buildPath, 'utf8');
  }
}

const SKILL_CONTENT = loadSkillContent();

export interface InstallSkillInput { dir: string; }
export interface InstallSkillResult { ok: boolean; path?: string; error?: string; }

export function installSkill(input: InstallSkillInput): InstallSkillResult {
  try {
    const dir = resolve(input.dir);
    mkdirSync(dir, { recursive: true });
    const target = join(dir, 'SKILL.md');
    writeFileSync(target, SKILL_CONTENT, 'utf8');
    return { ok: true, path: target };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface OneFileSkillInput { path: string; }
export interface OneFileSkillResult { ok: boolean; path?: string; error?: string; }

export function oneFileSkill(input: OneFileSkillInput): OneFileSkillResult {
  try {
    const target = resolve(input.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, SKILL_CONTENT, 'utf8');
    return { ok: true, path: target };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const DEFAULT_INSTALL_DIR = join(homedir(), '.agents', 'skills', 'kernelcad');
const DEFAULT_ONEFILE_PATH = './kernelcad-context.md';

export function skillCommand(): Command {
  const cmd = new Command('skill').description("Install kernelCAD's SKILL.md into an agent skills directory or emit it as a single context file.");

  cmd
    .command('install')
    .description(`Install SKILL.md into a directory (default: ${DEFAULT_INSTALL_DIR}).`)
    .option('--dir <path>', 'Target directory.', DEFAULT_INSTALL_DIR)
    .action((opts: { dir: string }) => {
      const r = installSkill({ dir: opts.dir });
      if (!r.ok) {
        console.error(`skill install failed: ${r.error}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Wrote ${r.path}`);
      console.log(`Reload your agent (Claude Code, Codex, OpenCode, …) to activate.`);
    });

  cmd
    .command('one-file [path]')
    .description(`Emit SKILL.md as a single context file (default path: ${DEFAULT_ONEFILE_PATH}).`)
    .action((path: string | undefined) => {
      const r = oneFileSkill({ path: path ?? DEFAULT_ONEFILE_PATH });
      if (!r.ok) {
        console.error(`skill one-file failed: ${r.error}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Wrote ${r.path}`);
      console.log(`Paste the contents into any AI chat UI (Claude.ai, ChatGPT, Gemini, …) for full kernelCAD API knowledge.`);
    });

  return cmd;
}
