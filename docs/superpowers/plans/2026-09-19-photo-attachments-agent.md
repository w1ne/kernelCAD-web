# Photo Attachments in the Agent Composer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the separate "Simple-device photo reference" panel; attach one photo through the composer's `Include files` button; the agent builds from the photo without a required dimension form.

**Architecture:** The composer reads an attached image to a bounded data URL and passes it as the existing `referenceImage` request field. The server makes `knownDimension` optional, tells the agent to use the deterministic trace proportions and ask for a measurement instead of inventing scale, and keeps the deterministic e-reader builder only when a width label exists.

**Tech Stack:** React 18 + TypeScript + Vitest/happy-dom (web); Express + Zod + Vitest (server).

**Worktrees (already created):**
- Web: `/home/andrii/projects/kernelCAD-web-worktrees/photo-attachments` (branch `feat/photo-attachments`, spec committed as `24d1b1ba`)
- Server: `/home/andrii/projects/kernelCAD-server-worktrees/photo-attachments` (branch `feat/photo-attachments` off `origin/main`)

**Deploy order:** server first, then web (the new client omits `knownDimension`; the old server would 400 it).

---

### Task 0: Worktree setup

**Files:** none (environment only).

- [ ] **Step 1: Install web dependencies**

Run (in `/home/andrii/projects/kernelCAD-web-worktrees/photo-attachments`):

```bash
npm ci
```

Expected: install completes without errors.

- [ ] **Step 2: Install server dependencies**

Run (in `/home/andrii/projects/kernelCAD-server-worktrees/photo-attachments`):

```bash
npm ci
git submodule update --init vendor/kernelcad
ln -s /home/andrii/projects/kernelCAD-server/vendor/kernelcad/dist vendor/kernelcad/dist
```

Expected: `vendor/kernelcad/dist/mcp/toolRegistry.js` resolves (the orchestrator imports it). The symlink is a local-only shortcut; nothing under `vendor/kernelcad/` is committed (gitlink stays at the pinned SHA).

- [ ] **Step 3: Sanity-check the focused suites**

Run (web worktree):

```bash
./node_modules/.bin/vitest run src/studio/__tests__/AgentComposer.test.tsx
```

Run (server worktree):

```bash
./node_modules/.bin/vitest run tests/agent/simplePhotoEreader.test.ts
```

Expected: both suites pass before any change.

---

### Task 1: Server accepts a photo without a known dimension

**Files:**
- Modify: `src/routes/generate.ts` (the `referenceImageSchema.knownDimension` field)
- Modify: `src/agent/photoReference.ts` (three interfaces)
- Test: `tests/routes/generatePhotoReference.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe('POST /api/v1/generate photo reference handoff', ...)` block in `tests/routes/generatePhotoReference.test.ts`, after the test named `'allows deployments to override only the photo-reference model'`:

```ts
  it('forwards a photo without a known physical scale and leaves scale unstated', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Build an enclosure from this photo.',
        referenceImage: photoReference({ knownDimension: undefined }),
      }),
    });

    expect(res.status).toBe(200);
    await res.text();
    expect(runAgentEscalating).toHaveBeenCalledOnce();
    const input = (runAgentEscalating as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as {
      photoReference?: { knownDimension?: unknown };
    };
    expect(input.photoReference).toBeDefined();
    expect(input.photoReference).not.toHaveProperty('knownDimension');
  });
```

Also update the existing first test's inline cast type (it currently requires `knownDimension`) — in `'materializes a validated photo only for the agent run and forwards durable provenance'`, change:

```ts
        knownDimension: { label: string; valueMm: number };
```

to:

```ts
        knownDimension?: { label: string; valueMm: number };
```

- [ ] **Step 2: Run the test to verify it fails**

Run (server worktree):

```bash
./node_modules/.bin/vitest run tests/routes/generatePhotoReference.test.ts
```

Expected: the new test FAILS with `expected 400 to be 200` (schema currently requires `knownDimension`).

- [ ] **Step 3: Make the dimension optional in the schema**

In `src/routes/generate.ts`, replace the `knownDimension` entry inside `referenceImageSchema`:

```ts
  knownDimension: z.object({
    label: z.string().trim().min(1).max(100).refine(
      value => !/[\r\n]/.test(value),
      'knownDimension.label must not contain line breaks',
    ),
    valueMm: z.number().finite().positive().max(10_000),
  }).optional(),
```

Add this comment directly above it:

```ts
  // Optional real-world scale anchor: with it the agent treats the label as
  // authoritative; without it the trace is proportions only and the agent must
  // ask for a measurement instead of inventing one.
```

- [ ] **Step 4: Make the dimension optional in the photo types**

In `src/agent/photoReference.ts`, change `knownDimension` to optional in all three interfaces:

