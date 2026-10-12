// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHAPE_METHODS } from '../../../src/agent/mcp/tools/listApi';
describe('functional drawing API discovery', () => {
  it('documents source-bound review and stable dimension identity in API discovery', () => {
    expect(SHAPE_METHODS.find(m => m.name === 'drawingReview')?.signature).toContain('DrawingReviewPlan');
    expect(SHAPE_METHODS.find(m => m.name === 'dimension')?.signature).toContain('id?: string');
    for (const name of ['kernelcad-authoring','kernelcad-drawings']) {
      const skill = readFileSync(`src/agent/skills/${name}/SKILL.md`,'utf8');
      expect(skill).toContain('drawingReview');
      expect(skill).toContain('authored:');
    }
  });
});
