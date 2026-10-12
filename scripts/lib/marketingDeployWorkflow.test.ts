// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

interface PushPaths {
  paths?: string[];
  'paths-ignore'?: string[];
}

const marketing = YAML.parse(readFileSync('.github/workflows/deploy-marketing.yml', 'utf8'));
const ci = YAML.parse(readFileSync('.github/workflows/ci.yml', 'utf8'));

// GitHub includes a push when any changed path survives the ordered patterns.
// Deleted paths and both names of a rename need the same source-input policy.
function selects(push: PushPaths, files: string[]): boolean {
  const patterns = push.paths;
  if (patterns) {
    return files.some((file) => patterns.reduce((included, pattern) => {
      const negative = pattern.startsWith('!');
      return matchesGlob(file, negative ? pattern.slice(1) : pattern)
        ? !negative : included;
    }, false));
  }
  return files.some((file) => !(push['paths-ignore'] ?? []).some((pattern) => matchesGlob(file, pattern)));
}

function isDocsOnly(files: string[]): boolean {
  const detect = ci.jobs.changes.steps.find((step: { id?: string }) => step.id === 'detect');
  const classifier = (detect.run as string).match(/case "\$f" in[\s\S]*?esac/);
  if (!classifier) throw new Error('CI path classifier is missing');
  // Execute the workflow's actual shell case block, rather than maintaining a
  // second copy of the classification rules in this test.
  const result = execFileSync('bash', ['-c', [
    'docs_only=true',
    'for f in "$@"; do',
    classifier[0],
    'done',
    'printf "docs_only=%s\\n" "$docs_only"',
  ].join('\n'), 'classifier-test', ...files], { encoding: 'utf8' });
  return result.trim().endsWith('docs_only=true');
}

const CONTENT_INPUTS = [
  'docs/guide/dimensions-measure-drawings.md',
  'docs/guide/tubes-how-to/route.png',
  'docs/demos/landing-hero/so100/demo.mp4',
  'docs/demos/landing-hero/so100/hero-frame.png',
  'docs/demos/landing-hero/so100/meta.json',
  'docs/demos/drawing-one-click/demo.mp4',
];
const PROSE = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE',
  'RELEASE_NOTES.md', 'docs/DEPLOY.md', 'docs/research/note.md', 'doc/note.md', 'archive/old.md'];

describe('marketing publishing inputs', () => {
  it.each(CONTENT_INPUTS)('dispatches marketing for a changed or deleted %s', (file) => {
    expect(selects(marketing.on.push, [file])).toBe(true);
  });

  it.each(PROSE)('keeps unrelated prose-only %s out of deployment', (file) => {
    expect(selects(marketing.on.push, [file])).toBe(false);
  });

  it.each(['site/index.html', 'src/docs/liveDocs.ts', 'examples/plate.kcad.ts',
    'cookbook/snippets/bracket.md', 'scripts/lib/landingHero.ts', 'package.json', 'CLAUDE.md'])('%s still dispatches marketing', (file) => {
    expect(selects(marketing.on.push, [file])).toBe(true);
  });

  it('dispatches when a consumed input is mixed with unrelated prose', () => {
    expect(selects(marketing.on.push, ['docs/DEPLOY.md', CONTENT_INPUTS[0]])).toBe(true);
  });

  it('checks and deploys removal of a consumed input when it is renamed into an archive', () => {
    const files = ['archive/retired-demo.mp4', CONTENT_INPUTS[2]];
    expect(selects(marketing.on.push, files)).toBe(true);
    expect(isDocsOnly(files)).toBe(false);
  });

  it('keeps the private deployment target, develop ref and manual override', () => {
    expect(marketing.on.push.branches).toEqual(['develop']);
    expect(Object.hasOwn(marketing.on, 'workflow_dispatch')).toBe(true);
    const dispatch = marketing.jobs.trigger.steps[0].run as string;
    expect(dispatch).toContain('gh workflow run deploy-kernelcad-com.yml');
    expect(dispatch).toContain('--repo w1ne/kernelCAD-server');
    expect(dispatch).toContain('--ref main');
    expect(dispatch).toContain('-f web_ref=develop');
    expect(marketing.concurrency['cancel-in-progress']).toBe(false);
  });
});

describe('CI classification of marketing content', () => {
  it.each(CONTENT_INPUTS)('runs normal checks for %s', (file) => {
    expect(selects(ci.on.push, [file])).toBe(true);
    expect(isDocsOnly([file])).toBe(false);
  });

  it.each(PROSE)('keeps %s in the prose-only category', (file) => {
    expect(selects(ci.on.push, [file])).toBe(false);
    expect(isDocsOnly([file])).toBe(true);
  });
});