```ts
export interface PhotoReferenceInput {
  dataUrl: string;
  fileName: string;
  mimeType: PhotoReferenceMimeType;
  knownDimension?: {
    label: string;
    valueMm: number;
  };
}

/** Validated provenance retained for the agent run, without retaining the data URL. */
export interface PreparedPhotoReference {
  fileName: string;
  mimeType: PhotoReferenceMimeType;
  knownDimension?: {
    label: string;
    valueMm: number;
  };
  byteLength: number;
  sha256: string;
  bytes: Buffer;
}
```

`PhotoReference` already derives from `PreparedPhotoReference` via `Omit<..., 'bytes'>`, so it picks up the optional field with no further edit.

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
./node_modules/.bin/vitest run tests/routes/generatePhotoReference.test.ts
```

Expected: all tests in the file pass (including `'requires a positive known physical dimension before agent work'`, since a supplied zero is still rejected).

- [ ] **Step 6: Commit**

```bash
git add src/routes/generate.ts src/agent/photoReference.ts tests/routes/generatePhotoReference.test.ts
git commit -m "feat(generate): make the photo reference scale optional"
```

---

### Task 2: Agent brief and deterministic reader handle the missing scale

**Files:**
- Modify: `src/agent/orchestrator.ts` (`buildPhotoReferenceBrief`, around line 268)
- Modify: `src/agent/simplePhotoEreader.ts` (near the top of `buildSimplePhotoEreaderArtifact`)
- Test: `tests/agent/orchestrator.test.ts`, `tests/agent/simplePhotoEreader.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/agent/orchestrator.test.ts`, inside `describe('buildUserMessage (edit mode)', ...)` after the existing photo brief test, add:

```ts
  it('tells the agent to ask for a measurement when the photo has no known scale', () => {
    const msg = buildUserMessage({
      prompt: 'Make a simple e-reader enclosure',
      photoReference: {
        fileName: 'e-reader-front.png',
        mimeType: 'image/png',
        byteLength: 1234,
        sha256: 'b'.repeat(64),
        localPath: '/private/tmp/photo/reference.png',
      },
    } as Parameters<typeof buildUserMessage>[0] & { photoReference: unknown });

    expect(msg).toContain('No physical scale was supplied');
    expect(msg).not.toContain('authoritative');
    expect(msg).toContain('suggestions');
    expect(msg).toContain('b'.repeat(64));
    expect(msg).not.toContain('/private/tmp/photo');
  });
