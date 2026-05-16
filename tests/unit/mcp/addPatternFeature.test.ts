import { describe, it, expect } from 'vitest';
import { addPatternFeatureTool } from '../../../src/agent/mcp/tools/addPatternFeature';

// kernelCAD scripts have a top-level `return`. The MCP add_pattern_feature
// tool inserts the patternX call before that return; the script then gets
// re-evaluated. We don't assert on eval diagnostics here (the inserted call
// references a `plate` Shape that's bound earlier in the same script).
const baseCode = [
  `const plate = box(100, 60, 6);`,
  `return plate;`,
].join('\n');

describe('add_pattern_feature MCP tool', () => {
  it('inserts a linear-pattern call', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'linear',
      linear: { count: 4, direction: [1, 0, 0], spacing: 20 },
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('plate.patternLinear({ count: 4, direction: [1, 0, 0], spacing: 20 });');
  });

  it('inserts a circular-pattern call with omitted angleDeg', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'circular',
      circular: { count: 6, axis: [0, 0, 1] },
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('plate.patternCircular({ count: 6, axis: [0, 0, 1] });');
    expect(out.new_code).not.toContain('angleDeg');
  });

  it('inserts a circular-pattern call with explicit angleDeg', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'circular',
      circular: { count: 6, axis: [0, 0, 1], angleDeg: 180 },
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('angleDeg: 180');
  });

  it('inserts a grid-pattern call', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'grid',
      grid: {
        x: { count: 3, direction: [1, 0, 0], spacing: 10 },
        y: { count: 2, direction: [0, 1, 0], spacing: 15 },
      },
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('patternGrid');
    expect(out.new_code).toContain('count: 3');
    expect(out.new_code).toContain('count: 2');
  });

  it('honors assign_to with a const binding', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'linear',
      linear: { count: 4, direction: [1, 0, 0], spacing: 20 },
      assign_to: 'arrayedPlate',
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('const arrayedPlate = plate.patternLinear');
  });

  it('rejects kind=linear without linear field', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'linear',
    });
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe('feature.invalid-args');
  });

  it('rejects count < 2 with feature.pattern.count-out-of-range', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'linear',
      linear: { count: 1, direction: [1, 0, 0], spacing: 20 },
    });
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe('feature.pattern.count-out-of-range');
  });

  it('rejects non-finite spacing', async () => {
    const out = await addPatternFeatureTool({
      code: baseCode, target: 'plate', kind: 'linear',
      linear: { count: 4, direction: [1, 0, 0], spacing: 0 },
    });
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe('feature.invalid-args');
  });
});
