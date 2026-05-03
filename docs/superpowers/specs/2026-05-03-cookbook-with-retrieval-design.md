# `.kcad.ts` Cookbook with Retrieval — Design (v1)

**Status:** Design approved 2026-05-03. Ready for implementation plan.
**Workstream:** #22 in the v0.2-to-v1.0 gap-closure roadmap (`docs/superpowers/specs/2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md`).
**Wave:** 1 (cross-cutting infrastructure, parallel-safe).

---

## Goal

Ship a curated library of canonical `.kcad.ts` pattern snippets, indexed for retrieval, that an agent can pull into its prompt at script-authoring time. Patterns are validated against the kernel surface and the eval corpus; retrieval is deterministic, BM25-scored, and integrated with both the live MCP path (agents call a tool) and the eval harness (pre-injection for clean A/B signal).

Distinct from the eval corpus (workstream #19): the **cookbook is for agents to reference**, the **corpus is for evaluation**. The cookbook is *continuous* — entries grow over time as new modules and recurring patterns emerge.

---

## Anchor-property fit

The four anchor properties from v0.1.0 NORTHSTAR re-baseline each get a check from this design:

1. **Open** — every snippet is a markdown file in `cookbook/snippets/`. No proprietary index format, no closed-source retrieval service. The retrieval algorithm is ~40 LoC of auditable TypeScript.
2. **MCP-native** — the primary agent-facing surface is the new MCP tool `lookup_cookbook(query, k)`. Discovery surface is in SKILL.md as a regenerated index section. Both surfaces share the same retrieval module.
3. **AST-edit-primacy** — the cookbook is a *prompt-time* artifact. It informs the script the agent writes; it does not introduce a new mutation path. Agents still author scripts that flow through the existing `add_feature` / `set_param_value` AST-edit machinery.
4. **Diagnostic-rigorous** — every snippet body must `kernelcad evaluate` clean as a CI gate. A snippet that fails to compile is a contradiction in terms — cookbook entries are by definition canonical.

---

## Non-goals (in v1)

- Embedding-based semantic retrieval (BM25 in v1; revisit if snapshot tests show systematic paraphrase misses).
- A tool-use loop in the eval `AnthropicAgentClient` (eval pre-injection in v1; tool-loop measurement deferred to live MCP runs and a future eval-loop expansion).
- Per-PR live A/B in CI (manual `npm run eval:ab` script; auto-CI A/B costs API budget without a clear signal threshold to act on yet).
- Full-part snippets — patterns first, parts in cookbook v2 once the retrieval substrate is proven.
- Module-specific snippet packs (sheet-metal, assembly, SDF, Patterns) — wait for the corresponding workstream to land.
- Snippet versioning fields (`since_version`, `deprecated_in`), retrieval telemetry, `related_snippets` graph, multi-language snippets, external contribution process.

---

## Architecture

Three isolated units with thin interfaces:

```
   ┌─────────────────────────┐
   │  cookbook/snippets/     │   data — markdown files w/ frontmatter
   │   <id>.md (~12 in v1)   │
   └────────────┬────────────┘
                │ loadSnippets() → Snippet[]
                ▼
   ┌─────────────────────────┐
   │  src/cookbook/index.ts  │   logic — pure load + BM25 search
   │   loadSnippets()        │   no agent knowledge,
   │   search(q, snippets,k) │   no harness knowledge
   └─────┬─────────┬─────────┘
         │         │
         ▼         ▼
   ┌──────────────────┐         ┌────────────────────┐
   │ MCP tool         │         │ Eval pre-injector  │
   │ lookup_cookbook  │         │ eval --cookbook    │
   │ (live agents)    │         │ (harness)          │
   └──────────────────┘         └────────────────────┘
                       ▲
                       │
              ┌────────┴────────┐
              │ SKILL.md index  │  build-time-generated
              │ (cookbook IDs   │  cookbook section
              │  + when_to_use) │  in SKILL.md
              └─────────────────┘
```

**Boundaries:**
- `src/cookbook/index.ts` — pure load + BM25 search. No agent knowledge, no harness knowledge.
- `src/mcp/tools/lookupCookbook.ts` — wraps `search()` for the MCP server.
- `eval/cookbook-injector.ts` — wraps `search()` for the eval harness.
- `scripts/build-cookbook-index.ts` — regenerates the SKILL.md cookbook section.

Each unit has a single responsibility and a small, well-defined interface to the central logic module.

---

## File layout

```
cookbook/
├── snippets/
│   ├── fillet-face-after-subtract.md
│   ├── chamfer-rotated-face.md
│   ├── fillet-translated-shape.md
│   ├── non-overlapping-l-bracket.md
│   ├── subtract-then-fillet-rim.md
│   ├── union-of-stacked-primitives.md
│   ├── clearance-hole-through-plate.md
│   ├── blind-pocket-from-top.md
│   ├── extrude-rounded-rect-plate.md
│   ├── revolve-rectangular-profile.md
│   ├── mirror-half-part.md
│   └── parametric-bolt-pattern-skeleton.md
└── tags.json                         # controlled-vocabulary whitelist

src/cookbook/
├── index.ts                          # loadSnippets, search (pure)
├── bm25.ts                           # tokenizer + scoring (pure)
├── index.test.ts                     # unit tests for load + search
└── snapshot.test.ts                  # real-cookbook query snapshot

src/mcp/tools/
├── lookupCookbook.ts                 # MCP tool wrapper
└── lookupCookbook.test.ts            # tool-shape + JSON-RPC envelope test

eval/
├── cookbook-injector.ts              # harness pre-injection
└── cookbook.test.ts                  # A/B golden test

scripts/
├── build-cookbook-index.ts           # regenerates SKILL.md cookbook section
└── build-cookbook-index.test.ts

src/skill/
└── SKILL.md                          # contains <!-- COOKBOOK:START --> /
                                      #          <!-- COOKBOOK:END --> markers
```

---

## Snippet file format

One markdown file per snippet at `cookbook/snippets/<id>.md`. Frontmatter (YAML) plus a fenced TypeScript code block.

**Example:**

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

**Schema rules:**

| Field | Type | Constraints |
|---|---|---|
| `id` | string | kebab-case, unique, `[a-z0-9-]+`, must match the filename stem. |
| `title` | string | ≤ 80 characters. Short headline. |
| `tags` | string[] | Every tag must appear in `cookbook/tags.json`. |
| `keywords` | string[] | 3–8 entries. Free-text paraphrases of the title / common ways an agent might describe the intent. |
| `when_to_use` | string | One sentence. The trigger condition. Rendered into the SKILL.md cookbook index. |
| Body | code block | Exactly one fenced TypeScript code block. No prose between frontmatter and code. |

**Validation (run via `npm run cookbook:validate`):**

- Frontmatter parses as YAML.
- All required fields present and conform to constraints above.
- Filename stem equals `id`.
- Body contains exactly one fenced code block, language `typescript`.
- Every tag is in the `tags.json` whitelist.

**Compile gate (run via `npm run cookbook:evaluate`):**

- Each snippet body is concatenated into a temporary `.kcad.ts` file with the implicit kernelCAD globals available.
- Each runs `kernelcad evaluate --json`. Must exit with `ok: true` and zero diagnostics.
- Loud-fail in CI when `kernelcad` binary is unavailable, mirroring the eval-harness CI-gate pattern in `eval/oracle/kernelcad-client.ts`.

---

## Retrieval algorithm (BM25)

`src/cookbook/index.ts` exports a small, pure surface:

```typescript
export interface Snippet {
  id: string;
  title: string;
  tags: string[];
  keywords: string[];
  when_to_use: string;
  body: string;          // raw TS code (no fences)
  filepath: string;      // for traceability in eval transcripts
}

export interface SearchHit {
  snippet: Snippet;
  score: number;         // BM25 score, higher = better
}

export function loadSnippets(rootDir?: string): Snippet[];
export function search(query: string, snippets: Snippet[], k?: number): SearchHit[];
```

**Scoring corpus per snippet:** `title + ' ' + tags.join(' ') + ' ' + keywords.join(' ') + ' ' + when_to_use`. Body is **excluded** — we want intent matching, not code-fragment matching.

**BM25 parameters:** `k1 = 1.5`, `b = 0.75` (standard Robertson/Sparck-Jones defaults).

**Tokenizer:** lowercase → split on `/[^a-z0-9]+/` → drop tokens of length ≤ 2 → drop a small English stopword list (`a, an, and, are, as, at, be, by, for, from, has, he, in, is, it, its, of, on, that, the, to, was, were, will, with`).

**Score floor:** hits with `score < 0.5` are dropped. Returning empty is better than returning irrelevant. Both consumers (MCP tool and eval pre-injector) treat empty results as "no cookbook help available for this query" rather than as an error.

**Default `k`:** 3. Maximum allowed: 5. Values above 5 are clamped (the MCP tool advertises max 5 in its description).

**Determinism:** identical query + identical snippet set → identical ranking, byte-identical. The retrieval module pure-function-tests this directly; downstream golden tests (eval A/B golden, snapshot test) re-verify it.

**Implementation:** ~40 LoC of pure TypeScript in `src/cookbook/bm25.ts`. No external dependencies. Reviewed candidate libraries (`wink-bm25-text-search`, `okapibm25`); each pulled in tokenizer/stemmer trees that were larger than the entire intended cookbook for negligible accuracy gain on a 12-snippet corpus.

---

## Agent surface — SKILL.md index

A new section is appended to `src/skill/SKILL.md`, just before the existing "Common errors" / debugging guidance (exact insertion point chosen during implementation):

```markdown
<!-- COOKBOOK:START -->
## Cookbook (snippet index)

When you need a canonical pattern, call MCP tool `lookup_cookbook(query, k?)` to fetch the full body of a snippet. The IDs and triggers below are the full v1 inventory; query by intent, not by ID.

| ID | Trigger |
|---|---|
| fillet-face-after-subtract | After subtracting a hole or pocket, you want to round only the rim of the resulting opening — not every edge in the part. |
| ... | ... |
<!-- COOKBOOK:END -->
```

**Generated by `scripts/build-cookbook-index.ts`:**
- Reads `cookbook/snippets/*.md`.
- Sorts entries by `id` (alphabetical, stable).
- Renders the markdown table between the `<!-- COOKBOOK:START -->` and `<!-- COOKBOOK:END -->` markers.
- Idempotent — re-running with no snippet changes produces no diff.

**CI guard:** `npm run cookbook:build && git diff --exit-code src/skill/SKILL.md`. If the regenerated section differs from the committed file, CI fails. This catches snippet edits that didn't trigger a manual rebuild.

---

## Agent surface — MCP tool `lookup_cookbook`

Registered in `src/mcp/server.ts` alongside the existing 14 tools. Implementation in `src/mcp/tools/lookupCookbook.ts`.

**Tool descriptor:**

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
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural-language description of what you want to do (e.g. "round the rim of a hole", "build an L-bracket").'
      },
      k: {
        type: 'number',
        description: 'Max snippets to return. Default 3, max 5.',
        default: 3
      }
    },
    required: ['query']
  }
}
```

**Return shape:**

```typescript
// Success — non-empty match
{ ok: true, hits: [{ id, title, when_to_use, body, score }, ...] }

