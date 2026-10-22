import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const README = readFileSync('README.md', 'utf8');

describe('Replicad-era public copy quarantine', () => {
  it('positions the README around editable .kcad.ts source and deterministic review', () => {
    expect(README).toContain('editable `.kcad.ts`');
    expect(README).toContain('review_cad');
    expect(README).toMatch(/\bassemblies\b/i);
    expect(README).toMatch(/\bparams\b/i);
    expect(README).toMatch(/\bNURBS\b/);
    expect(README).toMatch(/\bSDF\b/);
    expect(README).toMatch(/\bsheet metal\b/i);

    expect(README).not.toMatch(/\bAI-Native CAD Workbench\b/i);
    expect(README).not.toMatch(/\bturns words to CAD\b/i);
    expect(README).not.toMatch(/\bwords\s*->\s*generated/i);
  });

});
