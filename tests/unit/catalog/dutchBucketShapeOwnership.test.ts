// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capture, type ParameterValues } from './dutchBucketCapture';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/dutch-bucket-row.kcad.ts'), 'utf8');
const shared = readFileSync(resolve(root, 'tests/fixtures/catalog/dutchBucketSharedPrototype.kcad.ts'), 'utf8');

const layoutChanges = new Set(['drain-pipe', 'drain-elbow', 'pipe-saddle-6',
  ...Array.from({ length: 6 }, (_, i) => 'dripper-' + i)]);

const cases: [string, ParameterValues][] = [
  ['tomato default', {}],
  ['pepper', { crop: 'pepper' }],
  ['cucumber', { crop: 'cucumber' }],
  ['minimum scale', { scale: 0.7 }],
  ['maximum cucumber', { crop: 'cucumber', scale: 1.3 }],
];

describe('Dutch bucket independent shape ownership without CAD evaluation', () => {
  it.each(cases)('keeps 146 independent parts with mutable hosted transforms: %s', (_name, values) => {
    const result = capture(source, true, values);
    expect(result.parts).toHaveLength(146);
    expect(result.parts.filter(part => /^(leaf|crown|fruit)-/.test(part.name))).toHaveLength(78);
  });
  it.each(cases)('preserves unaffected public geometry expressions and metadata: %s', (_name, values) => {
    const current = capture(source, false, values), previous = capture(shared, false, values);
    expect(current.metadata).toEqual(previous.metadata);
    // The separate layout regression verifies the nine intentional clearance edits.
    expect(current.parts.filter(part => !layoutChanges.has(part.name)))
      .toEqual(previous.parts.filter(part => !layoutChanges.has(part.name)));
  });
  it('rejects the exact previous shared prototype under mutable hosted transforms', () => {
    expect(() => capture(shared, true)).toThrow('Aliased boolean operands');
  });
});
