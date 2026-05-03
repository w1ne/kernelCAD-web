# Cookbook with Retrieval v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship cookbook v1 — 12 curated `.kcad.ts` pattern snippets, BM25-indexed for retrieval via an MCP tool (`lookup_cookbook`) and an eval harness pre-injection mode (`--cookbook`), with CI gates and an A/B golden test.

**Architecture:** Three isolated units per the spec §Architecture. Snippets live as markdown files with YAML frontmatter at `cookbook/snippets/<id>.md`. Retrieval is a pure module (`src/cookbook/`) doing BM25 over `title + tags + keywords + when_to_use` with a 0.5 score floor. Two thin consumers wrap it: an MCP tool for live agents and an eval pre-injector that splices results into a separate `cache_control` block on the system prompt. A small build script regenerates a SKILL.md cookbook index between marker comments; CI fails if the file drifts from the regenerated content.

**Tech Stack:** TypeScript 5.9 strict ESM with `verbatimModuleSyntax`, vitest 4, `yaml` (new dependency — frontmatter parsing), `@modelcontextprotocol/sdk` (MCP server), `@anthropic-ai/sdk` (eval transport).

**Spec lineage:** Implements `docs/superpowers/specs/2026-05-03-cookbook-with-retrieval-design.md` (committed at `2ab8190` on `feat/cookbook-v1`). Design-time lineage captured in `~/.claude/projects/-home-andrii/memory/kernelcad_design_lineage.md` under "From #22 cookbook with retrieval (2026-05-03) — design-time lineage captured before spec write".

---

## File Structure

All paths relative to repo root (`/home/andrii/projects/kernelCAD-web-worktrees/feat-cookbook-v1/`).

**Create:**
- `cookbook/snippets/<id>.md` × 12 — one snippet per file (YAML frontmatter + fenced TS body).
- `cookbook/tags.json` — controlled-vocabulary whitelist for the `tags` field.
- `src/cookbook/bm25.ts` — pure tokenizer + BM25 scorer; ~60 LoC.
- `src/cookbook/bm25.test.ts` — unit tests for the scorer.
- `src/cookbook/loader.ts` — `Snippet` type + `loadSnippets` (parses frontmatter, validates fields, validates tags against whitelist).
- `src/cookbook/loader.test.ts` — unit tests for the loader.
- `src/cookbook/index.ts` — public API (`search()`); composes loader + bm25.
- `src/cookbook/index.test.ts` — integration test for `search()`.
- `src/cookbook/snapshot.test.ts` — snapshot test of top-3 IDs for 5 hand-picked queries against the real cookbook.
- `src/mcp/tools/lookupCookbook.ts` — MCP tool wrapping `search()`.
- `src/mcp/tools/lookupCookbook.test.ts` — tool-shape + envelope tests.
- `eval/cookbook-injector.ts` — eval pre-injection wrapper.
- `eval/cookbook.test.ts` — A/B golden test against `bracket-holes` task.
- `scripts/cookbookValidate.ts` — CLI that walks `cookbook/snippets/` and runs frontmatter/body validation; non-zero exit on failure.
- `scripts/cookbookEvaluate.ts` — CLI that runs `kernelcad evaluate` against every snippet body.
- `scripts/buildCookbookIndex.ts` — regenerates the SKILL.md cookbook index between marker comments.
- `scripts/buildCookbookIndex.test.ts` — generator stability/idempotency test.

**Modify:**
- `src/skill/SKILL.md` — insert `<!-- COOKBOOK:START -->` … `<!-- COOKBOOK:END -->` markers and the build-generated cookbook index between them.
- `src/mcp/server.ts` — register `lookup_cookbook` in the `TOOLS` array and the `CallToolRequestSchema` switch.
- `eval/types.ts` — add `cookbook_inject` to the `TranscriptEvent` discriminated union; extend `AgentClient` with optional `systemAddendum`.
- `eval/agent.ts` — `MockAgentClient` records `systemAddendum`; `AnthropicAgentClient` emits two `cache_control` blocks when addendum is non-empty.
- `eval/runner.ts` — accept optional `cookbookInjection` arg; pass `systemAddendum` to `agent.generate`; emit `cookbook_inject` event into the transcript.
- `eval/run.ts` — parse `--cookbook` flag; load snippets once; per-task call `injectCookbook(prompt)`.
- `eval/lib.ts` — `renderTranscript` handles `cookbook_inject` events.
- `package.json` — add `yaml` dep; add `cookbook:validate`, `cookbook:evaluate`, `cookbook:build`, `eval:ab` scripts; wire the three `cookbook:*` scripts into `qc`.
- `tsconfig.cli.json` — add `src/cookbook/**/*` to the CLI include list (the MCP tool needs cookbook code at runtime; CLI build needs to bundle it).
- `CHANGELOG.md` — `[Unreleased]` entry summarizing cookbook v1.

**Why files split this way:** `bm25.ts` / `loader.ts` / `index.ts` are independently testable units (BM25 needs no IO; loader needs no scoring; `index.ts` is a 5-line composition). `lookupCookbook.ts` and `cookbook-injector.ts` are thin one-purpose adapters; their tests cover only the wrapping logic. The build-generator script is its own file because its responsibility (file generation + diff stability) is orthogonal to retrieval.

---

## Task 1: Add `yaml` dep + `cookbook/tags.json` + `cookbook/snippets/.gitkeep`

**Files:**
- Modify: `package.json` (add `yaml` to `dependencies`)
- Create: `cookbook/tags.json`
- Create: `cookbook/snippets/.gitkeep`

The `yaml` package is needed by the loader to parse snippet frontmatter. The tags whitelist file gates new tag additions; an empty `snippets/` folder makes the layout visible from day one.

- [ ] **Step 1: Install `yaml`**

```bash
cd /home/andrii/projects/kernelCAD-web-worktrees/feat-cookbook-v1
npm install yaml@^2.6.0
```

Expected: `package.json` and `package-lock.json` updated. `yaml` added under `dependencies`.

- [ ] **Step 2: Create `cookbook/tags.json` with the v1 whitelist**

Create `cookbook/tags.json` with this exact content:

```json
[
  "fillet",
  "chamfer",
  "shell",
  "subtract",
  "union",
  "intersect",
  "boolean",
  "face-ref",
  "edge-features",
  "translate",
  "rotate",
  "mirror",
  "primitive",
  "sketch",
  "extrude",
  "revolve",
  "parameter",
  "bolt",
  "hole",
  "pocket",
  "plate",
  "bracket",
  "stacking",
  "symmetry"
]
```

- [ ] **Step 3: Create the `cookbook/snippets/.gitkeep` placeholder**

```bash
mkdir -p cookbook/snippets
touch cookbook/snippets/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json cookbook/tags.json cookbook/snippets/.gitkeep
git commit -m "chore(cookbook): add yaml dep + tags whitelist + snippets folder"
```

---

## Task 2: BM25 module — tokenizer + scorer

**Files:**
- Create: `src/cookbook/bm25.ts`
- Create: `src/cookbook/bm25.test.ts`

Pure module — no IO, no Node-specific imports. Tokenizer is lowercase + split on `/[^a-z0-9]+/` + drop tokens ≤ 2 chars + drop a small English stopword list. Scorer implements standard BM25 (`k1=1.5`, `b=0.75`).

- [ ] **Step 1: Write the failing tokenizer + scorer tests**

Create `src/cookbook/bm25.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { tokenize, scoreBM25 } from './bm25';

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumeric', () => {
    expect(tokenize('Fillet, the TOP face!')).toEqual(['fillet', 'top', 'face']);
  });

  it('drops tokens of length <= 2', () => {
    expect(tokenize('a an be the of fillet')).toEqual(['fillet']);
  });

  it('drops english stopwords', () => {
    expect(tokenize('the fillet is on top of the box')).toEqual(['fillet', 'top', 'box']);
  });

  it('returns empty array for empty/punctuation-only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('!!! ... ???')).toEqual([]);
  });
});

describe('scoreBM25', () => {
  const docs = [
    { id: 'd1', text: 'fillet round corner edge' },
    { id: 'd2', text: 'chamfer bevel corner' },
    { id: 'd3', text: 'subtract boolean operation' },
  ];

  it('returns higher score for better-matching doc', () => {
    const r = scoreBM25('fillet edge', docs);
    expect(r.find((x) => x.id === 'd1')!.score).toBeGreaterThan(r.find((x) => x.id === 'd2')!.score);
  });

  it('returns zero score for docs with no overlap', () => {
    const r = scoreBM25('fillet', docs);
    expect(r.find((x) => x.id === 'd3')!.score).toBe(0);
  });

  it('returns zero score for empty query', () => {
    const r = scoreBM25('', docs);
    for (const hit of r) expect(hit.score).toBe(0);
  });

  it('is deterministic — same inputs produce identical scores', () => {
    const r1 = scoreBM25('fillet edge', docs);
    const r2 = scoreBM25('fillet edge', docs);
    expect(r1).toEqual(r2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/cookbook/bm25.test.ts
```

Expected: all tests fail with "Failed to resolve import `./bm25`".

- [ ] **Step 3: Implement `src/cookbook/bm25.ts`**

```typescript
// Pure BM25 over a corpus of {id, text} docs. Standard Robertson/Sparck-Jones
// parameters (k1=1.5, b=0.75). No external deps. Tokenizer drops tokens <= 2
// chars and a small English stopword set.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with',
]);

const K1 = 1.5;
const B = 0.75;

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface ScoredDoc {
  id: string;
  score: number;
}

export function scoreBM25(query: string, docs: Array<{ id: string; text: string }>): ScoredDoc[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return docs.map((d) => ({ id: d.id, score: 0 }));

  const docTokens = docs.map((d) => tokenize(d.text));
  const docLengths = docTokens.map((t) => t.length);
  const avgDocLen = docLengths.reduce((a, b) => a + b, 0) / Math.max(docs.length, 1) || 1;

  // Document frequency for each query term.
  const df = new Map<string, number>();
  for (const term of new Set(qTokens)) {
    let count = 0;
    for (const tokens of docTokens) {
      if (tokens.includes(term)) count++;
    }
    df.set(term, count);
  }

  return docs.map((doc, i) => {
    const tokens = docTokens[i];
    const dl = docLengths[i];
    let score = 0;
    for (const term of new Set(qTokens)) {
      const tf = tokens.filter((t) => t === term).length;
      if (tf === 0) continue;
      const n = df.get(term)!;
      // BM25 IDF with the +1 smoothing (Lucene-style) so terms appearing in
      // every doc still contribute a tiny positive weight rather than going
      // negative.
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (dl / avgDocLen));
      score += idf * (numerator / denominator);
    }
    return { id: doc.id, score };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/cookbook/bm25.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cookbook/bm25.ts src/cookbook/bm25.test.ts
git commit -m "feat(cookbook): pure BM25 tokenizer + scorer"
```

