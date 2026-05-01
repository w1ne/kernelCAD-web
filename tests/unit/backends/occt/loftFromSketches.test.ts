// tests/unit/backends/occt/loftFromSketches.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/capture/sketch';

const square2x2: SketchCommand[] = [
  { kind: 'moveTo', x: -1, y: -1 },
  { kind: 'lineTo', x: 1, y: -1 },
  { kind: 'lineTo', x: 1, y: 1 },
  { kind: 'lineTo', x: -1, y: 1 },
  { kind: 'close' },
];

const square4x4: SketchCommand[] = [
  { kind: 'moveTo', x: -2, y: -2 },
  { kind: 'lineTo', x: 2, y: -2 },
  { kind: 'lineTo', x: 2, y: 2 },
  { kind: 'lineTo', x: -2, y: 2 },
  { kind: 'close' },
];

const square6x6: SketchCommand[] = [
  { kind: 'moveTo', x: -3, y: -3 },
  { kind: 'lineTo', x: 3, y: -3 },
  { kind: 'lineTo', x: 3, y: 3 },
  { kind: 'lineTo', x: -3, y: 3 },
  { kind: 'close' },
];

describe('OcctBackend.loftFromSketches', () => {
  beforeAll(async () => { await initOcct(); });

  it('2-section axial loft: 2x2 square → 4x4 square at z=30 produces a frustum solid', () => {
    const s1 = OcctBackend.fromSketchCommands(square2x2);
    const s2 = OcctBackend.fromSketchCommands(square4x4);
    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 30] },
    ];
    const lofted = OcctBackend.loftFromSketches([s1, s2], planes);
    expect(lofted.kind).toBeUndefined();
    // Frustum volume: h/3 × (A1 + A2 + √(A1·A2)) = 30/3 × (4 + 16 + 8) = 280
    const v = lofted.volume();
    expect(v).toBeGreaterThan(260);
    expect(v).toBeLessThan(300);
  });

  it('3-section loft: square stack 2→4→6 at z=0/30/60 → tapered solid with positive volume', () => {
    const s1 = OcctBackend.fromSketchCommands(square2x2);
    const s2 = OcctBackend.fromSketchCommands(square4x4);
    const s3 = OcctBackend.fromSketchCommands(square6x6);
    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 30] },
      { plane: 'XY', origin: [0, 0, 60] },
    ];
    const lofted = OcctBackend.loftFromSketches([s1, s2, s3], planes);
    expect(lofted.volume()).toBeGreaterThan(0);
  });

  it('throws on fewer than 2 sketches', () => {
    const s1 = OcctBackend.fromSketchCommands(square2x2);
    expect(() => OcctBackend.loftFromSketches([s1], [{ plane: 'XY', origin: [0, 0, 0] }]))
      .toThrow(/at least 2 sketches/i);
  });

  it('throws when planes count does not match sketches count', () => {
    const s1 = OcctBackend.fromSketchCommands(square2x2);
    const s2 = OcctBackend.fromSketchCommands(square4x4);
    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
    ];
    expect(() => OcctBackend.loftFromSketches([s1, s2], planes))
      .toThrow(/planes count.*must equal sketches count/i);
  });

  it('throws when input is not a sketch-tagged backend', () => {
    const cube = OcctBackend.box(1, 1, 1);
    const s1 = OcctBackend.fromSketchCommands(square2x2);
    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 30] },
    ];
    expect(() => OcctBackend.loftFromSketches([cube, s1], planes))
      .toThrow(/not a sketch/);
  });

  it('ruled: true produces a valid solid (sharp transitions)', () => {
    const s1 = OcctBackend.fromSketchCommands(square2x2);
    const s2 = OcctBackend.fromSketchCommands(square4x4);
    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 30] },
    ];
    const lofted = OcctBackend.loftFromSketches([s1, s2], planes, { ruled: true });
    expect(lofted.volume()).toBeGreaterThan(0);
  });
});
