// SPDX-License-Identifier: MIT
// Source algebra only. Native triangles, cavities and actual hosted loading
// remain separate acceptance gates.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capture, type Expression } from './hydroponicGrowRackSourceTrace';
import { sourceBounds, sourceContains, sourceVolume, type Point } from './hydroponicGrowRackSourceGeometry';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/hydroponic-grow-rack.kcad.ts'), 'utf8');
const old = readFileSync(resolve(root, 'tests/fixtures/catalog/hydroponicGrowRackUncutGutters.kcad.ts'), 'utf8');
const cases = ['lettuce', 'empty', 'microgreens'].flatMap(crop => [.7, 1, 1.3].map(scale => ({ crop, scale })));
const key = (prefix: string, t: number, g: number) => prefix + '-' + t + '-' + g;
const near = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 7);

function expectedChangedNames(crop: string): string[] {
  const names = ['upright-0--380', 'upright-0-380'];
  for (let k = 0; k < 14; k++) names.push('slots-0-' + k);
  for (const x of [-1200, 1200]) for (const z of [120, 760, 1430]) names.push('end-brace-' + x + '-' + z);
  for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) {
    names.push(key('gutter', t, g), key('gutter-lid', t, g));
    if (crop === 'lettuce') for (let h = 0; h < 9; h++) names.push('head-' + (t * 100 + g * 10 + h));
  }
  return names.sort();
}

