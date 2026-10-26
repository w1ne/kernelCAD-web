// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The local collaborative gate in a real temporary git repository: one branch
// changes the bracket fillet (pass), one moves a bracket hole (rejected by the
// shared requirement), and two branches set the same parameter differently
// (hard conflict).

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { runCollabCheck } from '../../../src/agent/cli/commands/collabCheck';

const example = readFileSync(resolve('examples/collab/bracket-and-motor-plate.kcad.ts'), 'utf8');

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function commitEdit(cwd: string, branch: string, from: string, edit: (source: string) => string): void {
  git(cwd, 'checkout', '-q', from);
  git(cwd, 'checkout', '-q', '-b', branch);
  writeFileSync(join(cwd, 'bracket.kcad.ts'), edit(example));
  git(cwd, 'add', 'bracket.kcad.ts');
  git(cwd, 'commit', '-q', '-m', branch);
}

function fixture(): { dir: string; file: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'kc-collab-check-'));
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'checkout', '-q', '-b', 'main');
  writeFileSync(join(dir, 'bracket.kcad.ts'), example);
  git(dir, 'add', 'bracket.kcad.ts');
  git(dir, 'commit', '-q', '-m', 'base');

  commitEdit(dir, 'fillet', 'main', (s) => s.replace("param('bracketFillet', 1.0", "param('bracketFillet', 1.2"));
  commitEdit(dir, 'hole-move', 'main', (s) => s.replace("param('bracketHoleX', 12", "param('bracketHoleX', 14"));
  commitEdit(dir, 'head-hole', 'main', (s) => s.replace("param('bracketHoleX', 12", "param('bracketHoleX', 15"));
  commitEdit(dir, 'other-hole', 'main', (s) => s.replace("param('bracketHoleX', 12", "param('bracketHoleX', 16"));
  git(dir, 'checkout', '-q', 'main');
  return { dir, file: join(dir, 'bracket.kcad.ts'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('kernelcad collab check', () => {
  it('reads a nested model path from a worktree directory', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-collab-worktree-'));
    const repo = join(root, 'repo');
    const alternate = join(root, 'alternate');
    const nestedPath = 'examples/collab/bracket.kcad.ts';
    const repoFile = join(repo, nestedPath);
    const alternateFile = join(alternate, nestedPath);
    mkdirSync(dirname(repoFile), { recursive: true });
    mkdirSync(dirname(alternateFile), { recursive: true });
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'checkout', '-q', '-b', 'main');
    writeFileSync(repoFile, example);
    git(repo, 'add', nestedPath);
    git(repo, 'commit', '-q', '-m', 'base');
    writeFileSync(alternateFile, example.replace("param('bracketFillet', 1.0", "param('bracketFillet', 1.2"));
    try {
      const result = await runCollabCheck({ file: repoFile, base: 'main', head: 'main', yours: alternate }, repo);
      expect(result.exitCode).toBe(0);
      expect(result.report.status).toBe('pass');
      expect(result.mergedSource).toContain("param('bracketFillet', 1.2");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('passes a disjoint fillet edit and writes the merged source', async () => {
    const { dir, file, cleanup } = fixture();
    try {
      const out = join(dir, 'merged.kcad.ts');
      const result = await runCollabCheck({ file, base: 'main', head: 'main', yours: 'fillet', out }, dir);
      expect(result.exitCode).toBe(0);
      expect(result.report.status).toBe('pass');
      expect(readFileSync(out, 'utf8')).toContain("param('bracketFillet', 1.2");
    } finally {
      cleanup();
    }
  });

  it('rejects the hole move with collab.gate.requirement-failed', async () => {
    const { dir, file, cleanup } = fixture();
    try {
      const result = await runCollabCheck({ file, base: 'main', head: 'main', yours: 'hole-move' }, dir);
      expect(result.exitCode).toBe(1);
      expect(result.report.status).toBe('reject');
      expect(result.report.gate).toMatchObject({
        status: 'reject',
        reasons: expect.arrayContaining([
          expect.objectContaining({ code: 'collab.gate.requirement-failed', name: 'hole-pattern' }),
        ]),
      });
    } finally {
      cleanup();
    }
  });

  it('rejects two branches setting the same param differently with collab.conflict.param', async () => {
    const { dir, file, cleanup } = fixture();
    try {
      const result = await runCollabCheck({ file, base: 'main', head: 'head-hole', yours: 'other-hole' }, dir);
      expect(result.exitCode).toBe(1);
      expect(result.report.status).toBe('conflict');
      expect(result.report.merge).toMatchObject({
        status: 'conflict',
        conflicts: [
          {
            code: 'collab.conflict.param',
            target: '$project',
            name: 'bracketHoleX',
            base: 12,
            head: 15,
            yours: 16,
          },
        ],
      });
    } finally {
      cleanup();
    }
  });
});