```

In `tests/agent/simplePhotoEreader.test.ts`, inside the `describe`, add:

```ts
  it('declines a photo without any known dimension', () => {
    const reference = {
      fileName: 'e-reader-front.png',
      mimeType: 'image/png' as const,
      byteLength: 1234,
      sha256: 'e'.repeat(64),
      localPath: '/private/tmp/photo/reference.png',
    };
    expect(buildSimplePhotoEreaderArtifact(input({ reference }))).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
./node_modules/.bin/vitest run tests/agent/orchestrator.test.ts tests/agent/simplePhotoEreader.test.ts
```

Expected: the orchestrator test FAILS (`No physical scale was supplied` missing); the e-reader test FAILS because `knownDimension.label` throws on `undefined` (test error, not a clean null).

- [ ] **Step 3: Make the brief conditional**

In `src/agent/orchestrator.ts`, replace the body of `buildPhotoReferenceBrief` up to the trace evidence block with:

```ts
function buildPhotoReferenceBrief(reference: PhotoReference, trace?: PhotoTraceEvidence): string {
  const dimension = reference.knownDimension;
  const traceEvidence = trace
    ? [
        '',
        'PHOTO TRACE EVIDENCE (server-derived before this model turn):',
        `- Image dimensions: ${trace.imageDims[0]} × ${trace.imageDims[1]} pixels.`,
        `- outer_housing normalized silhouette: ${trace.waypoints.map(([x, y]) => `[${x.toFixed(3)}, ${y.toFixed(3)}]`).join(', ')}.`,
        dimension
          ? '- Treat this as observed photo evidence for the outer envelope; map it to the known physical scale before deriving dimensions.'
          : '- Treat this as observed photo evidence for the outer envelope proportions. If the request states a real measurement, size the part from that; otherwise do not attach millimetre precision to the trace.',
      ]
    : [];
  const scaleLines = dimension
    ? [
        `- Known physical scale: ${dimension.label} = ${dimension.valueMm} mm. This scale is authoritative.`,
      ]
    : [
        '- No physical scale was supplied. The trace above is proportions only: do NOT claim observed millimetre accuracy.',
        '- Use named params with clearly editable defaults. When the request states no real measurement, ask for one in the artifact suggestions (for example "Tell me the real width in mm to scale this precisely").',
      ];
  const provenanceLine = dimension
    ? `- Add one concise source comment recording this provenance: ${reference.fileName}, SHA-256 ${reference.sha256}, ${dimension.label} ${dimension.valueMm} mm.`
    : `- Add one concise source comment recording this provenance: ${reference.fileName}, SHA-256 ${reference.sha256}; no physical scale was supplied.`;
  return [
    'PHOTO REFERENCE CONTRACT (simple consumer-device / passive enclosure):',
    `- Source file: ${reference.fileName}; MIME: ${reference.mimeType}; bytes: ${reference.byteLength}; SHA-256: ${reference.sha256}.`,
    ...scaleLines,
    '- A deterministic local trace is required before a hosted photo run reaches this model. If additional silhouette evidence would help, you MAY call trace_from_image without an imageUrl; the server binds it to this private photo and keeps it local.',
    '- Separate observed facts (outline, visible seams, buttons, screen proportions) from inferred facts (depth, hidden fasteners, internal structure). Do not invent precision or hidden mechanisms from one photo.',
    '- Build editable parametric kernelCAD source. Use named params for the known scale and major dimensions. If the visible device has distinct physical components (for example housing, screen, controls), model them as a static named assembly with non-overlapping parts; otherwise keep one simple parametric enclosure.',
    provenanceLine,
    '- This file is deleted when the generation ends. Never emit a referenceImage() call or any other nonportable source reference to the temporary path. Return a portable .kcad.ts artifact that builds after this photo is gone.',
    '- Retain the normal evaluate_script and build-gate loop before returning the artifact.',
    ...traceEvidence,
  ].join('\n');
}
```

- [ ] **Step 4: Guard the deterministic e-reader builder**

In `src/agent/simplePhotoEreader.ts`, replace the start of `buildSimplePhotoEreaderArtifact` (currently `if (input.currentCode?.trim()) return null; if (... !isOverallWidthLabel(input.reference.knownDimension.label) ...)`) with:

```ts
export function buildSimplePhotoEreaderArtifact(input: SimplePhotoEreaderInput): Artifact | null {
  if (input.currentCode?.trim()) return null;
  const dimension = input.reference.knownDimension;
  if (!dimension) return null;
  if (
    !EREADER_PROMPT.test(input.prompt)
    || !GENERIC_ENCLOSURE_PROMPT.test(input.prompt)
    || !SIMPLE_ENCLOSURE_PROMPT.test(input.prompt)
    || !FRONT_VIEW_PROMPT.test(input.prompt)
    || !isOverallWidthLabel(dimension.label)
  ) return null;
```

Then replace the two later uses of `input.reference.knownDimension` with `dimension`:

```ts
  const width = roundMm(dimension.valueMm);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
./node_modules/.bin/vitest run tests/agent/orchestrator.test.ts tests/agent/simplePhotoEreader.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/agent/orchestrator.ts src/agent/simplePhotoEreader.ts tests/agent/orchestrator.test.ts tests/agent/simplePhotoEreader.test.ts
git commit -m "feat(agent): ask for a real measurement instead of inventing photo scale"
```

---

### Task 3: Composer attaches one photo

**Files:**
- Modify: `src/funnel/lib/generateClient.ts` (`ReferenceImage.knownDimension`)
- Modify: `src/studio/AgentComposer.tsx`
- Test: `src/studio/__tests__/AgentComposer.test.tsx`

- [ ] **Step 1: Update the request type**

In `src/funnel/lib/generateClient.ts`, replace the `ReferenceImage` interface:

```ts
/** A user-supplied image reference. The server recomputes the SHA-256 from
 * `dataUrl`; no client-provided hash is trusted as provenance. A real-world
 * scale anchor is optional: when present the agent treats it as authoritative,
 * when absent the agent asks for a measurement instead of inventing one. */
export interface ReferenceImage {
  dataUrl: string;
  fileName: string;
  mimeType: ReferenceImageMimeType;
  knownDimension?: {
    label: string;
    valueMm: number;
  };
}
```

- [ ] **Step 2: Write the failing tests**

In `src/studio/__tests__/AgentComposer.test.tsx`, update the Harness signature:

```tsx
function Harness({ submit = vi.fn() }: { submit?: (prompt: string, referenceImage?: unknown) => void }) {
    const [value, setValue] = useState('');
    return <AgentComposer value={value} onChange={setValue} onSubmit={submit} />;
}
```

Add these tests inside `describe('AgentComposer', ...)`:

```tsx
    it('submits an attached photo as a reference image, not as prompt text', async () => {
        const submit = vi.fn();
        render(<Harness submit={submit} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Build this e-reader' } });
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File([new Uint8Array([137, 80, 78, 71])], 'device.png', { type: 'image/png' })] },
        });
        await screen.findByRole('button', { name: 'Remove device.png' });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit).toHaveBeenCalledWith('Build this e-reader', {
            dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
            fileName: 'device.png',
            mimeType: 'image/png',
        });
        expect(submit.mock.calls[0][0]).not.toContain('data:image');
        fireEvent.click(screen.getByRole('button', { name: 'Remove device.png' }));
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit).toHaveBeenLastCalledWith('Build this e-reader');
    });
    it('rejects a second photo', async () => {
        render(<Harness />);
        const chooser = screen.getByLabelText('Choose files');
        fireEvent.change(chooser, {
            target: { files: [new File(['first'], 'first.png', { type: 'image/png' })] },
        });
        await screen.findByRole('button', { name: 'Remove first.png' });
        fireEvent.change(chooser, {
            target: { files: [new File(['second'], 'second.png', { type: 'image/png' })] },
        });
        expect((await screen.findByRole('alert')).textContent).toContain('One photo per build.');
    });
    it('rejects photos larger than four MiB', async () => {
        render(<Harness />);
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' })] },
        });
        expect((await screen.findByRole('alert')).textContent).toContain('4 MiB');
    });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run (web worktree):

