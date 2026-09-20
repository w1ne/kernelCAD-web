# Sweep Prompt Compaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a preset-based compact sweep prompt from the real skill files plus per-task cookbook retrieval, then A/B it on the 58-case attribution subset.

**Architecture:** A JSON presets file with `##`-section allowlists; `eval/lib/sweepPrompt.ts` assembles and validates; the sweep CLI gains `--prompt-preset`/`--no-cookbook` and wires `injectCookbook` per case.

**Tech Stack:** TypeScript, vitest, existing `injectCookbook`, existing sweep runner.

**Spec:** `docs/superpowers/specs/2026-09-20-sweep-prompt-compaction-design.md`

---

### Task 1: Presets config and builder

> **Superseded code note:** the snippets below are the original plan draft.
> The merged implementation (commits `2df8055a`, `62617c62`) is authoritative:
> `extractSections` is fence-aware, CRLF-safe, and throws on duplicate
> headings; `BuiltSweepPrompt` is `{ text, bytes, preset }` (no
> `sectionBytes`); missing skills raise the `systemPrompt.ts`-style error.
> Replay from the repository, not from this code block.

**Files:**
- Create: `eval/prompts/sweep-prompt-presets.json`
- Create: `eval/lib/sweepPrompt.ts`
- Test: `eval/lib/sweepPrompt.test.ts`

- [ ] **Step 1: Create the presets config**

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

- [ ] **Step 2: Write the failing test**

`eval/lib/sweepPrompt.test.ts`:

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSweepPrompt, extractSections, loadPresets } from './sweepPrompt';

const FIXTURE_MD = [
  '# Title',
  '',
  'intro text',
  '',
  '## Alpha',
  '',
  'alpha body',
  '',
  '### Alpha sub',
  '',
  'sub body',
  '',
  '## Beta',
  '',
  'beta body',
].join('\n');

describe('extractSections', () => {
  it('extracts h2 sections with their heading line and drops the intro', () => {
    const s = extractSections(FIXTURE_MD);
    expect([...s.keys()]).toEqual(['Alpha', 'Beta']);
    expect(s.get('Alpha')).toContain('## Alpha');
    expect(s.get('Alpha')).toContain('### Alpha sub');
    expect(s.get('Alpha')).not.toContain('intro text');
    expect(s.get('Beta')).toContain('beta body');
  });
});

