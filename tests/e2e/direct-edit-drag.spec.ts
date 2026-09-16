// tests/e2e/direct-edit-drag.spec.ts
//
// Direct-edit hero e2e: drag the slider +30 mm in X, verify the planner's
// ACTUAL rewrite (it edits the `PX` param in place — the hero's header
// explains why; it does not append a `.translate(...)` wrapper), verify the
// file on disk is untouched until accept, write the accepted source through
// the same dev save endpoint `StagedEditSlot`'s Accept handler calls, and
// verify the reloaded model has zero interferences. The example is restored
// in a `finally` (direct write + sha256) so a failed assertion never leaves
// the repo dirty.
//
// AgentRail limitation: the staged-edit card (and its `staged-edit-approve`
// button) lives inside AgentRail, which StudioShell mounts only when Supabase
// auth is configured AND a session exists (`agentEnabled`). This suite runs
// against the plain local dev server (no auth), and there is no e2e
// precedent for seeding a signed-in session without real test-user
// credentials — `connectClaudeDesktop.spec.ts` skips exactly that branch.
// So acceptance is driven through the DEV hook's returned `StagedEdit` plus
// the same `/__kernelcad/source` PUT that the Accept handler issues; the
// button wiring itself is unit-covered in `StagedEditSlot.test.tsx`.

import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = 'examples/direct-edit-drag-to-clearance.kcad.ts';
const SCRIPT_PATH = resolve(HERE, '..', '..', SCRIPT);

/** Structural subset of the shell store's StagedEdit returned by the hook. */
interface StagedEditLike {
    id: string;
    intent: string;
    fromCode: string;
    toCode: string;
    specLabel?: string;
    validityDelta?: {
        fromInterferences: number;
        toInterferences: number;
        fromVolumeMm3: number;
        toVolumeMm3: number;
    };
    evaluation?: { ok: boolean; error?: string };
    targetScript?: string;
}

function sha256(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}

test('drag slider +30mm: stages PX rewrite, accept clears interference, file restored', async ({
    page,
    request,
}) => {
    test.setTimeout(360_000);

    const original = readFileSync(SCRIPT_PATH, 'utf8');
    const originalSha = sha256(original);
    let reviewPosts = 0;
    page.on('request', (req) => {
        if (req.method() === 'POST' && new URL(req.url()).pathname === '/__kernelcad/review') {
            reviewPosts += 1;
        }
    });

    try {
        // ---- Load the start pose: exactly one interference pair. ----------
        await page.goto(`/?script=${encodeURIComponent(SCRIPT)}`);
        await expect(page.getByTestId('part-row-slider')).toBeVisible({ timeout: 180_000 });
        await expect(page.getByTestId('status-recompute-ms')).toBeVisible({ timeout: 180_000 });
        await expect(page.getByTestId('status-interferences')).toHaveText('interferences: 1');
        await page.waitForFunction(
            () => typeof (window as unknown as { __kernelcad_drag_entity?: unknown }).__kernelcad_drag_entity === 'function',
            null,
            { timeout: 60_000 },
        );

        // The staged-edit card is not mounted in the unauthenticated dev
        // shell (see the header note); the hook is the observable surface.
        await expect(page.getByTestId('staged-edit-slot')).toHaveCount(0);

        // ---- Drive the drag through the DEV hook (same commit path). ------
        const edit = await page.evaluate(async () => {
            const hook = (window as unknown as {
                __kernelcad_drag_entity: (request: {
                    anchor: { kind: string; name: string };
                    delta: [number, number, number];
                }) => Promise<unknown>;
            }).__kernelcad_drag_entity;
            return hook({
                anchor: { kind: 'part', name: 'slider' },
                delta: [30, 0, 0],
            });
        }) as StagedEditLike | null;

        expect(edit).not.toBeNull();
        expect(edit!.id).toMatch(/^drag-/);
        expect(edit!.intent).toBe("Translate part 'slider' by (30, 0, 0) mm");
        expect(edit!.evaluation).toEqual({ ok: true });
        expect(edit!.specLabel).toBe('X:param · Y:literal · Z:param');
        expect(edit!.targetScript).toBe(SCRIPT);

        // Actual planner behavior for this hero: the PX param value is
        // rewritten in place (20 → 50), NOT a `.translate(...)` append.
        expect(edit!.toCode).toContain("param('PX', 50");
        expect(edit!.toCode).not.toContain('.translate(30, 0, 0)');

        // The candidate review moved the interference count 1 → 0 with a
        // real ~800 mm³ baseline volume (OCCT reports 799.9999999999998).
        const delta = edit!.validityDelta!;
        expect(delta.fromInterferences).toBe(1);
        expect(delta.toInterferences).toBe(0);
        expect(Math.round(delta.fromVolumeMm3)).toBe(800);
        expect(delta.toVolumeMm3).toBe(0);

        // One review per release: the hook must not fan out per pointer frame.
        expect(reviewPosts).toBe(1);

        // ---- Untouched on disk before accept. -----------------------------
        expect(sha256(readFileSync(SCRIPT_PATH, 'utf8'))).toBe(originalSha);

        // ---- Accept: same PUT the StagedEditSlot approve handler issues. --
        const put = await request.put(`/__kernelcad/source?script=${encodeURIComponent(SCRIPT)}`, {
            data: { source: edit!.toCode },
        });
        expect(put.ok()).toBe(true);

        const saved = readFileSync(SCRIPT_PATH, 'utf8');
        expect(saved).toBe(edit!.toCode);
        expect(saved).toContain("param('PX', 50");

        // ---- Reload: the accepted source now clears the clash. ------------
        const reviewResponse = page.waitForResponse(
            (resp) =>
                resp.url().includes('/__kernelcad/review')
                && resp.request().method() === 'GET',
            { timeout: 180_000 },
        );
        await page.reload();
        await reviewResponse;
        await expect(page.getByTestId('part-row-slider')).toBeVisible({ timeout: 180_000 });
        await expect(page.getByTestId('status-recompute-ms')).toBeVisible({ timeout: 180_000 });
        await expect(page.getByTestId('status-interferences')).toHaveText('interferences: 0');
    } finally {
        writeFileSync(SCRIPT_PATH, original, 'utf8');
        expect(sha256(readFileSync(SCRIPT_PATH, 'utf8'))).toBe(originalSha);
    }
});
