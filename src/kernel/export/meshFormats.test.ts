// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { exportMeshObj, exportMeshUsd } from './meshFormats';

const triangle = {
  vertices: [0, 0, 0, 10, 0, 0, 0, 10, 0],
  triangles: [0, 1, 2],
};

describe('mesh interchange writers', () => {
  it('writes OBJ vertices and 1-based triangular faces', () => {
    const text = new TextDecoder().decode(exportMeshObj([{ name: 'Plate', mesh: triangle }]));
    expect(text).toContain('o Plate');
    expect(text).toContain('v 10 0 0');
    expect(text).toContain('f 1 2 3');
  });

  it('writes parseable USDA mesh topology and declares millimeter Z-up units', () => {
    const text = new TextDecoder().decode(exportMeshUsd([{ name: 'Plate', mesh: triangle }]));
    expect(text).toMatch(/^#usda 1\.0/);
    expect(text).toContain('metersPerUnit = 0.001');
    expect(text).toContain('upAxis = "Z"');
    expect(text).toContain('def Mesh "Plate"');
    expect(text).toMatch(/point3f\[\] points = \[[\s\S]*?\(0, 0, 0\),[\s\S]*?\(10, 0, 0\),[\s\S]*?\(0, 10, 0\)/);
    expect(text).toContain('int[] faceVertexCounts = [3]');
    expect(text).toContain('int[] faceVertexIndices = [0, 1, 2]');
  });
});
