// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Merges to `develop` used to land unverified: ci.yml fired only on
// pull_request, so a PR tested against a stale base (e.g. an OCCT bump that
// left catalog/index.json stale) went green and broke every later PR.
const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
const jobs = ci.jobs as Record<string, { if?: string; needs?: string[] | string; steps?: { run?: string }[]; strategy?: { matrix?: { shard?: number[] } } }>;

describe('ci.yml develop push gate', () => {
  it('runs on push to develop and still on pull requests to develop', () => {
    expect(ci.on.push.branches).toContain('develop');
    expect(ci.on.pull_request.branches).toContain('develop');
    for (const path of ['catalog/index.json', 'src/kernel/x.ts', 'package.json', 'package-lock.json']) {
      const excluded = (ci.on.push.paths as string[]).filter(p => p.startsWith('!'))
        .some(p => p === `!${path}` || (p.endsWith('/**') && path.startsWith(p.slice(1, -2))));
      expect(excluded, path).toBe(false);
    }
  });

  it('keeps push and pull_request runs in separate concurrency groups', () => {
    expect(ci.concurrency.group).toContain('github.event_name');
    expect(ci.concurrency.group).toContain('github.event.pull_request.number');
  });

  it('runs lint, build-and-checks and the catalog index freshness gate on a develop push', () => {
    const detect = (jobs.changes.steps ?? []).map(s => s.run ?? '').join('\n');
    expect(detect).toMatch(/"\$EVENT" = "push" \] && \[ "\$REF" = "refs\/heads\/develop" \][\s\S]*push_gate=true/);
    for (const name of ['lint', 'build-and-checks']) expect(jobs[name].if ?? '', name).not.toContain('push_gate');
    expect(jobs['catalog-index'].if).toBe("needs.changes.outputs.push_gate == 'true'");
    expect(jobs['catalog-index'].steps?.map(s => s.run ?? '').join('\n')).toContain('tests/integration/catalog/catalogIndex.test.ts');
    expect(jobs.test.needs).toContain('catalog-index');
  });

  it('leaves the full 8-shard suite on the PR path', () => {
    expect(jobs['test-shard'].strategy?.matrix?.shard).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(jobs['test-shard'].if).toBe("needs.changes.outputs.docs_only != 'true' && needs.changes.outputs.push_gate != 'true'");
  });
});
