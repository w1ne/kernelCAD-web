import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const README = readFileSync('README.md', 'utf8');
const SITE = readFileSync('site/index.html', 'utf8');
const LLM_SERVICE = readFileSync('src/studio/features-ui/ai/LLMService.ts', 'utf8');

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

  it('keeps the landing page concrete about source and deterministic review', () => {
    expect(SITE).toContain('editable .kcad.ts');
    expect(SITE).toContain('review_cad');
    expect(SITE).toMatch(/\bdeterministic review\b/i);

    expect(SITE).not.toMatch(/\bWords to CAD\b/i);
    expect(SITE).not.toMatch(/\bText-to-CAD prompt\b/i);
  });

  it('moves the Studio assistant prompt from Replicad-first to kernelCAD APIs', () => {
    expect(LLM_SERVICE).toContain('kernelCAD APIs');
    expect(LLM_SERVICE).toContain('review_cad');
    expect(LLM_SERVICE).toMatch(/\bassemblies\b/i);
    expect(LLM_SERVICE).toMatch(/\bparams\b/i);
    expect(LLM_SERVICE).toMatch(/\bNURBS\b/);
    expect(LLM_SERVICE).toMatch(/\bSDF\b/);
    expect(LLM_SERVICE).toMatch(/\bsheet metal\b/i);

    expect(LLM_SERVICE).not.toContain("generate 3D geometry using the 'replicad' library");
    expect(LLM_SERVICE).not.toContain('standard Replicad API methods');
  });
});