---

## Task 3: Snippet loader — frontmatter parser + Snippet type

**Files:**
- Create: `src/cookbook/loader.ts`
- Create: `src/cookbook/loader.test.ts`

`loadSnippets(rootDir)` reads every `*.md` file under `cookbook/snippets/`, splits frontmatter (between `---` lines) from body, parses frontmatter as YAML, validates required fields, validates tags against the whitelist at `cookbook/tags.json`, extracts the body from the single fenced TS code block. Throws on any malformed snippet.

- [ ] **Step 1: Write failing loader tests**

Create `src/cookbook/loader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSnippets } from './loader';

function makeFixture(files: Record<string, string>): { rootDir: string; tagsPath: string } {
  const root = mkdtempSync(join(tmpdir(), 'cookbook-'));
  mkdirSync(join(root, 'snippets'), { recursive: true });
  writeFileSync(join(root, 'tags.json'), JSON.stringify(['fillet', 'subtract', 'face-ref', 'edge-features', 'boolean']));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, 'snippets', name), content);
  }
  return { rootDir: join(root, 'snippets'), tagsPath: join(root, 'tags.json') };
}

const goodSnippet = `---
id: fillet-face-after-subtract
title: Fillet only the top face after subtract
tags: [fillet, subtract, face-ref]
keywords:
  - round the rim of a hole
  - fillet the top edge after cutting
when_to_use: After subtracting a hole or pocket, you want to round only the rim.
---

\`\`\`typescript
return box(50, 50, 8).subtract(cylinder(10, 6).translate(25, 25, -1)).fillet(1.5, { face: 'top' });
\`\`\`
`;

