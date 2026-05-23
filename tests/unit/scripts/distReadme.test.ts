import { describe, it, expect } from 'vitest';
import { authorReadme } from '../../../scripts/lib/distReadme';
import type { SkillEntry } from '../../../src/agent/cli/lib/walkSkillTree';

function entry(name: string, relPath: string): SkillEntry {
  return {
    absPath: '/x',
    relPath,
    frontmatter: { name, description: 'd' },
    body: '',
    source: '',
  };
}

describe('authorReadme', () => {
  const entries: SkillEntry[] = [
    entry('kernelcad', 'kernelcad/SKILL.md'),
    entry('kernelcad-mcp', 'kernelcad-mcp/SKILL.md'),
    entry('kernelcad-authoring', 'kernelcad-authoring/SKILL.md'),
  ];

  it('opens with an install command users can paste', () => {
    const md = authorReadme({ entries, version: '0.11.0' });
    expect(md).toMatch(/npx skills add kernelcad\/skills/);
  });

  it('lists the four supported agents with their global-scope paths', () => {
    const md = authorReadme({ entries, version: '0.11.0' });
    expect(md).toMatch(/Claude Code/);
    expect(md).toMatch(/Cursor/);
    expect(md).toMatch(/Codex/);
    expect(md).toMatch(/Copilot/);
    expect(md).toMatch(/~\/\.claude\/skills/);
    expect(md).toMatch(/~\/\.cursor\/skills/);
    expect(md).toMatch(/~\/\.codex\/skills/);
    expect(md).toMatch(/~\/\.copilot\/skills/);
  });

  it('shows both local-default and hosted-fallback MCP setup', () => {
    const md = authorReadme({ entries, version: '0.11.0' });
    expect(md).toMatch(/kernelcad mcp/);
    expect(md).toMatch(/https:\/\/api\.kernelcad\.com\/mcp/);
    expect(md).toMatch(/KERNELCAD_API_KEY/);
  });

  it('lists each discovered skill with its description', () => {
    const md = authorReadme({ entries, version: '0.11.0' });
    for (const e of entries) {
      expect(md).toContain(e.frontmatter.name);
    }
  });

  it('contains no comparator-project names', () => {
    const md = authorReadme({ entries, version: '0.11.0' });
    const blocklist = [
      'cadskills',
      'build123d',
      'cadquery',
      'replicad',
      'forgecad',
      'onshape',
      'fusion',
      'moveit',
      'gazebo',
      'sendcutsend',
      'step.parts',
      'earthtojake',
    ];
    for (const word of blocklist) expect(md.toLowerCase()).not.toContain(word);
  });

  it('contains no Studio billing/account claims', () => {
    const md = authorReadme({ entries, version: '0.11.0' });
    expect(md.toLowerCase()).not.toMatch(/account|subscribe|sign up|paid|billing/);
  });
});
