# Photo-to-Parametric Consumer Device Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make KernelCAD's existing reference-image capability usable for a simple consumer-electronics photo by shipping a tested, parameterized e-reader reconstruction and its agent workflow.

**Architecture:** A new child skill under the existing `kernelcad-from-reference` orchestrator constrains what an agent may infer from a photo and points to the appropriate CAD checks. A checked-in public-domain reference image, provenance note, and `.kcad.ts` acceptance model demonstrate the flow. An integration test executes the actual script and guards the source-level contract.

**Tech Stack:** TypeScript, KernelCAD authoring API, Vitest, Sharp-backed `referenceImage()` validation, KernelCAD CLI rendering.

---

### Task 1: Lock the acceptance contract with a failing integration test

**Files:**
- Create: `tests/integration/examples/photoReferenceEreader.test.ts`
- Create later: `examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts`
- Create later: `examples/from-reference/e-reader/kindle-2-reference.jpg`
- Create later: `examples/from-reference/e-reader/PROVENANCE.md`

- [ ] **Step 1: Write the failing test**

```ts
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';

const EXAMPLE = 'examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts';
const REFERENCE = 'examples/from-reference/e-reader/kindle-2-reference.jpg';

describe('photo-reference e-reader example', () => {
  it('turns a sourced photo into a parametric, evaluatable device model', async () => {
    expect(existsSync(REFERENCE)).toBe(true);
    const source = readFileSync(EXAMPLE, 'utf8');
    expect(source).toContain('// Real Object Brief');
    expect(source).toContain("referenceImage('./kindle-2-reference.jpg'");
    for (const name of ['bodyWidth', 'bodyHeight', 'bodyThickness', 'screenWidth', 'screenHeight']) {
      expect(source).toContain(`param('${name}'`);
    }

    const built = await evaluateAndBuildScript({ file: EXAMPLE });
    expect(built.evaluation.exitCode).toBe(0);
    expect(built.evaluation.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(built.evaluation.featureCount).toBeGreaterThanOrEqual(7);
    const referenceRecord = built.model?.records.find((record) => record.kind === 'referenceImage');
    expect(referenceRecord).toBeDefined();
    expect((referenceRecord?.metadata?.path as string | undefined)?.endsWith('kindle-2-reference.jpg')).toBe(true);
    expect(referenceRecord?.metadata?.diagnostics ?? []).toEqual([]);

    const interference = await checkInterference({
      code: source,
      fileName: EXAMPLE,
      scriptDir: dirname(resolve(EXAMPLE)),
      epsilonMm3: 0.01,
    });
    expect(interference.partCount).toBe(4);
    expect(interference.pairs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails for missing acceptance artifacts**

Run:

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node ./node_modules/vitest/vitest.mjs run tests/integration/examples/photoReferenceEreader.test.ts --reporter=dot
```

Expected: FAIL because the e-reader source and reference image do not yet exist.

- [ ] **Step 3: Commit the red test only**

```bash
git add tests/integration/examples/photoReferenceEreader.test.ts
git commit -m "test: define photo-reference e-reader contract"
```

### Task 2: Add source-owned reference evidence and the e-reader model

**Files:**
- Create: `examples/from-reference/e-reader/kindle-2-reference.jpg`
- Create: `examples/from-reference/e-reader/PROVENANCE.md`
- Create: `examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts`

- [ ] **Step 1: Download the public-domain Kindle 2 front image from Wikimedia Commons**

Run:

```bash
curl -L --fail --silent --show-error \
  'https://commons.wikimedia.org/wiki/Special:FilePath/Amazon-kindle-gen2.jpg' \
  -o examples/from-reference/e-reader/kindle-2-reference.jpg
```

- [ ] **Step 2: Record immutable source facts in `PROVENANCE.md`**

Include the Wikimedia file page, author Evan-Amos, public-domain license, download date, SHA-256, intended internal benchmark use, and the explicit trade-dress limitation.

- [ ] **Step 3: Implement the minimal parameterized model**

Use a Real Object Brief followed by these named parameters: `bodyWidth`, `bodyHeight`, `bodyThickness`, `cornerRadius`, `bezelWidth`, `screenWidth`, `screenHeight`, `screenRecess`, `controlDiameter`, `usbPortWidth`, and `usbPortHeight`. Use `referenceImage()` on the XZ plane, an `extrudeRoundedRect()` body, a shallow screen recess, a seated display plate, a recessed circular control, status LED, and a through USB-C opening. Apply PBR material to leaf geometry before every boolean or union. Return `assembly('photo-reference-e-reader').model()` with exactly four named, non-overlapping parts: housing, display, navigation control, and status LED.

- [ ] **Step 4: Run the test and make it pass**

Run the Task 1 command again.

Expected: PASS with one file and no error diagnostics.

- [ ] **Step 5: Commit source, reference, provenance, and green test**

```bash
git add examples/from-reference/e-reader tests/integration/examples/photoReferenceEreader.test.ts
git commit -m "feat: add photo-reference e-reader example"
```

### Task 3: Make the workflow reusable for agents

**Files:**
- Create: `src/agent/skills/kernelcad-from-reference/photo-to-device/SKILL.md`
- Modify: `src/agent/skills/kernelcad-from-reference/SKILL.md`
- Create: `tests/unit/skill/photoToDeviceSkill.test.ts`

- [ ] **Step 1: Write the failing skill contract test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SKILL = 'src/agent/skills/kernelcad-from-reference/photo-to-device/SKILL.md';

describe('photo-to-device skill', () => {
  it('requires a scale anchor and labels mesh output as visual reference only', () => {
    const source = readFileSync(SKILL, 'utf8');
    expect(source).toContain('known dimension');
    expect(source).toContain('visual_mesh_reference');
    expect(source).toContain('kernelcad evaluate');
    expect(source).toContain('kernelcad interference');
  });
});
```

- [ ] **Step 2: Run it to verify it fails for the missing skill**

Run:

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/skill/photoToDeviceSkill.test.ts --reporter=dot
```

Expected: FAIL with `ENOENT` for the new skill path.

- [ ] **Step 3: Implement the skill and route to it from the orchestrator**

The new skill must cover: suitable categories, required scale anchor, visible-versus-inferred facts, e-reader/handheld enclosure feature checklist, required provenance, optional tracing, `visual_mesh_reference` terminology, and the deterministic evaluate/interference/render-inspect gates. Add it as the right-angled consumer-device path after `blockout-model` in the orchestrator.

- [ ] **Step 4: Run the skill test and distribution regression tests**

Run:

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node ./node_modules/vitest/vitest.mjs run \
  tests/unit/skill/photoToDeviceSkill.test.ts \
  tests/unit/cli/walkSkillTree.test.ts \
  tests/unit/cli/skillInstallRecursion.test.ts \
  --reporter=dot
```

Expected: PASS; recursive discovery makes the new child available to installed clients.

- [ ] **Step 5: Commit the reusable workflow**

```bash
git add src/agent/skills/kernelcad-from-reference tests/unit/skill/photoToDeviceSkill.test.ts
git commit -m "feat: guide photo-to-parametric device builds"
```

### Task 4: Run the physical and visual proof packet

**Files:**
- Read only: `examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts`
- Generated outside the repository: `/tmp/kernelcad-e-reader-inspect/`

- [ ] **Step 1: Build the CLI**

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node ./node_modules/typescript/bin/tsc -p tsconfig.cli.json --noEmit
/home/andrii/.nvm/versions/node/v22.22.0/bin/node scripts/build-cli.mjs
```

- [ ] **Step 2: Run deterministic gates**

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node dist/cli/index.js evaluate examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts --json
/home/andrii/.nvm/versions/node/v22.22.0/bin/node dist/cli/index.js interference examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts --json
```

Expected: zero error diagnostics, four assembly parts, and zero interference pairs.

- [ ] **Step 3: Create and inspect the render packet**

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node dist/cli/index.js render inspect \
  examples/from-reference/e-reader/kindle-2-e-reader.kcad.ts \
  /tmp/kernelcad-e-reader-inspect \
  --channels rgb,mask,depth,normals \
  --hide-reference-images
```

Open a canonical RGB output and verify the body, screen recess, circular control, LED, and port are visibly present and the object has non-trivial depth.

- [ ] **Step 4: Run focused regression tests and typecheck**

```bash
/home/andrii/.nvm/versions/node/v22.22.0/bin/node ./node_modules/vitest/vitest.mjs run \
  tests/integration/examples/photoReferenceEreader.test.ts \
  tests/unit/skill/photoToDeviceSkill.test.ts \
  tests/integration/agent/trace-from-image-smoke.test.ts \
  tests/unit/cli/skillInstallRecursion.test.ts \
  --reporter=dot
/home/andrii/.nvm/versions/node/v22.22.0/bin/node ./node_modules/typescript/bin/tsc -b --noEmit
```

Expected: all focused tests and typecheck pass.
