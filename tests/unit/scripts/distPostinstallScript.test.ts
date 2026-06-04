import { describe, it, expect } from 'vitest';
import { authorPostinstall } from '../../../scripts/lib/distPostinstallScript';

describe('authorPostinstall', () => {
  it('emits a Node ESM script with #!/usr/bin/env node shebang', () => {
    const src = authorPostinstall({ version: '0.11.0' });
    expect(src.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('contains no `execSync`, `spawn`, `exec` calls that would run npm install', () => {
    const src = authorPostinstall({ version: '0.11.0' });
    // The whole point of the print-not-execute contract.
    expect(src).not.toMatch(/execSync|spawnSync|spawn\(|exec\(/);
  });

  it('does not write to or read agent config paths', () => {
    const src = authorPostinstall({ version: '0.11.0' });
    // Should not touch any of the agent config locations.
    expect(src).not.toMatch(/writeFile|appendFile|writeFileSync|fs\.write/);
    expect(src).not.toMatch(/\.claude\.json|\.cursor\/mcp\.json|\.codex\/config\.toml/);
  });

  it('prints the kernelcad@<minor> npm install hint', () => {
    const src = authorPostinstall({ version: '0.11.0' });
    expect(src).toMatch(/npm i -g kernelcad@\^0\.11/);
  });

  it('prints per-agent MCP-registration snippets for claude-code, cursor, codex, copilot', () => {
    const src = authorPostinstall({ version: '0.11.0' });
    for (const agent of ['claude-code', 'cursor', 'codex', 'copilot']) {
      expect(src.toLowerCase()).toContain(agent);
    }
  });

  it('contains no comparator-project names', () => {
    const src = authorPostinstall({ version: '0.11.0' });
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
    ];
    for (const word of blocklist) {
      expect(src.toLowerCase()).not.toContain(word);
    }
  });
});
