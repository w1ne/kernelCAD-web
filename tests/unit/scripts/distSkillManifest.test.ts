import { describe, it, expect } from 'vitest';
import { authorPluginJson } from '../../../scripts/lib/distSkillManifest';
import type { SkillEntry } from '../../../src/agent/cli/lib/walkSkillTree';

function entry(name: string, relPath: string): SkillEntry {
  return {
    absPath: '/x',
    relPath,
    frontmatter: { name, description: 'x' },
    body: '',
    source: '',
  };
}

describe('authorPluginJson', () => {
  it('emits a manifest whose skills[] mirrors the entries argument', () => {
    const entries = [
      entry('kernelcad', 'kernelcad/SKILL.md'),
      entry('kernelcad-mcp', 'kernelcad-mcp/SKILL.md'),
      entry('blockout-model', 'kernelcad-from-reference/blockout-model/SKILL.md'),
    ];
    const out = JSON.parse(authorPluginJson({ entries, version: '0.11.0' }));
    expect(out.skills).toHaveLength(3);
    expect(out.skills.map((s: { name: string }) => s.name).sort()).toEqual([
      'blockout-model',
      'kernelcad',
      'kernelcad-mcp',
    ]);
  });

  it('sets version + name + description to spec §5.2 values', () => {
    const entries = [entry('kernelcad', 'kernelcad/SKILL.md')];
    const out = JSON.parse(authorPluginJson({ entries, version: '0.11.0' }));
    expect(out.name).toBe('kernelcad');
    expect(out.version).toBe('0.11.0');
    expect(typeof out.description).toBe('string');
    expect(out.description.length).toBeGreaterThan(0);
  });

  it('marks the kernelcad entry skill with entry: true; others have no entry key', () => {
    const entries = [
      entry('kernelcad', 'kernelcad/SKILL.md'),
      entry('kernelcad-mcp', 'kernelcad-mcp/SKILL.md'),
    ];
    const out = JSON.parse(authorPluginJson({ entries, version: '0.11.0' }));
    const kc = out.skills.find((s: { name: string }) => s.name === 'kernelcad');
    const mcp = out.skills.find((s: { name: string }) => s.name === 'kernelcad-mcp');
    expect(kc.entry).toBe(true);
    expect(mcp.entry).toBeUndefined();
  });

  it('encodes the kernelcad MCP block with local default + hosted fallback', () => {
    const out = JSON.parse(
      authorPluginJson({ entries: [entry('kernelcad', 'kernelcad/SKILL.md')], version: '0.11.0' }),
    );
    expect(out.kernelcad.mcp.default).toBe('local');
    expect(out.kernelcad.mcp.local.command).toBe('kernelcad');
    expect(out.kernelcad.mcp.local.args).toEqual(['mcp']);
    expect(out.kernelcad.mcp.remote.url).toBe('https://api.kernelcad.com/mcp');
    expect(out.kernelcad.mcp.remote.authEnv).toBe('KERNELCAD_API_KEY');
  });

  it('emits skills[] in deterministic sort order regardless of input order', () => {
    const entries = [
      entry('beta', 'beta/SKILL.md'),
      entry('alpha', 'alpha/SKILL.md'),
      entry('gamma', 'gamma/SKILL.md'),
    ];
    const out = JSON.parse(authorPluginJson({ entries, version: '0.11.0' }));
    expect(out.skills.map((s: { path: string }) => s.path)).toEqual([
      'skills/alpha/SKILL.md',
      'skills/beta/SKILL.md',
      'skills/gamma/SKILL.md',
    ]);
  });
});
