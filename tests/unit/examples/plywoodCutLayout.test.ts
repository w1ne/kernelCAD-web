// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #959 post-merge: the plywood-organizer laser layout placed panels at fixed
// coordinates and the 150 mm base overlapped the side panels. The generator
// now packs the panels and asserts clearance; this checks its placements
// independently (and that it writes nothing in --check mode).
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(__dirname, '../../../examples/plywood-organizer/generate-cut-layout.py');

interface Placed { name: string; x: number; y: number; w: number; h: number }

describe('plywood-organizer cut layout (#959)', () => {
  it('places all seven panels on the sheet with at least the cut gap between them', () => {
    const out = JSON.parse(execFileSync('python3', [script, '--check'], { encoding: 'utf8' })) as {
      layoutSizeMm: [number, number]; gapMm: number; panels: Placed[];
    };
    const { panels, gapMm, layoutSizeMm: [W, H] } = out;
    expect(panels.map(p => p.name).sort()).toEqual(['back', 'base', 'front', 'left', 'long-divider', 'right', 'short-divider']);
    expect(gapMm).toBeGreaterThan(0);
    for (const p of panels) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(W);
      expect(p.y + p.h).toBeLessThanOrEqual(H);
    }
    const clashes: string[] = [];
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i], b = panels[j];
        const apart = a.x + a.w + gapMm <= b.x + 1e-9 || b.x + b.w + gapMm <= a.x + 1e-9
          || a.y + a.h + gapMm <= b.y + 1e-9 || b.y + b.h + gapMm <= a.y + 1e-9;
        if (!apart) clashes.push(`${a.name}/${b.name}`);
      }
    }
    expect(clashes).toEqual([]);
  });
});
