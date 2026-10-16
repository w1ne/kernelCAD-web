# kernelCAD evals

`eval/tasks/<id>/` holds single tasks (`prompt.md`, `harness.ts`,
`solution-expert.kcad.ts`) run by `npm run eval -- <id>`; the typical use
cases are described in [`tasks/USECASES.md`](tasks/USECASES.md). By default
the agent's system prompt is the authoring + MCP skill core
(`kernelcad-authoring`, `kernelcad-mcp`); `--all-skills` loads every
SKILL.md and its references, `--skills a,b` picks a set.

## mech40 — mechanical agent eval

`eval/tasks/mech40/` is 42 mechanical jobs (the set keeps its mech40 name)
drawn from what users build most, each a plain-language request with
concrete dimensions:

| Group | Tasks |
|---|---|
| Plates and hole patterns | 01 corner holes · 02 bolt-circle flange · 03 perforated grid · 04 slotted plate · 05 NEMA 17 plate · 06 hole strip |
| Brackets and mounts | 07 L-bracket · 08 gusseted L · 09 counterbored shaft support · 10 tube socket · 11 clevis |
| Enclosures and shells | 12 box + screw-down lid (tapped bosses) · 13 Raspberry Pi 4 case (standoffs, ports) · 14 PCB tray (insert pilots) · 15 shelled enclosure · 16 slip-fit lid · 17 vented cover · 18 container · 19 Raspberry Pi 5 plate |
| Couplers / set screws | 20 5→8 mm coupler · 21 shaft collar · 22 D-shaft knob |
| Gears | 23 24-tooth spur gear · 24 2:1 gear pair · 25 gear with hub and set screw |
| Hinges and joints | 26 pin hinge · 27 hinged-lid box · 28 two-link arm (revolute mates) |
| Sheet metal | 29 L-bracket · 30 down tab · 31 45° bracket · 41 U-channel · 42 Z-bracket (folded part + flat pattern) |
| Threads, countersinks, fixtures | 32 tapped rail block · 33 countersunk plate · 34 board-edge drill guide · 35 drilling template · 36 vise soft jaw · 37 M6 fixture plate |
| FDM fits | 38 running-fit pin · 39 608 bearing seat · 40 M3 nut trap |

Each `harness.ts` is a deterministic checker built on `eval/mech40/checks.ts`
(over `eval/usecaseChecks.ts`): the script is built once in-process; the
gates are a clean evaluate, the named parts, and a closed valid solid per
part; the checks measure bbox, volume ranges, kernel hole detection
(diameter, axis, position, through/blind, depth), wall and floor thickness
with material probes, recorded intent (thread pitch → tap-drill diameter,
sheet-metal thickness / K-factor / bends and the flat pattern, revolute mates
and their travel, the dfmSpec gates), tooth counts, part overlap, and a STEP
export that is re-imported. Probes are relative to each part's bbox corner,
so a correct part placed elsewhere still passes.

Every task ships an expert `solution-expert.kcad.ts` that passes its own
checker — `npm run eval:mech40:self-check` (42/42), and in `npm test` via
`eval/mech40-{a,b,c,d}.test.ts`.

**Sheet metal.** Tasks 29–31 and 41–42 score the folded part, not only the
recorded intent: the folded envelope, one connected solid, probes on the web
and flanges, and volume within 3 % of the blank. 41 (U-channel) and 42
(Z-bracket) are two-bend chains; they were left out of the first cut while
the bend lowering kept the unfolded flange and split two-bend chains into
two solids.

### Run the agent

```bash
ANTHROPIC_API_KEY=... npm run eval:mech40 -- --k 3 [--model claude-sonnet-4-6] \
  [--tasks 01-plate-four-corner-holes,24-spur-gear-pair] [--max-attempts 3] \
  [--temperature 0.7] [--concurrency 2] [--skills a,b | --all-skills]
npm run eval:mech40 -- --mock --k 2   # no key: a reference agent answers with the expert solutions
```

Each sample is the agent loop of `eval/runner.ts`: generate → in-process
`evaluate_script` gate → repair prompt, up to `--max-attempts` evaluations;
the final script is then scored by the task checker (hidden from the agent).
The run writes `eval/results/<date>-<model>.json` (committed; `--mock` writes
to the gitignored `eval/runs/` unless `--out` is given). The nightly
`mech40-agent-eval` workflow runs it when the `EVAL_ANTHROPIC_API_KEY`
secret exists and skips otherwise.

### Read the results

- `summary.pass_at_1` — mean over tasks of the chance that one sample passes
  every gate and check; `summary.pass_at_k` — the chance that at least one of
  k does (unbiased estimator, Chen et al. 2021).
- `summary.mean_evals_to_success` — evaluations the passing samples needed
  (1 = right first time).
- `summary.failure_codes` — why failing samples failed: a diagnostic code
  (the first gate failure, e.g. `feature.invalid-args`), `check:<name>` (it
  evaluated clean but the checker found the wrong part), or `eval.*`
  (no script, infra error).
- `tasks[].samples[].failedChecks` — the checker items each sample missed.

### Regression gate

```bash
npm run eval:mech40:compare -- eval/results/<date>-<model>.json [--threshold 0.05]
npm run eval:mech40:compare -- eval/results/<date>-<model>.json --write-baseline
```

`compare` exits 1 when pass@1 fell more than the threshold (absolute) below
`eval/results/baseline.json`, and lists tasks that went from passing to
failing. The committed baseline has no pass@1 yet (no API key was available
when the set landed): record the first accepted run with `--write-baseline`
and commit both files.
