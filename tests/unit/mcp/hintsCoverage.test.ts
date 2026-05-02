// tests/unit/mcp/hintsCoverage.test.ts
//
// Structural sentinel: every diagnostic code emitted in source must
// have a HINTS entry, or be explicitly allowlisted as not-needing-hint.
// Catches the rc.16 C1 class of failure.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HINTS } from '../../../src/mcp/tools/whyDidThisFail';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolvePath(__dirname, '../../../src');

// Codes intentionally without hints (forward-looking, deprecated, etc).
// Adding to this list is meaningful — it must be a deliberate choice,
// not an oversight. Each entry should have a comment explaining why.
const ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // empty for now; populated as the kernel surfaces legitimate exclusions
]);

// Files that emit diagnostics — read these and grep for code: '...'.
// New emitters: add to this list (deliberate registration).
const EMITTING_FILES = [
  'script-runtime/export.ts',
  'compute/recomputeEngine.ts',
  'backends/occt/occtLowerer.ts',
  'backends/occt/edgeSelection.ts',
  'capture/proxy.ts',
  'capture/sketch.ts',
  'intent/kernelError.ts',  // some throws build KernelErrors with hardcoded codes
];

function extractEmittedCodes(content: string): string[] {
  // Match: code: 'string-with-dots-and-dashes' OR code: "string-..."
  const pattern = /\bcode\s*:\s*['"]([a-z][\w.\-]*)['"]/g;
  const codes: string[] = [];
  let m;
  while ((m = pattern.exec(content)) !== null) {
    codes.push(m[1]);
  }
  return codes;
}

describe('HINTS coverage sentinel', () => {
  it('every diagnostic code emitted in source has a HINTS entry', () => {
    const allEmitted: { file: string; code: string }[] = [];
    for (const relPath of EMITTING_FILES) {
      const fullPath = join(SRC_DIR, relPath);
      let content: string;
      try {
        content = readFileSync(fullPath, 'utf8');
      } catch (e) {
        // File doesn't exist — sentinel-design issue (added a non-existent path
        // to EMITTING_FILES). Surface clearly.
        throw new Error(
          `EMITTING_FILES references ${relPath} which doesn't exist. ` +
          `Update the list to match current source layout.`,
        );
      }
      for (const code of extractEmittedCodes(content)) {
        allEmitted.push({ file: relPath, code });
      }
    }

    const missing: { file: string; code: string }[] = [];
    const seen = new Set<string>();
    for (const { file, code } of allEmitted) {
      // Deduplicate by code; report the first file each missing code appears in.
      if (seen.has(code)) continue;
      seen.add(code);
      if (!HINTS[code] && !ALLOWLIST.has(code)) {
        missing.push({ file, code });
      }
    }

    expect(
      missing,
      `Diagnostic codes emitted in source but missing from HINTS table:\n` +
      missing.map((m) => `  ${m.file}: '${m.code}'`).join('\n') +
      `\n\nAdd entries in src/mcp/tools/whyDidThisFail.ts HINTS, OR add to ALLOWLIST in this test with a rationale comment.`,
    ).toEqual([]);
  });
});