describe('buildSweepPrompt', () => {
  it('throws on an unknown preset', () => {
    expect(() => buildSweepPrompt({ preset: 'nope' })).toThrow(/unknown prompt preset/);
  });

  it('throws when an allowlisted heading is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'preset-'));
    writeFileSync(
      join(dir, 'sweep-prompt-presets.json'),
      JSON.stringify({ presets: { bad: { skills: ['kernelcad'], sections: { kernelcad: ['No Such Heading'] } } } }),
    );
    expect(() => buildSweepPrompt({ preset: 'bad', configPath: join(dir, 'sweep-prompt-presets.json') })).toThrow(
      /heading 'No Such Heading' not found in skill 'kernelcad'/,
    );
  });

  it('builds v1 and v2_lean from the real skills within budget', () => {
    const v1 = buildSweepPrompt({ preset: 'v1' });
    const v2 = buildSweepPrompt({ preset: 'v2_lean' });
    expect(v1.bytes).toBeGreaterThan(50_000);
    expect(v1.bytes).toBeLessThan(80_000);
    expect(v2.bytes).toBeGreaterThan(40_000);
    expect(v2.bytes).toBeLessThan(60_000);
    expect(v2.bytes).toBeLessThan(v1.bytes);
    expect(v1.text).toContain('## API Surface');
    expect(v2.text).not.toContain('## Connectors and mates');
  });

  it('full preset concatenates all sweep skills (legacy)', () => {
    const full = buildSweepPrompt({ preset: 'full' });
    expect(full.bytes).toBeGreaterThan(130_000);
    expect(full.text).toContain('## API Surface');
  });

  it('is deterministic', () => {
    expect(buildSweepPrompt({ preset: 'v1' }).text).toBe(buildSweepPrompt({ preset: 'v1' }).text);
  });

  it('loadPresets exposes full, v1, v2_lean', () => {
    expect(Object.keys(loadPresets()).sort()).toEqual(['full', 'v1', 'v2_lean']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run eval/lib/sweepPrompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `eval/lib/sweepPrompt.ts`**

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt, SKILLS_ROOT, SWEEP_SKILLS } from './systemPrompt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = resolve(__dirname, '../prompts/sweep-prompt-presets.json');

export interface PresetConfig {
  skills: string[];
  sections: Record<string, string[] | '*'>;
}

export interface BuiltSweepPrompt {
  text: string;
  bytes: number;
  preset: string;
  sectionBytes: Record<string, number>;
}

export function extractSections(md: string): Map<string, string> {
  const out = new Map<string, string>();
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of md.split('\n')) {
    const m = /^## (?!#)(.*)$/.exec(line);
    if (m) {
      if (current !== null) out.set(current, buf.join('\n'));
      current = m[1].trim();
      buf = [line];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  if (current !== null) out.set(current, buf.join('\n'));
  return out;
}

export function loadPresets(configPath: string = DEFAULT_CONFIG_PATH): Record<string, PresetConfig | null> {
  const raw = JSON.parse(readFileSync(configPath, 'utf8')) as { presets?: Record<string, PresetConfig | null> };
  if (!raw.presets) throw new Error(`presets config missing 'presets' key: ${configPath}`);
  return raw.presets;
}

export function buildSweepPrompt(opts: {
  preset: string;
  root?: string;
  configPath?: string;
}): BuiltSweepPrompt {
  const root = opts.root ?? SKILLS_ROOT;
  const presets = loadPresets(opts.configPath);
  if (!(opts.preset in presets)) {
    throw new Error(`unknown prompt preset '${opts.preset}' (available: ${Object.keys(presets).join(', ')})`);
  }
  const cfg = presets[opts.preset];
  if (cfg === null) {
    const text = buildSystemPrompt(SWEEP_SKILLS, root);
    return { text, bytes: Buffer.byteLength(text), preset: opts.preset, sectionBytes: {} };
  }
  const parts: string[] = [];
  const sectionBytes: Record<string, number> = {};
  for (const skill of cfg.skills) {
    const md = readFileSync(join(root, skill, 'SKILL.md'), 'utf8');
    const wanted = cfg.sections[skill];
    if (wanted === undefined) {
      throw new Error(`preset '${opts.preset}' has no sections entry for skill '${skill}'`);
    }
    if (wanted === '*') {
      parts.push(md);
      sectionBytes[skill] = Buffer.byteLength(md);
      continue;
    }
    const sections = extractSections(md);
    for (const heading of wanted) {
      const body = sections.get(heading);
      if (body === undefined) {
        throw new Error(`heading '${heading}' not found in skill '${skill}' (preset '${opts.preset}')`);
      }
      parts.push(body);
      sectionBytes[`${skill}::${heading}`] = Buffer.byteLength(body);
    }
  }
  const text = parts.join('\n\n---\n\n');
  return { text, bytes: Buffer.byteLength(text), preset: opts.preset, sectionBytes };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run eval/lib/sweepPrompt.test.ts`
Expected: PASS (7 tests). If a real-skill heading mismatch surfaces, fix the JSON heading text to match the file exactly (do not loosen the validator).

- [ ] **Step 6: Commit**

```bash
git add eval/prompts/sweep-prompt-presets.json eval/lib/sweepPrompt.ts eval/lib/sweepPrompt.test.ts
git commit -m "eval: add compact sweep prompt presets and builder"
```

---

### Task 2: Sweep CLI wiring (preset + retrieval)

**Files:**
- Modify: `scripts/runMuseSweep.ts`
- Test: `scripts/runMuseSweep.test.ts` (new, pure arg/provenance checks)

- [ ] **Step 1: Write the failing test**

`scripts/runMuseSweep.test.ts`:

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { parseSweepArgs } from './runMuseSweep';

describe('parseSweepArgs prompt flags', () => {
  it('defaults to the full preset with cookbook retrieval on', () => {
    const cfg = parseSweepArgs(['--cases', 'stool']);
    expect(cfg.promptPreset).toBe('full');
    expect(cfg.useCookbook).toBe(true);
  });

  it('accepts a preset and --no-cookbook', () => {
    const cfg = parseSweepArgs(['--cases', 'stool', '--prompt-preset', 'v1', '--no-cookbook']);
    expect(cfg.promptPreset).toBe('v1');
    expect(cfg.useCookbook).toBe(false);
  });
});
```

This requires exporting `parseSweepArgs` from the CLI module (currently `parseArgs` is module-private). Rename it to `parseSweepArgs` and export it; keep behavior identical.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/runMuseSweep.test.ts`
Expected: FAIL — `parseSweepArgs` not exported / fields missing.

- [ ] **Step 3: Implement the wiring**

In `scripts/runMuseSweep.ts`:

1. Imports:

```ts
import { buildSweepPrompt } from '../eval/lib/sweepPrompt';
import { injectCookbook } from '../eval/cookbook-injector';
```

2. `SweepConfig` gains:

```ts
  promptPreset: string;
  useCookbook: boolean;
```

3. `parseArgs` → rename to `parseSweepArgs` and export; add:

```ts
    promptPreset: flagValue('--prompt-preset') ?? 'full',
    useCookbook: !has('--no-cookbook'),
```

4. In `main()`, replace `const skillMd = buildSystemPrompt(cfg.skills);` with:

```ts
  let skillMd: string;
  let promptBytes: number;
  if (cfg.promptPreset === 'full') {
    // Legacy path: `--skills` still selects the concatenated skill set.
    skillMd = buildSystemPrompt(cfg.skills);
    promptBytes = Buffer.byteLength(skillMd);
    console.log(`prompt preset=full skills=${cfg.skills.join(',')} bytes=${promptBytes}`);
  } else {
    const built = buildSweepPrompt({ preset: cfg.promptPreset });
    skillMd = built.text;
    promptBytes = built.bytes;
    console.log(`prompt preset=${built.preset} bytes=${built.bytes}`);
  }
```

5. In `runOneCase`, before `generateCase`:

```ts
      const cookbook = cfg.useCookbook
        ? injectCookbook(readFileSync(join(taskDir, 'prompt.md'), 'utf8'))
        : undefined;
```

and pass `cookbook` into the `generateCase({...})` call.

6. Envelope (`run.json`) gains:

```ts
    promptPreset: cfg.promptPreset,
    promptBytes,
    cookbook: cfg.useCookbook,
```

(Include them in the final write too — the envelope object is shared, so adding to the initial object is enough. `promptBytes` is computed in `main` before the envelope literal.)

- [ ] **Step 4: Run the test**

Run: `npx vitest run scripts/runMuseSweep.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Lint**

Run: `npx eslint scripts/runMuseSweep.ts scripts/runMuseSweep.test.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/runMuseSweep.ts scripts/runMuseSweep.test.ts
git commit -m "eval: wire compact prompt presets and cookbook retrieval into the sweep"
```

---

### Task 3: Verification (mock + smoke)

- [ ] **Step 1: Mock replay with v1**

```bash
export KERNELCAD_BIN=./dist/cli/index.js MUSE_ROOT=/home/andrii/projects/muse MUSE_PYTHON=/home/andrii/projects/muse/.venv/bin/python
npx tsx scripts/runMuseSweep.ts --cases stool chair --workers 2 \
  --mock-fixture eval/runs/golden-muse-sweep/fixture.json \
  --run-id _mock-prompt-v1 --prompt-preset v1 --skip-judge 2>&1 | tail -5
```

Expected: startup logs `prompt preset=v1 bytes=<~75k>`; 2/2 cases pass; `run.json` contains `promptPreset: "v1"`, `promptBytes`, `cookbook: true`; `transcript.md` `system_prompt` char count reflects the compact size.

- [ ] **Step 2: Live smoke (2 cases)**

```bash
set -a; source ~/.local/secrets/deepinfra.env; set +a
npx tsx scripts/runMuseSweep.ts --cases stool vase_teardrop --workers 2 \
  --run-id smoke-prompt-v1 --prompt-preset v1 2>&1 | tail -4
```

Expected: completes with judge scores; no infra errors.

- [ ] **Step 3: Commit nothing (run artifacts are gitignored); record observations for the A/B report.**

---

### Task 4: A/B on the 58-case attribution subset

- [ ] **Step 1: Materialize the subset list**

```bash
python3 - <<'EOF'
import json, glob, os
bare=json.load(open('/home/andrii/projects/muse/out/deepseek106_official2/reports/records.json'))
bare_sb={r['task_name']: bool(r.get('sandbox_ok')) for r in bare}
run='eval/runs/muse106-b0f8c78-deepseek-ai-deepseek-v4-1-flash-20260920-093950'
our={os.path.basename(os.path.dirname(p)): json.load(open(p)) for p in glob.glob(f'{run}/cases/*/score.json')}
bare_only=[c for c in our if bare_sb.get(c) and our[c].get('metrics',{}).get('muse_sandbox_ok') is not True]
both=[c for c in our if bare_sb.get(c) and our[c].get('metrics',{}).get('muse_sandbox_ok') is True]
open('/tmp/opencode/ab-cases.txt','w').write('\n'.join(sorted(bare_only+both)))
print(len(bare_only), 'bare-only +', len(both), 'both =', len(bare_only)+len(both))
EOF
```

- [ ] **Step 2: Run arm v1**

```bash
set -a; source ~/.local/secrets/deepinfra.env; set +a
export KERNELCAD_BIN=./dist/cli/index.js MUSE_ROOT=/home/andrii/projects/muse MUSE_PYTHON=/home/andrii/projects/muse/.venv/bin/python
nohup npx tsx scripts/runMuseSweep.ts --cases $(tr '\n' ' ' < /tmp/opencode/ab-cases.txt) --workers 6 \
  --prompt-preset v1 --run-id ab-v1 > /tmp/ab-v1.log 2>&1 &
```

Expected: ~58 cases, 0 infra errors.

- [ ] **Step 3: Run arm v2_lean** (after v1 completes)

```bash
nohup npx tsx scripts/runMuseSweep.ts --cases $(tr '\n' ' ' < /tmp/opencode/ab-cases.txt) --workers 6 \
  --prompt-preset v2_lean --run-id ab-v2 > /tmp/ab-v2.log 2>&1 &
```

- [ ] **Step 4: Compare arms against the run-2 baseline on the same 58 cases**

```bash
python3 - <<'EOF'
import json, glob, os
base='eval/runs/muse106-b0f8c78-deepseek-ai-deepseek-v4-1-flash-20260920-093950'
cases=[c.strip() for c in open('/tmp/opencode/ab-cases.txt') if c.strip()]
def stats(run):
    sb=ov=judged=0
    for c in cases:
        p=f'{run}/cases/{c}/score.json'
        if not os.path.exists(p): continue
        d=json.load(open(p)); m=d.get('metrics',{})
        sb+= m.get('muse_sandbox_ok') is True
        ov+= m.get('muse_overlap_free') is True
        j=os.path.join(os.path.dirname(p),'judge.json')
        if os.path.exists(j) and not json.load(open(j)).get('forcedZero'): judged+=1
    return sb, ov, judged
for name,run in [('baseline',base),('v1','eval/runs/ab-v1'),('v2','eval/runs/ab-v2')]:
    if os.path.isdir(run): print(name, stats(run))
EOF
```

Decision rule: adopt the arm with the higher sandbox pass on the subset; tie-break judged count.

- [ ] **Step 5: Record the A/B result in the private runbook**

Append the arm table to `kernelCAD-private/docs/process/running-muse-benchmark.md` and commit.

---

### Task 5: Winner full run and PR

- [ ] **Step 1: Full 106 run with the winning preset**

```bash
nohup npx tsx scripts/runMuseSweep.ts --workers 6 --prompt-preset <winner> > /tmp/muse-sweep-prompt.log 2>&1 &
```

- [ ] **Step 2: Delta vs run 2** — same comparison as the gates run (sandbox, overlap, judged, final, failure taxonomy). Append to the private runbook.

- [ ] **Step 3: Push and update PR #741** with the compaction section (spec, builder, wiring, A/B table, adopted preset).

---

## Self-review notes

- Spec coverage: presets/builder → Task 1; retrieval + CLI → Task 2; verification → Task 3; A/B → Task 4; adoption/full run → Task 5.
- Type consistency: `PresetConfig`/`BuiltSweepPrompt` used only in Task 1/2; `parseSweepArgs` renamed once and used by the new test; `cfg.promptPreset`/`cfg.useCookbook` defined in Task 2 Step 3 and consumed in `main`/`runOneCase` in the same step.
- No placeholders: full code for the builder and config; the CLI edits are line-anchored; the one runtime-dependent value (winner name) is explicitly decided in Task 4 Step 4.
