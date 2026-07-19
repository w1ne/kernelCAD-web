// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// SKILL.md told agents that "every PathBuilder coord and scalar accepts
// Editable<number>". `.circle` does not — its listApi signature is plain
// `number`, and passing a ParamRef fails at capture with "all of cx, cy, r must
// be finite numbers". An agent trusting the blanket claim writes
// `circle(0, 0, param('R', 3))` and hits a runtime error the docs said could not
// happen.
//
// This pins the two together: any PathBuilder method that does NOT accept
// Editable must be named as an exception in the prose. Adding a Editable-less
// method, or making `.circle` accept Editable without updating the text, fails
// here rather than in a user's script.

import { describe, it, expect } from 'vitest';
import { PATH_BUILDER_METHODS } from '../../../src/agent/mcp/tools/listApi';
import { loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

/** Methods taking only concrete numbers — the exceptions to the blanket claim. */
function methodsWithoutEditable(): string[] {
  return PATH_BUILDER_METHODS.filter((m) => !m.signature.includes('Editable')).map(
    (m) => m.name,
  );
}

describe('PathBuilder Editable claim matches the signatures', () => {
  it('every method that does NOT accept Editable is named as an exception', () => {
    const exceptions = methodsWithoutEditable();
    const unnamed = exceptions.filter(
      (name) => !new RegExp(`\\.?\\b${name}\\b`).test(SKILL_MD),
    );
    expect(
      unnamed,
      `PATH_BUILDER_METHODS entries take plain numbers but SKILL.md's ` +
        `"every coord and scalar accepts Editable<number>" does not carve them out: ` +
        `${unnamed.join(', ')}. Name each as an exception in the authoring skill, ` +
        `or widen the signature to Editable<number>.`,
    ).toEqual([]);
  });

  it('circle is still the known exception, and is called out by name', () => {
    // Guards the assertion above against becoming vacuous: if `.circle` ever
    // gains Editable support the exception list empties, the first test passes
    // trivially, and this one fails to say the prose now needs the carve-out
    // REMOVED rather than added.
    const exceptions = methodsWithoutEditable();
    expect(exceptions).toContain('circle');
    expect(SKILL_MD).toMatch(/except `?\.?circle/i);
  });
});
