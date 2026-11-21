// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/hydroponics/dutch-bucket-row.kcad.ts'), 'utf8');
const original = readFileSync(resolve(root, 'tests/fixtures/catalog/dutchBucketRowOriginal.kcad.ts'), 'utf8');
type Presets = Record<string, Record<string, string>>;
function readPresets(code: string): Presets {
  const parsed = ts.createSourceFile('asset.kcad.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'presets') {
      if (found) throw new Error('Duplicate presets declaration');
      found = node.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  function literal(node: ts.Node): string | Record<string, unknown> {
    if (ts.isStringLiteral(node)) return node.text;
    if (!ts.isObjectLiteralExpression(node)) throw new Error('Expected literal preset data');
    return Object.fromEntries(node.properties.map(prop => {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) throw new Error('Expected named literal field');
      return [prop.name.text, literal(prop.initializer)];
    }));
  }
  if (!found) throw new Error('Missing presets declaration');
  return literal(found) as Presets;
}
function cropSelectionFailures(presets: Presets): string[] {
  return ([['tomato', 'tomato'], ['sweetPepper', 'pepper'], ['cucumber', 'cucumber']] as const)
    .filter(([name, crop]) => presets[name]?.crop !== crop)
    .map(([name, crop]) => `${name} does not select ${crop}`);
}

describe('Dutch bucket crop presets without CAD evaluation', () => {
  it('adds only the three intended crop overrides and preserves all existing colors and names', () => {
    const before = readPresets(original), after = readPresets(source);
    const expected = structuredClone(before);
    expected.tomato!.crop = 'tomato'; expected.sweetPepper!.crop = 'pepper'; expected.cucumber!.crop = 'cucumber';
    expect(after).toEqual(expected);
    expect(Object.keys(after)).toEqual(['tomato', 'sweetPepper', 'cucumber', 'weathered']);
    expect(after.weathered).not.toHaveProperty('crop');
    expect(cropSelectionFailures(after)).toEqual([]);
  });
  it('detects the original presets that leave the previous crop unchanged', () => {
    expect(cropSelectionFailures(readPresets(original))).toEqual([
      'tomato does not select tomato', 'sweetPepper does not select pepper', 'cucumber does not select cucumber',
    ]);
  });
});
