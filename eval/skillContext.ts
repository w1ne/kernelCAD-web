// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { resolve } from 'node:path';
import { walkSkillTree } from '../src/agent/cli/lib/walkSkillTree';

const SKILLS_ROOT = resolve('src/agent/skills');

/**
 * Build the complete skill context used by evaluation and portfolio agents.
 * Keep this aligned with `kernelcad skill onefile`: nested child skills are
 * executable policy, not optional documentation.
 */
export function loadCombinedSkillMd(): string {
  return walkSkillTree(SKILLS_ROOT)
    .map((entry) => entry.source)
    .join('\n\n---\n\n');
}