```bash
./node_modules/.bin/vitest run src/studio/__tests__/AgentComposer.test.tsx
```

Expected: the new tests FAIL (`.png` is rejected as a non-text file, so no `referenceImage` is passed).

- [ ] **Step 4: Implement the composer changes**

In `src/studio/AgentComposer.tsx`, make these edits.

Add the import and types near the top:

```tsx
import {
    isReferenceImageMimeType,
    MAX_REFERENCE_IMAGE_BYTES,
    type GenerateRequest,
} from '../../funnel/lib/generateClient';
```

```tsx
interface TextAttachment { kind: 'text'; name: string; content: string }
interface PhotoAttachment {
    kind: 'image';
    name: string;
    dataUrl: string;
    mimeType: NonNullable<GenerateRequest['referenceImage']>['mimeType'];
}
type Attachment = TextAttachment | PhotoAttachment;
// Leave room for Studio's selected-feature context in the 64,000 character API budget.
const MAX_PROMPT = 63_000;
const MAX_TEXT_FILES = 5;
const ACCEPT = '.txt,.md,.csv,.json,.svg,.ts,.js,.py,.scad,.step,.stp';

function readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string' || !result.startsWith(`data:${file.type};base64,`)) {
                reject(new Error(`Could not read ${file.name} as a safe image.`));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => reject(new Error(`Could not read ${file.name}. Try another photo.`));
        reader.readAsDataURL(file);
    });
}
```

Change the component props:

```tsx
export function AgentComposer({ value, onChange, onSubmit, disabled = false, submitLabel = 'Send', onPhotoChange }: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (prompt: string, referenceImage?: GenerateRequest['referenceImage']) => void;
    disabled?: boolean;
    submitLabel?: string;
    onPhotoChange?: (hasPhoto: boolean) => void;
}) {
```

Replace `includeFiles` with the mixed body (and add `replaceFiles`/`removeFile`):

```tsx
    function replaceFiles(next: Attachment[]) {
        setFiles(next);
        onPhotoChange?.(next.some(file => file.kind === 'image'));
    }

    function removeFile(index: number) {
        replaceFiles(files.filter((_, i) => i !== index));
    }

    async function includeFiles(selected: File[]) {
        setError('');
        setReading(true);
        try {
            const added: Attachment[] = [];
            let textCount = files.filter(file => file.kind === 'text').length;
            let photoCount = files.filter(file => file.kind === 'image').length;
            let textBytes = files.reduce((sum, file) => sum + (file.kind === 'text' ? file.content.length : 0), 0);
            for (const file of selected) {
                const mimeType = file.type;
                if (isReferenceImageMimeType(mimeType)) {
                    if (photoCount >= 1) throw new Error('One photo per build.');
                    if (file.size === 0) throw new Error(`${file.name} is empty. Choose a photo with visible device details.`);
                    if (file.size > MAX_REFERENCE_IMAGE_BYTES) throw new Error('Photos must be 4 MiB or smaller.');
                    added.push({ kind: 'image', name: file.name, dataUrl: await readDataUrl(file), mimeType });
                    photoCount += 1;
                    continue;
                }
                if (!ACCEPT.split(',').some(ext => file.name.toLowerCase().endsWith(ext))) {
                    throw new Error('Choose text, code, SVG, or STEP files, or one PNG/JPEG/WebP photo.');
                }
                if (textCount >= MAX_TEXT_FILES) throw new Error(`Include up to ${MAX_TEXT_FILES} text files.`);
                if (file.size > 60_000) throw new Error(`${file.name} is too large. Include files under 60 KB.`);
                const content = await file.text();
                if (content.includes('\0')) throw new Error(`${file.name} is not a text file.`);
                textBytes += content.length;
                if (textBytes > 60_000) throw new Error('Included files must total less than 60 KB of text.');
                added.push({ kind: 'text', name: file.name, content });
                textCount += 1;
            }
            replaceFiles([...files, ...added]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not read the selected files.');
        } finally {
            setReading(false);
            if (picker.current) picker.current.value = '';
        }
    }
```

