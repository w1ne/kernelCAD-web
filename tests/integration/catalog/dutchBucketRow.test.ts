// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { setParamValue } from '../../../src/modeling/edits/setParamValue';
import { readConnectionParts } from './fiveConnectionsGeometry';
import { dutchCases, inspectDutchBucketGlb, inspectDutchBucketParts, moveDutchPart } from './dutchBucketGeometry';

const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/hydroponics/dutch-bucket-row.kcad.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const original = readFileSync(resolve(root, 'tests/fixtures/catalog/dutchBucketRowOriginal.kcad.ts'), 'utf8');
function declarations(code: string) {
  const parsed = ts.createSourceFile('asset.kcad.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && ['meta', 'param'].includes(node.expression.text)) result.push(node.getText(parsed));
    ts.forEachChild(node, visit);
  };
  visit(parsed); return result;
}
function authoredPresets() {
  const parsed = ts.createSourceFile('asset.kcad.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let presets: Record<string, Record<string, string>> | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'presets') {
      const arg = node.arguments[0]; if (!arg || !ts.isObjectLiteralExpression(arg)) throw new Error('Literal presets required');
      presets = {};
      for (const prop of arg.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || !ts.isObjectLiteralExpression(prop.initializer)) throw new Error('Literal preset required');
        const values: Record<string, string> = {};
        for (const field of prop.initializer.properties) {
          if (!ts.isPropertyAssignment(field) || !ts.isIdentifier(field.name) || !ts.isStringLiteral(field.initializer)) throw new Error('Literal preset value required');
          values[field.name.text] = field.initializer.text;
        }
        presets[prop.name.text] = values;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed); if (!presets) throw new Error('Presets missing'); return presets;
}
const presetValues = authoredPresets();
async function exportVariant(values: Record<string, string | number>) {
  let code = source;
  for (const [name, value] of Object.entries(values)) {
    const edit = setParamValue(code, name, value); expect(edit.ok).toBe(true);
    if (!edit.ok) throw new Error(edit.error); code = edit.new_code;
  }
  const result = await runAndExport({ code, fileName: 'dutch-bucket-row.kcad.ts',
    scriptDir: resolve(root, 'catalog/kits/hydroponics'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 5600 } } });
  expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  return result.bytes;
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('Dutch bucket scene facets and drain contacts', () => {
  it('preserves metadata and all six control declarations', () => {
    expect(declarations(source)).toHaveLength(7);
    expect(declarations(source)).toEqual(declarations(original));
  });
  it('seats all six buckets and siphons while keeping the cavities open', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, file);
    expect(asset.triangleBudget).toBe(5600);
    expect(asset.stats.triangles).toBeLessThanOrEqual(5600);
    const parts = await readConnectionParts(glb);
    expect(inspectDutchBucketParts(parts, 'tomato').failures).toEqual([]);
    // Restore the two measured gap sizes in copied exported triangles only.
    // No original-source native run is needed for these negative controls.
    const raised = moveDutchPart(parts, 'bucket-0', [0, 0, 17]);
    expect(inspectDutchBucketParts(raised, 'tomato').failures).toContain('bucket-0 is not seated on drain');
    const lateralOffset = parts.get('drain-pipe')!.max[1] - parts.get('siphon-0')!.min[1] + 16;
    const disconnected = moveDutchPart(parts, 'siphon-0', [0, lateralOffset, 0]);
    expect(inspectDutchBucketParts(disconnected, 'tomato').failures).toContain('siphon-0 does not enter drain');
  }, 60_000);
  for (const test of dutchCases.slice(1)) {
    it(`keeps the named parts and crop geometry for ${test.id}`, async () => {
      const preset = test.id === 'pepper' ? 'sweetPepper' : test.id === 'cucumber' ? 'cucumber'
        : test.id === 'default-recovery' ? 'tomato' : undefined;
      const values: Record<string, string | number> = preset ? { ...presetValues[preset], scale: test.scale } : { crop: test.crop, scale: test.scale };
      if (preset) expect(values.crop).toBe(test.crop);
      const report = await inspectDutchBucketGlb(await exportVariant(values), test.crop, test.scale);
      expect(report.failures).toEqual([]);
    }, 60_000);
  }
});
