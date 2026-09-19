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