Replace `send` with:

```tsx
    function send() {
        if (disabled || reading || listening || !value.trim()) return;
        const photo = files.find((file): file is PhotoAttachment => file.kind === 'image');
        const prompt = [
            value.trim(),
            ...files
                .filter((file): file is TextAttachment => file.kind === 'text')
                .map(file => `Included file: ${file.name}\n${file.content}\nEnd of file: ${file.name}`),
        ].join('\n\n');
        if (prompt.length > MAX_PROMPT) { setError('Your message and files are too long. Shorten the message or remove a file.'); return; }
        setError('');
        if (photo) {
            onSubmit(prompt, { dataUrl: photo.dataUrl, fileName: photo.name, mimeType: photo.mimeType });
        } else {
            onSubmit(prompt);
        }
    }
```

Update the chip list's remove handler:

```tsx
                        <button type="button" aria-label={`Remove ${file.name}`} disabled={disabled || reading} className={buttonClass}
                            onClick={() => removeFile(index)}><X size={12} /></button>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
./node_modules/.bin/vitest run src/studio/__tests__/AgentComposer.test.tsx
```

Expected: PASS (the existing text-attachment assertions still pass because a photo-less submit calls `onSubmit(prompt)` with exactly one argument).

- [ ] **Step 6: Commit**

```bash
git add src/funnel/lib/generateClient.ts src/studio/AgentComposer.tsx src/studio/__tests__/AgentComposer.test.tsx
git commit -m "feat(studio): attach one photo through the agent composer"
```

---

### Task 4: Remove the photo panel and dimension flow

**Files:**
- Modify: `src/studio/components/GenerateForm.tsx`
- Modify: `src/studio/StudioGenerate.tsx`
- Modify: `src/studio/hooks/useAgentGeneration.ts`
- Modify: `src/studio/hooks/useConceptWorkflow.ts`
- Delete: `src/studio/components/ReferencePhotoPanel.tsx`, `src/studio/hooks/useReferencePhoto.ts`
- Test: `src/studio/__tests__/StudioGenerate.test.tsx`, `src/studio/StudioGenerate.test.tsx`

- [ ] **Step 1: Rewrite GenerateForm**

Replace the whole file `src/studio/components/GenerateForm.tsx` with:

```tsx
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import type { PreviewPhase } from '../../funnel/hooks/useTextTo3dPreview';
import type { GenerateRequest } from '../../funnel/lib/generateClient';
import type { SelectedFeatureId } from '../types';
import { AgentComposer } from '../AgentComposer';

export function GenerateForm({
    selectedFeatureId,
    prompt,
    onPromptChange,
    busy,
    conceptBusy,
    previewPhase,
    onSubmit,
    onConcept,
}: {
    selectedFeatureId: SelectedFeatureId;
    prompt: string;
    onPromptChange: (value: string) => void;
    busy: boolean;
    conceptBusy: boolean;
    previewPhase: PreviewPhase;
    onSubmit: (message: string, referenceImage?: GenerateRequest['referenceImage']) => void;
    onConcept: () => void;
}) {
    const [photoAttached, setPhotoAttached] = useState(false);
    return (
        <div className="flex flex-col gap-2">
            <div className="text-[10px] text-gray-500 truncate" data-testid="studio-generate-target">
                Target: {selectedFeatureId ?? 'whole model'}
            </div>
            <AgentComposer value={prompt} onChange={onPromptChange} onSubmit={onSubmit}
                disabled={busy} submitLabel="Build" onPhotoChange={setPhotoAttached} />
            {previewPhase.state !== 'unavailable' && (
                <button
                    type="button"
                    onClick={onConcept}
                    disabled={busy || photoAttached || !prompt.trim()}
                    title={photoAttached
                        ? 'Remove the attached photo to use the mesh concept workflow'
                        : 'Quick visual 3D concept of this description (paid feature)'}
                    className="rounded bg-[#1a1d24] hover:bg-[#222630] text-gray-300 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                    {conceptBusy ? `Concept… ${previewPhase.state === 'running' ? previewPhase.progress : 0}%` : '3D concept'}
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Simplify useAgentGeneration**

In `src/studio/hooks/useAgentGeneration.ts`:

Remove `referenceImage`, `referenceNeedsDimension`, `setReferenceImageError`, `readingReferenceImage` from `UseAgentGenerationArgs` and from the destructured parameter list. Remove the now-unused `import { useState, type FormEvent } from 'react';` FormEvent (keep `useState`).

Replace `onSubmit` with:

```ts
    const onSubmit = (message?: string, referenceImage?: GenerateRequest['referenceImage']) => {
        const trimmed = (message ?? prompt).trim();
        if (!trimmed || busy) return;
        const matchesDraftedRepair =
            agentRepairWorkflow != null &&
            agentRepairWorkflow.state === 'drafted' &&
            agentRepairWorkflow.promptText === trimmed;
        const runTargetId =
            matchesDraftedRepair && agentRepairWorkflow.targetId === null
                ? null
                : selectedFeatureId;
        const agentPrompt = runTargetId === null ? trimmed : `Edit selected target "${runTargetId}": ${trimmed}`;
        let repairWorkflowForRun = agentRepairWorkflow;
        if (
            matchesDraftedRepair &&
            agentRepairWorkflow.targetId === runTargetId
        ) {
            repairWorkflowForRun = { ...agentRepairWorkflow, state: 'running' };
            shellStore.setAgentRepairWorkflow(repairWorkflowForRun);
        }
        runAgent(agentPrompt, {
            fromCode: currentCode,
            promptText: trimmed,
            selectedFeatureId: runTargetId,
            repairWorkflow: repairWorkflowForRun,
        }, referenceImage);
    };
