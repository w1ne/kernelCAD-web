import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { selectHeroDemo } from './selectHeroDemo';
import { getCatalogForVersion } from './memorableBuildsCatalog';

test('happy path — picks the catalog-conformant task for v0.21', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  const v021Slug = getCatalogForVersion('v0.21')!.candidates[0].slug;

  mkdirSync(path.join(root, 'v0.21', 'hero-task'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.21', 'hero-task', 'meta.json'),
    JSON.stringify({ heroArtifact: v021Slug }),
  );
  writeFileSync(path.join(root, 'v0.21', 'hero-task', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root });
  assert.equal(result.task, 'hero-task');
  assert.equal(result.heroArtifact, v021Slug);
  assert.equal(result.mp4Path, path.join(root, 'v0.21', 'hero-task', 'demo.mp4'));
  assert.equal(result.iterationKey, 'v0.21');

  rmSync(root, { recursive: true, force: true });
});

test('patch reuse — 0.21.1 maps to v0.21 too', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  const v021Slug = getCatalogForVersion('v0.21')!.candidates[0].slug;

  mkdirSync(path.join(root, 'v0.21', 'hero-task'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.21', 'hero-task', 'meta.json'),
    JSON.stringify({ heroArtifact: v021Slug }),
  );
  writeFileSync(path.join(root, 'v0.21', 'hero-task', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.21.1', demosRoot: root });
  assert.equal(result.iterationKey, 'v0.21');

  rmSync(root, { recursive: true, force: true });
});

test('missing iteration dir — throws', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  assert.throws(
    () => selectHeroDemo({ packageVersion: '0.99.0', demosRoot: root }),
    /no demo dir/i,
  );
  rmSync(root, { recursive: true, force: true });
});

test('non-grandfathered, no catalog match — throws', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  mkdirSync(path.join(root, 'v0.21', 'random'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.21', 'random', 'meta.json'),
    JSON.stringify({ heroArtifact: 'not-in-catalog' }),
  );
  writeFileSync(path.join(root, 'v0.21', 'random', 'demo.mp4'), 'fake');

  assert.throws(
    () => selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root }),
    /no task .* heroArtifact in catalog/i,
  );
  rmSync(root, { recursive: true, force: true });
});

test('grandfathered v0.2 single-task fallback', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  mkdirSync(path.join(root, 'v0.2', 'subtract-then-fillet-rim'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.2', 'subtract-then-fillet-rim', 'meta.json'),
    JSON.stringify({ taskId: 'subtract-then-fillet-rim' }),
  );
  writeFileSync(path.join(root, 'v0.2', 'subtract-then-fillet-rim', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.2.1', demosRoot: root });
  assert.equal(result.task, 'subtract-then-fillet-rim');
  assert.equal(result.heroArtifact, null);

  rmSync(root, { recursive: true, force: true });
});

test('multiple catalog matches — throws ambiguity', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  const candidates = getCatalogForVersion('v0.21')!.candidates;
  if (candidates.length < 2) {
    rmSync(root, { recursive: true, force: true });
    return;
  }
  mkdirSync(path.join(root, 'v0.21', 'a'), { recursive: true });
  mkdirSync(path.join(root, 'v0.21', 'b'), { recursive: true });
  writeFileSync(path.join(root, 'v0.21', 'a', 'meta.json'),
    JSON.stringify({ heroArtifact: candidates[0].slug }));
  writeFileSync(path.join(root, 'v0.21', 'a', 'demo.mp4'), 'fake');
  writeFileSync(path.join(root, 'v0.21', 'b', 'meta.json'),
    JSON.stringify({ heroArtifact: candidates[1].slug }));
  writeFileSync(path.join(root, 'v0.21', 'b', 'demo.mp4'), 'fake');

  assert.throws(
    () => selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root }),
    /ambiguous hero/i,
  );
  rmSync(root, { recursive: true, force: true });
});

test('hero task missing demo.mp4 — throws', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  const slug = getCatalogForVersion('v0.21')!.candidates[0].slug;

  mkdirSync(path.join(root, 'v0.21', 'no-mp4'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.21', 'no-mp4', 'meta.json'),
    JSON.stringify({ heroArtifact: slug }),
  );

  assert.throws(
    () => selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root }),
    /missing demo\.mp4/i,
  );
  rmSync(root, { recursive: true, force: true });
});
