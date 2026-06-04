// scripts/distGenerate.mjs
//
// Build-time generator for the public skills-distribution repo.
// Walks src/agent/skills/, copies SKILL.md tree, emits the manifest,
// distills the harness contract, runs gates, and writes everything to
// a clean output directory. The CI workflow (.github/workflows/
// dist-skills.yml) commits the result to the published repo on release
// tags — this script does NOT publish on its own.

import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { walkSkillTree } from '../src/agent/cli/lib/walkSkillTree.ts';
import { authorPluginJson } from './lib/distSkillManifest.ts';
import { authorHarnessAgentsMd } from './lib/distHarnessAuthor.ts';
import { authorReadme } from './lib/distReadme.ts';
import { authorPostinstall } from './lib/distPostinstallScript.ts';
import { runGrepGate } from './lib/distGrepGate.ts';
import { runToolNameGate } from './lib/distToolNameGate.ts';
import { runFsDiscoverySentinel } from './lib/distFsDiscoverySentinel.ts';

export async function runDistGenerate({ repoRoot, outDir }) {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  const skillRoot = join(repoRoot, 'src/agent/skills');
  const entries = walkSkillTree(skillRoot);

  // 1. Copy the SKILL.md tree under skills/, preserving relative paths.
  for (const entry of entries) {
    const dst = join(outDir, 'skills', entry.relPath);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(entry.absPath, dst);
  }

  // 2. Copy the top-level entry SKILL.md to outDir/SKILL.md (the index).
  const indexEntry = entries.find((e) => e.relPath === 'kernelcad/SKILL.md');
  if (!indexEntry) throw new Error('kernelcad/SKILL.md not found in skill tree.');
  writeFileSync(join(outDir, 'SKILL.md'), indexEntry.source);

  // 3. VERSION.
  writeFileSync(join(outDir, 'VERSION'), `${pkg.version}\n`);

  // 4. .claude-plugin/plugin.json (manifest).
  mkdirSync(join(outDir, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(outDir, '.claude-plugin/plugin.json'),
    authorPluginJson({ entries, version: pkg.version }),
  );

  // 5. harness/AGENTS.md + CLAUDE.md (re-export).
  mkdirSync(join(outDir, 'harness'), { recursive: true });
  const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8');
  writeFileSync(join(outDir, 'harness/AGENTS.md'), authorHarnessAgentsMd(claudeMd));
  writeFileSync(
    join(outDir, 'harness/CLAUDE.md'),
    '# CLAUDE.md\n\nSee [AGENTS.md](./AGENTS.md) — the same agent rules apply.\n',
  );

  // 6. scripts/postinstall.mjs (prints, does not execute).
  mkdirSync(join(outDir, 'scripts'), { recursive: true });
  writeFileSync(
    join(outDir, 'scripts/postinstall.mjs'),
    authorPostinstall({ version: pkg.version }),
  );

  // 7. README.md.
  writeFileSync(join(outDir, 'README.md'), authorReadme({ entries, version: pkg.version }));

  // 8. LICENSE.
  copyFileSync(join(repoRoot, 'LICENSE'), join(outDir, 'LICENSE'));

  // 9. CHANGELOG.md (mirror the upstream tail).
  writeFileSync(join(outDir, 'CHANGELOG.md'), mirrorChangelog(repoRoot));

  // 10. Run gates.
  const grep = runGrepGate(outDir);
  const toolName = runToolNameGate({ outDir, repoRoot });
  const fsDiscoverySentinel = runFsDiscoverySentinel({ repoRoot });

  if (!grep.ok) throw new Error(`competitor-grep gate FAIL:\n${formatHits(grep.hits)}`);
  if (!toolName.ok) throw new Error(`tool-name gate FAIL:\n${formatHits(toolName.hits)}`);
  if (!fsDiscoverySentinel.ok) {
    throw new Error(`fs-discovery sentinel FAIL:\n${formatHits(fsDiscoverySentinel.hits)}`);
  }

  return { entries, gates: { grep, toolName, fsDiscoverySentinel } };
}

function mirrorChangelog(repoRoot) {
  const src = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8');
  // Ship at most the last two ## blocks (Unreleased + latest tag). Anything
  // older lives in the upstream CHANGELOG; the dist repo stays compact.
  const blocks = src.split(/(?=^## )/m);
  return blocks.slice(0, 2).join('').trim() + '\n';
}

function formatHits(hits) {
  return hits.map((h) => `  ${h.file}:${h.line}: ${h.match}`).join('\n');
}

// Allow `node scripts/distGenerate.mjs` as a CLI entry.
if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.cwd();
  const outDir = process.argv[2] ?? join(repoRoot, 'dist/skills-package');
  runDistGenerate({ repoRoot, outDir }).then(
    (r) => console.log(`dist generated → ${outDir}; ${r.entries.length} skills.`),
    (err) => {
      console.error(err.message);
      process.exit(1);
    },
  );
}