```

`runAgent` stays as-is (its third parameter already accepts `GenerateRequest['referenceImage']`).

- [ ] **Step 3: Simplify useConceptWorkflow**

In `src/studio/hooks/useConceptWorkflow.ts`:

Remove from `UseConceptWorkflowArgs` (and the destructure): `photoReferenceSelected`, `referenceNeedsDimension`, `setReferenceImageError`, `readingReferenceImage`, `referenceImage`. Remove the now-unused `import type { GenerateRequest } from '../../funnel/lib/generateClient';`.

Replace `onConcept` and `buildConceptAsCad` with:

```ts
    const onConcept = () => {
        const trimmed = prompt.trim();
        if (!trimmed || busy) return;
        setConceptPrompt(trimmed);
        void preview.submit(trimmed);
    };

    const buildConceptAsCad = () => {
        if (!conceptPrompt || busy) return;
        // Fresh generation, never an edit: framing the concept prompt as an
        // edit of whatever happens to sit in the editor (often the untouched
        // starter sample) lets the model return that code unchanged. The
        // review diff still uses the current editor code as its baseline, so
        // nothing is overwritten without the user accepting.
        setBaseline(currentCode);
        setReviewSnapshot({
            fromCode: currentCode,
            promptText: conceptPrompt,
            selectedFeatureId,
            repairWorkflow: agentRepairWorkflow,
        });
        // Read the concept mesh directly from the live preview phase (no mirrored
        // state). A done preview with no Tripo render/fingerprint yields
        // {renderImageUrl:null, proportions:null} — intentional and distinct from
        // "no mesh" (undefined); the server's nullish schema accepts it.
        const mesh = preview.phase.state === 'done'
            ? { renderImageUrl: preview.phase.renderImageUrl, proportions: preview.phase.proportions }
            : undefined;
        void submit(conceptPrompt, undefined, mesh);
    };
```

- [ ] **Step 4: Update StudioGenerate**

In `src/studio/StudioGenerate.tsx`:

1. Delete `import { useReferencePhoto } from './hooks/useReferencePhoto';`
2. Delete the whole `const { pendingReferenceImage, ... } = useReferencePhoto();` block.
3. Slim the `useAgentGeneration({...})` call to `phase, submit, currentCode, prompt, selectedFeatureId, agentRepairWorkflow, conceptBusy`.
4. Slim the `useConceptWorkflow({...})` call to `prompt, busy, currentCode, selectedFeatureId, agentRepairWorkflow, submit, preview, setBaseline, setReviewSnapshot`.
5. Replace the `<GenerateForm ... />` props with:

```tsx
            <GenerateForm
                selectedFeatureId={selectedFeatureId}
                prompt={prompt}
                onPromptChange={setPrompt}
                busy={busy}
                conceptBusy={conceptBusy}
                previewPhase={preview.phase}
                onSubmit={onSubmit}
                onConcept={onConcept}
            />
```

6. Change the `ConceptResult` prop to:

```tsx
                buildDisabled={busy}
