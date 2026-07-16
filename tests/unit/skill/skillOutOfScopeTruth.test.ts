// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Out of Scope truth sentinel.
//
// WHAT THIS REPLACED, AND WHY IT MATTERS
// --------------------------------------
// The previous version of this file grepped the Out of Scope block for four
// hardcoded words (Hole/cutout/Assemblies/joints). None had appeared in that
// block for a long time, so it passed unconditionally — green for months while
// the list told agents that rational NURBS, STEP export, dimensioned drawings,
// and the entire motion-simulation lane all "return errors today". It then
// false-positived on the phrase "hole callouts" the first time the list was
// corrected, because /\bHole\b/i cannot tell the shipped `hole` feature from a
// deferred drawing annotation. It was worse than nothing: its name claimed this
// surface was covered.
//
// This version checks the claims against the live TOOL_REGISTRY instead of
// against a word list. Keep it that way.
import { describe, expect, it } from 'vitest';
import {
  OUT_OF_SCOPE_CLAIMS,
  checkOutOfScopeClaims,
} from '../../../src/agent/skills/outOfScope';
import { renderOutOfScopeSection } from '../../../scripts/buildOutOfScopeSection';
import { loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

/**
 * Manual claims are the unavoidable escape hatch: capabilities that would ship
 * as a new *parameter* rather than new registry surface, so no probe can see
 * them. They are also how the previous thunk happened, so the count is
 * ratcheted — a new claim must be machine-checkable, or this number must be
 * raised deliberately in review with a reason.
 */
const MAX_MANUAL_CLAIMS = 3;

describe('SKILL.md Out of Scope truth sentinel', () => {
  it('every claim is still true against the live tool registry', () => {
    const offenders = checkOutOfScopeClaims()
      .filter((r) => !r.ok)
      .map((r) => `${r.claimId}: ${r.reason}`);

    expect(
      offenders,
      `Out of Scope claims that no longer hold — the feature SHIPPED and the skill ` +
        `is now lying to every agent that reads it:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the SKILL.md block matches the registry (no hand edits)', () => {
    const expected = renderOutOfScopeSection(OUT_OF_SCOPE_CLAIMS);
    expect(
      SKILL_MD.includes(expected.trim()),
      'The Out of Scope block in kernelcad-authoring/SKILL.md has drifted from ' +
        'OUT_OF_SCOPE_CLAIMS. It is generated — edit src/agent/skills/outOfScope.ts, ' +
        'then run `npm run skill:out-of-scope`. Do not hand-edit the block.',
    ).toBe(true);
  });

  it('registry hygiene: unique ids, non-empty claims, at least one probe each', () => {
    const offenders: string[] = [];
    const seen = new Set<string>();
    for (const c of OUT_OF_SCOPE_CLAIMS) {
      if (seen.has(c.id)) offenders.push(`${c.id}: duplicate id`);
      seen.add(c.id);
      if (!/^[a-z][a-z0-9-]*$/.test(c.id)) offenders.push(`${c.id}: id must be kebab-case`);
      if (c.claim.trim().length === 0) offenders.push(`${c.id}: empty claim text`);
      if (c.probes.length === 0) {
        offenders.push(
          `${c.id}: no probe — an unprobed claim is exactly the thunk this file replaced`,
        );
      }
      for (const p of c.probes) {
        if (p.kind === 'manual' && p.justification.trim().length === 0) {
          offenders.push(`${c.id}: manual probe needs a justification saying what was checked`);
        }
      }
    }
    expect(offenders, `Out of Scope registry hygiene:\n${offenders.join('\n')}`).toEqual([]);
  });

  it(`no more than ${MAX_MANUAL_CLAIMS} claims rely on a manual probe`, () => {
    const manual = OUT_OF_SCOPE_CLAIMS.filter((c) =>
      c.probes.every((p) => p.kind === 'manual'),
    ).map((c) => c.id);

    expect(
      manual.length,
      `${manual.length} claims are manual-only (${manual.join(', ')}), ceiling is ` +
        `${MAX_MANUAL_CLAIMS}. Prefer an enum-absent probe. If a new claim genuinely ` +
        `cannot be probed, raise MAX_MANUAL_CLAIMS deliberately and say why in review.`,
    ).toBeLessThanOrEqual(MAX_MANUAL_CLAIMS);
  });
});

// The predecessor of this file could not fail. Passing therefore proves nothing
// about a guard on its own — these tests prove the checker actually fires, using
// synthetic claims so they never depend on the real registry's contents.
describe('checkOutOfScopeClaims — the guard can actually fail', () => {
  it("flags a claim whose capability has shipped ('step' IS a live export format)", () => {
    const [result] = checkOutOfScopeClaims([
      {
        id: 'synthetic-step',
        claim: 'STEP export — deferred',
        probes: [{ kind: 'enum-absent', tool: 'export', property: 'format', value: 'step' }],
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/SHIPPED/);
    expect(result.reason).toMatch(/synthetic-step/);
  });

  it('flags a probe whose target tool no longer exists, rather than passing silently', () => {
    const [result] = checkOutOfScopeClaims([
      {
        id: 'synthetic-renamed',
        claim: 'something — deferred',
        probes: [
          { kind: 'enum-absent', tool: 'tool_that_does_not_exist', property: 'of', value: 'x' },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not in TOOL_REGISTRY/);
  });

  it('passes a claim whose capability is genuinely absent', () => {
    const [result] = checkOutOfScopeClaims([
      {
        id: 'synthetic-absent',
        claim: 'holography export — deferred',
        probes: [
          { kind: 'enum-absent', tool: 'export', property: 'format', value: 'hologram' },
        ],
      },
    ]);
    expect(result.ok).toBe(true);
  });

  it('does not silently pass a manual-only claim off as machine-checked', () => {
    const results = checkOutOfScopeClaims([
      {
        id: 'synthetic-manual',
        claim: 'something unprobeable — deferred',
        probes: [{ kind: 'manual', justification: 'checked by hand' }],
      },
    ]);
    // Manual probes yield no result at all — they are not evidence. The
    // MAX_MANUAL_CLAIMS ratchet above is what keeps this set from growing.
    expect(results).toEqual([]);
  });
});
