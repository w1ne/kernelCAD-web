// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The design-loop quality gate turns the deterministic geometric contact
// graph into a review fact: floating/disconnected bodies block acceptance
// regardless of what the agent's prose visualReview claims. Unlike the
// hard-blocked visual.* checks, this fact is allow-listable with its explicit
// named code, because a genuinely multi-body deliverable is sometimes
// intended and the agent/human can attest to it.

import { describe, it, expect } from 'vitest';
import { geometryReviewFacts } from '../../../src/agent/mcp/tools/designLoop';
import type { ContactGraphResult } from '../../../src/modeling/runtime/contactGraph';

const connected: ContactGraphResult = {
  objectCount: 1,
  components: [['base', 'arm', 'link']],
  floatingParts: [],
  gapMm: 0.5,
};

const floating: ContactGraphResult = {
  objectCount: 2,
  components: [['base', 'arm'], ['bezel']],
  floatingParts: ['bezel'],
  gapMm: 0.5,
};

describe('geometryReviewFacts — deterministic floating-geometry gate', () => {
  it('returns no facts when geometry was not computed', () => {
    expect(geometryReviewFacts(undefined, [])).toEqual([]);
  });

  it('returns no facts when the whole scene is one connected body', () => {
    expect(geometryReviewFacts(connected, [])).toEqual([]);
  });

  it('emits a warning naming the floating parts and object count', () => {
    const facts = geometryReviewFacts(floating, []);
    expect(facts).toHaveLength(1);
    expect(facts[0].code).toBe('assembly.geometry.floating-body');
    expect(facts[0].severity).toBe('warning');
    expect(facts[0].message).toContain('bezel');
    expect(facts[0].message).toContain('2');
  });

  it('can be silenced only by explicitly allow-listing its named code', () => {
    expect(geometryReviewFacts(floating, ['assembly.geometry.floating-body'])).toEqual([]);
  });
});
