import { describe, expect, it } from 'vitest';
import { rotateSketchCommands } from '../../../../src/shared/capture/rotateSketchCommands';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';
import type { SketchCommand } from '../../../../src/shared/capture/sketchCommand';

const mm = (n: number) => toParam(n, 'mm');
const evl = (p: { evaluated: number }) => p.evaluated;

describe('rotateSketchCommands', () => {
  it('rotates line endpoints about the rotation center', () => {
    const cmds: SketchCommand[] = [
      { kind: 'moveTo', x: mm(1), y: mm(0) },
      { kind: 'lineTo', x: mm(0), y: mm(1) },
      { kind: 'close' },
    ];
    const out = rotateSketchCommands(cmds, 90, [0, 0]);
    const a = out[0] as { kind: string; x: { evaluated: number }; y: { evaluated: number } };
    expect(evl(a.x)).toBeCloseTo(0, 9);
    expect(evl(a.y)).toBeCloseTo(1, 9);
  });

  it('keeps arc scalar magnitudes under rotation', () => {
    const cmds: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'sagittaArc', x: mm(10), y: mm(0), sagitta: mm(2) },
      { kind: 'close' },
    ];
    const out = rotateSketchCommands(cmds, 45, [0, 0]);
    const arc = out[1] as { kind: string; sagitta: { evaluated: number } };
    expect(evl(arc.sagitta)).toBe(2);
  });

  it('rotates about a non-origin center', () => {
    const cmds: SketchCommand[] = [
      { kind: 'moveTo', x: mm(2), y: mm(0) },
      { kind: 'close' },
    ];
    const out = rotateSketchCommands(cmds, 90, [1, 0]);
    const a = out[0] as { x: { evaluated: number }; y: { evaluated: number } };
    expect(evl(a.x)).toBeCloseTo(1, 9);
    expect(evl(a.y)).toBeCloseTo(1, 9);
  });

  it('leaves a point sitting on the rotation center fixed', () => {
    const cmds: SketchCommand[] = [
      { kind: 'moveTo', x: mm(2), y: mm(3) },
      { kind: 'close' },
    ];
    const out = rotateSketchCommands(cmds, 90, [2, 3]);
    const a = out[0] as { x: { evaluated: number }; y: { evaluated: number } };
    expect(evl(a.x)).toBeCloseTo(2, 9);
    expect(evl(a.y)).toBeCloseTo(3, 9);
  });

  it('throws on a non-finite angle or center', () => {
    const cmds: SketchCommand[] = [
      { kind: 'moveTo', x: mm(1), y: mm(0) },
      { kind: 'close' },
    ];
    expect(() => rotateSketchCommands(cmds, NaN)).toThrow(/finite/);
    expect(() => rotateSketchCommands(cmds, Infinity)).toThrow(/finite/);
    expect(() => rotateSketchCommands(cmds, 90, [Infinity, 0])).toThrow(/finite/);
    expect(() => rotateSketchCommands(cmds, 90, [0, NaN])).toThrow(/finite/);
  });

  it('rotates hermite tangents as direction vectors without translating them', () => {
    const cmds: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'hermiteG2_2d',
        ax: mm(0), ay: mm(0), atx: mm(10), aty: mm(0),
        acx: mm(0), acy: mm(0),
        bx: mm(5), by: mm(0), btx: mm(10), bty: mm(0),
        bcx: mm(0), bcy: mm(0),
      } as unknown as SketchCommand,
      { kind: 'close' },
    ];
    const out = rotateSketchCommands(cmds, 90, [0, 0]);
    const h = out[1] as { atx: { evaluated: number }; aty: { evaluated: number } };
    expect(evl(h.atx)).toBeCloseTo(0, 9);
    expect(evl(h.aty)).toBeCloseTo(10, 9);
  });
});