// Success — empty match (no snippet above score floor)
{ ok: true, hits: [] }

// Error — invalid input
{ ok: false, error: '<reason>' }
```

**Tool-description discipline:** the description tells the agent (1) when to call it, (2) what BM25 ranks against, and (3) how to interpret an empty result. All three are common failure modes when an agent discovers a new tool from `list_tools` — addressing them in the description avoids the agent inventing wrong heuristics.

---

## Eval integration — `--cookbook` flag

`eval/run.ts` accepts a new `--cookbook` flag (default off). When on, the harness pre-injects retrieval results before calling the agent transport.

**Pre-injector** (`eval/cookbook-injector.ts`):

```typescript
import { loadSnippets, search, type Snippet } from '../src/cookbook/index.js';

export interface CookbookInjection {
  query: string;
  hits: Array<{ id: string; score: number }>;
  systemPromptAddendum: string;   // markdown to append to system prompt
}

export function injectCookbook(prompt: string, snippets?: Snippet[]): CookbookInjection;
```

**Splice point:** the addendum is appended to the system prompt (currently `SKILL.md`) under a `## Retrieved cookbook snippets for this task` heading. Each snippet rendered as `### <title>` + fenced TS body + the snippet's `when_to_use` line.

**Cache discipline:** the addendum gets its own `cache_control: { type: 'ephemeral' }` block, separate from the SKILL.md block. SKILL.md's cache survives across tasks (it's stable); the cookbook addendum varies per task and is allowed to invalidate without dragging SKILL.md with it.

