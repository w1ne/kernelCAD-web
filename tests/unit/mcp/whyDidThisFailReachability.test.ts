import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(
  resolvePath(__dirname, '../../../src/mcp/tools/whyDidThisFail.ts'),
  'utf8',
);

describe('whyDidThisFail HINTS table reachability classification', () => {
  it('every HINTS entry has an explicit reachable field', () => {
    const startMarker = 'const HINTS: Record<string, HintEntry> = {';
    const startIdx = SRC.indexOf(startMarker);
    expect(startIdx).toBeGreaterThan(-1);

    const tableStart = startIdx + startMarker.length;
    const tableEnd = SRC.indexOf('\n};', tableStart);
    expect(tableEnd).toBeGreaterThan(tableStart);

    const tableBody = SRC.slice(tableStart, tableEnd);

    const entryLineRegex = /^\s*'[^']+'\s*:\s*\{/gm;
    let m: RegExpExecArray | null;
    let entryCount = 0;
    while ((m = entryLineRegex.exec(tableBody)) !== null) {
      entryCount += 1;
      const tail = tableBody.slice(m.index);
      const closeIdx = tail.indexOf('}');
      expect(closeIdx).toBeGreaterThan(-1);
      const entryBody = tail.slice(0, closeIdx);
      expect(
        /reachable\s*:/.test(entryBody),
        `HINTS entry near offset ${m.index} is missing 'reachable:'. Body: ${entryBody.slice(0, 200)}`,
      ).toBe(true);
    }

    expect(entryCount).toBeGreaterThanOrEqual(30);
  });

  it('reachable values are only the three allowed enum values', () => {
    const allowed = new Set(["'engine-path'", "'direct-lowerer-only'", "'reserved'"]);
    const reachableValueRegex = /reachable\s*:\s*('[^']+')/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = reachableValueRegex.exec(SRC)) !== null) {
      count += 1;
      expect(allowed.has(m[1]), `Unknown reachable value: ${m[1]}`).toBe(true);
    }
    expect(count).toBeGreaterThanOrEqual(30);
  });

  it('feature.loft.bad-sketch and feature.sweep.multi-face-profile are direct-lowerer-only', () => {
    expect(SRC).toMatch(/'feature\.loft\.bad-sketch'\s*:\s*\{[^}]*reachable\s*:\s*'direct-lowerer-only'/);
    expect(SRC).toMatch(/'feature\.sweep\.multi-face-profile'\s*:\s*\{[^}]*reachable\s*:\s*'direct-lowerer-only'/);
  });
});
