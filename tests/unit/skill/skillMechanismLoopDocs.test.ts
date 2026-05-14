import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md fresh-agent mechanism loop docs', () => {
  it('documents the mechanism build loop and critical review tools', () => {
    expect(SKILL_MD).toMatch(/Mechanism build loop for fresh agents/);
    expect(SKILL_MD).toMatch(/inspect_assembly\(\{ file\? \| code\?, assembly\? \}\)/);
    expect(SKILL_MD).toMatch(/review_cad\(\{ file\? \| code\?/);
    expect(SKILL_MD).toMatch(/design_loop\(\{ goal, attempts/);
    expect(SKILL_MD).toMatch(/arm\.transmission\(name/);
    expect(SKILL_MD).toMatch(/assembly\.transmission\.missing-for-coupled-mate/);
    expect(SKILL_MD).toMatch(/assembly\.transmission\.path-disconnected/);
    expect(SKILL_MD).toMatch(/unexplainedGeometry/);
    expect(SKILL_MD).toMatch(/connector-not-in-solid/);
    expect(SKILL_MD).toMatch(/missing mate contact/);
  });

  it('does not advertise a stale fixed MCP tool count', () => {
    expect(SKILL_MD).not.toMatch(/exposes \d+ tools/);
  });
});
