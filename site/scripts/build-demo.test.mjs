import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLatestDemo, parseSemver } from './build-demo.mjs';

test('parseSemver parses v0.21', () => {
  assert.deepEqual(parseSemver('v0.21'), [0, 21, 0]);
});

test('parseSemver parses v1.2.3', () => {
  assert.deepEqual(parseSemver('v1.2.3'), [1, 2, 3]);
});

test('parseSemver returns null for non-version dirs', () => {
  assert.equal(parseSemver('README.md'), null);
  assert.equal(parseSemver('vNotAVersion'), null);
});

test('findLatestDemo picks highest semver from a list', () => {
  const dirs = ['v0.1', 'v0.21', 'v0.2', 'README.md'];
  assert.equal(findLatestDemo(dirs), 'v0.21');
});

test('findLatestDemo handles single entry', () => {
  assert.equal(findLatestDemo(['v0.1']), 'v0.1');
});

test('findLatestDemo returns null on empty list', () => {
  assert.equal(findLatestDemo([]), null);
});
