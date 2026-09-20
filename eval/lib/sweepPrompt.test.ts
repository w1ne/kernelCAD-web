// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSweepPrompt, extractSections, loadPresets } from './sweepPrompt';

const FIXTURE_MD = [
  '# Title',
  '',
  'intro text',
  '',
  '## Alpha',
  '',
  'alpha body',
  '',
  '### Alpha sub',
  '',
  'sub body',
  '',
  '## Beta',
  '',
  'beta body',
].join('\n');

describe('extractSections', () => {
  it('extracts h2 sections with their heading line and drops the intro', () => {
    const s = extractSections(FIXTURE_MD);
    expect([...s.keys()]).toEqual(['Alpha', 'Beta']);
    expect(s.get('Alpha')).toContain('## Alpha');
    expect(s.get('Alpha')).toContain('### Alpha sub');
    expect(s.get('Alpha')).not.toContain('intro text');
    expect(s.get('Beta')).toContain('beta body');
  });
});

describe('buildSweepPrompt', () => {
  it('throws on an unknown preset', () => {
    expect(() => buildSweepPrompt({ preset: 'nope' })).toThrow(/unknown prompt preset/);
  });

  it('throws when an allowlisted heading is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'preset-'));
    writeFileSync(
      join(dir, 'sweep-prompt-presets.json'),
      JSON.stringify({ presets: { bad: { skills: ['kernelcad'], sections: { kernelcad: ['No Such Heading'] } } } }),
    );
    expect(() => buildSweepPrompt({ preset: 'bad', configPath: join(dir, 'sweep-prompt-presets.json') })).toThrow(
      /heading 'No Such Heading' not found in skill 'kernelcad'/,
    );
  });

  it('builds v1 and v2_lean from the real skills within budget', () => {
    const v1 = buildSweepPrompt({ preset: 'v1' });
    const v2 = buildSweepPrompt({ preset: 'v2_lean' });
    expect(v1.bytes).toBeGreaterThan(50_000);
    expect(v1.bytes).toBeLessThan(80_000);
    expect(v2.bytes).toBeGreaterThan(40_000);
    expect(v2.bytes).toBeLessThan(60_000);
    expect(v2.bytes).toBeLessThan(v1.bytes);
    expect(v1.text).toContain('## API Surface');
    expect(v2.text).not.toContain('## Connectors and mates');
  });

  it('full preset concatenates all sweep skills (legacy)', () => {
    const full = buildSweepPrompt({ preset: 'full' });
    expect(full.bytes).toBeGreaterThan(130_000);
    expect(full.text).toContain('## API Surface');
  });

  it('is deterministic', () => {
    expect(buildSweepPrompt({ preset: 'v1' }).text).toBe(buildSweepPrompt({ preset: 'v1' }).text);
  });

  it('loadPresets exposes full, v1, v2_lean', () => {
    expect(Object.keys(loadPresets()).sort()).toEqual(['full', 'v1', 'v2_lean']);
  });
});
