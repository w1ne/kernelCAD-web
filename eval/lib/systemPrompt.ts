// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Pilot-parity skill selection for MUSE/benchmark sweeps. */
export const SWEEP_SKILLS = [
  'kernelcad',
  'kernelcad-authoring',
  'kernelcad-assemblies',
  'kernelcad-parts',
] as const;

export const SKILLS_ROOT = resolve('src/agent/skills');

/** Concatenate the SKILL.md files for the given skill dirs (sorted, safe). */
export function buildSystemPrompt(
  skillDirs: readonly string[],
  root: string = SKILLS_ROOT,
): string {
  const parts: string[] = [];
  for (const name of [...skillDirs].sort()) {
    const path = join(root, name, 'SKILL.md');
    if (!existsSync(path)) {
      throw new Error(`SKILL.md not found for skill '${name}' at ${path}`);
    }
    parts.push(readFileSync(path, 'utf8'));
  }
  return parts.join('\n\n---\n\n');
}

/**
 * Default skill context for `npm run eval` and the mech40 agent eval: the
 * authoring core plus the MCP core. Loading all ~28 SKILL.md files (~0.5 MB)
 * buried the authoring rules under specialty material the task never needs;
 * pass `--all-skills` for that old behaviour, or `--skills a,b` to pick.
 */
export const DEFAULT_EVAL_SKILLS = ['kernelcad-authoring', 'kernelcad-mcp'] as const;

export type SkillSelection =
  | { mode: 'default'; skills: readonly string[] }
  | { mode: 'custom'; skills: readonly string[] }
  | { mode: 'all' };

/** Parse `--all-skills` / `--skills a,b` (mutually exclusive). Throws on misuse. */
export function parseSkillSelection(args: readonly string[]): SkillSelection {
  const all = args.includes('--all-skills');
  const i = args.indexOf('--skills');
  if (i < 0) return all ? { mode: 'all' } : { mode: 'default', skills: DEFAULT_EVAL_SKILLS };
  if (all) throw new Error('--skills and --all-skills are mutually exclusive');
  const raw = args[i + 1];
  if (raw === undefined || raw.startsWith('--')) throw new Error('--skills needs a comma-separated list');
  const skills = raw.split(',').map((s) => s.trim()).filter((s) => s !== '');
  if (skills.length === 0) throw new Error('--skills needs at least one skill');
  return { mode: 'custom', skills };
}

/** Human label of a selection, recorded in results files. */
export function describeSkillSelection(sel: SkillSelection): string {
  return sel.mode === 'all' ? 'all' : sel.skills.join(',');
}

/** The system prompt for a selection (`all` → every SKILL.md plus references). */
export function loadSkillSelection(
  sel: SkillSelection,
  loadAll: () => string,
  root: string = SKILLS_ROOT,
): string {
  return sel.mode === 'all' ? loadAll() : buildSystemPrompt(sel.skills, root);
}
