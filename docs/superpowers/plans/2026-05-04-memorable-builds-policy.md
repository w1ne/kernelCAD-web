# Memorable Builds Policy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the §3 enforcement touchpoints from `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md` so the "memorable hero artifact" rule binds structurally — at the meta.json schema layer, the lint layer, the whats-new template layer, the demos README rule layer, the gap-closure roadmap §H11 layer, and the project-local reviewer-prompt layer.

**Architecture:** Six structural touchpoints from §3 of the spec, plus two mechanical prerequisites: (a) a typed catalog module that mirrors the spec's §2 catalog so the lint can validate slugs programmatically, (b) a pure-function refactor of `lint-demos.ts`'s metadata check so it's unit-testable. All changes are additive — no existing tests are modified, no shipped behavior regresses.

**Tech Stack:** TypeScript (Node + Vitest), the existing `scripts/captureDemo.ts` + `scripts/lint-demos.ts` + `scripts/lib/whatsNewTemplate.ts` pipeline. No new dependencies.

---

## File map

**Create (5 files):**
- `scripts/lib/memorableBuildsCatalog.ts` — typed catalog data + helpers (`getCatalogForVersion`, `isCatalogSlug`, `GENERIC_PRIMITIVE_DENYLIST`).
- `scripts/lib/memorableBuildsCatalog.test.ts` — asserts catalog shape + denylist.
- `scripts/lib/demoMetaValidator.ts` — pure `validateDemoMeta(meta, version)` extracted from `lint-demos.ts`.
- `scripts/lib/demoMetaValidator.test.ts` — unit tests for the validator (catalog hit, denylist hit, override path, missing fields).
- `CLAUDE.md` (repo root) — project-local reviewer-prompt rule for `v0.X.0`-tag PR demo judgment.

**Modify (5 files):**
- `scripts/lint-demos.ts` — call `validateDemoMeta` for each module's meta.json; remove inline gitSha/capturedAt/taskId check (it's now inside the validator); keep the rest untouched.
- `scripts/lib/whatsNewTemplate.ts` — extend template body with three required sections; strengthen `whatsNewIsFilled` validator to check for the new sections by header.
- `scripts/captureDemo.ts` — accept `--hero-artifact <slug>` CLI flag; pass to template; write `heroArtifact` / `catalogSource` / `overrideApprovedBy` into meta.json.
- `docs/demos/README.md` — append rule 7 referencing the policy spec.
- `docs/superpowers/specs/2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md` — replace §H11 enforcement line to point at the policy spec.
- `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md` — fix two stale path references (`scripts/demo-template/whats-new.md` → `scripts/lib/whatsNewTemplate.ts`).

---

## Task 1: Fix stale path references in the policy spec

**Why first:** Subsequent tasks reference the spec's §3.4 and architecture table; if those still point at the wrong file, future readers (human or agent) get misled.

**Files:**
- Modify: `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`

- [ ] **Step 1: Replace §3.4 path reference**

In `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`, find the line:

```markdown
Extend `scripts/demo-template/whats-new.md` with three required sections:
```

Replace with:

```markdown
Extend the template body returned by `scripts/lib/whatsNewTemplate.ts` (`whatsNewTemplate()`) with three required sections, and strengthen `whatsNewIsFilled()` in the same module to verify they're filled:
```

- [ ] **Step 2: Update architecture table**

Find the row in the `## Architecture & components` table:

```markdown
| `whats-new.md` template | `scripts/demo-template/whats-new.md` | follow-up plan |
```

Replace with:

```markdown
| `whats-new.md` template | `scripts/lib/whatsNewTemplate.ts` | follow-up plan |
```

- [ ] **Step 3: Verify no other stale references**

Run: `grep -n "demo-template" docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`

Expected: no matches (or only matches inside historical context that you intentionally leave).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md
git commit -m "docs(policy): point spec at scripts/lib/whatsNewTemplate.ts (real path)"
```

---

## Task 2: Create the typed catalog module

**Why:** `lint-demos.ts` needs a programmatic source of truth for "what slugs are valid for v0.X". This module is that source. The spec's §2 markdown is human-readable narrative; this is the machine-readable mirror.

**Files:**
- Create: `scripts/lib/memorableBuildsCatalog.ts`
- Test: `scripts/lib/memorableBuildsCatalog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/memorableBuildsCatalog.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getCatalogForVersion,
  isCatalogSlug,
  GENERIC_PRIMITIVE_DENYLIST,
  ALL_VERSIONS,
} from './memorableBuildsCatalog';

