import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const README = readFileSync(resolvePath(__dirname, '../../../README.md'), 'utf8');

describe('README MCP tool count truth', () => {
  it('does not advertise a hard-coded MCP tool count that drifts from SKILL.md', () => {
    expect(README).not.toMatch(/\b\d+\s+introspection tools\b/i);
  });
});
