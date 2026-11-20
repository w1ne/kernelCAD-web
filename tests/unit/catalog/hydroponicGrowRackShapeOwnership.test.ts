// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capture, type Values } from './hydroponicGrowRackSourceTrace';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/hydroponic-grow-rack.kcad.ts'), 'utf8');
const shared = readFileSync(resolve(root, 'tests/fixtures/catalog/hydroponicGrowRackSharedHeads.kcad.ts'), 'utf8');

const cases: [string, Values, number, number][] = [
  ['lettuce default', {}, 272, 108],
  ['empty cups', { crop: 'empty' }, 272, 0],
  ['microgreens', { crop: 'microgreens' }, 224, 0],
  ['minimum scale', { scale: 0.7 }, 272, 108],
  ['maximum scale', { scale: 1.3 }, 272, 108],
];

describe('Grow rack independent shape ownership without CAD evaluation', () => {
  it.each(cases)('keeps independent parts with mutable hosted transforms: %s', (_name, values, count, heads) => {
    const result = capture(source, true, values);
    expect(result.parts).toHaveLength(count);
    expect(result.parts.filter(part => part.name.startsWith('head-'))).toHaveLength(heads);
  });
  it.each(cases)('keeps the same expressions and metadata under both ownership modes: %s', (_name, values) => {
    expect(capture(source, true, values)).toEqual(capture(source, false, values));
  });
  it('rejects the exact previous shared-head source under mutable hosted transforms', () => {
    expect(createHash('sha256').update(shared).digest('hex')).toBe('e8e4d180bb5ed55b2c95e1e8b3595e461989c6a69bd54c1c8ad6999682dc8690');
    expect(() => capture(shared, true)).toThrow('Mutated an already published part');
  });
});