**Empty-hits behavior:** when `hits` is empty, the addendum is the empty string (no `## Retrieved cookbook snippets` heading at all). Avoids confusing the agent with an empty section.

**Transcript discipline:** every cookbook injection emits a new `TranscriptEvent` kind:

```typescript
{ kind: 'cookbook_inject', query: string, hits: Array<{ id: string; score: number }> }
```

Recorded into `transcript.md` so a reviewer can see exactly which snippets were injected and at what score. Empty hits are still logged (`cookbook_inject: query="...", hits=[] (no match above floor)`) — silence would be ambiguous.

**A/B golden test** (`eval/cookbook.test.ts`):

- Runs the existing `bracket-holes` task twice using `MockAgentClient` returning the gold solution unchanged.
- First run: `--cookbook` off. Asserts score = 1.00, no `cookbook_inject` event in transcript.
- Second run: `--cookbook` on. Asserts score = 1.00, exactly one `cookbook_inject` event with the expected snippet IDs in the expected rank order (likely `non-overlapping-l-bracket` ranks highest for that prompt).
- Locks the splice point, the cache-control discipline, and the deterministic ranking. Any future change to the BM25 algorithm or snippet inventory that would shift the ranking on this prompt requires an explicit golden-fixture update.

**Live A/B (`npm run eval:ab`):** a small wrapper script that runs the suite twice (off then on) and prints the score delta per task. Manual; not gated in CI. The flag itself is the experiment surface; the script is the convenience.

