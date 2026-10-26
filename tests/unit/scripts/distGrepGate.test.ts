import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGrepGate } from '../../../scripts/lib/distGrepGate';

describe('distGrepGate', () => {
  it('returns ok for a clean tree with no comparator references', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-grep-clean-'));
    try {
      mkdirSync(join(root, 'skills/x'), { recursive: true });
      writeFileSync(
        join(root, 'skills/x/SKILL.md'),
        '---\nname: x\ndescription: y\n---\n# clean\n',
      );
      writeFileSync(join(root, 'README.md'), '# kernelCAD\n\nA NURBS BREP kernel.\n');
      const r = runGrepGate(root);
      expect(r.ok).toBe(true);
      expect(r.hits).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails on cadskills, build123d, cadquery, replicad, forgecad', () => {
    for (const word of ['cadskills', 'build123d', 'CADQuery', 'replicad', 'ForgeCAD']) {
      const root = mkdtempSync(join(tmpdir(), 'kc-grep-bad-'));
      try {
        mkdirSync(join(root, 'skills/x'), { recursive: true });
        writeFileSync(
          join(root, 'skills/x/SKILL.md'),
          `---\nname: x\ndescription: y\n---\n# Inspired by ${word}.\n`,
        );
        const r = runGrepGate(root);
        expect(r.ok).toBe(false);
        expect(r.hits.some((h) => h.match.toLowerCase().includes(word.toLowerCase()))).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('fails on OnShape, Fusion 360, MoveIt, Gazebo, SendCutSend, step.parts, earthtojake', () => {
    for (const word of [
      'OnShape',
      'Fusion 360',
      'MoveIt',
      'Gazebo',
      'SendCutSend',
      'step.parts',
      'earthtojake',
    ]) {
      const root = mkdtempSync(join(tmpdir(), 'kc-grep-x-'));
      try {
        mkdirSync(join(root), { recursive: true });
        writeFileSync(join(root, 'README.md'), `# kernelCAD\n\nLike ${word}.\n`);
        const r = runGrepGate(root);
        expect(r.ok).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('flags every use of sendcutsend, including quoted tokens and the domain', () => {
    for (const prose of ['Like SendCutSend.', 'Inspired by sendcutsend', "vendor: 'sendcutsend'", 'https://sendcutsend.com/materials/']) {
      const root = mkdtempSync(join(tmpdir(), 'kc-grep-vendor-bad-'));
      try {
        writeFileSync(join(root, 'README.md'), `# kernelCAD\n\n${prose}\n`);
        const r = runGrepGate(root);
        expect(r.ok).toBe(false);
        expect(r.hits.some((h) => h.match === 'sendcutsend')).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('allows MoveIt inside the URDF / MoveIt / ROS interop-porting list, blocks bare prose', () => {
    // MoveIt is a robotics-ecosystem tool the kinematic skill helps authors
    // port FROM (alongside URDF / ROS), not a rival CAD tool. The slash-list
    // porting idiom must pass; bare comparator-prose stays blocked.
    const ok = mkdtempSync(join(tmpdir(), 'kc-grep-moveit-ok-'));
    try {
      writeFileSync(
        join(ok, 'SKILL.md'),
        'Authors porting code from URDF / MoveIt / ROS must convert radians.\n',
      );
      expect(runGrepGate(ok).ok).toBe(true);
    } finally {
      rmSync(ok, { recursive: true, force: true });
    }

    for (const prose of ['Like MoveIt.', 'Inspired by MoveIt for IK']) {
      const bad = mkdtempSync(join(tmpdir(), 'kc-grep-moveit-bad-'));
      try {
        writeFileSync(join(bad, 'README.md'), `${prose}\n`);
        const r = runGrepGate(bad);
        expect(r.ok).toBe(false);
        expect(r.hits.some((h) => h.match === 'moveit')).toBe(true);
      } finally {
        rmSync(bad, { recursive: true, force: true });
      }
    }
  });

  it('also scans .claude-plugin/plugin.json, harness/, and CHANGELOG.md', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-grep-paths-'));
    try {
      mkdirSync(join(root, '.claude-plugin'), { recursive: true });
      mkdirSync(join(root, 'harness'), { recursive: true });
      writeFileSync(
        join(root, '.claude-plugin/plugin.json'),
        '{"description":"like cadskills"}\n',
      );
      const a = runGrepGate(root);
      expect(a.ok).toBe(false);

      // Clean plugin.json, but harness leaks the name.
      writeFileSync(join(root, '.claude-plugin/plugin.json'), '{}\n');
      writeFileSync(join(root, 'harness/AGENTS.md'), '# AGENTS\n\nfrom cadskills.\n');
      const b = runGrepGate(root);
      expect(b.ok).toBe(false);

      writeFileSync(join(root, 'harness/AGENTS.md'), '# AGENTS\n');
      writeFileSync(join(root, 'CHANGELOG.md'), '## Unreleased\n\nMatches MoveIt.\n');
      const c = runGrepGate(root);
      expect(c.ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not scan LICENSE (legal text) or the LICENSE word in headers', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-grep-license-'));
    try {
      writeFileSync(join(root, 'LICENSE'), 'MIT License\n\nCopyright (c) kernelCAD contributors\n');
      const r = runGrepGate(root);
      expect(r.ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
