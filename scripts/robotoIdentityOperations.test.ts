import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { findGeometryOperationIssues } from '../examples/gallery/roboto-01/verify-identity-operations.mjs';

const modelSource = readFileSync(new URL('../examples/gallery/roboto-01.kcad.ts', import.meta.url), 'utf8');

it('accepts the exact mesh scale and finish pipeline', () => {
  expect(findGeometryOperationIssues(modelSource)).toEqual([]);
});

it('rejects an additional scale on a loaded mesh', () => {
  const mutated = modelSource.replace('.scale(1000)\n    .material(', '.scale(1000)\n    .scale(2)\n    .material(');
  expect(mutated).not.toBe(modelSource);
  expect(findGeometryOperationIssues(mutated)).not.toEqual([]);
});

it('rejects a geometry transform after loading at a use site', () => {
  const mutated = modelSource.replace(
    "await loadLink('base_link')",
    "(await loadLink('base_link')).translate([1, 0, 0])",
  );
  expect(mutated).not.toBe(modelSource);
  expect(findGeometryOperationIssues(mutated)).not.toEqual([]);
});

it('rejects an unapproved operation in the loader chain', () => {
  const mutated = modelSource.replace(
    '.scale(1000)\n    .material(',
    ".scale(1000)\n    .color('#ffffff')\n    .material(",
  );
  expect(mutated).not.toBe(modelSource);
  expect(findGeometryOperationIssues(mutated)).not.toEqual([]);
});
