# CADGenBench harness

Runs kernelCAD on [CADGenBench](https://github.com/huggingface/cadgenbench):
81 mechanical parts, 49 generation tasks (engineering drawing → STEP) and 32
editing tasks (STEP + change request → STEP). The output is a submission zip
in the benchmark's layout. The harness never uploads anything. Submitting to
the leaderboard is a separate, manual decision.

## What the benchmark provides

- Public inputs: the Hugging Face dataset `HuggingAI4Engineering/cadgenbench-data`
  (ODC-BY 1.0). The harness downloads the inputs on demand into
  `.cache/<revision>/`, which is gitignored. The inputs are never committed.
- Ground truth: private. Only the leaderboard grader reads it. **The CAD Score
  cannot be computed locally.** The summary reports validity, which is the
  gate that every scored candidate must pass.
- Validity gate: `cadgenbench.common.validity.analyze_step` (the dataset's
  `sanity_check_submission.py` calls it). `--official-check` runs it on every
  candidate through `officialGate.py`.

## Pipeline per task

| Task | Steps |
|---|---|
| generation | drawing PNG(s) + prompt → LLM writes `.kcad.ts` → STEP export → validity pre-check |
| editing | `input.step` + `inspect({ of: 'step' })` summary + renders + change request → LLM writes `.kcad.ts` that calls `lib.fromSTEP('./input.step')` → STEP export → validity pre-check |

- The closed loop (`src/agent/loop/closedLoop.ts`) repairs failures. An
  export error or a failed validity check (open shell, non-manifold mesh,
  BRepCheck error) becomes a typed verdict in the repair prompt.
  `--max-attempts` sets the number of attempts (default 3).
- If no attempt produces a script that exports, one deterministic
  `repair_script` iteration runs.
- The pre-check (`validity.ts`) mirrors the benchmark gate: BRepCheck, closed
  and consistently oriented shells, and a closed, orientation-consistent
  tessellation at the grader's deflection. Only a candidate that passes goes to
  `submission/<id>/output.step`. Use `--keep-invalid` to override this.

## Setup

```bash
npm run build:cli                       # the harness drives the kernelcad CLI
export ANTHROPIC_API_KEY=...            # or: --base-url <openai-compatible> --api-key-env <VAR>
```

Optional, for `--official-check`: a Python 3.12 environment with the
benchmark package installed from its repository, exported as
`CADGENBENCH_PYTHON`. If `analyze_step` fails with
`Unable to convert function return value ... Bnd_Box::Limits`, the package's
OCCT Python bindings resolved to major version 8. Pin them (and the package
that requires them) to the previous major version.

```bash
uv venv -p 3.12 ~/.venvs/cadgenbench
VIRTUAL_ENV=~/.venvs/cadgenbench uv pip install "git+https://github.com/huggingface/cadgenbench"
export CADGENBENCH_PYTHON=~/.venvs/cadgenbench/bin/python
```

## Commands

```bash
# Dry run: 3 generation + 2 editing tasks
npx tsx eval/benchmarks/cadgenbench/run.ts --generation 3 --editing 2 --official-check

# Full set (81 tasks), resumable: rerun the same command with the same --run-dir
npx tsx eval/benchmarks/cadgenbench/run.ts \
  --run-dir eval/benchmarks/cadgenbench/runs/full-v1 \
  --workers 4 --official-check \
  --price-in 3 --price-out 15 \
  --submitter "<name>" --name "kernelCAD (<model>)"

# Specific tasks
npx tsx eval/benchmarks/cadgenbench/run.ts --tasks 101,201

# No LLM: generation tasks are recorded as needs_key; editing tasks submit the unchanged input
npx tsx eval/benchmarks/cadgenbench/run.ts --no-llm --editing 2

# Scripts written elsewhere (for example through the kernelCAD MCP tools): <dir>/<id>.kcad.ts
npx tsx eval/benchmarks/cadgenbench/run.ts --scripts-from path/to/scripts --tasks 101,102
```

| Flag | Meaning |
|---|---|
| `--model` | default `$EVAL_MODEL` or the eval default model; it must accept images |
| `--edit-fallback passthrough` | an editing task without a valid edit submits the unchanged input. The benchmark scores a no-op edit at no more than 0.4. An invalid candidate scores 0. |
| `--retry-failed` | also rerun tasks that ended `invalid` or `failed` (by default, resume skips them) |
| `--revision <sha>` | pin a dataset revision (default `main`, resolved to a sha and recorded in `run.json`) |
| `--data-dir <dir>` | use a local copy of the inputs instead of downloading them |
| `--agree` | sets `agree_to_publish: true` in `meta.json` (default false) |

## Outputs (`<run-dir>/`)

- `run.json`: dataset revision, git sha, model, settings.
- `tasks/<id>/`: `state.json` (resume record: status, attempts, tokens, cost,
  time, pre-check and official verdicts), `prompt.md`, `transcript.md`,
  `model.kcad.ts`, `model.step`.
- `submission/<id>/output.step` and `submission.zip`: `meta.json` plus one
  folder per task. A task without a candidate keeps an empty folder, and the
  grader scores it as `missing`.
- `summary.md` / `summary.json`: the per-task table and the valid counts.

Resume skips a task that is `valid`, `invalid` or `failed` for the same
producer (LLM, scripts-from, or passthrough). The `needs_key` and
`infra_error` states always rerun.
