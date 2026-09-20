# Sweep Prompt Compaction — design

Status: implemented and **A/B tested 2026-09-20 — not adopted**. Paired result
on the 58-case attribution subset (same driver/conditions): full 181 KB prompt
16/58 sandbox, `v2_lean` (57 KB) 12/58, `v1` (76 KB) 10/58. Compaction gained
4–5 cases but lost 10–12, clustered on detail-heavy models (pegboards, pen
holders, combs, CNC tables). The presets and builder ship as opt-in tooling
(`--prompt-preset`), default remains `full`. Evidence:
kernelCAD-private runbook §7.

## Evidence

Attribution experiment (kernelCAD-private runbook §7): bare DeepSeek on MUSE's
official CadQuery pipeline scores sandbox 54.7% / final 27.83, while the same
model through our sweep harness (`.kcad.ts`, ~35k-token skill prompt, text-only
loop) scores 24.5% / 11.79. Decomposition of the 43 bare-only losses: 22
`feature.invalid-args`, 7 gate-policy, 6 script exceptions, 8 other — i.e. the
model fails to author kernelCAD. The 35k-token prompt (4 full skills) is the
prime harness suspect: a flash model must find the DSL API inside ~10k tokens
of prose, loops, CLI docs, animation, pose-envelope review, and a 20 KB
cookbook index it cannot navigate.

## Goal

Cut the sweep system prompt from 142 KB (~35k tokens) to a compact,
API-dense core (presets: 74 KB / 56 KB) assembled from the real `SKILL.md`
files, and replace the dropped cookbook index with task-time retrieval
(`injectCookbook`, top-3 snippets). Measure on the 58-case attribution subset
before adopting.

## Non-goals

- No changes to the skill files themselves (source of truth stays intact).
- No tool-calling loop in this change (separate workstream).
- No gate-policy changes (the 7 noop-blocked cases are a separate item).
- No model change.

## Design

### Presets config

`eval/prompts/sweep-prompt-presets.json`:

```json
{
  "presets": {
    "full": null,
    "v1": {
      "skills": ["kernelcad", "kernelcad-authoring", "kernelcad-assemblies"],
      "sections": {
        "kernelcad": ["Decision tree", "Key globals available today", "Universal conventions"],
        "kernelcad-authoring": ["Coordinate System", "API Surface", "Labels — naming faces at creation time", "When something fails", "Conventions", "Interlocking joinery (flat-pack / laser / CNC)", "Hardware, belts, and wood joinery", "Verification gates", "Sample"],
        "kernelcad-assemblies": ["Assembly validity", "Assembly intent API", "Scene API", "Connectors and mates", "Verification gates"]
      }
    },
    "v2_lean": {
      "skills": ["kernelcad", "kernelcad-authoring", "kernelcad-assemblies"],
      "sections": {
        "kernelcad": ["Decision tree", "Key globals available today", "Universal conventions"],
        "kernelcad-authoring": ["Coordinate System", "API Surface", "Labels — naming faces at creation time", "When something fails", "Conventions", "Interlocking joinery (flat-pack / laser / CNC)", "Verification gates"],
        "kernelcad-assemblies": ["Assembly validity", "Assembly intent API", "Scene API", "Verification gates"]
      }
    }
  }
}
```

`null` = legacy full concatenation of `SWEEP_SKILLS`. `"*"` (allowed per skill)
= whole file. Section headings are `##`-level and matched exactly; a missing
heading is a hard error, so skill edits surface immediately in tests.

### Builder

`eval/lib/sweepPrompt.ts`:

- `extractSections(md): Map<string, string>` — `##` sections, heading text
  trimmed, body includes the heading line; content before the first `##` is
  dropped.
- `loadPresets(configPath?)`.
- `buildSweepPrompt({ preset, root?, configPath? }): { text, bytes, preset }` —
  validates every allowlisted heading exists, assembles in config order, joins
  with `\n\n---\n\n`.
- `full` delegates to the existing `buildSystemPrompt(SWEEP_SKILLS)`.

Size budgets asserted in tests: `v1 < 80 KB`, `v2_lean < 60 KB`, `full`
unchanged (~142 KB).

### Retrieval

`eval/cookbook-injector.ts` already provides `injectCookbook(prompt)` →
`systemPromptAddendum` (top-3 snippets). The sweep builds it per case from
`prompt.md` and passes it to `generateCase`'s existing `cookbook` arg.
`--no-cookbook` disables.

### Sweep wiring

`scripts/runMuseSweep.ts`:

- `--prompt-preset <name>` (default `full` until the A/B adopts a winner).
- `--no-cookbook`.
- `run.json` records `promptPreset`, `promptBytes`, `cookbook: boolean`.
- Startup logs `prompt preset=<name> bytes=<n>`.

## Measurement

A/B on the 58-case attribution subset (43 bare-only losses + 15 both-pass
cases), same driver/temperature/attempts, arms:

1. baseline = run 2 metrics on the same 58 cases (35k prompt, no retrieval);
2. `v1` + retrieval;
3. `v2_lean` + retrieval.

Decision rule: adopt the arm with the higher subset sandbox pass (tie-break:
judged count, then final). Then a full 106 run with the winner, delta recorded
in the private runbook. If neither arm beats baseline, keep `full` and report
the negative result before considering the tool-loop workstream.

## Risks

- Dropping `Connectors and mates` (v2_lean) may hurt joint-heavy cases; v1
  keeps it, so the A/B compares both.
- Retrieval may inject irrelevant snippets; `--no-cookbook` is the escape
  hatch and a follow-up ablation if results are ambiguous.
- Em-dash headings must match exactly; the builder test catches drift.
- Smaller prompts may reduce API coverage; sandbox pass is the metric, not
  prompt size.