describe('loadSnippets', () => {
  it('parses a well-formed snippet', () => {
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': goodSnippet });
    const snippets = loadSnippets(rootDir, tagsPath);
    expect(snippets).toHaveLength(1);
    const s = snippets[0];
    expect(s.id).toBe('fillet-face-after-subtract');
    expect(s.title).toBe('Fillet only the top face after subtract');
    expect(s.tags).toEqual(['fillet', 'subtract', 'face-ref']);
    expect(s.keywords).toContain('round the rim of a hole');
    expect(s.when_to_use).toMatch(/^After subtracting/);
    expect(s.body).toMatch(/return box\(50, 50, 8\)/);
    expect(s.body).not.toContain('```');
  });

  it('rejects snippets whose filename does not match the id', () => {
    const { rootDir, tagsPath } = makeFixture({ 'wrong-name.md': goodSnippet });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/filename.*id/i);
  });

  it('rejects snippets with unknown tags', () => {
    const bad = goodSnippet.replace('tags: [fillet, subtract, face-ref]', 'tags: [fillet, mystery]');
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': bad });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/unknown tag.*mystery/i);
  });

  it('rejects snippets without a body code fence', () => {
    const bad = goodSnippet.replace(/```typescript[\s\S]*```/, 'just prose, no fence');
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': bad });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/code fence/i);
  });

  it('rejects snippets with two code fences', () => {
    const bad = goodSnippet.replace(/```$/, "```\n\n```typescript\nreturn cylinder(1,1);\n```");
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': bad });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/exactly one.*fence/i);
  });

  it('rejects snippets missing frontmatter', () => {
    const { rootDir, tagsPath } = makeFixture({ 'naked.md': '```typescript\nreturn box(1,1,1);\n```' });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/frontmatter/i);
  });

  it('returns snippets sorted by id (alphabetical, stable)', () => {
    const a = goodSnippet
      .replace('id: fillet-face-after-subtract', 'id: alpha-snippet')
      .replace('title: Fillet only the top face after subtract', 'title: Alpha');
    const b = goodSnippet
      .replace('id: fillet-face-after-subtract', 'id: beta-snippet')
      .replace('title: Fillet only the top face after subtract', 'title: Beta');
    const { rootDir, tagsPath } = makeFixture({ 'beta-snippet.md': b, 'alpha-snippet.md': a });
    const snippets = loadSnippets(rootDir, tagsPath);
    expect(snippets.map((s) => s.id)).toEqual(['alpha-snippet', 'beta-snippet']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/cookbook/loader.test.ts
```

Expected: all tests fail with "Failed to resolve import `./loader`".

- [ ] **Step 3: Implement `src/cookbook/loader.ts`**

```typescript
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface Snippet {
  id: string;
  title: string;
  tags: string[];
  keywords: string[];
  when_to_use: string;
  body: string;       // raw TS code, fences stripped
  filepath: string;   // for traceability
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const FENCE_RE = /```typescript\n([\s\S]*?)\n```/g;

export function loadSnippets(rootDir = 'cookbook/snippets', tagsPath = 'cookbook/tags.json'): Snippet[] {
  if (!existsSync(rootDir)) {
    throw new Error(`Cookbook snippets directory not found: ${rootDir}`);
  }
  const allowedTags = new Set<string>(JSON.parse(readFileSync(tagsPath, 'utf8')));
  const files = readdirSync(rootDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const snippets: Snippet[] = [];
  for (const file of files) {
    const filepath = join(rootDir, file);
    const raw = readFileSync(filepath, 'utf8');
    snippets.push(parseSnippet(raw, filepath, allowedTags));
  }
  return snippets;
}

function parseSnippet(raw: string, filepath: string, allowedTags: Set<string>): Snippet {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    throw new Error(`${filepath}: missing or malformed frontmatter (expected leading '---' fences)`);
  }
  const fm = parseYaml(m[1]) as Partial<Snippet> | null;
  if (!fm || typeof fm !== 'object') {
    throw new Error(`${filepath}: frontmatter did not parse as a YAML object`);
  }

  const required = ['id', 'title', 'tags', 'keywords', 'when_to_use'] as const;
  for (const field of required) {
    if (fm[field] === undefined) {
      throw new Error(`${filepath}: frontmatter missing required field '${field}'`);
    }
  }

  const filenameStem = basename(filepath, extname(filepath));
  if (fm.id !== filenameStem) {
    throw new Error(`${filepath}: filename stem '${filenameStem}' does not match frontmatter id '${fm.id}'`);
  }

  if (!Array.isArray(fm.tags)) {
    throw new Error(`${filepath}: 'tags' must be an array`);
  }
  for (const tag of fm.tags) {
    if (!allowedTags.has(tag)) {
      throw new Error(`${filepath}: unknown tag '${tag}' (add it to cookbook/tags.json with justification)`);
    }
  }

  if (!Array.isArray(fm.keywords) || fm.keywords.length < 1) {
    throw new Error(`${filepath}: 'keywords' must be a non-empty array`);
  }

  // Body validation — exactly one fenced typescript block in the post-frontmatter text.
  const body = m[2];
  const matches = [...body.matchAll(FENCE_RE)];
  if (matches.length === 0) {
    throw new Error(`${filepath}: body has no \`\`\`typescript code fence`);
  }
  if (matches.length > 1) {
    throw new Error(`${filepath}: body has ${matches.length} code fences; expected exactly one`);
  }

  return {
    id: fm.id as string,
    title: fm.title as string,
    tags: fm.tags as string[],
    keywords: fm.keywords as string[],
    when_to_use: fm.when_to_use as string,
    body: matches[0][1].trim(),
    filepath,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/cookbook/loader.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cookbook/loader.ts src/cookbook/loader.test.ts
git commit -m "feat(cookbook): snippet loader with frontmatter + tag validation"
```

---

## Task 4: Compose `search()` + score floor

**Files:**
- Create: `src/cookbook/index.ts`
- Create: `src/cookbook/index.test.ts`

`src/cookbook/index.ts` is the public surface — re-exports `Snippet` and `loadSnippets`, and exports `search(query, snippets, k=3)` that runs BM25 on the scoring corpus (`title + tags + keywords + when_to_use`, body excluded), sorts descending, drops below-floor hits (`score < 0.5`), and clamps `k` to `[1, 5]`.

- [ ] **Step 1: Write failing search() tests**

Create `src/cookbook/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { search, type Snippet } from './index';

const fixture: Snippet[] = [
  {
    id: 'alpha',
    title: 'Fillet the top face after subtract',
    tags: ['fillet', 'subtract', 'face-ref'],
    keywords: ['round the rim of a hole', 'edge of a pocket'],
    when_to_use: 'After subtracting, fillet the top face.',
    body: '/* code */',
    filepath: '/tmp/alpha.md',
  },
  {
    id: 'beta',
    title: 'Chamfer a rotated face',
    tags: ['chamfer', 'rotate', 'face-ref'],
    keywords: ['bevel the top after rotate'],
    when_to_use: 'Chamfer a face after the part has been rotated.',
    body: '/* code */',
    filepath: '/tmp/beta.md',
  },
  {
    id: 'gamma',
    title: 'Mirror a half part',
    tags: ['mirror', 'symmetry'],
    keywords: ['symmetric part', 'half then mirror'],
    when_to_use: 'Build half a symmetric part then mirror to complete it.',
    body: '/* code */',
    filepath: '/tmp/gamma.md',
  },
];

describe('search', () => {
  it('ranks fillet+subtract query: alpha first', () => {
    const hits = search('fillet after subtract', fixture, 3);
    expect(hits[0].snippet.id).toBe('alpha');
  });

  it('returns empty for queries below the score floor', () => {
    expect(search('xyzzy plugh', fixture, 3)).toEqual([]);
  });

  it('returns empty for empty query', () => {
    expect(search('', fixture, 3)).toEqual([]);
  });

  it('returns empty for stopword-only query', () => {
    expect(search('the of and', fixture, 3)).toEqual([]);
  });

  it('clamps k to [1, 5]', () => {
    expect(search('fillet', fixture, 0).length).toBeGreaterThanOrEqual(0);
    expect(search('the rim of', fixture, 99).length).toBeLessThanOrEqual(5);
  });

  it('excludes body from scoring (matching only body content scores 0)', () => {
    const f: Snippet[] = [
      {
        id: 'just-code',
        title: 'unrelated',
        tags: ['fillet'],
        keywords: ['unrelated'],
        when_to_use: 'unrelated.',
        body: 'mysterious-magic-token-xyz123',
        filepath: '/tmp/just-code.md',
      },
    ];
    expect(search('mysterious magic token xyz123', f, 3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/cookbook/index.test.ts
```

Expected: all tests fail with import error.

- [ ] **Step 3: Implement `src/cookbook/index.ts`**

```typescript
import { scoreBM25 } from './bm25';
import { loadSnippets, type Snippet } from './loader';

export type { Snippet } from './loader';
export { loadSnippets } from './loader';

export interface SearchHit {
  snippet: Snippet;
  score: number;
}

const SCORE_FLOOR = 0.5;
const K_MIN = 1;
const K_MAX = 5;
const K_DEFAULT = 3;

function buildScoringText(s: Snippet): string {
  return `${s.title} ${s.tags.join(' ')} ${s.keywords.join(' ')} ${s.when_to_use}`;
}

export function search(query: string, snippets: Snippet[], k: number = K_DEFAULT): SearchHit[] {
  const kClamped = Math.max(K_MIN, Math.min(K_MAX, Math.floor(k) || K_DEFAULT));
  const docs = snippets.map((s) => ({ id: s.id, text: buildScoringText(s) }));
  const scored = scoreBM25(query, docs);
  const byId = new Map(snippets.map((s) => [s.id, s]));
  return scored
    .filter((d) => d.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, kClamped)
    .map((d) => ({ snippet: byId.get(d.id)!, score: d.score }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/cookbook/index.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cookbook/index.ts src/cookbook/index.test.ts
git commit -m "feat(cookbook): public search() with score floor + k clamping"
```

---

## Task 5: Author the 12 starter snippets

**Files:**
- Create: `cookbook/snippets/<id>.md` × 12

Author all 12 v1 snippets per the spec inventory. Bodies are short (~5–15 LoC), validated against the kernelCAD surface in `src/skill/SKILL.md`, and largely mirror or simplify the eval expert solutions.

- [ ] **Step 1: Author edge-features snippets (3)**

Create `cookbook/snippets/fillet-face-after-subtract.md`:

````markdown
---
id: fillet-face-after-subtract
title: Fillet only the top face after subtract
tags: [fillet, subtract, face-ref, edge-features]
keywords:
  - round the rim of a hole
  - fillet the top edge after cutting
  - chamfer the lip of a pocket
when_to_use: After subtracting a hole or pocket, you want to round only the rim of the resulting opening — not every edge in the part.
---

```typescript
const plate = box(50, 50, 8);
const hole = cylinder(10, 6).translate(25, 25, -1);
return plate.subtract(hole).fillet(1.5, { face: 'top' });
```
````

Create `cookbook/snippets/chamfer-rotated-face.md`:

````markdown
---
id: chamfer-rotated-face
title: Chamfer a canonical face after the part is rotated
tags: [chamfer, rotate, face-ref, edge-features]
keywords:
  - bevel the top edge after rotate
  - chamfer after rotation
  - face name survives rotate
when_to_use: You rotated a primitive and now want to chamfer one of its canonical faces by name (face-name semantics survive transforms).
---

```typescript
return box(40, 30, 20).rotate([1, 0, 0], 30).chamfer(1.5, { face: 'top' });
```
````

Create `cookbook/snippets/fillet-translated-shape.md`:

````markdown
---
id: fillet-translated-shape
title: Fillet a face by name on a translated primitive
tags: [fillet, translate, face-ref, edge-features]
keywords:
  - round the top after moving the part
  - fillet the top face after translate
  - face name survives translate
when_to_use: You translated a primitive and now want to fillet one of its canonical faces by name (canonical face refs survive translate).
---

```typescript
return box(40, 30, 10).translate(5, 7, 0).fillet(2, { face: 'top' });
```
````

- [ ] **Step 2: Author booleans + composition snippets (3)**

Create `cookbook/snippets/non-overlapping-l-bracket.md`:

````markdown
---
id: non-overlapping-l-bracket
title: Build an L-bracket as two non-overlapping plates
tags: [boolean, union, plate, bracket, stacking]
keywords:
  - L-shape from two plates
  - perpendicular plates joined at a right angle
  - L bracket without volume overlap
when_to_use: You're building two perpendicular plates joined at a right angle; both plates have the same thickness; volumes must not overlap at the joint.
---

```typescript
const t = 8;
const horiz = box(40, 30, t);
const vert = box(t, 30, 40).translate(0, 0, t);
return horiz.union(vert);
```
````

Create `cookbook/snippets/subtract-then-fillet-rim.md`:

````markdown
---
id: subtract-then-fillet-rim
title: Plate with a through-hole and a filleted top rim around the hole
tags: [fillet, subtract, hole, plate, parameter]
keywords:
  - fillet the rim of a through-hole
  - rounded edge around a circular hole
  - parametric plate with hole and rim fillet
when_to_use: You want a parametric plate, drill a through-hole, and round the rim where the hole meets the top face.
---

```typescript
const s = param('Plate Size', 50, { unit: 'mm', min: 20, max: 200 });
const t = param('Plate Thickness', 8, { unit: 'mm', min: 2, max: 30 });
const d = param('Hole Diameter', 12, { unit: 'mm', min: 3, max: 30 });
const r = param('Fillet Radius', 1.5, { unit: 'mm', min: 0.2, max: 5 });
const plate = box(s, s, t);
const hole = cylinder(t + 2, d / 2).translate(s / 2, s / 2, -1);
return plate.subtract(hole).fillet(r, { face: 'top' });
```
````

Create `cookbook/snippets/union-of-stacked-primitives.md`:

````markdown
---
id: union-of-stacked-primitives
title: Compose multiple primitives by translate then union
tags: [boolean, union, translate, stacking, primitive]
keywords:
  - stack two boxes
  - join multiple parts with union
  - compose primitives without overlap
when_to_use: You want to compose multiple primitives into one part by translating each into place and unioning them, without volume overlap.
---

```typescript
const lower = box(30, 30, 10);
const upper = box(20, 20, 10).translate(5, 5, 10);
return lower.union(upper);
```
````

- [ ] **Step 3: Author holes/cuts snippets (2)**

Create `cookbook/snippets/clearance-hole-through-plate.md`:

````markdown
---
id: clearance-hole-through-plate
title: Through-hole sized for a bolt with clearance
tags: [subtract, hole, bolt, plate, parameter]
keywords:
  - clearance fit hole for a bolt
  - through-hole for M5 bolt
  - bolt diameter plus 0.5mm clearance
when_to_use: You need a through-hole sized for a bolt with a small clearance margin; cylinder height extends beyond the plate so the cut is unambiguous.
---

```typescript
const t = 8;
const boltDiam = 5;
const plate = box(40, 40, t);
const hole = cylinder(t + 2, (boltDiam + 0.5) / 2).translate(20, 20, -1);
return plate.subtract(hole);
```
````

Create `cookbook/snippets/blind-pocket-from-top.md`:

````markdown
---
id: blind-pocket-from-top
title: Blind pocket cut into one face only
tags: [subtract, pocket, plate, primitive]
keywords:
  - pocket that does not go through
  - blind hole from the top
  - partial-depth cut
when_to_use: You want a pocket cut into the top face only — the cylinder is shorter than the plate so it does not reach the bottom face.
---

```typescript
const t = 12;
const pocketDepth = 6;
const plate = box(40, 40, t);
const pocket = cylinder(pocketDepth + 1, 6).translate(20, 20, t - pocketDepth);
return plate.subtract(pocket);
```
````

- [ ] **Step 4: Author sketches/symmetry/parameters snippets (4)**

Create `cookbook/snippets/extrude-rounded-rect-plate.md`:

````markdown
---
id: extrude-rounded-rect-plate
title: Plate with rounded corners via extrudeRoundedRect
tags: [extrude, plate, primitive]
keywords:
  - rounded-corner plate
  - rectangular plate with corner radius
  - rounded rectangle extruded
when_to_use: You want a flat plate with rounded corners; use the dedicated rounded-rect extrude rather than building corners by hand.
---

```typescript
return extrudeRoundedRect(60, 40, 5, 8);
```
````

Create `cookbook/snippets/revolve-rectangular-profile.md`:

````markdown
---
id: revolve-rectangular-profile
title: Cylindrical wall or ring via revolveRect with offset
tags: [revolve, primitive]
keywords:
  - thin cylindrical wall
  - ring or tube
  - revolve a rectangle offset from the axis
when_to_use: You want a thin cylindrical wall, ring, or tube — revolve a rectangle around Z with an offset from the axis equal to the inner radius.
---

```typescript
return revolveRect(2, 20, 15, 360);
```
````

Create `cookbook/snippets/mirror-half-part.md`:

````markdown
---
id: mirror-half-part
title: Build half a symmetric part then mirror to complete it
tags: [mirror, symmetry, boolean]
keywords:
  - symmetric part
  - build half then mirror
  - reflect across a plane
when_to_use: The part is symmetric across a cardinal plane; build only one half and call mirror to produce the complete symmetric part.
---

```typescript
const half = box(20, 30, 10).translate(0, 0, 0);
return half.mirror('yz');
```
````

Create `cookbook/snippets/parametric-bolt-pattern-skeleton.md`:

````markdown
---
id: parametric-bolt-pattern-skeleton
title: Parametric part skeleton driven by bolt diameter
tags: [parameter, bolt, plate, hole, subtract]
keywords:
  - parametric bracket scaled by bolt size
  - thickness as multiple of bolt diameter
  - dimensions derived from bolt parameter
when_to_use: You want a part whose dimensions all derive from a single bolt-diameter parameter; thickness, plate size, hole clearance all scale together.
---

```typescript
const boltDiam = param('Bolt Diameter', 5, { unit: 'mm', min: 3, max: 10 });
const t = 2 * boltDiam;
const w = 4 * boltDiam;
const holeR = (boltDiam + 0.5) / 2;
const plate = box(w, w, t);
const hole = cylinder(t + 2, holeR).translate(w / 2, w / 2, -1);
return plate.subtract(hole);
```
````

- [ ] **Step 5: Verify the loader can read every snippet**

```bash
npx tsx -e "import { loadSnippets } from './src/cookbook/index.ts'; const s = loadSnippets(); console.log('loaded', s.length, 'snippets:', s.map(x => x.id).join(', '));"
```

Expected: `loaded 12 snippets: blind-pocket-from-top, chamfer-rotated-face, clearance-hole-through-plate, extrude-rounded-rect-plate, fillet-face-after-subtract, fillet-translated-shape, mirror-half-part, non-overlapping-l-bracket, parametric-bolt-pattern-skeleton, revolve-rectangular-profile, subtract-then-fillet-rim, union-of-stacked-primitives`

- [ ] **Step 6: Commit**

```bash
git add cookbook/snippets/
git commit -m "feat(cookbook): 12 starter pattern snippets"
```

---

## Task 6: `cookbook:validate` script + npm wiring

**Files:**
- Create: `scripts/cookbookValidate.ts`
- Modify: `package.json`

CLI wrapper that calls `loadSnippets()` and exits non-zero with the failing message on any validation error. The loader already throws with file-specific messages — this script just translates that into a process exit code and a clean output line per snippet.

- [ ] **Step 1: Create `scripts/cookbookValidate.ts`**

```typescript
#!/usr/bin/env node
import { loadSnippets } from '../src/cookbook/index';

try {
  const snippets = loadSnippets();
  console.log(`✓ ${snippets.length} cookbook snippet(s) validated`);
  for (const s of snippets) {
    console.log(`  ${s.id} (${s.tags.length} tags, ${s.keywords.length} keywords, ${s.body.length} body chars)`);
  }
  process.exit(0);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`✗ cookbook validation failed:\n  ${msg}`);
  process.exit(1);
}
```

- [ ] **Step 2: Wire `cookbook:validate` npm script**

Edit `package.json`. In `"scripts"`, add after the `eval` line:

```json
"cookbook:validate": "npx tsx scripts/cookbookValidate.ts",
```

- [ ] **Step 3: Run the script — expect success**

```bash
npm run cookbook:validate
```

Expected: `✓ 12 cookbook snippet(s) validated` followed by 12 lines.

- [ ] **Step 4: Verify it fails on a malformed snippet**

```bash
echo "broken" > cookbook/snippets/broken.md
npm run cookbook:validate || echo "exited non-zero — good"
rm cookbook/snippets/broken.md
```

Expected: process exits 1 with a message about missing frontmatter; the cleanup `rm` restores the cookbook.

- [ ] **Step 5: Commit**

```bash
git add scripts/cookbookValidate.ts package.json
git commit -m "feat(cookbook): cookbook:validate npm script"
```

---

## Task 7: `cookbook:evaluate` script — every body must `kernelcad evaluate` clean

**Files:**
- Create: `scripts/cookbookEvaluate.ts`
- Modify: `package.json`

Walks every snippet, writes its body to a temporary `.kcad.ts` file, runs `kernelcad evaluate --json`, asserts `ok: true` with zero diagnostics. CI-loud-fail when the binary is unavailable, mirroring the eval-harness pattern.

- [ ] **Step 1: Create `scripts/cookbookEvaluate.ts`**

```typescript
#!/usr/bin/env node
import { loadSnippets } from '../src/cookbook/index';
import { evaluateScript, isKernelcadAvailable } from '../eval/oracle/kernelcad-client';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main(): Promise<void> {
  const available = await isKernelcadAvailable();
  if (!available) {
    if (process.env.CI) {
      console.error('✗ kernelcad CLI not available in CI. Run `npm run build:cli` first or set KERNELCAD_BIN.');
      process.exit(1);
    }
    console.error('⚠ kernelcad CLI not available; skipping cookbook:evaluate (set CI=1 to fail loudly).');
    process.exit(0);
  }

  const snippets = loadSnippets();
  const tmp = mkdtempSync(join(tmpdir(), 'cookbook-eval-'));
  let failed = 0;

  for (const s of snippets) {
    const file = join(tmp, `${s.id}.kcad.ts`);
    writeFileSync(file, s.body);
    const r = await evaluateScript(file);
    if (r.ok) {
      console.log(`✓ ${s.id}`);
    } else {
      failed++;
      console.error(`✗ ${s.id}`);
      for (const d of r.diagnostics) {
        console.error(`    ${d.code}: ${d.message}`);
      }
    }
  }

  rmSync(tmp, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n✗ ${failed} of ${snippets.length} snippet(s) failed evaluate`);
    process.exit(1);
  }
  console.log(`\n✓ all ${snippets.length} snippet bodies evaluate clean`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Wire `cookbook:evaluate` npm script**

Edit `package.json`, in `"scripts"`, add after `cookbook:validate`:

```json
"cookbook:evaluate": "npx tsx scripts/cookbookEvaluate.ts",
```

- [ ] **Step 3: Build the CLI binary so `evaluateScript` works locally**

```bash
npm run build:cli
```

Expected: `dist/cli/index.js built` printed at end.

- [ ] **Step 4: Run cookbook:evaluate — expect all 12 pass**

```bash
npm run cookbook:evaluate
```

Expected: 12 lines starting with `✓`, then `✓ all 12 snippet bodies evaluate clean`.

If any snippet fails: read the diagnostic, fix the body in `cookbook/snippets/<id>.md`, rerun.

- [ ] **Step 5: Commit**

```bash
git add scripts/cookbookEvaluate.ts package.json
git commit -m "feat(cookbook): cookbook:evaluate gate (every body must kernelcad evaluate clean)"
```

---

## Task 8: Snapshot test — top-3 IDs for 5 hand-picked queries

**Files:**
- Create: `src/cookbook/snapshot.test.ts`

Locks the deterministic ranking against the real cookbook. Updates require a deliberate `npm test -- -u` and a CHANGELOG note.

- [ ] **Step 1: Create `src/cookbook/snapshot.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { loadSnippets, search } from './index';

const QUERIES = [
  'fillet the top edge after a subtract',
  'build an L-bracket from two perpendicular plates',
  'through-hole for a bolt with clearance',
  'pocket cut into the top face',
  'symmetric part using mirror',
];

describe('cookbook snapshot — top-3 IDs per query', () => {
  const snippets = loadSnippets();

  for (const q of QUERIES) {
    it(`ranks: "${q}"`, () => {
      const hits = search(q, snippets, 3).map((h) => h.snippet.id);
      expect(hits).toMatchSnapshot();
    });
  }
});
```

- [ ] **Step 2: Run the test to write snapshots**

```bash
npx vitest run src/cookbook/snapshot.test.ts
```

Expected: 5 snapshots written, all 5 tests pass. Snapshot file appears at `src/cookbook/__snapshots__/snapshot.test.ts.snap`.

- [ ] **Step 3: Inspect the snapshot — confirm rankings make sense**

```bash
cat src/cookbook/__snapshots__/snapshot.test.ts.snap
```

Expected (representative — actual depends on real BM25 scores):
- "fillet the top edge after a subtract" → `fillet-face-after-subtract`, `subtract-then-fillet-rim` near top
- "build an L-bracket from two perpendicular plates" → `non-overlapping-l-bracket` first
- "through-hole for a bolt with clearance" → `clearance-hole-through-plate` first
- "pocket cut into the top face" → `blind-pocket-from-top` first
- "symmetric part using mirror" → `mirror-half-part` first

If any ranking is obviously wrong: tune the snippet's `keywords` or `when_to_use` (NOT the BM25 algorithm), re-run, accept the new snapshot.

- [ ] **Step 4: Re-run the test — expect snapshots match**

```bash
npx vitest run src/cookbook/snapshot.test.ts
```

Expected: 5 tests pass with no snapshot updates.

- [ ] **Step 5: Commit**

```bash
git add src/cookbook/snapshot.test.ts src/cookbook/__snapshots__/
git commit -m "test(cookbook): snapshot top-3 IDs for 5 hand-picked queries"
```

---

## Task 9: SKILL.md cookbook index generator

**Files:**
- Create: `scripts/buildCookbookIndex.ts`
- Create: `scripts/buildCookbookIndex.test.ts`

Reads `cookbook/snippets/`, sorts by `id`, renders a markdown table between `<!-- COOKBOOK:START -->` / `<!-- COOKBOOK:END -->` markers in `src/skill/SKILL.md`. Idempotent: re-running with no snippet changes produces no diff.

- [ ] **Step 1: Write failing generator test**

Create `scripts/buildCookbookIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderCookbookSection } from './buildCookbookIndex';
import type { Snippet } from '../src/cookbook/index';

const fixture: Snippet[] = [
  {
    id: 'beta-snippet',
    title: 'Beta',
    tags: [],
    keywords: [],
    when_to_use: 'When you need beta.',
    body: '/* */',
    filepath: '/tmp/beta.md',
  },
  {
    id: 'alpha-snippet',
    title: 'Alpha',
    tags: [],
    keywords: [],
    when_to_use: 'When you need alpha.',
    body: '/* */',
    filepath: '/tmp/alpha.md',
  },
];

describe('renderCookbookSection', () => {
  it('renders a header + table sorted by id', () => {
    const out = renderCookbookSection(fixture);
    expect(out).toContain('## Cookbook (snippet index)');
    expect(out).toContain('lookup_cookbook(query, k?)');
    // alpha-snippet should appear before beta-snippet
    const ai = out.indexOf('alpha-snippet');
    const bi = out.indexOf('beta-snippet');
    expect(ai).toBeGreaterThan(0);
    expect(bi).toBeGreaterThan(ai);
  });

  it('is idempotent — same inputs produce identical bytes', () => {
    expect(renderCookbookSection(fixture)).toBe(renderCookbookSection(fixture));
  });

  it('renders an empty-cookbook placeholder when given no snippets', () => {
    const out = renderCookbookSection([]);
    expect(out).toContain('## Cookbook (snippet index)');
    expect(out).toContain('(empty)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run scripts/buildCookbookIndex.test.ts
```

Expected: import error / file not found.

- [ ] **Step 3: Implement `scripts/buildCookbookIndex.ts`**

```typescript
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { loadSnippets, type Snippet } from '../src/cookbook/index';

const SKILL_PATH = 'src/skill/SKILL.md';
const START_MARKER = '<!-- COOKBOOK:START -->';
const END_MARKER = '<!-- COOKBOOK:END -->';

export function renderCookbookSection(snippets: Snippet[]): string {
  const lines: string[] = [];
  lines.push('## Cookbook (snippet index)');
  lines.push('');
  lines.push(
    'When you need a canonical pattern, call MCP tool `lookup_cookbook(query, k?)` to fetch the full body of a snippet. The IDs and triggers below are the full v1 inventory; query by intent, not by ID.',
  );
  lines.push('');
  if (snippets.length === 0) {
    lines.push('_(empty — no snippets in `cookbook/snippets/` yet)_');
    lines.push('');
    return lines.join('\n');
  }
  lines.push('| ID | Trigger |');
  lines.push('|---|---|');
  const sorted = [...snippets].sort((a, b) => a.id.localeCompare(b.id));
  for (const s of sorted) {
    // Escape pipes inside when_to_use so the table stays valid markdown.
    const trigger = s.when_to_use.replace(/\|/g, '\\|');
    lines.push(`| ${s.id} | ${trigger} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function rewriteSkillMd(generated: string): { changed: boolean; before: string; after: string } {
  const before = readFileSync(SKILL_PATH, 'utf8');
  const startIdx = before.indexOf(START_MARKER);
  const endIdx = before.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `${SKILL_PATH} is missing ${START_MARKER} / ${END_MARKER} markers. Insert them before running this generator.`,
    );
  }
  if (endIdx < startIdx) {
    throw new Error(`${SKILL_PATH}: ${END_MARKER} appears before ${START_MARKER}`);
  }
  const head = before.slice(0, startIdx + START_MARKER.length);
  const tail = before.slice(endIdx);
  const after = `${head}\n${generated}\n${tail}`;
  return { changed: after !== before, before, after };
}

function main(): void {
  const snippets = loadSnippets();
  const generated = renderCookbookSection(snippets);
  const { changed, after } = rewriteSkillMd(generated);
  if (changed) {
    writeFileSync(SKILL_PATH, after);
    console.log(`✓ regenerated cookbook section in ${SKILL_PATH} (${snippets.length} snippet(s))`);
  } else {
    console.log(`✓ ${SKILL_PATH} cookbook section already up to date (${snippets.length} snippet(s))`);
  }
}

// Run main only when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 4: Run generator test — expect pass**

```bash
npx vitest run scripts/buildCookbookIndex.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/buildCookbookIndex.ts scripts/buildCookbookIndex.test.ts
git commit -m "feat(cookbook): SKILL.md cookbook index generator"
```

---

## Task 10: Insert COOKBOOK markers into SKILL.md, generate, commit

**Files:**
- Modify: `src/skill/SKILL.md`
- Modify: `package.json` (add `cookbook:build` script)

The generator looks for marker comments. Insert them in SKILL.md, run the generator, then commit the regenerated section.

- [ ] **Step 1: Find a stable insertion point in SKILL.md**

```bash
grep -n "^## " src/skill/SKILL.md | tail -10
```

Expected: a list of section headings. Insert markers just before the **last** top-level `## ` section (typically "Common errors" or "Debugging" — confirm by reading the headings list). The generated cookbook section will sit second-to-last in SKILL.md.

- [ ] **Step 2: Add the marker pair to `src/skill/SKILL.md`**

Open `src/skill/SKILL.md`, locate the chosen insertion point, and add this on its own pair of lines (separated by a blank line above/below):

```
<!-- COOKBOOK:START -->
<!-- COOKBOOK:END -->
```

The generator will write the cookbook section between these markers. Until the first run, the gap between markers is empty.

- [ ] **Step 3: Wire `cookbook:build` npm script**

Edit `package.json`, in `"scripts"`, add after `cookbook:evaluate`:

```json
"cookbook:build": "npx tsx scripts/buildCookbookIndex.ts",
```

- [ ] **Step 4: Run the generator**

```bash
npm run cookbook:build
```

Expected: `✓ regenerated cookbook section in src/skill/SKILL.md (12 snippet(s))`.

- [ ] **Step 5: Verify the generated section is sane**

```bash
sed -n '/<!-- COOKBOOK:START -->/,/<!-- COOKBOOK:END -->/p' src/skill/SKILL.md
```

Expected: the markers + a `## Cookbook (snippet index)` heading + a 12-row table sorted by `id`.

- [ ] **Step 6: Re-run — expect "already up to date"**

```bash
npm run cookbook:build
```

Expected: `✓ src/skill/SKILL.md cookbook section already up to date (12 snippet(s))`. Confirms idempotency.

- [ ] **Step 7: Commit**

```bash
git add src/skill/SKILL.md package.json
git commit -m "feat(cookbook): SKILL.md cookbook index — markers + generated section"
```

---

## Task 11: Wire `cookbook:*` into `npm run qc`

**Files:**
- Modify: `package.json`

The three cookbook scripts (`validate`, `evaluate`, `build`) run on every `qc` invocation. The build step doubles as a drift-check via `git diff --exit-code`.

- [ ] **Step 1: Update the `qc` script in `package.json`**

Find the existing `"qc"` line (currently `"qc": "npm run lint && npm run typecheck && npm run build:cli && npm test"`) and replace with:

```json
"qc": "npm run lint && npm run typecheck && npm run build:cli && npm run cookbook:validate && npm run cookbook:evaluate && npm run cookbook:build && git diff --exit-code src/skill/SKILL.md && npm test",
```

The `git diff --exit-code` step fails CI if `cookbook:build` regenerated content that wasn't committed.

- [ ] **Step 2: Run `qc` — expect success**

```bash
npm run qc 2>&1 | tail -20
```

Expected: lint passes, typecheck passes, build:cli runs, validate prints 12 ✓, evaluate prints 12 ✓, build says "already up to date", git diff exits 0, tests pass.

- [ ] **Step 3: Verify the diff guard catches drift**

```bash
# Manually corrupt the SKILL.md cookbook section
sed -i 's/| fillet-face-after-subtract |/| WRONG-ID |/' src/skill/SKILL.md
npm run cookbook:build && git diff --exit-code src/skill/SKILL.md && echo "FAIL: should have caught drift" || echo "✓ diff guard caught drift"
git checkout src/skill/SKILL.md
```

Expected: `cookbook:build` regenerates; `git diff --exit-code` exits non-zero; the message `✓ diff guard caught drift` prints; final `git checkout` restores SKILL.md.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(cookbook): wire cookbook:validate/evaluate/build + diff-check into qc"
```

---

## Task 12: MCP tool `lookup_cookbook` — implementation + registration

**Files:**
- Create: `src/mcp/tools/lookupCookbook.ts`
- Create: `src/mcp/tools/lookupCookbook.test.ts`
- Modify: `src/mcp/server.ts`
- Modify: `tsconfig.cli.json`

Wraps `search()` for the MCP server. Tool description tells the agent when to call it, what BM25 ranks against, and how to interpret an empty result.

- [ ] **Step 1: Write failing tool tests**

Create `src/mcp/tools/lookupCookbook.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

describe('lookupCookbookTool', () => {
  it('returns hits for a real query', async () => {
    const r = await lookupCookbookTool({ query: 'fillet after subtract' });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.hits)).toBe(true);
    expect(r.hits!.length).toBeGreaterThan(0);
    expect(r.hits![0]).toHaveProperty('id');
    expect(r.hits![0]).toHaveProperty('title');
    expect(r.hits![0]).toHaveProperty('when_to_use');
    expect(r.hits![0]).toHaveProperty('body');
    expect(r.hits![0]).toHaveProperty('score');
  });

  it('returns empty hits for queries below the floor', async () => {
    const r = await lookupCookbookTool({ query: 'mysterious-magic-token-xyz123' });
    expect(r.ok).toBe(true);
    expect(r.hits).toEqual([]);
  });

  it('errors on empty query', async () => {
    const r = await lookupCookbookTool({ query: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/query/i);
  });

  it('clamps k > 5 to 5', async () => {
    const r = await lookupCookbookTool({ query: 'fillet', k: 99 });
    expect(r.ok).toBe(true);
    expect(r.hits!.length).toBeLessThanOrEqual(5);
  });

  it('defaults k to 3', async () => {
    const r = await lookupCookbookTool({ query: 'plate' });
    expect(r.ok).toBe(true);
    expect(r.hits!.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/mcp/tools/lookupCookbook.test.ts
```

Expected: all tests fail with import error.

- [ ] **Step 3: Implement `src/mcp/tools/lookupCookbook.ts`**

```typescript
// src/mcp/tools/lookupCookbook.ts
//
// MCP tool: BM25 search over the curated kernelCAD cookbook. Returns
// the top-k snippets matching a natural-language query, ranked by score
// over title + tags + keywords + when_to_use (body excluded). Empty hits
// is a valid success — tells the agent "no canonical pattern available
// for this intent; proceed without cookbook help."

import { loadSnippets, search } from '../../cookbook/index';

export interface LookupCookbookInput {
  query: string;
  k?: number;
}

export interface CookbookHit {
  id: string;
  title: string;
  when_to_use: string;
  body: string;
  score: number;
}

export interface LookupCookbookOutput {
  ok: boolean;
  hits?: CookbookHit[];
  error?: string;
}

// Snippet inventory is small (~12 in v1) and pure data — load once per
// process and reuse across calls. Tests load lazily on first use.
let cached: ReturnType<typeof loadSnippets> | null = null;
function snippets() {
  if (cached === null) cached = loadSnippets();
  return cached;
}

export async function lookupCookbookTool(input: LookupCookbookInput): Promise<LookupCookbookOutput> {
  if (typeof input.query !== 'string' || input.query.trim().length === 0) {
    return { ok: false, error: 'query must be a non-empty string' };
  }
  const k = input.k ?? 3;
  const hits = search(input.query, snippets(), k).map((h) => ({
    id: h.snippet.id,
    title: h.snippet.title,
    when_to_use: h.snippet.when_to_use,
    body: h.snippet.body,
    score: h.score,
  }));
  return { ok: true, hits };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/mcp/tools/lookupCookbook.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Register the tool in `src/mcp/server.ts`**

Edit `src/mcp/server.ts`. Near the top, add the import alongside the other tool imports:

```typescript
import { lookupCookbookTool } from './tools/lookupCookbook';
```

In the `TOOLS` array, after the existing `export_stl` entry (which is the last one in the array), append:

```typescript
  {
    name: 'lookup_cookbook',
    description:
      'Search the kernelCAD cookbook for canonical pattern snippets. ' +
      'Returns top-k snippets matching the natural-language query, ' +
      'ranked by BM25 over title/tags/keywords/trigger. ' +
      'Use when you need a canonical pattern for fillet-after-subtract, ' +
      'non-overlapping booleans, sketch-to-extrude flows, etc. ' +
      'Returns empty if no snippet scores above the relevance floor — ' +
      'proceed without cookbook help in that case.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Natural-language description of what you want to do (e.g. "round the rim of a hole", "build an L-bracket").',
        },
        k: {
          type: 'number',
          description: 'Max snippets to return. Default 3, max 5.',
          default: 3,
        },
      },
      required: ['query'],
    },
  },
```

In the `switch (name)` block in the `CallToolRequestSchema` handler, after the `case 'export_stl':` block, add:

```typescript
      case 'lookup_cookbook':
        result = await lookupCookbookTool(input as Parameters<typeof lookupCookbookTool>[0]);
        break;
```

- [ ] **Step 6: Update `tsconfig.cli.json` to include the cookbook source**

Edit `tsconfig.cli.json`. In the `"include"` array, add `"src/cookbook/**/*"` after the existing entries (before `"src/modules/**/*"` is fine):

```json
  "include": ["src/cli/**/*", "src/script-runtime/**/*", "src/capture/**/*",
              "src/compute/**/*", "src/intent/**/*", "src/backends/**/*",
              "src/diagnostics/**/*",
              "src/cookbook/**/*",
              "src/lib/geometryHelpers.ts", "src/lib/safeSketch.ts",
              "src/lib/userGlobals.ts", "src/lib/withTemporaryGlobals.ts", "src/lib/workerTypes.ts",
              "src/modules/**/*", "src/naming/**/*"],
```

- [ ] **Step 7: Build CLI to confirm everything compiles together**

```bash
npm run build:cli
```

Expected: `dist/cli/index.js built` printed, no TypeScript errors.

- [ ] **Step 8: Smoke-test the MCP tool end-to-end**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lookup_cookbook","arguments":{"query":"fillet after subtract","k":2}}}' | node dist/cli/index.js mcp 2>/dev/null | tail -1 | python3 -c "import sys, json; r = json.load(sys.stdin); print(json.dumps(json.loads(r['result']['content'][0]['text']), indent=2)[:600])"
```

Expected: a JSON object with `ok: true` and a `hits` array containing snippets matching the fillet-after-subtract intent.

- [ ] **Step 9: Commit**

```bash
git add src/mcp/tools/lookupCookbook.ts src/mcp/tools/lookupCookbook.test.ts src/mcp/server.ts tsconfig.cli.json
git commit -m "feat(mcp): lookup_cookbook tool — BM25 retrieval over cookbook"
```

---

## Task 13: TranscriptEvent + renderTranscript update for `cookbook_inject`

**Files:**
- Modify: `eval/types.ts`
- Modify: `eval/lib.ts`
- Modify: `eval/lib.test.ts` (or create if missing)

Add a new `TranscriptEvent` kind and teach `renderTranscript` to render it. Empty hits still render so silence is never ambiguous.

- [ ] **Step 1: Add the event kind to `eval/types.ts`**

In `eval/types.ts`, find the `TranscriptEvent` discriminated union and add a new variant. After the existing `'evaluate'` variant, before `'score'`:

```typescript
  | { kind: 'cookbook_inject'; query: string; hits: Array<{ id: string; score: number }> }
```

- [ ] **Step 2: Write a renderTranscript test for the new event**

Open `eval/lib.test.ts` (it exists; append to the existing `describe` block for `renderTranscript`, or create a new `describe` if there isn't one for `renderTranscript` yet).

Add this test:

```typescript
import { describe, it, expect } from 'vitest';
import { renderTranscript } from './lib';
import type { TranscriptEvent, Score } from './types';

describe('renderTranscript — cookbook_inject', () => {
  const baseScore: Score = {
    gates: { 'evaluates clean': true },
    scored: {},
    gate_pass: true,
    score: 1,
    attempts: 1,
    tokens: { input: 0, output: 0, total: 0 },
    time_ms: 0,
  };

  it('renders a non-empty cookbook_inject as a Cookbook section', () => {
    const events: TranscriptEvent[] = [
      { kind: 'cookbook_inject', query: 'fillet after subtract', hits: [{ id: 'fillet-face-after-subtract', score: 1.42 }] },
    ];
    const out = renderTranscript({ task: 't', model: 'm', started_at: 's', events, score: baseScore });
    expect(out).toContain('## Cookbook injection');
    expect(out).toContain('query: "fillet after subtract"');
    expect(out).toContain('fillet-face-after-subtract');
    expect(out).toContain('1.42');
  });

  it('renders an empty cookbook_inject as a no-match line', () => {
    const events: TranscriptEvent[] = [
      { kind: 'cookbook_inject', query: 'xyzzy', hits: [] },
    ];
    const out = renderTranscript({ task: 't', model: 'm', started_at: 's', events, score: baseScore });
    expect(out).toContain('## Cookbook injection');
    expect(out).toContain('query: "xyzzy"');
    expect(out).toMatch(/no match above floor/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run eval/lib.test.ts -t cookbook_inject
```

Expected: tests fail (renderer doesn't yet handle the new event).

- [ ] **Step 4: Update `renderTranscript` in `eval/lib.ts` to handle `cookbook_inject`**

In `eval/lib.ts`, find the `renderTranscript` function and the chained `if (ev.kind === 'system_prompt') { ... } else if (ev.kind === 'turn') { ... }` block. Add a new branch after the `evaluate` branch and before the `score` branch:

```typescript
    } else if (ev.kind === 'cookbook_inject') {
      lines.push(`## Cookbook injection`);
      lines.push(`- query: "${ev.query}"`);
      if (ev.hits.length === 0) {
        lines.push('- hits: (no match above floor)');
      } else {
        lines.push(`- hits:`);
        for (const h of ev.hits) {
          lines.push(`  - ${h.id} (score ${h.score.toFixed(2)})`);
        }
      }
      lines.push('');
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run eval/lib.test.ts
```

Expected: all `eval/lib.test.ts` tests pass, including the two new ones.

- [ ] **Step 6: Commit**

```bash
git add eval/types.ts eval/lib.ts eval/lib.test.ts
git commit -m "feat(eval): cookbook_inject TranscriptEvent + renderer"
```

---

## Task 14: Extend `AgentClient` interface to support `systemAddendum`

**Files:**
- Modify: `eval/types.ts`
- Modify: `eval/agent.ts`
- Modify: `eval/agent.test.ts`

The cookbook addendum lives in its own `cache_control: { type: 'ephemeral' }` block so SKILL.md's cache survives across tasks. `MockAgentClient` records the addendum without action; `AnthropicAgentClient` builds a 2-block array when the addendum is non-empty.

- [ ] **Step 1: Extend the `AgentClient.generate` signature in `eval/types.ts`**

Find the `AgentClient` interface and add an optional `systemAddendum` field:

```typescript
export interface AgentClient {
  generate(opts: {
    system: string;
    systemAddendum?: string;   // NEW — gets its own cache_control block
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
  }): Promise<AgentResponse>;
}
```

- [ ] **Step 2: Write a failing test for the new behavior**

Append to `eval/agent.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MockAgentClient } from './agent';

describe('MockAgentClient — systemAddendum', () => {
  it('records systemAddendum on the call object', async () => {
    const client = new MockAgentClient([{ text: 'r', tokens_in: 1, tokens_out: 1 }]);
    await client.generate({
      system: 'sys',
      systemAddendum: 'addendum',
      messages: [],
      model: 'm',
      max_tokens: 1,
    });
    expect(client.calls[0].systemAddendum).toBe('addendum');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run eval/agent.test.ts -t systemAddendum
```

Expected: test fails because `MockAgentClient`'s `GenerateArgs` interface doesn't have the field yet.

- [ ] **Step 4: Update `eval/agent.ts`**

Replace the file content with:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AgentClient, AgentMessage, AgentResponse } from './types';

interface GenerateArgs {
  system: string;
  systemAddendum?: string;
  messages: AgentMessage[];
  model: string;
  max_tokens: number;
}

export class MockAgentClient implements AgentClient {
  public calls: GenerateArgs[] = [];
  private idx = 0;

  constructor(private readonly responses: AgentResponse[]) {}

  async generate(args: GenerateArgs): Promise<AgentResponse> {
    this.calls.push(args);
    if (this.idx >= this.responses.length) {
      throw new Error(
        `MockAgentClient: response queue exhausted (asked for #${this.idx + 1}, only ${this.responses.length} canned)`,
      );
    }
    return this.responses[this.idx++];
  }
}

export class AnthropicAgentClient implements AgentClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(args: GenerateArgs): Promise<AgentResponse> {
    // Build the system blocks. Always one block for SKILL.md (cached). When
    // a cookbook addendum is present, it's a separate ephemeral cache block
    // so it can vary per task without invalidating the SKILL.md cache.
    const systemBlocks: Anthropic.TextBlockParam[] = [
      { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
    ];
    if (args.systemAddendum && args.systemAddendum.length > 0) {
      systemBlocks.push({
        type: 'text',
        text: args.systemAddendum,
        cache_control: { type: 'ephemeral' },
      });
    }

    const resp = await this.client.messages.create({
      model: args.model,
      max_tokens: args.max_tokens,
      system: systemBlocks,
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      tokens_in: resp.usage.input_tokens + (resp.usage.cache_creation_input_tokens ?? 0) + (resp.usage.cache_read_input_tokens ?? 0),
      tokens_out: resp.usage.output_tokens,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify all pass**

```bash
npx vitest run eval/agent.test.ts
```

Expected: all tests pass, including the new `systemAddendum` test.

- [ ] **Step 6: Commit**

```bash
git add eval/types.ts eval/agent.ts eval/agent.test.ts
git commit -m "feat(eval): AgentClient supports optional systemAddendum (separate cache block)"
```

---

## Task 15: Cookbook injector module

**Files:**
- Create: `eval/cookbook-injector.ts`

Wraps `search()` for the harness. Returns `{ query, hits, systemPromptAddendum }`. When hits is empty the addendum is the empty string (not "## Retrieved cookbook snippets — none" — that would be confusing context).

- [ ] **Step 1: Implement `eval/cookbook-injector.ts`**

```typescript
import { loadSnippets, search, type Snippet } from '../src/cookbook/index';

export interface CookbookInjection {
  query: string;
  hits: Array<{ id: string; score: number }>;
  systemPromptAddendum: string;
}

const DEFAULT_K = 3;

export function injectCookbook(prompt: string, snippets?: Snippet[]): CookbookInjection {
  const all = snippets ?? loadSnippets();
  const results = search(prompt, all, DEFAULT_K);
  const hits = results.map((r) => ({ id: r.snippet.id, score: r.score }));

  if (results.length === 0) {
    return { query: prompt, hits: [], systemPromptAddendum: '' };
  }

  const lines: string[] = [];
  lines.push('## Retrieved cookbook snippets for this task');
  lines.push('');
  lines.push('The following canonical patterns may help with the task. Adapt freely.');
  lines.push('');
  for (const h of results) {
    lines.push(`### ${h.snippet.title}`);
    lines.push('');
    lines.push(h.snippet.when_to_use);
    lines.push('');
    lines.push('```typescript');
    lines.push(h.snippet.body);
    lines.push('```');
    lines.push('');
  }

  return { query: prompt, hits, systemPromptAddendum: lines.join('\n') };
}
```

- [ ] **Step 2: Sanity-check the injector inline**

```bash
npx tsx -e "import { injectCookbook } from './eval/cookbook-injector.ts'; const r = injectCookbook('build an L-bracket from two perpendicular plates'); console.log(JSON.stringify({ query: r.query, hits: r.hits, addendumLen: r.systemPromptAddendum.length }, null, 2));"
```

Expected: `query` matches, `hits` is a non-empty array (likely starting with `non-overlapping-l-bracket`), `addendumLen` > 0.

- [ ] **Step 3: Commit**

```bash
git add eval/cookbook-injector.ts
git commit -m "feat(eval): cookbook injector — wraps search() for the harness"
```

---

## Task 16: Wire `--cookbook` flag through `eval/run.ts` + `eval/runner.ts`

**Files:**
- Modify: `eval/runner.ts`
- Modify: `eval/run.ts`

`runner.runTask` accepts an optional pre-computed `cookbookInjection` arg (so the runner stays oracle-agnostic and the per-task injection happens at the `run.ts` layer). On every turn, the runner passes the injection's `systemPromptAddendum` to `agent.generate` and emits the `cookbook_inject` event into the transcript exactly once per task (before the first turn).

- [ ] **Step 1: Update `eval/runner.ts` to accept and use the injection**

In `eval/runner.ts`, update the `RunTaskArgs` interface:

```typescript
import type { CookbookInjection } from './cookbook-injector';

export interface RunTaskArgs {
  taskDir: string;
  runDir: string;
  agent: AgentClient;
  model: string;
  skillMd: string;
  startedAt: string;
  cookbook?: CookbookInjection;   // NEW — optional
}
```

After the existing `events.push({ kind: 'user_prompt', content: prompt });` line (around line 33), add:

```typescript
  if (args.cookbook) {
    events.push({
      kind: 'cookbook_inject',
      query: args.cookbook.query,
      hits: args.cookbook.hits,
    });
  }
```

In the `for (let attempt = 1; ...)` loop, replace the `args.agent.generate({ ... })` call's options object with one that includes the addendum:

```typescript
    const resp = await args.agent.generate({
      system: args.skillMd,
      systemAddendum: args.cookbook?.systemPromptAddendum,
      messages,
      model: args.model,
      max_tokens: MAX_TOKENS,
    });
```

- [ ] **Step 2: Update `eval/run.ts` to parse `--cookbook` and call the injector**

In `eval/run.ts`, near the top of `main()`, add the flag parse:

```typescript
  const useCookbook = args.includes('--cookbook');
```

After the existing `const skillMd = readFileSync(...)` line, add:

```typescript
  // Lazy-load the injector only when --cookbook is enabled to avoid the
  // cookbook IO/parse cost in the default code path.
  const inject = useCookbook
    ? (await import('./cookbook-injector')).injectCookbook
    : null;
```

In the per-task loop, just before `await runTask(...)`, add:

```typescript
    const cookbookInjection = inject
      ? inject(readFileSync(join(TASKS_DIR, task, 'prompt.md'), 'utf8'))
      : undefined;
```

And pass it to `runTask`:

```typescript
      const r = await runTask({
        taskDir: join(TASKS_DIR, task),
        runDir: join(runRoot, task),
        agent,
        model: isMock ? 'mock-model' : MODEL,
        skillMd,
        startedAt,
        cookbook: cookbookInjection,
      });
```

- [ ] **Step 3: Run typecheck — expect clean**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Run the existing eval tests — expect all still pass (cookbook off by default)**

```bash
npx vitest run eval/
```

Expected: every existing eval test (including `golden.test.ts`) still passes — the default code path is unchanged when `--cookbook` is not set.

- [ ] **Step 5: Commit**

```bash
git add eval/runner.ts eval/run.ts
git commit -m "feat(eval): --cookbook flag wires per-task injection into runner"
```

---

## Task 17: A/B golden test — bracket-holes with and without `--cookbook`

**Files:**
- Create: `eval/cookbook.test.ts`

Locks the splice point and the deterministic ranking. Mock agent returns the gold solution unchanged; both runs produce identical scores; the cookbook-on transcript contains exactly one `cookbook_inject` event with the expected ranking.

- [ ] **Step 1: Create `eval/cookbook.test.ts`**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';
import { injectCookbook } from './cookbook-injector';

let kernelcadAvailable = false;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  if (!kernelcadAvailable && process.env.CI) {
    throw new Error(
      'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`.',
    );
  }
});

describe('cookbook A/B against bracket-holes', () => {
  it('produces identical scores with --cookbook on vs off; transcript reflects the difference', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();

    const expert = readFileSync('eval/tasks/bracket-holes/solution-expert.kcad.ts', 'utf8');
    const skillMd = readFileSync('src/skill/SKILL.md', 'utf8');
    const prompt = readFileSync('eval/tasks/bracket-holes/prompt.md', 'utf8');

    // OFF
    const offDir = mkdtempSync(join(tmpdir(), 'cookbook-ab-off-'));
    const offClient = new MockAgentClient([
      { text: '```typescript\n' + expert + '\n```', tokens_in: 1000, tokens_out: 200 },
    ]);
    const offResult = await runTask({
      taskDir: 'eval/tasks/bracket-holes',
      runDir: offDir,
      agent: offClient,
      model: 'mock-model',
      skillMd,
      startedAt: 'AB-OFF',
    });

    // ON
    const onDir = mkdtempSync(join(tmpdir(), 'cookbook-ab-on-'));
    const onClient = new MockAgentClient([
      { text: '```typescript\n' + expert + '\n```', tokens_in: 1000, tokens_out: 200 },
    ]);
    const injection = injectCookbook(prompt);
    const onResult = await runTask({
      taskDir: 'eval/tasks/bracket-holes',
      runDir: onDir,
      agent: onClient,
      model: 'mock-model',
      skillMd,
      startedAt: 'AB-ON',
      cookbook: injection,
    });

    // Identical scores (mock agent ⇒ same script ⇒ same harness verdict).
    expect(onResult.score?.score).toBe(offResult.score?.score);
    expect(onResult.score?.gates).toEqual(offResult.score?.gates);
    expect(onResult.score?.scored).toEqual(offResult.score?.scored);

    // OFF: agent received no addendum.
    expect(offClient.calls[0].systemAddendum).toBeUndefined();

    // ON: agent received a non-empty addendum, and the transcript shows the injection.
    expect((onClient.calls[0].systemAddendum ?? '').length).toBeGreaterThan(0);
    expect(onClient.calls[0].systemAddendum).toContain('## Retrieved cookbook snippets for this task');

    const onTx = readFileSync(join(onDir, 'transcript.md'), 'utf8');
    expect(onTx).toContain('## Cookbook injection');
    expect(onTx).toMatch(/non-overlapping-l-bracket|subtract-then-fillet-rim|parametric-bolt-pattern-skeleton/);

    const offTx = readFileSync(join(offDir, 'transcript.md'), 'utf8');
    expect(offTx).not.toContain('## Cookbook injection');

    // Injection ranking is deterministic and includes a top hit relevant to L-brackets.
    expect(injection.hits.length).toBeGreaterThan(0);
    expect(injection.hits.map((h) => h.id)).toContain('non-overlapping-l-bracket');
  });
});
```

- [ ] **Step 2: Run the test — expect pass**

```bash
npx vitest run eval/cookbook.test.ts
```

Expected: 1 test passes (or skips if `kernelcad` is unavailable).

- [ ] **Step 3: Sanity-check via the CLI**

```bash
KERNELCAD_BIN=./dist/cli/index.js npm run eval -- --mock --cookbook bracket-holes 2>&1 | head -25
```

Expected: completes a mock run with `--cookbook` on; printed summary matches the off-mode score (1.00).

- [ ] **Step 4: Commit**

```bash
git add eval/cookbook.test.ts
git commit -m "test(eval): A/B golden — bracket-holes identical with/without --cookbook"
```

---

## Task 18: `eval:ab` convenience script

**Files:**
- Modify: `package.json`
- Create: `scripts/evalAb.ts`

A small wrapper that runs the eval suite twice (off then on) and prints a per-task delta. Manual; not gated in CI.

- [ ] **Step 1: Create `scripts/evalAb.ts`**

```typescript
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface ScoreFile { score: number; gate_pass: boolean; tokens: { total: number }; }

function discoverRunDir(rootBefore: string[]): string {
  const after = readdirSync('eval/runs').sort();
  const fresh = after.find((n) => !rootBefore.includes(n));
  if (!fresh) throw new Error('Could not detect new run directory under eval/runs/');
  return join('eval/runs', fresh);
}

function readScores(runDir: string): Record<string, ScoreFile> {
  const out: Record<string, ScoreFile> = {};
  for (const task of readdirSync(runDir)) {
    const full = join(runDir, task);
    if (!statSync(full).isDirectory()) continue;
    const scorePath = join(full, 'score.json');
    if (!existsSync(scorePath)) continue;
    out[task] = JSON.parse(readFileSync(scorePath, 'utf8'));
  }
  return out;
}

function runEval(extraArgs: string[]): string {
  const before = existsSync('eval/runs') ? readdirSync('eval/runs').sort() : [];
  const r = spawnSync('npx', ['tsx', 'eval/run.ts', ...extraArgs], {
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`eval failed (exit ${r.status})`);
  return discoverRunDir(before);
}

function main(): void {
  console.log('\n=== A/B eval — cookbook OFF ===\n');
  const offRun = runEval([]);
  console.log('\n=== A/B eval — cookbook ON ===\n');
  const onRun = runEval(['--cookbook']);

  const off = readScores(offRun);
  const on = readScores(onRun);

  console.log('\n=== Score delta (ON minus OFF) ===\n');
  console.log('TASK                  OFF    ON     ΔSCORE  ΔTOKENS');
  console.log('─'.repeat(60));
  let totalDelta = 0;
  let tokenDeltaTotal = 0;
  for (const task of Object.keys(off).sort()) {
    if (!on[task]) continue;
    const d = on[task].score - off[task].score;
    const td = on[task].tokens.total - off[task].tokens.total;
    totalDelta += d;
    tokenDeltaTotal += td;
    console.log(`${task.padEnd(22)}${off[task].score.toFixed(2).padEnd(7)}${on[task].score.toFixed(2).padEnd(7)}${(d >= 0 ? '+' : '') + d.toFixed(2).padEnd(7)}${(td >= 0 ? '+' : '') + td}`);
  }
  console.log('─'.repeat(60));
  console.log(`TOTAL                                ${(totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(2)}    ${(tokenDeltaTotal >= 0 ? '+' : '') + tokenDeltaTotal}`);
}

main();
```

- [ ] **Step 2: Wire `eval:ab` npm script**

Edit `package.json`, in `"scripts"`, add after `eval`:

```json
"eval:ab": "npx tsx scripts/evalAb.ts",
```

- [ ] **Step 3: Smoke-test against mock mode (uses the existing fixture)**

```bash
npm run eval:ab -- --mock bracket-holes 2>&1 | tail -15
```

Expected: two mock runs complete, the delta table prints with `bracket-holes` showing `+0.00` score delta (mock returns same script either way) and a non-zero token delta (cookbook ON injects extra tokens).

- [ ] **Step 4: Commit**

```bash
git add scripts/evalAb.ts package.json
git commit -m "chore(eval): eval:ab script — runs suite twice, prints score delta"
```

---

## Task 19: CHANGELOG entry + final qc + memory update

**Files:**
- Modify: `CHANGELOG.md`

Wrap the milestone with a CHANGELOG entry, run `qc` end-to-end, and (manually) update the lineage memory note that the design landed.

- [ ] **Step 1: Add a CHANGELOG entry**

Edit `CHANGELOG.md`. At the top of the `[Unreleased]` section (under any existing `### Added` block), add a new heading and entry:

```markdown
### Added — Cookbook v1 (workstream #22)

- **12 curated `.kcad.ts` pattern snippets under `cookbook/snippets/`** covering edge features, booleans, holes, sketches, symmetry, and parameters. Each snippet is a markdown file with YAML frontmatter (`id`, `title`, `tags`, `keywords`, `when_to_use`) plus a fenced TypeScript body. Tag whitelist at `cookbook/tags.json`.
- **Pure BM25 retrieval module at `src/cookbook/`** — `search(query, snippets, k=3)` ranks over `title + tags + keywords + when_to_use` (body excluded), score floor 0.5, k clamped to [1, 5]. ~60 LoC pure TS, no external deps. Snapshot test locks ranking on 5 hand-picked queries.
- **MCP tool `lookup_cookbook(query, k?)`** — registered alongside the 14 existing tools. Returns `{ ok, hits[] }`; empty hits is a valid success ("no canonical pattern; proceed without cookbook help").
- **SKILL.md cookbook index** — build-generated section between `<!-- COOKBOOK:START -->` / `<!-- COOKBOOK:END -->` markers. CI gate: `npm run cookbook:build && git diff --exit-code src/skill/SKILL.md`.
- **Eval `--cookbook` flag** — pre-injects top-3 retrieval results into a separate `cache_control` block on the system prompt; emits a `cookbook_inject` `TranscriptEvent` per task. A/B golden test (`eval/cookbook.test.ts`) locks deterministic ranking against the bracket-holes prompt.
- **`npm run eval:ab`** convenience script — runs the suite twice (off then on) and prints the per-task score / token delta.
- **CI gates wired into `npm run qc`**: `cookbook:validate` (frontmatter + tag whitelist), `cookbook:evaluate` (every body must `kernelcad evaluate` clean), `cookbook:build` + diff-check.

Continuous growth contract per spec §"Continuous": same-PR additions; eval-driven additions; snapshot-test gate on ranking shifts; tag whitelist gate on vocabulary growth.

Per the gap-closure roadmap §I4 / first-wave dispatch doc, this is workstream #22.
```

- [ ] **Step 2: Run the full `qc` pipeline**

```bash
npm run qc 2>&1 | tail -30
```

Expected: lint passes, typecheck passes, `build:cli` runs, `cookbook:validate` prints 12 ✓, `cookbook:evaluate` prints 12 ✓, `cookbook:build` says "already up to date", `git diff --exit-code` exits 0, `npm test` passes (including new cookbook tests).

If anything fails: fix and re-run before proceeding.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): cookbook v1 — workstream #22"
```

- [ ] **Step 4: Update the lineage memory (manual, controller does this — not part of the agent commit cycle)**

In `~/.claude/projects/-home-andrii/memory/kernelcad_design_lineage.md`, under the existing "From #22 cookbook with retrieval (2026-05-03) — design-time lineage captured before spec write" subsection, append a final note line confirming the implementation matches the design:

```markdown
**Implementation status:** Cookbook v1 shipped on branch `feat/cookbook-v1` (PR pending). All design-time lineage rows above match what was implemented; no implementer deviations propagated forward (per `feedback_propagate_implementer_deviations.md` audit).
```

This step is the controller's job, not the implementing agent's — the agent flags any deviations during implementation, the controller updates the memory at the end.

- [ ] **Step 5: Push the branch + open PR**

```bash
git push -u origin feat/cookbook-v1
gh pr create --title "feat(cookbook): v1 — 12 snippets + BM25 retrieval + MCP tool + eval --cookbook" --body "$(cat <<'EOF'
## Summary

Workstream #22 of the v0.2-to-v1.0 gap-closure roadmap. Curated library of 12 canonical `.kcad.ts` pattern snippets indexed for in-prompt retrieval. Distinct from corpus expansion (cookbook is for *agents to reference*, corpus is for *evaluation*). Continuous.

- **Data:** 12 markdown-frontmatter snippets at `cookbook/snippets/`; tag whitelist at `cookbook/tags.json`.
- **Retrieval:** Pure BM25 module at `src/cookbook/` (~60 LoC, no deps); score floor 0.5; k clamped to [1, 5].
- **Agent surface:** SKILL.md cookbook index (build-generated between marker comments) + new MCP tool `lookup_cookbook(query, k?)`.
- **Eval:** `--cookbook` flag pre-injects top-3 hits into a separate `cache_control` block; `cookbook_inject` `TranscriptEvent` lands in transcript; A/B golden test locks ranking on bracket-holes; `npm run eval:ab` convenience script for manual A/B runs.
- **CI gates** (`npm run qc`): `cookbook:validate`, `cookbook:evaluate`, `cookbook:build` + diff-check.

Spec at `docs/superpowers/specs/2026-05-03-cookbook-with-retrieval-design.md`. Plan at `docs/superpowers/plans/2026-05-03-cookbook-with-retrieval-v1.md`.

## Test Plan

- [ ] `npm run qc` passes locally (lint + typecheck + cli build + 3 cookbook gates + diff check + test).
- [ ] `npm run cookbook:evaluate` reports 12 ✓.
- [ ] `npm run eval -- --mock --cookbook bracket-holes` completes with score 1.00 and a `cookbook_inject` event in the transcript.
- [ ] `npm run eval:ab -- --mock bracket-holes` prints the off-vs-on delta table (score delta = 0, token delta > 0 in mock mode).
EOF
)"
```

Expected: PR URL printed; CI runs the new `qc` gates green.

---

## Definition of done

1. ~~Spec doc written~~ ✓ (committed at `2ab8190`).
2. All 19 plan tasks landed on `feat/cookbook-v1`.
3. `npm run qc` green locally and in CI.
4. PR opened with the test plan above.
5. A/B golden test passes (or skips with the explicit CI loud-fail when `kernelcad` is unavailable).
6. Lineage memory updated to record implementation completeness (controller step).

After PR merges to `develop`, this milestone is done. Future cookbook v2 work is driven by snapshot test failures, eval `--cookbook` lift signal, and the same-PR additions path described in the spec's "Continuous growth contract" section.
