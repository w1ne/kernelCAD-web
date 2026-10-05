// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { facingView, longestView } from '../../kernel/backends/occt/viewerDimensions/drawingAnnotation';
import { runAndExport } from './export';

const SRC = `
const plate = box(40, 20, 10)
  .subtract(cylinder(20, 2.5).translate(5, 10, -5))
  .subtract(cylinder(20, 2.5).translate(35, 10, -5));
return plate.dimension({ kind: 'linear', from: [5, 10, 10], to: [35, 10, 10], label: 'pitch' });`;

const draw = async (code: string, options: Record<string, unknown> = {}) => {
  const r = await runAndExport({
    code, fileName: 'plate.kcad.ts', format: 'svg-drawing',
    options: { format: 'svg-drawing', ...options } as never,
  });
  return new TextDecoder().decode(r.bytes);
};

describe('declared dimensions on drawings', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('prints the label as a name before the computed value', async () => {
    expect(await draw(SRC)).toContain('>pitch 30</text>');
  });

  it('authored export-option annotations win over declared ones', async () => {
    const svg = await draw(SRC, { annotations: [{ kind: 'linear', from: [0, 0, 10], to: [40, 0, 10], text: 'AUTHORED' }] });
    expect(svg).toContain('AUTHORED');
    expect(svg).not.toContain('pitch 30');
  });
});

describe('declared dimension view choice', () => {
  it('puts a linear dimension on the view where it projects longest', () => {
    expect(longestView([40, 0, 0])).toBe('front');
    expect(longestView([0, 18, 0])).toBe('top');
    expect(longestView([0, 0, 6])).toBe('front');
  });

  it('puts circles and angles on the view facing their plane', () => {
    expect(facingView([0, 0, 1])).toBe('top');
    expect(facingView([0, 1, 0])).toBe('front');
    expect(facingView([1, 0, 0])).toBe('left');
  });
});
