import { describe, it, expect } from 'vitest';
import { authorHarnessAgentsMd } from '../../../scripts/lib/distHarnessAuthor';

const FIXTURE = `# Repo conventions for Claude Code agents working in kernelCAD-web

## CAD authoring discipline

For any task that creates or modifies CAD output, use the bundled
\`kernelcad\` skill first.

Adopt this loop:
1. Classify the job.
2. Plan the .kcad.ts source.
3. Edit source and provenance only.

## Demo discipline (v0.X.0-tag PR review rule)

When reviewing a PR that ships a v0.X.0 tag (cuts a per-module release):
1. Verify docs/demos/v0.X/<task>/whats-new.md contains...
`;

describe('authorHarnessAgentsMd', () => {
  it('includes the CAD authoring discipline section', () => {
    const out = authorHarnessAgentsMd(FIXTURE);
    expect(out).toMatch(/CAD authoring discipline/);
    expect(out).toMatch(/Classify the job/);
  });

  it('excludes the demo-discipline section', () => {
    const out = authorHarnessAgentsMd(FIXTURE);
    expect(out).not.toMatch(/Demo discipline/);
    expect(out).not.toMatch(/v0\.X\.0-tag/);
    expect(out).not.toMatch(/docs\/demos\//);
  });

  it('appends the Multi-agent parallelization rules section', () => {
    const out = authorHarnessAgentsMd(FIXTURE);
    expect(out).toMatch(/## Multi-agent parallelization/);
    expect(out).toMatch(/mutating generation/i);
    expect(out).toMatch(/inspection/);
    expect(out).toMatch(/render/);
  });

  it('rewrites the kernelCAD-web title to a native dist-repo title', () => {
    const out = authorHarnessAgentsMd(FIXTURE);
    expect(out).not.toMatch(/kernelCAD-web/);
    expect(out.split('\n')[0]).toMatch(/^# /);
  });

  it('contains no comparator-project names', () => {
    const out = authorHarnessAgentsMd(FIXTURE);
    const blocklist = [
      'cadskills',
      'build123d',
      'cadquery',
      'replicad',
      'forgecad',
      'onshape',
      'fusion 360',
      'fusion360',
      'moveit',
      'gazebo',
      'sendcutsend',
      'step.parts',
      'earthtojake',
    ];
    for (const word of blocklist) {
      expect(out.toLowerCase()).not.toContain(word);
    }
  });
});
