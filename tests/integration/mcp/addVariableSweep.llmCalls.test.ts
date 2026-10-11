// tests/integration/mcp/addVariableSweep.llmCalls.test.ts
//
// LLM-style calls to `add_variable_sweep`, made through the public registry
// exactly as a ChatGPT / Claude client sends them after reading the tool
// description: the description's own example, a ring band on a closed spine,
// the binding form, the argument-name slips models make (`spine`, `profile`,
// no `t`), and genuinely-invalid inputs, which must come back as coded
// diagnostics naming the argument and the bad value.
import { describe, it, expect, beforeAll } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { AddVariableSweepOutput } from '../../../src/agent/mcp/tools/addVariableSweep';

async function sweep(args: Record<string, unknown>): Promise<AddVariableSweepOutput> {
  return (await callMcpTool('add_variable_sweep', args)) as AddVariableSweepOutput;
}

function ringPoints(radius: number, n: number): number[][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [radius * Math.cos(a), radius * Math.sin(a), 0];
  });
}

const errors = (r: AddVariableSweepOutput) => (r.diagnostics ?? []).filter((d) => d.severity === 'error');

describe('add_variable_sweep — LLM-style calls', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('the description example builds a tapered horn and measures it', async () => {
    const r = await sweep({
      code: 'return box(1, 1, 1);',
      spine_points: [[0, 0, 0], [0, 10, 30], [0, 0, 60]],
      sections: [{ t: 0, radius: 8 }, { t: 0.5, radius: 10 }, { t: 1, radius: 4 }],
    });
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sweep!.volumeMm3).toBeGreaterThan(5000);
    expect(r.sweep!.bbox.max[2]).toBeGreaterThan(59);
    // Inserted before the return, which does not use it yet — say so.
    expect(r.notes?.join(' ')).toMatch(/return does not use it/);
  });

  it('a fresh script ("") with a closed spine makes a ring band that is returned', async () => {
    const r = await sweep({
      code: '',
      spine_points: ringPoints(10, 12),
      spine_closed: true,
      sections: [{ radius: 1.5 }, { radius: 2.5 }, { radius: 1.5 }],
      binding_name: 'band',
    });
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('spline3d(');
    expect(r.new_code).toContain('{ closed: true }');
    expect(r.new_code).toMatch(/return band;\s*$/);
    expect(r.notes?.join(' ')).toMatch(/spread evenly as 0, 0.5, 1/);
    // A torus-like band: tube cross-section between pi*1.5^2 and pi*2.5^2 over ~2*pi*10.
    const len = 2 * Math.PI * 10;
    expect(r.sweep!.volumeMm3).toBeGreaterThan(Math.PI * 1.5 ** 2 * len * 0.9);
    expect(r.sweep!.volumeMm3).toBeLessThan(Math.PI * 2.5 ** 2 * len);
  });

  it('the binding form works with existing spline3d + sketch bindings', async () => {
    const code = [
      'const spine = spline3d([[0, 0, 0], [5, 0, 20], [0, 0, 40]]);',
      'const big = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();',
      'const small = path().circle(0, 0, 2);',
      'return big;',
    ].join('\n');
    const r = await sweep({
      code,
      spine_binding: 'spine',
      sections: [{ t: 0, profile_binding: 'big' }, { t: 1, profile_binding: 'small' }],
    });
    expect(errors(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sweep!.volumeMm3).toBeGreaterThan(0);
  });

  it('accepts `spine` and per-section `profile` / `diameter` as aliases', async () => {
    const code = 'const spine = spline3d([[0, 0, 0], [0, 0, 40]]);\nconst s0 = path().circle(0, 0, 5);\nreturn s0;';
    const r = await sweep({ code, spine: 'spine', sections: [{ t: 0, profile: 's0' }, { t: 1, diameter: 4 }] });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('{ t: 0, profile: s0 }, { t: 1, profile: path().circle(0, 0, 2) }');
  });

  it('an undeclared spine binding is a coded error naming it, with a working example', async () => {
    const r = await sweep({ code: 'return box(1, 1, 1);', spine_binding: 'curve', sections: [{ t: 0, radius: 2 }, { t: 1, radius: 1 }] });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toContain('spine_binding "curve" is not declared');
    expect(r.error).toContain('Example: add_variable_sweep({ code, spine_points:');
  });

  it('a non-positive radius names the section, the argument and the value', async () => {
    const r = await sweep({ code: '', spine_points: [[0, 0, 0], [0, 0, 10]], sections: [{ t: 0, radius: 2 }, { t: 1, radius: -1 }] });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toContain('sections[1].radius must be a positive number in mm; got -1');
  });

  it('a section with no profile at all says which forms are accepted', async () => {
    const r = await sweep({ code: '', spine_points: [[0, 0, 0], [0, 0, 10]], sections: [{ t: 0, radius: 2 }, { t: 1 }] });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('sections[1] has no profile: give profile_binding (an existing Sketch), radius, or width + height');
  });
});
