// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, afterEach } from 'vitest';
import {
  whatsNewTemplate,
  whatsNewIsFilled,
} from './whatsNewTemplate';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('whatsNewTemplate', () => {
  it('includes a Hero artifact section header', () => {
    const out = whatsNewTemplate({ module: 'v0.3', partName: 'espresso-cup', heroArtifact: 'espresso-cup' });
    expect(out).toContain('## Hero artifact');
    expect(out).toContain('espresso-cup');
  });

  it('includes a Why memorable section with three bullet headers', () => {
    const out = whatsNewTemplate({ module: 'v0.3', partName: 'espresso-cup', heroArtifact: 'espresso-cup' });
    expect(out).toContain('## Why memorable');
    expect(out).toContain('Recognizable in one second:');
    expect(out).toContain('New tool central:');
    expect(out).toContain('Reads at 360°:');
  });

  it('includes a What\'s new section with the existing capability blurb hook', () => {
    const out = whatsNewTemplate({ module: 'v0.3', partName: 'espresso-cup', heroArtifact: 'espresso-cup' });
    expect(out).toContain("## What's new");
  });
});

describe('whatsNewIsFilled', () => {
  const dirsToClean: string[] = [];
  afterEach(() => {
    for (const d of dirsToClean.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  function writeTmp(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-whats-new-'));
    dirsToClean.push(dir);
    const path = join(dir, 'whats-new.md');
    writeFileSync(path, content, 'utf8');
    return path;
  }

  it('returns false if the file contains "TODO:"', () => {
    const path = writeTmp('## Hero artifact\nfoo\n## Why memorable\n- Recognizable in one second: TODO:\n- New tool central: x\n- Reads at 360°: y\n## What\'s new\nblurb\n');
    expect(whatsNewIsFilled(path)).toBe(false);
  });

  it('returns false if any of the three required sections is missing', () => {
    const noHero = writeTmp('## Why memorable\n- Recognizable in one second: x\n- New tool central: y\n- Reads at 360°: z\n## What\'s new\nblurb\n');
    expect(whatsNewIsFilled(noHero)).toBe(false);

    const noWhy = writeTmp('## Hero artifact\nfoo\n## What\'s new\nblurb\n');
    expect(whatsNewIsFilled(noWhy)).toBe(false);

    const noWhat = writeTmp('## Hero artifact\nfoo\n## Why memorable\n- Recognizable in one second: x\n- New tool central: y\n- Reads at 360°: z\n');
    expect(whatsNewIsFilled(noWhat)).toBe(false);
  });

  it('returns false if any "Why memorable" bullet is empty after the colon', () => {
    const path = writeTmp(
      '## Hero artifact\nespresso-cup\n## Why memorable\n- Recognizable in one second: \n- New tool central: y\n- Reads at 360°: z\n## What\'s new\nblurb\n',
    );
    expect(whatsNewIsFilled(path)).toBe(false);
  });

  it('returns true when all three sections are present and bullets are filled', () => {
    const path = writeTmp(
      '## Hero artifact\nespresso-cup\n\n## Why memorable\n- Recognizable in one second: looks like a coffee mug\n- New tool central: shell hollow + handle hole\n- Reads at 360°: handle visible from any angle\n\n## What\'s new\nv0.3 ships shell + hole + cut.\n',
    );
    expect(whatsNewIsFilled(path)).toBe(true);
  });
});
