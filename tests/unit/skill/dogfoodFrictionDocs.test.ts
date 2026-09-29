// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Dogfood friction: agents lost calls to three documentation gaps. Pin the
// text AND the geometry it describes, so the docs can't drift from the kernel.
//   - box(w, d, h, true) centres ALL THREE axes (cylinder keeps z = 0).
//   - ParamRef arithmetic uses .add/.subtract/.multiply/.divide/.negate.
//   - "check your work": render top/front/iso before calling a layout done.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { GLOBALS } from '../../../src/agent/mcp/tools/listApi';

const AUTHORING_SKILL = readFileSync(
  resolve(__dirname, '../../../src/agent/skills/kernelcad-authoring/SKILL.md'),
  'utf8',
);

function globalEntry(name: string): string {
  const e = GLOBALS.find((g) => g.name === name);
  if (e === undefined) throw new Error(`no GLOBALS entry '${name}'`);
  return e.description;
}

describe('primitive centring docs match the kernel', () => {
  beforeAll(async () => { await initOcct(); });

  it('box(…, true) centres Z too; cylinder bottom stays on z = 0', async () => {
    const m = await buildModel({ fileName: 'box-centred.kcad.ts', code: 'return box(10, 20, 30, true);' });
    const bb = m.tailShape!.boundingBox();
    expect(bb.min[2]).toBeCloseTo(-15, 5);
    expect(bb.max[2]).toBeCloseTo(15, 5);
    const c = await buildModel({ fileName: 'cyl.kcad.ts', code: 'return cylinder(30, 5);' });
    expect(c.tailShape!.boundingBox().min[2]).toBeCloseTo(0, 5);

    expect(globalEntry('box')).toContain('ALL THREE axes');
    expect(globalEntry('box')).toContain('-z/2..+z/2');
    expect(globalEntry('cylinder')).toContain('z = 0..h');
    expect(AUTHORING_SKILL).toContain('centered=true centres ALL');
  });

  it('the documented cavity-from-floor example keeps the floor', async () => {
    // Same expression as the box API text / authoring skill.
    const expr = 'base.subtract(box(x - 2*wall, y - 2*wall, z, true).translate(x/2, y/2, floor + z/2))';
    expect(globalEntry('box')).toContain(expr);
    expect(AUTHORING_SKILL).toContain(expr);
    const x = 40, y = 30, z = 20, wall = 2, floor = 3;
    const m = await buildModel({
      fileName: 'cavity.kcad.ts',
      code: `const x = ${x}, y = ${y}, z = ${z}, wall = ${wall}, floor = ${floor};
        const base = box(x, y, z);
        return ${expr};`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const expected = x * y * z - (x - 2 * wall) * (y - 2 * wall) * (z - floor);
    expect(m.tailShape!.volume()).toBeCloseTo(expected, 0);
    expect(m.tailShape!.boundingBox().min[2]).toBeCloseTo(0, 5);
  });
});

describe('ParamRef arithmetic example', () => {
  beforeAll(async () => { await initOcct(); });

  it('param() API text and the authoring skill show the method API, and it evaluates', async () => {
    const text = globalEntry('param');
    for (const m of ['.add(5)', '.subtract(t)', '.multiply(2)', '.divide(4)', '.negate()']) {
      expect(text).toContain(m);
    }
    expect(AUTHORING_SKILL).toContain("box(w.add(5), w.subtract(t).multiply(2), w.divide(4))");
    const m = await buildModel({
      fileName: 'param-arith.kcad.ts',
      code: `const w = param('w', 60), t = param('t', 2);
        return box(w.add(5), w.subtract(t).multiply(2), w.divide(4));`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bb = m.tailShape!.boundingBox();
    expect(bb.max[0] - bb.min[0]).toBeCloseTo(65, 5);
    expect(bb.max[1] - bb.min[1]).toBeCloseTo(116, 5);
    expect(bb.max[2] - bb.min[2]).toBeCloseTo(15, 5);
  });
});

describe('authoring skill: check your work', () => {
  it('tells the agent to render top/front/iso before calling a layout done', () => {
    expect(AUTHORING_SKILL).toContain('Check your work: render top, front and iso before calling a layout done.');
    expect(AUTHORING_SKILL).toContain('decorations overlap holes');
  });
});