describe('memorableBuildsCatalog', () => {
  it('exposes shortlists for v0.21 and every version v0.3 through v0.17 plus v1.0', () => {
    expect(ALL_VERSIONS).toEqual([
      'v0.21',
      'v0.3', 'v0.4', 'v0.5', 'v0.6', 'v0.7', 'v0.8', 'v0.9',
      'v0.10', 'v0.11', 'v0.12', 'v0.13', 'v0.14', 'v0.15', 'v0.16', 'v0.17',
      'v1.0',
    ]);
  });

  it('every version has at least 2 candidate slugs and exactly one recommended', () => {
    for (const version of ALL_VERSIONS) {
      const entry = getCatalogForVersion(version);
      expect(entry).toBeDefined();
      expect(entry!.candidates.length).toBeGreaterThanOrEqual(2);
      const recommended = entry!.candidates.filter((c) => c.recommended);
      expect(recommended.length).toBe(1);
    }
  });

  it('isCatalogSlug accepts ★ recommendations and backups for the matching version', () => {
    expect(isCatalogSlug('donut', 'v0.21')).toBe(true);
    expect(isCatalogSlug('apple-core', 'v0.21')).toBe(true);
    expect(isCatalogSlug('espresso-cup', 'v0.3')).toBe(true);
  });

  it('isCatalogSlug rejects slugs from the wrong version', () => {
    expect(isCatalogSlug('donut', 'v0.3')).toBe(false);
    expect(isCatalogSlug('espresso-cup', 'v0.21')).toBe(false);
  });

  it('isCatalogSlug rejects unknown slugs', () => {
    expect(isCatalogSlug('made-up-thing', 'v0.3')).toBe(false);
  });

  it('GENERIC_PRIMITIVE_DENYLIST contains the expected primitive names', () => {
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('box');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('bracket');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('plate');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('cylinder');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('cube');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('sphere');
    expect(GENERIC_PRIMITIVE_DENYLIST).toContain('torus-only');
  });

  it('every catalog slug is kebab-case and has no leading/trailing dashes', () => {
    for (const version of ALL_VERSIONS) {
      const entry = getCatalogForVersion(version)!;
      for (const c of entry.candidates) {
        expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/memorableBuildsCatalog.test.ts`
Expected: FAIL with `Cannot find module './memorableBuildsCatalog'`.

- [ ] **Step 3: Create the catalog module**

Create `scripts/lib/memorableBuildsCatalog.ts`:

```typescript
// scripts/lib/memorableBuildsCatalog.ts
//
// Machine-readable mirror of §2 of
// docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md.
//
// When the spec catalog is amended, update this file in the same commit.
// The denylist below is intentionally extensible — add primitive names
// that should never be valid `heroArtifact` slugs.

export interface CatalogCandidate {
  slug: string;
  recommended: boolean;
}

export interface CatalogEntry {
  version: string;
  candidates: CatalogCandidate[];
}

export const ALL_VERSIONS = [
  'v0.21',
  'v0.3', 'v0.4', 'v0.5', 'v0.6', 'v0.7', 'v0.8', 'v0.9',
  'v0.10', 'v0.11', 'v0.12', 'v0.13', 'v0.14', 'v0.15', 'v0.16', 'v0.17',
  'v1.0',
] as const;

export type CatalogVersion = (typeof ALL_VERSIONS)[number];

const CATALOG: Record<CatalogVersion, CatalogCandidate[]> = {
  'v0.21': [
    { slug: 'donut', recommended: true },
    { slug: 'apple-core', recommended: false },
    { slug: 'rubber-duck-silhouette', recommended: false },
  ],
  'v0.3': [
    { slug: 'espresso-cup', recommended: true },
    { slug: 'tiny-pumpkin', recommended: false },
    { slug: 'watering-can', recommended: false },
  ],
  'v0.4': [
    { slug: 'guitar-pick', recommended: true },
    { slug: 'house-key-silhouette', recommended: false },
    { slug: 'heart', recommended: false },
  ],
  'v0.5': [
    { slug: 'parametric-mug', recommended: true },
    { slug: 'parametric-lego-brick', recommended: false },
    { slug: 'parametric-phone-case', recommended: false },
  ],
  'v0.6': [
    { slug: 'articulated-desk-lamp', recommended: true },
    { slug: 'crank-slider-piston', recommended: false },
    { slug: 'robot-finger', recommended: false },
  ],
  'v0.7': [
    { slug: 'computer-mouse-shell', recommended: true },
    { slug: 'electric-guitar-body', recommended: false },
    { slug: 'perfume-bottle', recommended: false },
  ],
  'v0.8': [
    { slug: 'three-leg-stool-with-assembly-diagram', recommended: true },
    { slug: 'mini-drone-frame', recommended: false },
    { slug: 'skateboard-truck', recommended: false },
  ],
  'v0.9': [
    { slug: 'mechanical-keyboard-chassis', recommended: true },
    { slug: 'warp-pipe', recommended: false },
    { slug: 'rube-goldberg-gear-train', recommended: false },
  ],
  'v0.10': [
    { slug: 'engine-block-exploded-view', recommended: true },
    { slug: 'nesting-doll-cross-section', recommended: false },
    { slug: 'onion-cross-section', recommended: false },
  ],
  'v0.11': [
    { slug: 'kernelcad-logo-extruded', recommended: true },
    { slug: 'hello-world-3d-text', recommended: false },
    { slug: 'engraved-postcard', recommended: false },
  ],
  'v0.12': [
    { slug: 'rubber-duck-skill', recommended: true },
    { slug: 'self-bundling-build', recommended: false },
  ],
  'v0.13': [
    { slug: 'origami-crane-in-steel', recommended: true },
    { slug: 'pencil-cup', recommended: false },
    { slug: 'letter-holder', recommended: false },
  ],
  'v0.14': [
    { slug: 'octopus', recommended: true },
    { slug: 'gyroid-lattice-cube', recommended: false },
    { slug: 'coral-cluster', recommended: false },
  ],
  'v0.15': [
    { slug: 'tiny-wooden-chair', recommended: true },
    { slug: 'picture-frame', recommended: false },
    { slug: 'birdhouse', recommended: false },
  ],
  'v0.16': [
    { slug: 'napkin-sketch-to-3d', recommended: true },
    { slug: 'whiteboard-sketch-to-3d', recommended: false },
    { slug: 'photo-of-flat-object-to-3d', recommended: false },
  ],
  'v0.17': [
    { slug: 'engraved-nameplate', recommended: true },
    { slug: 'engraved-coaster', recommended: false },
    { slug: 'cookie-cutter-shape', recommended: false },
  ],
  'v1.0': [
    { slug: 'mechanical-music-box', recommended: true },
    { slug: 'articulated-robot-arm', recommended: false },
    { slug: 'pinball-machine-table', recommended: false },
  ],
};

export const GENERIC_PRIMITIVE_DENYLIST = new Set<string>([
  'box',
  'bracket',
  'plate',
  'cylinder',
  'cube',
  'sphere',
  'torus-only',
]);

export function getCatalogForVersion(version: string): CatalogEntry | undefined {
  if (!(ALL_VERSIONS as readonly string[]).includes(version)) return undefined;
  return { version, candidates: CATALOG[version as CatalogVersion] };
}

export function isCatalogSlug(slug: string, version: string): boolean {
  const entry = getCatalogForVersion(version);
  if (!entry) return false;
  return entry.candidates.some((c) => c.slug === slug);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/memorableBuildsCatalog.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/memorableBuildsCatalog.ts scripts/lib/memorableBuildsCatalog.test.ts
git commit -m "feat(scripts): typed catalog module mirroring memorable-builds spec §2"
```

---

## Task 3: Extract pure-function `validateDemoMeta` from `lint-demos.ts`

**Why:** The current `lint-demos.ts` mixes filesystem walks, ffprobe calls, and metadata checks in one function — not unit-testable. Extracting a pure validator lets us TDD the new gates (denylist, catalog match, field presence) without spinning up a real demos directory.

**Files:**
- Create: `scripts/lib/demoMetaValidator.ts`
- Test: `scripts/lib/demoMetaValidator.test.ts`
- Modify (next task): `scripts/lint-demos.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/demoMetaValidator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateDemoMeta } from './demoMetaValidator';

describe('validateDemoMeta', () => {
  const validBase = {
    taskId: 'donut',
    module: 'v0.21',
    capturedAt: '2026-05-04T00:00:00Z',
    durationMs: 21500,
    truncated: false,
    gitSha: 'abc123',
    heroArtifact: 'donut',
    catalogSource: 'memorable-builds-policy/v0.21',
    overrideApprovedBy: null,
  };

  it('passes a fully-valid catalog match', () => {
    expect(validateDemoMeta(validBase, 'v0.21')).toEqual([]);
  });

  it('rejects missing pre-existing fields (gitSha/capturedAt/taskId)', () => {
    const errs = validateDemoMeta({ ...validBase, gitSha: undefined as unknown as string }, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'gitSha'"))).toBe(true);
  });

  it('rejects missing heroArtifact', () => {
    const meta = { ...validBase } as Record<string, unknown>;
    delete meta.heroArtifact;
    const errs = validateDemoMeta(meta, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'heroArtifact'"))).toBe(true);
  });

  it('rejects missing catalogSource', () => {
    const meta = { ...validBase } as Record<string, unknown>;
    delete meta.catalogSource;
    const errs = validateDemoMeta(meta, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'catalogSource'"))).toBe(true);
  });

  it('rejects missing overrideApprovedBy (must be present even if null)', () => {
    const meta = { ...validBase } as Record<string, unknown>;
    delete meta.overrideApprovedBy;
    const errs = validateDemoMeta(meta, 'v0.21');
    expect(errs.some((e) => e.includes("missing key 'overrideApprovedBy'"))).toBe(true);
  });

  it('rejects denylisted heroArtifact (e.g. "box")', () => {
    const errs = validateDemoMeta({ ...validBase, heroArtifact: 'box' }, 'v0.21');
    expect(errs.some((e) => e.includes('denylisted'))).toBe(true);
  });

  it('rejects denylisted heroArtifact even with override set', () => {
    const errs = validateDemoMeta(
      { ...validBase, heroArtifact: 'bracket', overrideApprovedBy: 'controller' },
      'v0.21',
    );
    expect(errs.some((e) => e.includes('denylisted'))).toBe(true);
  });

  it('rejects heroArtifact that does not match the version catalog', () => {
    const errs = validateDemoMeta({ ...validBase, heroArtifact: 'espresso-cup' }, 'v0.21');
    expect(errs.some((e) => e.includes('does not match catalog for v0.21'))).toBe(true);
  });

  it('accepts heroArtifact off-catalog if overrideApprovedBy is set', () => {
    const errs = validateDemoMeta(
      { ...validBase, heroArtifact: 'custom-hero', overrideApprovedBy: 'controller: spike-day' },
      'v0.21',
    );
    expect(errs).toEqual([]);
  });

  it('rejects unknown module version (no catalog entry)', () => {
    const errs = validateDemoMeta(validBase, 'v9.9');
    expect(errs.some((e) => e.includes('no catalog entry for v9.9'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/demoMetaValidator.test.ts`
Expected: FAIL with `Cannot find module './demoMetaValidator'`.

- [ ] **Step 3: Create the validator module**

Create `scripts/lib/demoMetaValidator.ts`:

```typescript
// scripts/lib/demoMetaValidator.ts
//
// Pure validator for docs/demos/v0.X/<task>/meta.json contents.
// Called by scripts/lint-demos.ts and unit-tested in isolation.

import {
  getCatalogForVersion,
  isCatalogSlug,
  GENERIC_PRIMITIVE_DENYLIST,
} from './memorableBuildsCatalog';

const REQUIRED_PRE_EXISTING = ['gitSha', 'capturedAt', 'taskId'] as const;
const REQUIRED_NEW = ['heroArtifact', 'catalogSource', 'overrideApprovedBy'] as const;

export function validateDemoMeta(meta: Record<string, unknown>, version: string): string[] {
  const errors: string[] = [];

  for (const k of REQUIRED_PRE_EXISTING) {
    if (!meta[k]) errors.push(`meta.json missing key '${k}'`);
  }
  for (const k of REQUIRED_NEW) {
    // overrideApprovedBy may be null, but the key must be present.
    if (!(k in meta)) errors.push(`meta.json missing key '${k}'`);
  }

  if (!getCatalogForVersion(version)) {
    errors.push(`no catalog entry for ${version} in memorableBuildsCatalog`);
    return errors;
  }

  const heroArtifact = meta.heroArtifact;
  if (typeof heroArtifact === 'string' && GENERIC_PRIMITIVE_DENYLIST.has(heroArtifact)) {
    errors.push(`heroArtifact '${heroArtifact}' is denylisted (generic primitive)`);
  }

  const override = meta.overrideApprovedBy;
  const hasOverride = typeof override === 'string' && override.length > 0;

  if (
    typeof heroArtifact === 'string' &&
    !GENERIC_PRIMITIVE_DENYLIST.has(heroArtifact) &&
    !hasOverride &&
    !isCatalogSlug(heroArtifact, version)
  ) {
    errors.push(`heroArtifact '${heroArtifact}' does not match catalog for ${version} and no overrideApprovedBy is set`);
  }

  return errors;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/demoMetaValidator.test.ts`
Expected: PASS — all 10 assertions green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/demoMetaValidator.ts scripts/lib/demoMetaValidator.test.ts
git commit -m "feat(scripts): pure validateDemoMeta with catalog + denylist + override checks"
```

---

## Task 4: Wire `validateDemoMeta` into `lint-demos.ts`

**Why:** Replaces the inline pre-existing-fields check inside `lintModule` with a call to the new pure validator, so the new gates (denylist, catalog match, override path) take effect at ship-time.

**Files:**
- Modify: `scripts/lint-demos.ts:54-66` (the meta.json check block inside `lintModule`)

- [ ] **Step 1: Read the current meta.json check block**

Open `scripts/lint-demos.ts` and locate this block (around lines 54-66):

```typescript
    const metaPath = join(taskDir, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        for (const k of ['gitSha', 'capturedAt', 'taskId']) {
          if (!meta[k]) errors.push(`${moduleSlug}/${taskName}: meta.json missing key '${k}'`);
        }
      } catch (e) {
        errors.push(`${moduleSlug}/${taskName}: meta.json parse failed: ${(e as Error).message}`);
      }
    }
```

- [ ] **Step 2: Replace with a call to `validateDemoMeta`**

Add an import at the top of `scripts/lint-demos.ts`:

```typescript
import { validateDemoMeta } from './lib/demoMetaValidator';
```

Replace the meta.json check block (lines 54-66 above) with:

```typescript
    const metaPath = join(taskDir, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        for (const err of validateDemoMeta(meta, moduleSlug)) {
          errors.push(`${moduleSlug}/${taskName}: ${err}`);
        }
      } catch (e) {
        errors.push(`${moduleSlug}/${taskName}: meta.json parse failed: ${(e as Error).message}`);
      }
    }
```

- [ ] **Step 3: Smoke-run lint-demos against the existing v0.21 demo**

Run: `npm run lint-demos`

Expected: FAILS — `v0.21/bracket-holes` will now report missing `heroArtifact` / `catalogSource` / `overrideApprovedBy` keys (because the existing meta.json predates this policy). This proves the gate is wired in.

Capture the output: keep the failure as evidence that the lint now enforces the new fields. The failure resolves automatically once Task 7 completes (which re-shoots v0.21 with the new template) — but for this task, the lint failing on a known-stale fixture is the success signal.

- [ ] **Step 4: Run the existing unit + integration tests to confirm no regression**

Run: `npm run test -- scripts/lib/`

Expected: PASS — all `scripts/lib/` tests including the new `demoMetaValidator.test.ts` and `memorableBuildsCatalog.test.ts` are green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lint-demos.ts
git commit -m "feat(lint-demos): use validateDemoMeta for catalog + denylist + override gates"
```

---

## Task 5: Extend `whatsNewTemplate` with the three required sections

**Why:** §3.4 of the spec requires `whats-new.md` to contain "Hero artifact", "Why memorable", and "What's new" sections. The current template only emits a 1-paragraph capability blurb plus an MP4/panel embed. Reviewer-agent (Task 8) keys off these sections by header.

**Files:**
- Modify: `scripts/lib/whatsNewTemplate.ts`
- Test: `scripts/lib/whatsNewTemplate.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/whatsNewTemplate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  whatsNewTemplate,
  whatsNewIsFilled,
} from './whatsNewTemplate';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('whatsNewTemplate', () => {
  it('includes a Hero artifact section header', () => {
    const out = whatsNewTemplate({ module: 'v0.3', partName: 'espresso-cup', heroArtifact: 'espresso-cup' });
    expect(out).toContain('## Hero artifact');
    expect(out).toContain('espresso-cup');
  });

  it('includes a Why memorable section with three bullet headers', () => {
    const out = whatsNewTemplate({ module: 'v0.3', partName: 'espresso-cup', heroArtifact: 'espresso-cup' });
    expect(out).toContain('## Why memorable');
    expect(out).toContain('Recognizable in one second:');
    expect(out).toContain('New tool central:');
    expect(out).toContain('Reads at 360°:');
  });

  it('includes a What\'s new section with the existing capability blurb hook', () => {
    const out = whatsNewTemplate({ module: 'v0.3', partName: 'espresso-cup', heroArtifact: 'espresso-cup' });
    expect(out).toContain("## What's new");
  });
});

describe('whatsNewIsFilled', () => {
  function writeTmp(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-whats-new-'));
    const path = join(dir, 'whats-new.md');
    writeFileSync(path, content, 'utf8');
    return path;
  }

  it('returns false if the file contains "TODO:"', () => {
    const path = writeTmp('## Hero artifact\nfoo\n## Why memorable\n- Recognizable in one second: TODO:\n- New tool central: x\n- Reads at 360°: y\n## What\'s new\nblurb\n');
    expect(whatsNewIsFilled(path)).toBe(false);
  });

  it('returns false if any of the three required sections is missing', () => {
    const noHero = writeTmp('## Why memorable\n- Recognizable in one second: x\n- New tool central: y\n- Reads at 360°: z\n## What\'s new\nblurb\n');
    expect(whatsNewIsFilled(noHero)).toBe(false);

    const noWhy = writeTmp('## Hero artifact\nfoo\n## What\'s new\nblurb\n');
    expect(whatsNewIsFilled(noWhy)).toBe(false);

    const noWhat = writeTmp('## Hero artifact\nfoo\n## Why memorable\n- Recognizable in one second: x\n- New tool central: y\n- Reads at 360°: z\n');
    expect(whatsNewIsFilled(noWhat)).toBe(false);
  });

  it('returns false if any "Why memorable" bullet is empty after the colon', () => {
    const path = writeTmp(
      '## Hero artifact\nespresso-cup\n## Why memorable\n- Recognizable in one second: \n- New tool central: y\n- Reads at 360°: z\n## What\'s new\nblurb\n',
    );
    expect(whatsNewIsFilled(path)).toBe(false);
  });

  it('returns true when all three sections are present and bullets are filled', () => {
    const path = writeTmp(
      '## Hero artifact\nespresso-cup\n\n## Why memorable\n- Recognizable in one second: looks like a coffee mug\n- New tool central: shell hollow + handle hole\n- Reads at 360°: handle visible from any angle\n\n## What\'s new\nv0.3 ships shell + hole + cut.\n',
    );
    expect(whatsNewIsFilled(path)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/whatsNewTemplate.test.ts`
Expected: FAIL — template doesn't yet take a `heroArtifact` arg or emit the new sections, and `whatsNewIsFilled` doesn't yet check sections.

- [ ] **Step 3: Replace the contents of `scripts/lib/whatsNewTemplate.ts`**

Replace the file with:

```typescript
// scripts/lib/whatsNewTemplate.ts
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

export interface WhatsNewArgs {
  module: string;
  partName: string;
  heroArtifact: string;
}

export function whatsNewTemplate(opts: WhatsNewArgs): string {
  return `# ${opts.module} — synchronized live-build demo

## Hero artifact

${opts.heroArtifact}

## Why memorable

<!-- TODO: Replace each bullet's content (after the colon) with a 1-line answer. Required by docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md §1. -->

- Recognizable in one second: TODO:
- New tool central: TODO:
- Reads at 360°: TODO:

## What's new

<!-- TODO: 1-paragraph capability gain blurb in plain English. -->

This release demonstrates the agent building **${opts.partName}** with synchronized live-build.

![Demo](./demo.mp4)
![Panel](./panel.png)
`;
}

export function writeWhatsNewIfMissing(path: string, content: string): void {
  if (existsSync(path)) return;
  writeFileSync(path, content, 'utf8');
}

const REQUIRED_HEADERS = ['## Hero artifact', '## Why memorable', "## What's new"];
const WHY_MEMORABLE_BULLETS = [
  'Recognizable in one second:',
  'New tool central:',
  'Reads at 360°:',
];

export function whatsNewIsFilled(path: string): boolean {
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  if (text.includes('TODO:')) return false;
  for (const h of REQUIRED_HEADERS) {
    if (!text.includes(h)) return false;
  }
  for (const bullet of WHY_MEMORABLE_BULLETS) {
    // Match `- <bullet> <non-empty content>` — fail if content is blank or whitespace-only.
    const re = new RegExp(`-\\s*${bullet.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*(\\S.*)`, 'm');
    if (!re.test(text)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/whatsNewTemplate.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Verify no consumer of the old `whatsNewTemplate` signature broke**

Run: `npx tsc --noEmit -p tsconfig.cli.json` (or whichever tsconfig covers `scripts/`).

Expected: PASS — but if `captureDemo.ts` calls `whatsNewTemplate({ module, partName })` without `heroArtifact`, expect a type error. That error gets fixed in Task 6.

If you see a single error in `captureDemo.ts` about the missing `heroArtifact` argument, that's expected and gets resolved in Task 6 — proceed.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/whatsNewTemplate.ts scripts/lib/whatsNewTemplate.test.ts
git commit -m "feat(scripts): whats-new template with Hero artifact / Why memorable / What's new sections"
```

---

## Task 6: Add `--hero-artifact` flag to `captureDemo` + wire meta.json fields

**Why:** Capture-time is where hero-artifact info enters the system. The flag is required (no silent default). Meta.json receives the three new policy fields here.

**Files:**
- Modify: `scripts/captureDemo.ts` — `Args` interface, `parseArgs`, the meta.json `writeFileSync` block, the `whatsNewTemplate` call.

- [ ] **Step 1: Extend the `Args` interface and parse logic**

In `scripts/captureDemo.ts`, find:

```typescript
interface Args {
  task?: string;
  script?: string;
  prompt?: string;
  module: string;
  output: string;
  pacing?: string;
  titleCardSvg?: string;
  rotateOnly: boolean;
}
```

Replace with:

```typescript
interface Args {
  task?: string;
  script?: string;
  prompt?: string;
  module: string;
  output: string;
  pacing?: string;
  titleCardSvg?: string;
  rotateOnly: boolean;
  heroArtifact: string;
  overrideApprovedBy: string | null;
}
```

In `parseArgs`, find the loop with the existing flags. Add two new branches inside the `for` loop, immediately before the closing brace of the `for` loop:

```typescript
    else if (arg === '--hero-artifact') { a.heroArtifact = next; i++; }
    else if (arg === '--override-approved-by') { a.overrideApprovedBy = next; i++; }
```

Update the validation block at the end of `parseArgs`:

```typescript
  if (!a.module || !a.output) {
    console.error('Usage: captureDemo --module v0.X --output <dir> --hero-artifact <slug> (--task <id> | --script <path> --prompt <path>) [--override-approved-by "<name>: <reason>"]');
    process.exit(2);
  }
  if (!a.task && !(a.script && a.prompt)) {
    console.error('Must specify either --task or both --script and --prompt');
    process.exit(2);
  }
  if (!a.heroArtifact) {
    console.error('Missing --hero-artifact <slug>. See docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md §2 for the catalog.');
    process.exit(2);
  }
  if (!a.overrideApprovedBy) a.overrideApprovedBy = null;
  return a as Args;
```

(Replace the existing `return a as Args;` line.)

- [ ] **Step 2: Update the `whatsNewTemplate` call**

Find:

```typescript
  writeWhatsNewIfMissing(
    join(args.output, 'whats-new.md'),
    whatsNewTemplate({ module: args.module, partName }),
  );
```

Replace with:

```typescript
  writeWhatsNewIfMissing(
    join(args.output, 'whats-new.md'),
    whatsNewTemplate({ module: args.module, partName, heroArtifact: args.heroArtifact }),
  );
```

- [ ] **Step 3: Update the meta.json `writeFileSync` block**

Find:

```typescript
  writeFileSync(
    join(args.output, 'meta.json'),
    JSON.stringify({
      taskId: args.task ?? basename(scriptPath),
      module: args.module,
      capturedAt: new Date().toISOString(),
      durationMs: pacing.totalDurationMs,
      truncated: pacing.truncated,
      gitSha: execSync('git rev-parse HEAD').toString().trim(),
    }, null, 2),
  );
```

Replace with:

```typescript
  writeFileSync(
    join(args.output, 'meta.json'),
    JSON.stringify({
      taskId: args.task ?? basename(scriptPath),
      module: args.module,
      capturedAt: new Date().toISOString(),
      durationMs: pacing.totalDurationMs,
      truncated: pacing.truncated,
      gitSha: execSync('git rev-parse HEAD').toString().trim(),
      heroArtifact: args.heroArtifact,
      catalogSource: `memorable-builds-policy/${args.module}`,
      overrideApprovedBy: args.overrideApprovedBy,
    }, null, 2),
  );
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.cli.json`

Expected: PASS — no type errors.

- [ ] **Step 5: Smoke-run captureDemo argument parsing**

Run: `npx tsx scripts/captureDemo.ts --module v0.21 --output /tmp/foo --task whatever 2>&1 | head -2`

Expected: emits the new usage line with `--hero-artifact <slug>` and exits non-zero.

Run: `npx tsx scripts/captureDemo.ts --module v0.21 --output /tmp/foo --task whatever --hero-artifact donut 2>&1 | head -2`

Expected: passes argument validation (will fail later because `/tmp/foo` doesn't exist or vite isn't running, but parsing succeeded — that's the smoke-test signal).

- [ ] **Step 6: Commit**

```bash
git add scripts/captureDemo.ts
git commit -m "feat(captureDemo): require --hero-artifact, write policy fields to meta.json"
```

---

## Task 7: Append rule 7 to `docs/demos/README.md`

**Why:** §3.1 of the spec.

**Files:**
- Modify: `docs/demos/README.md`

- [ ] **Step 1: Append rule 7 under the existing policy block**

Open `docs/demos/README.md`. Find the section starting `## Rules (enforced policy)`. After the four existing rules (the bulleted list), add:

```markdown
- **Hero artifact must be drawn from the catalog in [`docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`](../superpowers/specs/2026-05-04-memorable-builds-policy-design.md)** (or have a non-null `meta.json.overrideApprovedBy` recording controller approval). Generic primitives (box, bracket, plate, cylinder, cube, sphere) are denylisted by `scripts/lint-demos.ts`. No catalog-conformant artifact, no `v0.X.0` tag.
```

- [ ] **Step 2: Verify markdown renders**

Run: `cat docs/demos/README.md | head -25`

Expected: the new bullet appears after the existing four rules.

- [ ] **Step 3: Commit**

```bash
git add docs/demos/README.md
git commit -m "docs(demos): add catalog/denylist rule to demos README policy block"
```

---

## Task 8: Replace the §H11 enforcement line in the gap-closure roadmap

**Why:** §3.5 of the spec. Old line: "per-module ship gate gains a 6th criterion — visual artifact set committed under `docs/demos/v0.X/`. No artifact, no `v0.X.0` tag." New line points readers at the policy spec for the catalog binding.

**Files:**
- Modify: `docs/superpowers/specs/2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md` (around line 561, the `**Enforcement:**` line under §H11)

- [ ] **Step 1: Read the current §H11 enforcement line**

Open the roadmap and find around line 561:

```markdown
**Enforcement:** per-module ship gate gains a 6th criterion — "visual artifact set committed under `docs/demos/v0.X/`." No artifact, no `v0.X.0` tag.
```

- [ ] **Step 2: Replace with a pointer to the policy spec**

Replace with:

```markdown
**Enforcement:** per-module ship gate gains a 6th criterion — "visual artifact set committed under `docs/demos/v0.X/`." No artifact, no `v0.X.0` tag. Hero artifact selection is governed by [`2026-05-04-memorable-builds-policy-design.md`](./2026-05-04-memorable-builds-policy-design.md): the catalog (§2 there) binds per-module brainstorms; lint-demos.ts denylist + catalog-match enforce at ship-gate time.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md
git commit -m "docs(roadmap): point §H11 enforcement at memorable-builds policy spec"
```

---

## Task 9: Create repo-root `CLAUDE.md` with reviewer-prompt rule

**Why:** §3.6 of the spec. Per-repo `CLAUDE.md` is read automatically by Claude Code agents (including dispatched `superpowers:code-reviewer` runs) when working in this repo, so a single line there propagates the v0.X.0 demo-judgment rule to every reviewer dispatch without modifying the upstream agent definition.

**Files:**
- Create: `CLAUDE.md` (repo root)

- [ ] **Step 1: Create `CLAUDE.md`**

Create `CLAUDE.md` at the repo root:

```markdown
# Repo conventions for Claude Code agents working in kernelCAD-web

## Demo discipline (v0.X.0-tag PR review rule)

When reviewing a PR that ships a `v0.X.0` tag (cuts a per-module release):

1. Verify `docs/demos/v0.X/<task>/whats-new.md` contains a `## Hero artifact` section, a `## Why memorable` section with all three bullets filled (no `TODO:`), and a `## What's new` section.
2. Verify `docs/demos/v0.X/<task>/meta.json` contains `heroArtifact`, `catalogSource`, and `overrideApprovedBy` keys.
3. Verify the §1 bar of [`docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`](docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md) is satisfied by the *artifact itself*, not by the prose. If `heroArtifact` is generic (box, bracket, plate, etc.) or the new tool isn't visibly central to the build, fail the review and cite the policy spec.
4. If `meta.json.overrideApprovedBy` is non-null, the override path was used. Surface this to the controller for traceability — it is not automatically a fail, but should not be a default.

This rule binds the `superpowers:code-reviewer` agent and any human reviewer working in this repo.
```

- [ ] **Step 2: Verify**

Run: `head -5 CLAUDE.md`

Expected: file exists and starts with `# Repo conventions`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: project CLAUDE.md with v0.X.0 demo-discipline reviewer rule"
```

---

## Task 10: End-to-end smoke run — re-shoot v0.21 as the donut to validate the full chain

**Why:** Per the user's "actually use what you ship" feedback, the chain isn't proven until a real iteration runs through it end-to-end. v0.21 is the launch artifact for the policy (per §2 of the spec, replacing `bracket-holes`); reshooting it here both validates the chain and ships the first compliant demo.

**Note:** This task may legitimately require a separate per-iteration brainstorm/spec for the donut build script itself (geometry, pacing, target render). If running this task surfaces non-trivial choices (donut proportions, sprinkle count, glaze topology), STOP this task, dispatch a `superpowers:brainstorming` session for the v0.21 donut build, and resume this task once the donut spec is written. **Do not silently default to a primitive shape.**

**Files:**
- Create: `examples/v0.21/donut.kcad.ts` — donut build script (torus + glaze ring + sprinkles).
- Modify: `docs/demos/v0.21/donut/{demo.mp4,panel.png,hero-frame.png,meta.json,pacing.json,whats-new.md}` — output of the capture run.
- Delete (after donut ships green): `docs/demos/v0.21/bracket-holes/` — supplanted by donut per §2 of the policy spec. Confirm with controller before deletion.

- [ ] **Step 1: Write the donut build script**

Create `examples/v0.21/donut.kcad.ts` that emits a recognizable donut: torus body (R≈30, r≈10), an offset glaze ring booleaned on top (slightly larger minor radius), and 6–10 small extruded "sprinkle" cylinders scattered on the glaze. Use only features available in v0.1/v0.2/v0.21 (primitives + booleans + the live-build pipeline). Reference: spec §2 v0.21 entry.

If geometric specifics aren't obvious, **escalate**: dispatch a per-iteration brainstorm to lock the donut shape before continuing.

- [ ] **Step 2: Run captureDemo end-to-end**

Run:

```bash
npx tsx scripts/captureDemo.ts --module v0.21 --output docs/demos/v0.21/donut --script examples/v0.21/donut.kcad.ts --prompt "Build a donut with glaze and sprinkles" --hero-artifact donut
```

Expected: emits `demo.mp4`, `panel.png`, `hero-frame.png`, `meta.json` (containing `heroArtifact: "donut"`, `catalogSource: "memorable-builds-policy/v0.21"`, `overrideApprovedBy: null`), `pacing.json`, `whats-new.md` (containing the three required sections with `TODO:` placeholders).

- [ ] **Step 3: Fill in the `whats-new.md` TODOs**

Open `docs/demos/v0.21/donut/whats-new.md` and replace each `TODO:` with a 1-line answer per §1 of the policy spec.

- [ ] **Step 4: Run lint-demos**

Run: `npm run lint-demos`

Expected: PASSES for `v0.21/donut` (it must — every gate this plan adds was designed to be satisfied by this artifact). If `bracket-holes` is still present, it will fail; that's expected — it gets removed in Step 6.

- [ ] **Step 5: Open the `demo.mp4` in a video player and confirm 360° readability**

Per the user's "actually use what you ship" feedback. Open `docs/demos/v0.21/donut/demo.mp4` and confirm:
- The donut is recognizable from at least 80% of the rotation.
- The glaze and sprinkles read at all angles.
- The build-step animation visibly composes the donut (not just appears at end).

If any check fails, iterate on `donut.kcad.ts`. Do not ship a demo that fails this check.

- [ ] **Step 6: Confirm with controller before deleting `bracket-holes`**

Confirm with the controller that `docs/demos/v0.21/bracket-holes/` should be removed in this PR (per §2 of the policy spec, it is supplanted). On approval:

```bash
git rm -r docs/demos/v0.21/bracket-holes/
```

- [ ] **Step 7: Re-run lint-demos to confirm green**

Run: `npm run lint-demos`

Expected: PASSES — no errors.

- [ ] **Step 8: Commit**

```bash
git add docs/demos/v0.21/donut/ examples/v0.21/donut.kcad.ts
git commit -m "feat(v0.21): re-shoot demo as donut per memorable-builds policy"
```

---

## Self-review checklist (run before opening the PR)

- [ ] Run `npm run test -- scripts/lib/` — every test in scripts/lib passes.
- [ ] Run `npm run lint-demos` — passes (donut is the only v0.21 demo; bracket-holes removed).
- [ ] Run `npm run lint` (eslint) — no errors.
- [ ] Run `npx tsc --noEmit -p tsconfig.cli.json` — no errors.
- [ ] Spec coverage check: every §3 touchpoint (3.1–3.6) has an implementing task. (3.1 → Task 7, 3.2 → Task 6, 3.3 → Tasks 3+4, 3.4 → Task 5, 3.5 → Task 8, 3.6 → Task 9.) ✅
- [ ] Spec coverage check: §4 protocol items get inherited by future per-module brainstorms via the spec text + Task 9's CLAUDE.md, no code change needed. ✅
- [ ] Spec coverage check: §5 build-in-public coupling is policy-only, no code change. ✅
- [ ] No placeholders left in any task body.

## Out of scope for this plan

- Re-shooting v0.2 (`box-minus-divider` is grandfathered per §1 non-goals of the spec).
- Authoring per-module hero builds for v0.3 → v1.0. Each is its own future brainstorm + spec + plan.
- Visual-quality polish (lighting, materials, render style). Owned by the v0.21.1+ stream.
- Build-in-public posting cadence. Owned by the build-in-public memory note.