```

- [ ] **Step 5: Delete the panel and hook**

```bash
git rm src/studio/components/ReferencePhotoPanel.tsx src/studio/hooks/useReferencePhoto.ts
```

- [ ] **Step 6: Update the StudioGenerate integration tests**

In `src/studio/__tests__/StudioGenerate.test.tsx`, delete the tests `'forwards a scaled reference photo through the active agent generation path'`, `'requires a named positive millimetre dimension before generating from a selected photo'`, and `'requires a new known dimension when the reference photo changes'`; replace them with:

```tsx
    it('forwards an attached photo through the active agent generation path without a dimension form', async () => {
        render(<StudioGenerate />);
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File(['photo-bytes'], 'e-reader.png', { type: 'image/png' })] },
        });
        await waitFor(() => expect(screen.getByText('e-reader.png')).toBeTruthy());

        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.change(prompt, { target: { value: 'model this e-reader enclosure' } });
        expect((screen.getByRole('button', { name: /^build/i }) as HTMLButtonElement).disabled).toBe(false);
        fireEvent.submit(prompt.closest('form')!);

        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'model this e-reader enclosure',
            undefined,
            undefined,
            expect.objectContaining({
                dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
                fileName: 'e-reader.png',
                mimeType: 'image/png',
            }),
        );
    });
```

Update the two validation tests to use the composer input:

- `'rejects unsupported photo types before they enter the generation request'`: change `screen.getByLabelText('Reference photo')` to `screen.getByLabelText('Choose files')`; keep the `/PNG, JPEG, or WebP/i` alert assertion (the new message contains `PNG/JPEG/WebP photo`).
- `'rejects photo files larger than four MiB before they enter the generation request'`: same label swap; keep the `/4 MiB/i` alert assertion.

In `src/studio/StudioGenerate.test.tsx` (the concept suite):

- `'disables 3D concept mode when a reference photo is selected'`: replace the `fireEvent.change(screen.getByLabelText('Reference photo'), ...)` call with:

```tsx
    fireEvent.change(screen.getByLabelText('Choose files'), {
      target: { files: [new File(['photo-bytes'], 'e-reader.png', { type: 'image/png' })] },
    });
```

and keep the rest (`await waitFor(() => expect(screen.getByText('e-reader.png')).toBeInTheDocument());` then expect the concept button disabled).
- Delete `'Build-as-CAD sends a selected photo without a stale concept mesh'` entirely (photos and the concept mesh are now mutually exclusive by UI).

- [ ] **Step 7: Run the web suites**

Run:

```bash
./node_modules/.bin/vitest run src/studio/__tests__/AgentComposer.test.tsx src/studio/__tests__/StudioGenerate.test.tsx src/studio/StudioGenerate.test.tsx src/studio/__tests__/AgentRail.test.tsx src/studio/__tests__/agentRailVisibility.test.tsx
```

Expected: PASS with no references to `Reference photo` or `Known dimension`.

- [ ] **Step 8: Typecheck and lint**

Run:

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/studio/AgentComposer.tsx src/studio/components/GenerateForm.tsx src/studio/StudioGenerate.tsx src/studio/hooks/useAgentGeneration.ts src/studio/hooks/useConceptWorkflow.ts src/funnel/lib/generateClient.ts src/studio/__tests__/AgentComposer.test.tsx src/studio/__tests__/StudioGenerate.test.tsx src/studio/StudioGenerate.test.tsx
```

Expected: both clean.

- [ ] **Step 9: Commit**

```bash
git add -A src/studio src/funnel/lib/generateClient.ts
git commit -m "refactor(studio): drop the photo reference panel for composer attachments"
```

---

### Task 5: Browser verification of the composer photo flow

**Files:**
- Create (temporary, not committed): `photo-attachments-preview.html`, `photo-attachments-preview.tsx` in the web worktree root
- Create (temporary, not committed): `/tmp/kernelcad-photo-browser.mjs`

- [ ] **Step 1: Create a temporary preview entry**

`photo-attachments-preview.html`:

```html
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#111;color:#eee"><div id="root"></div>
<script type="module" src="/photo-attachments-preview.tsx"></script></body></html>
```

`photo-attachments-preview.tsx`:

```tsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentComposer } from './src/studio/AgentComposer';

function Preview() {
    const [value, setValue] = useState('');
    const [sent, setSent] = useState('none');
    return (
        <div style={{ maxWidth: 480, margin: '40px auto' }}>
            <AgentComposer value={value} onChange={setValue} onSubmit={(prompt, photo) => {
                setSent(photo ? `photo:${photo.fileName}:${photo.mimeType}:${photo.dataUrl.slice(0, 22)}` : `text:${prompt}`);
            }} />
            <p aria-label="Submitted prompt">{sent}</p>
        </div>
    );
}
createRoot(document.getElementById('root')!).render(<Preview />);
```

- [ ] **Step 2: Run the browser check**

```bash
npm run dev -- --host 127.0.0.1 --port 5189 &
```

`/tmp/kernelcad-photo-browser.mjs`:

