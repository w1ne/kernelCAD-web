import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

describe('kernelcad-shopcheck SKILL.md (Slice E)', () => {
  const skill = readFileSync('src/agent/skills/kernelcad-shopcheck/SKILL.md', 'utf-8');

  it('lists every dfm.* code from the registry', () => {
    const dfmCodes = Object.keys(DIAGNOSTIC_REGISTRY).filter(c => c.startsWith('dfm.'));
    for (const code of dfmCodes) {
      expect(skill, `SKILL.md is missing diagnostic ${code}`).toContain(code);
    }
  });

  it('does not name competitor vendors in prose', () => {
    // Vendor identifier in code blocks (vendor: 'sendcutsend') is data, not prose;
    // the rule ban is on narrative text.
    const noCodeBlocks = skill.replace(/```[\s\S]*?```/g, '');
    expect(noCodeBlocks).not.toMatch(/SendCutSend/i);
    expect(noCodeBlocks).not.toMatch(/sendcutsend\.com/i);
  });

  it('declares the kernelcad-shopcheck skill name in frontmatter', () => {
    expect(skill).toMatch(/^---\nname: kernelcad-shopcheck/);
  });
});
