// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { svgSheetToDxf } from './svgSheetToDxf';

const sheet = `<svg viewBox="0 0 100 50">
  <g class="visible"><line x1="0" y1="10" x2="40" y2="10"/></g>
  <g class="hidden"><path d="M 0 20 L 10 20 L 10 30 Z"/></g>
  <circle cx="5" cy="5" r="2"/>
  <text x="8" y="12" font-size="3.2" transform="rotate(-90 8 12)">40</text>
</svg>`;

describe('svgSheetToDxf', () => {
  const dxf = svgSheetToDxf(sheet);

  it('is metric DXF that AutoCAD and Fusion open', () => {
    expect(dxf).toContain('AC1027');
    expect(dxf).toContain('$INSUNITS\n70\n4');
    expect(dxf.endsWith('EOF\n')).toBe(true);
  });

  it('flips SVG y-down into DXF y-up and keeps millimetres', () => {
    expect(dxf).toContain('LINE');
    expect(dxf).toContain('\n10\n0\n20\n40\n');
    expect(dxf).toContain('\n11\n40\n21\n40\n');
  });

  it('puts hidden geometry on its own layer and writes text', () => {
    expect(dxf).toContain('HIDDEN');
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('\n1\n40\n');
    expect(dxf).toContain('\n50\n90\n');
    expect(dxf).toContain('CIRCLE');
  });
});
