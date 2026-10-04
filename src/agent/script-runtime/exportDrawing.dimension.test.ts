// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';
import { toDrawingAnnotation } from './exportDrawing';

const SRC = `
const plate = box(40, 20, 10)
  .subtract(cylinder(20, 2.5).translate(5, 10, -5))
  .subtract(cylinder(20, 2.5).translate(35, 10, -5));
return plate.dimension({ kind: 'linear', from: [5, 10, 10], to: [35, 10, 10], label: 'PITCH 30' });`;

const draw = async (options: Record<string, unknown> = {}) => {
  const r = await runAndExport({
    code: SRC, fileName: 'plate.kcad.ts', format: 'svg-drawing',
    options: { format: 'svg-drawing', ...options } as never,
  });
  return new TextDecoder().decode(r.bytes);
};

describe('declared dimensions on drawings', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('draws the declared label on the SVG sheet', async () => {
    expect(await draw()).toContain('PITCH 30');
  });

  it('authored export-option annotations win over declared ones', async () => {
    const svg = await draw({ annotations: [{ kind: 'linear', from: [0, 0, 10], to: [40, 0, 10], text: 'AUTHORED' }] });
    expect(svg).toContain('AUTHORED');
    expect(svg).not.toContain('PITCH 30');
  });

  it('maps spec kinds to annotations', () => {
    expect(toDrawingAnnotation({ kind: 'diameter', edge: { at: [0, 0, 0] } as never })).toEqual({ kind: 'diameter', edge: { at: [0, 0, 0] } });
    expect(toDrawingAnnotation({ kind: 'linear', from: [0, 0, 0], to: [1, 0, 0], label: 'X' })).toMatchObject({ kind: 'linear', text: 'X' });
  });
});