describe('grow rack continuous planting slots and separated frame, without CAD', () => {
  it.each(cases)('preserves controls, names and all unchanged geometry: $crop scale $scale', values => {
    const next = capture(source, false, values), before = capture(old, false, values);
    expect(next.metadata.slice(1)).toEqual(before.metadata.slice(1));
    expect(next.parts.map(p => p.name)).toEqual(before.parts.map(p => p.name));
    expect(next.parts).toHaveLength(values.crop === 'microgreens' ? 224 : 272);
    const oldParts = new Map(before.parts.map(p => [p.name, p.expression]));
    const changed = next.parts.filter(p => JSON.stringify(p.expression) !== JSON.stringify(oldParts.get(p.name))).map(p => p.name).sort();
    expect(changed).toEqual(expectedChangedNames(values.crop));
    const bounds = next.parts.map(p => sourceBounds(p.expression));
    for (let a = 0; a < 3; a++) {
      near(Math.min(...bounds.map(b => b.min[a]!)), [-1360, -440, 0][a]! * values.scale);
      near(Math.max(...bounds.map(b => b.max[a]!)), [1620, 440, 2100][a]! * values.scale);
    }
  });

  it.each(cases)('has real source-defined slots, cavities and support contacts: $crop scale $scale', values => {
    const scale = values.scale, parts = new Map(capture(source, true, values).parts.map(p => [p.name, p.expression]));
    const part = (name: string) => { const p = parts.get(name); if (!p) throw new Error('Missing part: ' + name); return p; };
    const inside = (name: string, p: Point) => sourceContains(part(name), p.map(v => v * scale) as Point);
    for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) {
      const z = [280, 950, 1620][t]!, y = [-270, -90, 90, 270][g]!;
      const channel = key('gutter', t, g), lid = key('gutter-lid', t, g);
      near(sourceVolume(part(channel)), 2_750_000 * scale ** 3);
      near(sourceVolume(part(lid)), 1_980_000 * scale ** 3);
      const b = sourceBounds(part(channel));
      for (let a = 0; a < 3; a++) {
        near(b.min[a]!, [-1250, y - 55, z][a]! * scale);
        near(b.max[a]!, [1250, y + 55, z + 60][a]! * scale);
      }
      for (const x of [-1249, 0, 1249]) {
        expect(inside(channel, [x, y, z + 30])).toBe(false);
        expect(inside(channel, [x, y, z + 2.5])).toBe(true);
        for (const sign of [-1, 1]) expect(inside(channel, [x, y + sign * 52.5, z + 30])).toBe(true);
      }
      expect(inside(channel, [0, y, z + 4.9])).toBe(true);
      expect(inside(channel, [0, y, z + 5.1])).toBe(false);
      expect(inside(channel, [0, y + 49.9, z + 30])).toBe(false);
      expect(inside(channel, [0, y + 50.1, z + 30])).toBe(true);
      for (const sign of [-1, 1]) {
        expect(inside(lid, [0, y + sign * 27.9, z + 65])).toBe(false);
        expect(inside(lid, [0, y + sign * 28.1, z + 65])).toBe(true);
        expect(inside(lid, [sign * 999.9, y, z + 65])).toBe(false);
        expect(inside(lid, [sign * 1000.1, y, z + 65])).toBe(true);
      }
      for (let h = 0; h < 9; h++) {
        const x = (h - 4) * 240;
        expect(inside(lid, [x, y, z + 65])).toBe(false);
        expect(inside(channel, [x, y, z + 30])).toBe(false);
        if (values.crop === 'lettuce') {
          const head = 'head-' + (t * 100 + g * 10 + h), r = 78 + ((h * 5 + g * 3 + t) % 3) * 8;
          const b = sourceBounds(part(head));
          near(b.min[2], (z + 62.2) * scale);
          near(b.max[2], (z + 62.2 + 1.2 * r) * scale);
          near(sourceVolume(part(head)), 2.4 * (r * scale) ** 3);
          expect(inside(head, [x + 25.9, y, z + 70])).toBe(true);
          expect(inside(head, [x + 26.1, y, z + 70])).toBe(false);
          expect(b.max[1]).toBeLessThanOrEqual(364 * scale + 1e-7);
          expect(b.min[1]).toBeGreaterThanOrEqual(-364 * scale - 1e-7);
        }
      }
    }
    for (const sign of [-1, 1]) {
      const name = 'upright-0-' + sign * 380, b = sourceBounds(part(name)), foot = sourceBounds(part('foot-0-' + sign * 380));
      near(b.min[1], (sign * 400 - 30) * scale); near(b.max[1], (sign * 400 + 30) * scale);
      near(b.min[2], foot.max[2]);
      for (const a of [0, 1]) { expect(b.min[a]!).toBeGreaterThanOrEqual(foot.min[a]! - 1e-7); expect(b.max[a]!).toBeLessThanOrEqual(foot.max[a]! + 1e-7); }
      for (let t = 0; t < 3; t++) {
        const p: Point = [0, sign * 390, [280, 950, 1620][t]! - 35];
        expect(inside(name, p)).toBe(true);
        expect(inside('beam-' + t + '-' + sign * 380, p)).toBe(true);
      }
    }
    const front = sourceBounds(part('upright-0--380'));
    for (let k = 0; k < 14; k++) {
      const slot = sourceBounds(part('slots-0-' + k));
      near(slot.max[1], front.min[1]);
      expect(slot.min[2]).toBeGreaterThan(front.min[2]); expect(slot.max[2]).toBeLessThan(front.max[2]);
    }
    for (const x of [-1200, 1200]) for (const z0 of [120, 760, 1430]) {
      const brace = 'end-brace-' + x + '-' + z0, b = sourceBounds(part(brace));
      for (const [other, p] of [
        ['upright-' + x + '--380', [x, -352, z0 + 114]],
        ['end-tie-' + x + '-' + z0, [x, -176, z0 + 25]],
      ] as [string, Point][]) {
        expect(inside(brace, p)).toBe(true); expect(inside(other, p)).toBe(true);
      }
      for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) for (const prefix of ['gutter', 'gutter-lid']) {
        const gutter = sourceBounds(part(key(prefix, t, g)));
        expect(b.max[2] < gutter.min[2] || b.min[2] > gutter.max[2]).toBe(true);
      }
    }
  });

  it('rejects the exact accepted uncut source with all eighteen old crossing witnesses and 216 plant interfaces', () => {
    expect(createHash('sha256').update(old).digest('hex')).toBe('c8fa474c0ba0901a07b6a0dd282c4adac8ba35c113eb76c043948f96b4df212d');
    const parts = new Map(capture(old, false).parts.map(p => [p.name, p.expression]));
    const inside = (name: string, p: Point) => sourceContains(parts.get(name)!, p);
    const pairs: [number, string, number, number][] = [
      [120, 'gutter-0-0', -215.380282254914, 280.347686633064],
      [120, 'gutter-0-1', -133.994717745086, 329.938027652650],
      [120, 'gutter-lid-0-1', -125.78125, 345],
      [760, 'gutter-1-1', -127.350746268657, 993.107142857143],
      [760, 'gutter-lid-1-1', -104.477611940299, 1015],
      [1430, 'gutter-2-1', -119.452323198984, 1649.177261212314],
      [1430, 'gutter-lid-2-1', -80.327868852459, 1685],
    ];
    let crossings = 0, plantInterfaces = 0;
    for (const x of [-1200, 1200]) for (const [z, other, y, height] of pairs) {
      expect(inside('end-brace-' + x + '-' + z, [x, y, height]) && inside(other, [x, y, height])).toBe(true); crossings++;
    }
    for (const [name, sign, z] of [['head-4', -1, 385.72], ['head-34', 1, 385.72], ['head-204', -1, 1722.68], ['head-234', 1, 1722.68]] as [string, number, number][]) {
      const p: Point = [0, sign * (name.includes('20') || name.includes('23') ? 353 : 357), z];
      expect(inside(name, p) && inside('upright-0-' + sign * 380, p)).toBe(true); crossings++;
    }
    for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) for (let h = 0; h < 9; h++) {
      const head = 'head-' + (t * 100 + g * 10 + h), x = (h - 4) * 240;
      const y = [-270, -90, 90, 270][g]!, z = [280, 950, 1620][t]!;
      const bottom = sourceBounds(parts.get(head)!).min[2];
      for (const [other, height] of [[key('gutter', t, g), (bottom + z + 60) / 2], [key('gutter-lid', t, g), z + 65]] as [string, number][]) {
        expect(inside(head, [x, y, height]) && inside(other, [x, y, height])).toBe(true); plantInterfaces++;
      }
    }
    expect(crossings).toBe(18); expect(plantInterfaces).toBe(216);
  });

  it('states the slot and scene-prop limits, and rejects unsupported analytic forms', () => {
    const meta = capture(source, false).metadata[0] as { description: string; triangleBudget: number };
    expect(meta.description).toContain('continuously slotted lids');
    expect(meta.description).toContain('roots, net-cup interiors and connected fluid passages are omitted');
    expect(source).not.toContain('planting holes');
    expect(meta.triangleBudget).toBe(8000);
    const unsupported: Expression = { operation: 'unknownGeometry', arguments: [] };
    expect(() => sourceBounds(unsupported)).toThrow('Unsupported');
    expect(() => sourceContains(unsupported, [0, 0, 0])).toThrow('Unsupported');
    expect(() => sourceVolume(unsupported)).toThrow('Unsupported');
  });
});
