// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// SKILL.md tells agents that "every PathBuilder coord and scalar accepts
// Editable<number>". `.circle` used to break that claim (plain `number`
// signature, ParamRef rejected at capture) and was carved out by name; it now
// accepts Editable like the rest.
//
// This pins the two together: any PathBuilder method that does NOT accept
// Editable must be named as an exception in the prose, and a method that gains
// Editable support must lose its carve-out.

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

  it('circle accepts Editable, and the prose no longer carves it out', () => {
    // `.circle` used to be the one exception. It now captures ParamRef centre
    // and radius symbolically, so it must not be listed as plain-number, and
    // the skill must not still tell agents to avoid ParamRefs there.
    const exceptions = methodsWithoutEditable();
    expect(exceptions).not.toContain('circle');
    expect(SKILL_MD).not.toMatch(/except `?\.?circle/i);
  });
});
