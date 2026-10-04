// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

describe('lookupCookbookTool — ChatGPT fail J/K industry cookbooks', () => {
  it('finds scissor-lift-closed-loop for scissor / pin_slot queries', async () => {
    for (const query of [
      'scissor lift table mechanism',
      'industrial scissor jack closed loop',
      'joint.scissorLift pin_slot',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('scissor-lift-closed-loop');
    }
  });

  it('finds multi-dof-robot-arm-4axis for 4-DOF / yaw-shoulder-elbow-wrist queries', async () => {
    for (const query of [
      '4-DOF robot arm mechanicalJoint',
      'multi dof production robot arm bridged yoke',
      'base yaw shoulder elbow wrist reach cycle',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('multi-dof-robot-arm-4axis');
    }
  });
});
