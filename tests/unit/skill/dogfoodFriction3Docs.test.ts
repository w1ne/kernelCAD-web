// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Dogfood friction, round 3: pin the documentation the fixes rely on, so the
// text an agent reads cannot drift from the behaviour.
//   - authoring skill: evaluate_script's mechanism check is shallow; run
//     review_cad (pose envelope + gravity) when the result has reviewHint.
//   - thread clearance: the pitch/8 cap and the FDM recipe (grow diameter).
//   - drawings: style 'architectural'.
//   - cookbook: the twisted vase explains the 6-fold symmetry of a hex twist.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHAPE_METHODS } from '../../../src/agent/mcp/tools/listApi';

const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf8');

describe('dogfood friction docs (round 3)', () => {
  it('authoring skill says evaluate_script mechanism checks are shallow and names review_cad', () => {
    const skill = read('src/agent/skills/kernelcad-authoring/SKILL.md');
    expect(skill).toContain('`evaluate_script` on a model with mates runs only a shallow mechanism check.');
    expect(skill).toContain('run `review_cad` for the pose-envelope + gravity checks');
  });

  it('hole API text, features skill and bolt cookbook document the clearance cap and the FDM recipe', () => {
    const hole = SHAPE_METHODS.find((m) => m.name === 'hole')!.description;
    expect(hole).toContain('capped at pitch/8 (0.125 mm on M6 × 1)');
    expect(hole).toContain('diameter: 6.7, thread: { pitch: 1, clearance: 0.125 }');
    const features = read('src/agent/skills/kernelcad-features/SKILL.md');
    expect(features).toContain('**Print tolerance (FDM).**');
    expect(features).toContain('add `4 × (play − pitch/8)` to `diameter`');
    const cookbook = read('cookbook/snippets/iso-metric-bolt-and-nut.md');
    expect(cookbook).toContain("const printPlay = param('printPlay', 0);");
    expect(cookbook).toContain('diameter: printPlay.multiply(4).add(spec.d)');
  });

  it('drawings skill documents the architectural style', () => {
    const skill = read('src/agent/skills/kernelcad-drawings/SKILL.md');
    expect(skill).toContain('## Architectural floor plans');
    expect(skill).toContain("`style: 'architectural'`");
    expect(skill).toContain('drawing.style.architectural-suggested');
  });

  it('the vase cookbook explains why a 60° twist of a hexagon is invisible', () => {
    const vase = read('cookbook/snippets/twisted-tapered-thin-wall-vase.md');
    expect(vase).toContain('a regular hexagon looks the same every 60°');
    expect(vase).toContain('const twistDeg = [0, 8, 18, 28, 36, 40];');
    expect(vase).toContain('return outer.subtract(inner);');
  });
});
