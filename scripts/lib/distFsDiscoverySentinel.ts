// scripts/lib/distFsDiscoverySentinel.ts
//
// Guards against the generator accidentally growing a hand-coded skill
// enumeration. Greps the generator source files (scripts/distGenerate.mjs
// + scripts/lib/dist*.ts) for any string literal that matches the
// pattern `kernelcad-<word>` (the skill-directory shape). If any
// appears, fail — the only correct way to list skills in the generator
// is via walkSkillTree's filesystem discovery.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_NAME_PATTERN = /['"`](kernelcad-[a-z][a-z0-9-]*)['"`]/g;

export interface SentinelHit {
  file: string;
  line: number;
  match: string;
}
export interface SentinelResult {
  ok: boolean;
  hits: SentinelHit[];
}

export function runFsDiscoverySentinel({ repoRoot }: { repoRoot: string }): SentinelResult {
  const targets: string[] = [];
  const distGen = join(repoRoot, 'scripts/distGenerate.mjs');
  try {
    if (statSync(distGen).isFile()) targets.push(distGen);
  } catch {
    /* skip */
  }
  const libDir = join(repoRoot, 'scripts/lib');
  try {
    for (const name of readdirSync(libDir)) {
      if (/^dist.*\.(ts|mjs|js)$/.test(name)) targets.push(join(libDir, name));
    }
  } catch {
    /* skip */
  }

  const hits: SentinelHit[] = [];
  for (const file of targets) {
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let m: RegExpExecArray | null;
      SKILL_NAME_PATTERN.lastIndex = 0;
      while ((m = SKILL_NAME_PATTERN.exec(lines[i])) !== null) {
        hits.push({ file, line: i + 1, match: m[1] });
      }
    }
  }
  return { ok: hits.length === 0, hits };
}
