// SPDX-License-Identifier: MIT
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHAPE_METHODS } from '../../../src/agent/mcp/tools/listApi';
describe('functional drawing API discovery', () => {
  it('documents source-bound review and stable dimension identity in API discovery', () => {
    expect(SHAPE_METHODS.find(m => m.name === 'drawingReview')?.signature).toContain('DrawingReviewPlan');
    expect(SHAPE_METHODS.find(m => m.name === 'dimension')?.signature).toContain('id?: string');
    for (const name of ['kernelcad-authoring','kernelcad-drawings']) {
      // A skill is its SKILL.md plus any references/*.md it loads on demand.
      const dir = `src/agent/skills/${name}`;
      const refs = existsSync(`${dir}/references`)
        ? readdirSync(`${dir}/references`).filter(f => f.endsWith('.md')).map(f => readFileSync(`${dir}/references/${f}`, 'utf8'))
        : [];
      const skill = [readFileSync(`${dir}/SKILL.md`, 'utf8'), ...refs].join('\n');
      expect(skill).toContain('drawingReview');
      expect(skill).toContain('authored:');
    }
  });
});
