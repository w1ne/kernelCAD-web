import { test, expect } from 'vitest';
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
  expect(result.task).toBe('hero-task');
  expect(result.heroArtifact).toBe(v021Slug);
  expect(result.mp4Path).toBe(path.join(root, 'v0.21', 'hero-task', 'demo.mp4'));
  expect(result.iterationKey).toBe('v0.21');

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
  expect(result.iterationKey).toBe('v0.21');

  rmSync(root, { recursive: true, force: true });
});

test('missing iteration dir — throws', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  expect(
    () => selectHeroDemo({ packageVersion: '0.99.0', demosRoot: root }),
  ).toThrow(/no demo dir/i);
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

  expect(
    () => selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root }),
  ).toThrow(/no task .* heroArtifact in catalog/i);
  rmSync(root, { recursive: true, force: true });
});

test('non-grandfathered approved override can be selected when catalog has no match', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  mkdirSync(path.join(root, 'v0.4', 'rocket-keychain'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.4', 'rocket-keychain', 'meta.json'),
    JSON.stringify({
      heroArtifact: 'rocket-keychain',
      overrideApprovedBy: 'controller: user selected this reference',
    }),
  );
  writeFileSync(path.join(root, 'v0.4', 'rocket-keychain', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.4.0', demosRoot: root });
  expect(result.task).toBe('rocket-keychain');
  expect(result.heroArtifact).toBe('rocket-keychain');

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
  expect(result.task).toBe('subtract-then-fillet-rim');
  expect(result.heroArtifact).toBeNull();

  rmSync(root, { recursive: true, force: true });
});

test('grandfathered multi-task picks the unique override-null hero', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  mkdirSync(path.join(root, 'v0.2', 'primary'), { recursive: true });
  mkdirSync(path.join(root, 'v0.2', 'override'), { recursive: true });
  mkdirSync(path.join(root, 'v0.2', 'pre-policy'), { recursive: true });

  writeFileSync(
    path.join(root, 'v0.2', 'primary', 'meta.json'),
    JSON.stringify({ heroArtifact: 'primary-slug', overrideApprovedBy: null }),
  );
  writeFileSync(path.join(root, 'v0.2', 'primary', 'demo.mp4'), 'fake');

  writeFileSync(
    path.join(root, 'v0.2', 'override', 'meta.json'),
    JSON.stringify({ heroArtifact: 'override-slug', overrideApprovedBy: 'reason' }),
  );
  writeFileSync(path.join(root, 'v0.2', 'override', 'demo.mp4'), 'fake');

  writeFileSync(
    path.join(root, 'v0.2', 'pre-policy', 'meta.json'),
    JSON.stringify({ taskId: 'pre-policy' }),
  );
  writeFileSync(path.join(root, 'v0.2', 'pre-policy', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.2.1', demosRoot: root });
  expect(result.task).toBe('primary');
  expect(result.heroArtifact).toBe('primary-slug');

  rmSync(root, { recursive: true, force: true });
});

test('grandfathered multi-task with multiple primary candidates — throws', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  mkdirSync(path.join(root, 'v0.2', 'a'), { recursive: true });
  mkdirSync(path.join(root, 'v0.2', 'b'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.2', 'a', 'meta.json'),
    JSON.stringify({ heroArtifact: 'slug-a', overrideApprovedBy: null }),
  );
  writeFileSync(path.join(root, 'v0.2', 'a', 'demo.mp4'), 'fake');
  writeFileSync(
    path.join(root, 'v0.2', 'b', 'meta.json'),
    JSON.stringify({ heroArtifact: 'slug-b', overrideApprovedBy: null }),
  );
  writeFileSync(path.join(root, 'v0.2', 'b', 'demo.mp4'), 'fake');

  expect(
    () => selectHeroDemo({ packageVersion: '0.2.1', demosRoot: root }),
  ).toThrow(/grandfathered v0\.2 cannot auto-pick hero/i);
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

  expect(
    () => selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root }),
  ).toThrow(/ambiguous hero/i);
  rmSync(root, { recursive: true, force: true });
});

test('patch dir takes precedence over minor dir when both exist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));

  // Minor dir has the v0.4 rocket-keychain (override-approved)
  mkdirSync(path.join(root, 'v0.4', 'rocket-keychain'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.4', 'rocket-keychain', 'meta.json'),
    JSON.stringify({
      heroArtifact: 'rocket-keychain',
      overrideApprovedBy: 'pre-policy v0.4 retro',
    }),
  );
  writeFileSync(path.join(root, 'v0.4', 'rocket-keychain', 'demo.mp4'), 'fake');

  // Patch dir has a refresh hero
  mkdirSync(path.join(root, 'v0.4.1', 'donut'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.4.1', 'donut', 'meta.json'),
    JSON.stringify({
      heroArtifact: 'donut',
      overrideApprovedBy: 'controller: parametric closure refresh',
    }),
  );
  writeFileSync(path.join(root, 'v0.4.1', 'donut', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.4.1', demosRoot: root });
  expect(result.iterationKey).toBe('v0.4.1');
  expect(result.task).toBe('donut');
  expect(result.heroArtifact).toBe('donut');

  rmSync(root, { recursive: true, force: true });
});

test('falls back to minor dir when patch dir is absent', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));

  mkdirSync(path.join(root, 'v0.4', 'rocket-keychain'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.4', 'rocket-keychain', 'meta.json'),
    JSON.stringify({
      heroArtifact: 'rocket-keychain',
      overrideApprovedBy: 'pre-policy v0.4 retro',
    }),
  );
  writeFileSync(path.join(root, 'v0.4', 'rocket-keychain', 'demo.mp4'), 'fake');

  // No v0.4.1 dir
  const result = selectHeroDemo({ packageVersion: '0.4.1', demosRoot: root });
  expect(result.iterationKey).toBe('v0.4');
  expect(result.task).toBe('rocket-keychain');

  rmSync(root, { recursive: true, force: true });
});

test('falls back to minor dir when patch dir exists but has no task subdirs', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));

  mkdirSync(path.join(root, 'v0.4.1'), { recursive: true });
  // empty patch dir — no task subdirs

  mkdirSync(path.join(root, 'v0.4', 'rocket-keychain'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.4', 'rocket-keychain', 'meta.json'),
    JSON.stringify({
      heroArtifact: 'rocket-keychain',
      overrideApprovedBy: 'pre-policy v0.4 retro',
    }),
  );
  writeFileSync(path.join(root, 'v0.4', 'rocket-keychain', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.4.1', demosRoot: root });
  expect(result.iterationKey).toBe('v0.4');

  rmSync(root, { recursive: true, force: true });
});

test('catalog lookup uses minor key even when patch dir is selected', () => {
  // A catalog-conformant hero can land in a patch dir; the catalog is keyed
  // on minor, so the lookup must use minor regardless of which dir was picked.
  const root = mkdtempSync(path.join(tmpdir(), 'demos-'));
  const v021Slug = getCatalogForVersion('v0.21')!.candidates[0].slug;

  mkdirSync(path.join(root, 'v0.21.1', 'hero-task'), { recursive: true });
  writeFileSync(
    path.join(root, 'v0.21.1', 'hero-task', 'meta.json'),
    JSON.stringify({ heroArtifact: v021Slug }),
  );
  writeFileSync(path.join(root, 'v0.21.1', 'hero-task', 'demo.mp4'), 'fake');

  const result = selectHeroDemo({ packageVersion: '0.21.1', demosRoot: root });
  expect(result.iterationKey).toBe('v0.21.1');
  expect(result.task).toBe('hero-task');
  expect(result.heroArtifact).toBe(v021Slug);

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

  expect(
    () => selectHeroDemo({ packageVersion: '0.21.0', demosRoot: root }),
  ).toThrow(/missing demo\.mp4/i);
  rmSync(root, { recursive: true, force: true });
});