---

## Initial inventory (12 snippets)

Seeded from patterns already validated in `eval/tasks/*/solution-expert.kcad.ts` and the documented kernel surface in `src/skill/SKILL.md`. Every snippet body must run `kernelcad evaluate` clean as part of CI.

**Edge features (3):**
1. `fillet-face-after-subtract` — Round only the rim of a hole/pocket, not every edge.
2. `chamfer-rotated-face` — Chamfer a canonical face after the part is rotated (face-name semantics survive).
3. `fillet-translated-shape` — Fillet by face-name on a primitive that has been translated (canonical face refs survive translate).

**Booleans + composition (3):**
4. `non-overlapping-l-bracket` — Build two perpendicular plates joined at a right angle without volume overlap.
5. `subtract-then-fillet-rim` — Plate with a through-hole and a filleted top rim around the hole.
6. `union-of-stacked-primitives` — Compose multiple primitives into one part by `.translate()` then `.union()`, no overlap.

**Holes / cuts (2):**
7. `clearance-hole-through-plate` — Through-hole sized for a bolt with a small clearance margin (`(boltDiam + 0.5) / 2`).
8. `blind-pocket-from-top` — Pocket cut into one face only (subtract a cylinder that doesn't reach the opposite face).

**Sketches → 3D (2):**
9. `extrude-rounded-rect-plate` — Plate with rounded corners via `extrudeRoundedRect`.
10. `revolve-rectangular-profile` — Cylindrical wall / ring via `revolveRect` with offset from axis.

**Symmetry (1):**
11. `mirror-half-part` — Build half a symmetric part, then `.mirror('xy' | 'xz' | 'yz')` to complete it.

**Parameters (1):**
12. `parametric-bolt-pattern-skeleton` — Skeleton for a part driven by a bolt-diameter param (thickness/widths derived as multiples).

**Tags whitelist** (`cookbook/tags.json`, v1):

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

Adding a new tag requires editing `tags.json` in the same PR as the snippet. Forces deliberation before the vocabulary grows.

---

## Testing

Every test runs under the existing `npm test` pipeline (vitest 4).

- **`src/cookbook/index.test.ts`** — `loadSnippets` parses well-formed files, rejects malformed frontmatter, rejects body without exactly one TS fence, rejects unknown tags. `search` returns empty for empty/stopword-only queries; ranks correctly on a 3-snippet fixture; honors the score floor.
- **`src/cookbook/snapshot.test.ts`** — loads the real cookbook + 5 hand-picked queries → snapshot of top-3 IDs per query. Snapshot updates require `npm test -- -u` and a CHANGELOG note explaining the ranking change.
- **`src/mcp/tools/lookupCookbook.test.ts`** — JSON-RPC envelope shape (matches `evaluate_script` etc.), empty-query error, `k > 5` clamps to 5, default `k` = 3.
- **`eval/cookbook.test.ts`** — A/B golden test described in §"Eval integration".
- **`scripts/build-cookbook-index.test.ts`** — generator output is stable, idempotent, sorted by `id`. Re-running on the same input produces the same bytes.

---

## CI gates (added to `npm run qc`)

1. `npm run cookbook:validate` — every snippet's frontmatter parses; body is exactly one fenced TS block; every tag is in `cookbook/tags.json`.
2. `npm run cookbook:evaluate` — every snippet body runs `kernelcad evaluate` clean. Loud-fail in CI when the binary is unavailable (matches the eval-harness CI-gate pattern).
3. `npm run cookbook:build && git diff --exit-code src/skill/SKILL.md` — regenerated index matches committed.

These three commands also run on the local pre-commit hook so the contributor catches drift before pushing.

---

## "Continuous" growth contract

The cookbook is meant to grow as new modules and recurring patterns emerge. The growth contract:

1. **Same-PR additions.** Anyone authoring a new module/feature adds 1–3 cookbook snippets in the same PR if a canonical pattern emerges. No batched "cookbook expansion sprints" — entries land in the PR that motivates them.
2. **Eval-driven additions.** Eval failures with no matching cookbook hit are a leading indicator. If a recurring task pattern would benefit from a snippet that doesn't exist, file it as a new cookbook entry. Repeated failures of the same shape across runs strengthen the case.
3. **Snapshot-test gate.** Snippet edits that change ranking trigger the snapshot test → forces a deliberate snapshot update + CHANGELOG note.
4. **Tag whitelist gate.** Adding a tag that isn't in `cookbook/tags.json` blocks CI. Forces a separate, deliberate edit.
5. **No ranking heuristics outside BM25.** If retrieval needs to change, the change happens in `src/cookbook/bm25.ts` (or its replacement) — not in per-snippet boost fields. Keeps the ranking algorithm centralized and reviewable.

This makes the cookbook a continuously-curated artifact rather than a versioned dataset that gets occasionally re-shipped.

---

## Out-of-scope (deferred to v2+)

The boundary is drawn here so future cookbook work has a clear starting point.

1. **Embedding-based retrieval** — BM25 in v1; revisit if snapshot tests show systematic paraphrase misses.
2. **Tool-use loop in the eval `AnthropicAgentClient`** — eval pre-injection in v1 measures snippet usefulness; live MCP path measures agent-driven retrieval. Tool-loop in eval lands when a workstream needs it (likely the visual verifier loop, workstream #21).
3. **Live A/B in CI on every PR** — manual `npm run eval:ab` script in v1; auto-CI A/B costs API budget without a clear signal threshold to act on yet.
4. **Full-part snippets** — patterns first; parts in cookbook v2 once the retrieval substrate is proven.
5. **Module-specific snippet packs** — sheet-metal / assembly / SDF / patterns recipes wait for the corresponding workstream to land.
6. **Snippet versioning** (`since_version`, `deprecated_in`) — cookbook is git-versioned at file level; per-snippet version metadata lands when we hit the first deprecation case.
7. **Telemetry on which snippets get retrieved in production** — useful for curation, but adds a privacy surface; defer until we have explicit consent UX.
8. **`related_snippets` field** — graph navigation between snippets; YAGNI until cookbook hits ~30 entries.
9. **Multi-language snippets** — kernelCAD is TS-only.
10. **External cookbook contributions** — process for community-submitted snippets; v1 is internal-curated only.

---

## Definition of done (this milestone)

1. All sections approved by user (✓ during brainstorm).
2. Spec doc written + committed at this file path.
3. Spec self-review passed (placeholder scan, internal consistency, scope check, ambiguity check).
4. User reviews committed spec and explicitly approves moving to writing-plans.

Then handoff to `superpowers:writing-plans` to author the implementation plan.

The implementation plan covers: cookbook folder + tags whitelist + 12 starter snippets, retrieval module + BM25, MCP tool, SKILL.md index generator, eval `--cookbook` flag + injector + A/B golden test, CI gates, npm scripts. Estimated bite-sized steps: ~16–20 tasks.
