// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Drift gate tying the finish vocabulary (code) to what the skills teach (docs).
// Mirrors the SHAPE_METHODS / PATH_BUILDER_METHODS skill-drift pattern. Two
// failures it must catch:
//   - a finish added to `FINISHES` that no skill documents → agents can't find it;
//   - a finish the authoring skill advertises that `FINISHES` does not define →
//     `.finish('that')` throws at runtime, so the doc is a lie.
// The authoring skill wraps its vocabulary table in FINISH-VOCABULARY markers so
// this gate compares an exact set, not a fuzzy word-boundary scan.

import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { FINISH_TOKENS } from '../../../src/shared/render/finishes';
import { assertEveryNameInSKILL, loadCombinedSkillMd } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORING_SKILL = resolvePath(
  __dirname,
  '../../../src/agent/skills/kernelcad-authoring/SKILL.md',
);

/** Pull the inline-code tokens the authoring skill lists between the
 *  FINISH-VOCABULARY markers. That block is the human-facing source of truth. */
function documentedFinishes(): string[] {
  const src = readFileSync(AUTHORING_SKILL, 'utf8');
  const m = src.match(/<!-- FINISH-VOCABULARY:START -->([\s\S]*?)<!-- FINISH-VOCABULARY:END -->/);
  if (!m) {
    throw new Error(
      'FINISH-VOCABULARY markers not found in kernelcad-authoring/SKILL.md. ' +
        'The finish drift gate needs the vocabulary table wrapped in ' +
        '`<!-- FINISH-VOCABULARY:START -->` / `<!-- FINISH-VOCABULARY:END -->`.',
    );
  }
  return [...m[1].matchAll(/`([a-z][a-z0-9-]*)`/g)].map((x) => x[1]);
}

describe('finish vocabulary ↔ skill drift', () => {
  it('every FINISH_TOKENS entry is mentioned somewhere in the skills', () => {
    // Word-boundary scan across all SKILL.md files (same as the other gates).
    assertEveryNameInSKILL(loadCombinedSkillMd(), FINISH_TOKENS, 'finish tokens');
  });

  it('the authoring vocabulary table lists exactly the finishes that exist', () => {
    const documented = new Set(documentedFinishes());
    const real = new Set<string>(FINISH_TOKENS);

    const undocumented = [...real].filter((t) => !documented.has(t));
    const phantom = [...documented].filter((t) => !real.has(t));

    expect(
      undocumented,
      `Finishes in FINISHES but missing from the authoring vocabulary table: ${undocumented.join(', ')}. ` +
        'Add them to the FINISH-VOCABULARY table in kernelcad-authoring/SKILL.md.',
    ).toEqual([]);
    expect(
      phantom,
      `Finishes in the authoring vocabulary table that do not exist in FINISHES: ${phantom.join(', ')}. ` +
        'A .finish() call with one of these throws at runtime — fix the table or add the token.',
    ).toEqual([]);
  });
});
