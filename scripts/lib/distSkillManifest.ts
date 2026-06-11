// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/distSkillManifest.ts
//
// Generates .claude-plugin/plugin.json from filesystem-discovered
// entries. No hard-coded skill list; skills[] is whatever the walker
// returned, sorted deterministically by path so the manifest diff is
// stable across machines.

import type { SkillEntry } from '../../src/agent/cli/lib/walkSkillTree';

export interface PluginManifestInput {
  entries: SkillEntry[];
  version: string;
}

const ENTRY_SKILL_NAME = 'kernelcad';

export function authorPluginJson({ entries, version }: PluginManifestInput): string {
  const skills = entries
    .map((e) => {
      const item: { name: string; path: string; entry?: true } = {
        name: e.frontmatter.name,
        path: `skills/${e.relPath}`,
      };
      if (e.frontmatter.name === ENTRY_SKILL_NAME) item.entry = true;
      return item;
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifest = {
    name: 'kernelcad',
    version,
    description:
      'kernelCAD authoring skills — OCCT NURBS BREP CAD, agent-first, ships STEP.',
    kernelcad: {
      requires: { kernelcad: `^${minorOf(version)}` },
      mcp: {
        default: 'local',
        local: { command: 'kernelcad', args: ['mcp'] },
        remote: {
          url: 'https://api.kernelcad.com/mcp',
          authEnv: 'KERNELCAD_API_KEY',
        },
      },
    },
    skills,
  };
  return JSON.stringify(manifest, null, 2) + '\n';
}

function minorOf(version: string): string {
  const m = /^(\d+)\.(\d+)/.exec(version);
  if (!m) throw new Error(`distSkillManifest: cannot parse minor from version '${version}'.`);
  return `${m[1]}.${m[2]}.0`;
}