```js
import { chromium } from '/home/andrii/projects/kernelCAD-web-worktrees/photo-attachments/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:5189/photo-attachments-preview.html');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6OwAAAABJRU5ErkJggg==', 'base64');
await page.getByRole('textbox').fill('Build this e-reader from the photo');
await page.getByLabel('Choose files').setInputFiles({ name: 'device.png', mimeType: 'image/png', buffer: png });
await page.getByRole('button', { name: 'Remove device.png' }).waitFor();
if (await page.getByRole('textbox').count() !== 1) throw new Error('More than one text interface');
await page.getByRole('button', { name: 'Send', exact: true }).click();
const sent = await page.getByLabel('Submitted prompt').textContent();
if (!sent.startsWith('photo:device.png:image/png:data:image/png;base64')) throw new Error(`Unexpected payload: ${sent}`);
if (errors.length) throw new Error(errors.join('\n'));
console.log(JSON.stringify({ textboxCount: 1, photoPayload: sent.slice(0, 48) }));
await browser.close();
```

Run with node 22 while the dev server is up, then stop the server and delete the temporary files:

```bash
node /tmp/kernelcad-photo-browser.mjs
```

Expected output: `{"textboxCount":1,"photoPayload":"photo:device.png:image/png:data:image/png;base64"}` (browser reads the file and passes exactly the `referenceImage` shape).

- [ ] **Step 3: Clean up the temporary files**

```bash
rm photo-attachments-preview.html photo-attachments-preview.tsx /tmp/kernelcad-photo-browser.mjs
```

- [ ] **Step 4: No commit** (verification only).

---

### Task 6: Rollout — server first, then web

**Files:** none (release steps).

- [ ] **Step 1: Push and merge the server PR**

```bash
git push -u origin HEAD:feat/photo-scale-optional
gh pr create --repo w1ne/kernelCAD-server --base main --head feat/photo-scale-optional --fill
PR=$(gh pr view --repo w1ne/kernelCAD-server --head feat/photo-scale-optional --json number --jq .number)
```

Wait for checks (`gh pr checks "$PR" --repo w1ne/kernelCAD-server`), then merge (auto-merge is disabled on this repo, so merge manually):

```bash
gh pr merge "$PR" --repo w1ne/kernelCAD-server --squash
git fetch origin main
git rev-parse origin/main
```

Watch the deploy workflow and confirm the exact commit is live:

```bash
gh run list --repo w1ne/kernelCAD-server --workflow deploy.yml --limit 3
curl -sS https://api.kernelcad.com/healthz
```

Expected: `"commit":"<merge sha>"`.

- [ ] **Step 2: Live server check before the web deploy**

Use a real 1x1 PNG data URL with **no** `knownDimension`; expect `401` (auth gate), not `400`:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://api.kernelcad.com/api/v1/generate \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"build this","referenceImage":{"dataUrl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6OwAAAABJRU5ErkJggg==","fileName":"a.png","mimeType":"image/png"}}'
```

Expected: `401`.

- [ ] **Step 3: Push and merge the web PR**

```bash
git push -u origin HEAD:feat/photo-attachments
gh pr create --repo w1ne/kernelCAD-web --base develop --head feat/photo-attachments --fill
PR=$(gh pr view --repo w1ne/kernelCAD-web --head feat/photo-attachments --json number --jq .number)
gh pr merge "$PR" --repo w1ne/kernelCAD-web --auto --squash
```

Wait for checks (rerun a flaky shard once if an unrelated OCCT test fails), then watch the Cloudflare deploy:

```bash
gh run list --repo w1ne/kernelCAD-web --workflow deploy-cloudflare.yml --limit 3
```

- [ ] **Step 4: Verify the live bundle**

```bash
ASSET=$(curl -sS https://app.kernelcad.com/ | grep -o 'assets/[^"]*\.js' | sort -u | head -1)
curl -sS "https://app.kernelcad.com/$ASSET" -o /tmp/app-live.js
for s in "Include files" "One photo per build." "Photos must be 4 MiB or smaller." "Simple-device photo reference" "Known dimension"; do printf '%s  ' "$s"; grep -c -F "$s" /tmp/app-live.js || true; done
rm -f /tmp/app-live.js
```

Expected: the first three are present; `Simple-device photo reference` and `Known dimension` are gone.

---

## Self-review notes

- Spec coverage: composer photo attach (Task 3), no dimension UI/gate (Task 4), optional server dimension (Task 1), agent asks for scale (Task 2), browser check (Task 5), rollout order (Task 6).
- The `useGeneration.test.ts` fixture that passes `knownDimension` still typechecks and passes because the field remains valid when present.
- `Toolbar`/`embed`/`browserRuntime` matches for `referenceImage` are unrelated (viewport reference images and the CAD `referenceImage()` lib call); no edits needed.
- Type names used across tasks: `PhotoAttachment`, `TextAttachment`, `generateClient.ReferenceImage`, `GenerateRequest['referenceImage']`, `PhotoReference.knownDimension?`, `buildSimplePhotoEreaderArtifact`.
