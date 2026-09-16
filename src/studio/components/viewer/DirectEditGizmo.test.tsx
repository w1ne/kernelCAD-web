// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/viewer/DirectEditGizmo.test.tsx
//
// Unit coverage for the direct-edit gizmo's decision logic. Full R3F
// rendering is not available here: `TransformControls` is mocked to capture
// its handlers, and `three`'s Object3D subclass records the proxy so tests can
// drive a release with a non-zero delta without WebGL.
/** @vitest-environment happy-dom */
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeometryResult, FaceGeometry } from '../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { DirectEditAnchor } from '../../../modeling/directEdit/anchors';
import type { ScriptReviewSummary } from '../../context/GeometryContext';
import type { StagedEdit } from '../../store/shellStore';

// `solvedAssembly` / `assemblyPart` shapes below mirror the records actually
// produced by examples/robot-arm/desktop-3axis-mates.kcad.ts (captured via
// POST /__kernelcad/mesh, 16 parts + one solvedAssembly with 15 mates).
const hoisted = vi.hoisted(() => ({
    proxies: [] as Array<{ position: { x: number; y: number; z: number } }>,
    workbench: {
        selectedItemIds: [] as string[],
        code: '',
        scriptReview: null as ScriptReviewSummary | null,
        isComputing: false,
    },
    features: [] as FeatureRecord[],
    transformProps: null as null | {
        onMouseDown?: () => void;
        onObjectChange?: () => void;
        onMouseUp?: () => void;
    },
    planDrag: vi.fn(),
    reviewCandidate: vi.fn(),
    currentStudioScript: vi.fn(() => 'examples/test.kcad.ts'),
}));

vi.mock('three', async () => {
    const actual = await vi.importActual<typeof import('three')>('three');
    class TrackedObject3D extends actual.Object3D {
        constructor() {
            super();
            hoisted.proxies.push(this as unknown as { position: { x: number; y: number; z: number } });
        }
    }
    return { ...actual, Object3D: TrackedObject3D };
});

vi.mock('@react-three/drei/core/TransformControls', () => ({
    TransformControls: (props: NonNullable<typeof hoisted.transformProps>) => {
        hoisted.transformProps = props;
        return null;
    },
}));

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => hoisted.workbench,
}));

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({ features: hoisted.features }),
}));

vi.mock('../../directEdit/candidateReview', () => ({
    reviewCandidate: hoisted.reviewCandidate,
}));

vi.mock('../../../modeling/directEdit/planDrag', () => ({
    planDrag: hoisted.planDrag,
}));

vi.mock('../../scriptSource', () => ({
    currentStudioScript: hoisted.currentStudioScript,
}));

import { DirectEditGizmo, REVIEW_BUSY_NOTICE, SOURCE_CHANGED_NOTICE } from './DirectEditGizmo';
import { isMatedAnchor, resolveAnchor } from './directEditTarget';
import { shellStore } from '../../store/useShellStore';

function face(): FaceGeometry {
    return {
        faceId: 0,
        vertices: new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
    };
}

function geometry(overrides: Partial<GeometryResult> = {}): GeometryResult {
    return { faces: [face()], ...overrides };
}

function makePart(
    id: string,
    partName: string,
    metadata: Record<string, unknown> = {},
): FeatureRecord {
    return {
        id,
        kind: 'assemblyPart',
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        metadata: { assemblyName: 'desktop 3-axis parametric arm', partName, ...metadata },
    };
}

/** Real-shape subset of the desktop-3axis-mates records: five parts, the
 *  solvedAssembly carrying 15 mates, one joint primitive, one legacy connect. */
function makeMateRecords(): FeatureRecord[] {
    return [
        makePart('assemblyPart_1', 'base-plate'),
        makePart('assemblyPart_4', 'shoulder-column'),
        makePart('assemblyPart_7', 'upper-arm-beam'),
        makePart('assemblyPart_11', 'forearm-beam'),
        makePart('assemblyPart_90', 'legacy-slider', {
            placedBy: {
                connector: 'root',
                to: { partId: 'assemblyPart_1', partName: 'base-plate', connector: 'top' },
            },
        }),
        {
            id: 'assemblyJoint_1',
            kind: 'assemblyJoint',
            inputs: {
                a: { kind: 'feature', id: 'assemblyPart_4' },
                b: { kind: 'feature', id: 'assemblyPart_7' },
            },
            params: {},
            transforms: [],
            suppressed: false,
            metadata: {
                assemblyName: 'desktop 3-axis parametric arm',
                jointName: 'shoulder-pitch-joint',
                jointKind: 'revolute',
            },
        },
        {
            id: 'assemblyConnect_1',
            kind: 'assemblyConnect',
            inputs: {
                a: { kind: 'feature', id: 'assemblyPart_11' },
                b: { kind: 'feature', id: 'assemblyPart_90' },
            },
            params: {},
            transforms: [],
            suppressed: false,
            metadata: {
                assemblyName: 'desktop 3-axis parametric arm',
                connectName: 'grip-connect',
                kind: 'fixed',
                a: { partName: 'forearm-beam', connector: 'gripper-mount' },
                b: { partName: 'legacy-slider', connector: 'root' },
            },
        },
        {
            id: 'solvedAssembly_1',
            kind: 'solvedAssembly',
            inputs: {
                part_0: { kind: 'feature', id: 'assemblyPart_1' },
                part_1: { kind: 'feature', id: 'assemblyPart_4' },
                part_2: { kind: 'feature', id: 'assemblyPart_7' },
                part_3: { kind: 'feature', id: 'assemblyPart_11' },
            },
            params: {},
            transforms: [],
            suppressed: false,
            metadata: {
                assemblyName: 'desktop 3-axis parametric arm',
                partIds: ['assemblyPart_1', 'assemblyPart_4', 'assemblyPart_7', 'assemblyPart_11'],
                jointIds: [],
                mates: [
                    { name: 'base-yaw', a: 'base-yaw-output.yaw-out', b: 'shoulder-column.yaw-in', type: 'revolute' },
                    { name: 'shoulder-pitch', a: 'shoulder-cheeks.pitch-out', b: 'upper-arm-beam.pitch-in', type: 'revolute' },
                    { name: 'elbow-pitch', a: 'upper-arm-beam.elbow-out', b: 'forearm-beam.elbow-in', type: 'revolute' },
                ],
            },
        },
    ];
}

const PART_ANCHOR: DirectEditAnchor = { kind: 'part', name: 'base-plate' };
const HOOK_DELTA: [number, number, number] = [5, 0, 0];

function stubPlan(overrides: Record<string, unknown> = {}) {
    hoisted.planDrag.mockReturnValue({
        fromCode: hoisted.workbench.code,
        toCode: 'const base = box(1, 1, 1).translate(5, 0, 0);\nreturn base;',
        anchor: PART_ANCHOR,
        spec: {
            translateCall: null,
            hasTranslateCall: false,
            axes: [
                { axis: 0, kind: 'delta' },
                { axis: 1, kind: 'delta' },
                { axis: 2, kind: 'delta' },
            ],
        },
        diagnostics: [],
        intent: "Translate part 'base-plate' by (5, 0, 0) mm",
        ...overrides,
    });
}

function stubCandidate(overrides: Record<string, unknown> = {}) {
    hoisted.reviewCandidate.mockResolvedValue({
        ok: true,
        reviewed: false,
        review: null,
        delta: null,
        ...overrides,
    });
}

beforeEach(() => {
    cleanup();
    shellStore.reset();
    hoisted.proxies.length = 0;
    hoisted.transformProps = null;
    hoisted.workbench.selectedItemIds = ['base'];
    hoisted.workbench.code = 'const base = box(1, 1, 1);\nreturn base;';
    hoisted.workbench.scriptReview = { ok: true } as unknown as ScriptReviewSummary;
    hoisted.workbench.isComputing = false;
    hoisted.features = [];
    hoisted.planDrag.mockReset();
    hoisted.reviewCandidate.mockReset();
    hoisted.currentStudioScript.mockReset();
    hoisted.currentStudioScript.mockReturnValue('examples/test.kcad.ts');
    delete window.__kernelcad_drag_entity;
});

afterEach(() => {
    cleanup();
    delete window.__kernelcad_drag_entity;
    shellStore.reset();
});

describe('resolveAnchor', () => {
    it('maps an assemblyPartName to a part anchor', () => {
        const resolved = resolveAnchor(
            'base-plate',
            [geometry({ assemblyPartName: 'base-plate' })],
            [null],
        );
        expect(resolved?.anchor).toEqual({ kind: 'part', name: 'base-plate' });
    });

    it('maps a returned-variable name to a variable anchor', () => {
        const resolved = resolveAnchor('base', [geometry()], ['base']);
        expect(resolved?.anchor).toEqual({ kind: 'variable', name: 'base' });
    });

    it('matches on assemblyPartName ?? itemNames[i], not itemNames alone', () => {
        // The geometry is a named part, so the variable name at the same
        // index must NOT match it (mirrors Viewer.tsx identity convention).
        const resolved = resolveAnchor('base', [geometry({ assemblyPartName: 'part-a' })], ['base']);
        expect(resolved).toBeNull();
    });

    it('returns null without a selection, without a match, or for anonymous geometry', () => {
        expect(resolveAnchor(undefined, [geometry()], ['base'])).toBeNull();
        expect(resolveAnchor('missing', [geometry()], ['base'])).toBeNull();
        expect(resolveAnchor('base', [geometry()], [null])).toBeNull();
    });
});

describe('isMatedAnchor', () => {
    it('refuses a part member of a solvedAssembly carrying mates (fail-safe, incl. FK root)', () => {
        const records = makeMateRecords();
        expect(isMatedAnchor(records, { kind: 'part', name: 'shoulder-column' })).toBe(true);
        expect(isMatedAnchor(records, { kind: 'part', name: 'upper-arm-beam' })).toBe(true);
        // Root has no direct mate reference but is still a mate-model member.
        expect(isMatedAnchor(records, { kind: 'part', name: 'base-plate' })).toBe(true);
    });

    it('refuses a part participating in an assemblyJoint primitive', () => {
        const records = makeMateRecords();
        // assemblyPart_7 is also a solvedAssembly member; use a records subset
        // without the solvedAssembly to isolate the joint signal.
        const jointOnly = records.filter((r) => r.kind !== 'solvedAssembly');
        expect(isMatedAnchor(jointOnly, { kind: 'part', name: 'shoulder-column' })).toBe(true);
        expect(isMatedAnchor(jointOnly, { kind: 'part', name: 'upper-arm-beam' })).toBe(true);
    });

    it('refuses a part participating in an assemblyConnect primitive', () => {
        const records = makeMateRecords().filter((r) => r.kind !== 'solvedAssembly' && r.kind !== 'assemblyJoint');
        expect(isMatedAnchor(records, { kind: 'part', name: 'forearm-beam' })).toBe(true);
        expect(isMatedAnchor(records, { kind: 'part', name: 'legacy-slider' })).toBe(true);
    });

    it('refuses the legacy placedBy connect path', () => {
        const records = [makeMateRecords().find((r) => r.id === 'assemblyPart_90')!];
        expect(isMatedAnchor(records, { kind: 'part', name: 'legacy-slider' })).toBe(true);
    });

    it('refuses a mate connector reference by name when the part record is absent', () => {
        const records = makeMateRecords().filter((r) => r.id === 'solvedAssembly_1');
        expect(isMatedAnchor(records, { kind: 'part', name: 'shoulder-column' })).toBe(true);
    });

    it('allows a non-assembly part and variable anchors', () => {
        const records = makeMateRecords();
        expect(isMatedAnchor(records, { kind: 'part', name: 'some-free-part' })).toBe(false);
        expect(isMatedAnchor(records, { kind: 'variable', name: 'base-plate' })).toBe(false);
        expect(isMatedAnchor([], { kind: 'part', name: 'base-plate' })).toBe(false);
    });
});

describe('DirectEditGizmo commit path', () => {
    it('DEV hook stages the planned edit with payload fields and reviews exactly once', async () => {
        stubPlan();
        stubCandidate();
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        const staged = (await window.__kernelcad_drag_entity!({
            anchor: PART_ANCHOR,
            delta: HOOK_DELTA,
        })) as StagedEdit | null;

        expect(hoisted.reviewCandidate).toHaveBeenCalledTimes(1);
        expect(hoisted.reviewCandidate).toHaveBeenCalledWith({
            source: 'const base = box(1, 1, 1).translate(5, 0, 0);\nreturn base;',
            script: 'examples/test.kcad.ts',
            baseline: hoisted.workbench.scriptReview,
        });
        expect(staged).toMatchObject({
            intent: "Translate part 'base-plate' by (5, 0, 0) mm",
            fromCode: hoisted.workbench.code,
            toCode: 'const base = box(1, 1, 1).translate(5, 0, 0);\nreturn base;',
            specLabel: 'X:delta · Y:delta · Z:delta',
            evaluation: { ok: true },
            targetScript: 'examples/test.kcad.ts',
            source: { kind: 'human', label: 'drag' },
        });
        expect(staged?.id).toMatch(/^drag-\d+-[a-z0-9]+$/);
        expect(staged?.validityDelta).toBeUndefined();
        expect(shellStore.getSnapshot().stagedEdit).toBe(staged);
        expect(shellStore.getSnapshot().directEditNotice).toBeNull();
    });

    it('attaches validityDelta only when the candidate review carries one', async () => {
        stubPlan();
        const delta = {
            fromInterferences: 2,
            toInterferences: 0,
            fromVolumeMm3: 12.5,
            toVolumeMm3: 0,
            fromOk: false,
            toOk: true,
        };
        stubCandidate({ reviewed: true, delta });
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        const staged = (await window.__kernelcad_drag_entity!({
            anchor: PART_ANCHOR,
            delta: HOOK_DELTA,
        })) as StagedEdit | null;

        expect(staged?.validityDelta).toEqual(delta);
    });

    it('surfaces a plan failure as a notice and never stages', async () => {
        stubPlan({
            toCode: null,
            diagnostics: [
                { code: 'feature.direct-edit.unresolved', severity: 'error', message: 'anchor missing', hint: '' },
            ],
        });
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        const result = await window.__kernelcad_drag_entity!({
            anchor: PART_ANCHOR,
            delta: HOOK_DELTA,
        });

        expect(result).toBeNull();
        expect(hoisted.reviewCandidate).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(shellStore.getSnapshot().directEditNotice).toBe('anchor missing');
    });

    it('stages candidate evaluation failure with ok:false so Accept stays disabled', async () => {
        stubPlan();
        stubCandidate({ ok: false, reviewed: false, error: 'candidate exploded' });
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        const staged = (await window.__kernelcad_drag_entity!({
            anchor: PART_ANCHOR,
            delta: HOOK_DELTA,
        })) as StagedEdit | null;

        expect(staged?.evaluation).toEqual({ ok: false, error: 'candidate exploded' });
        expect(staged?.validityDelta).toBeUndefined();
    });

    it('refuses to stage when the source changes while the review awaits', async () => {
        stubPlan();
        let resolveReview!: (value: unknown) => void;
        hoisted.reviewCandidate.mockImplementation(
            () => new Promise((resolve) => { resolveReview = resolve; }),
        );
        const { rerender } = render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        const pending = window.__kernelcad_drag_entity!({ anchor: PART_ANCHOR, delta: HOOK_DELTA });
        await waitFor(() => expect(hoisted.reviewCandidate).toHaveBeenCalledTimes(1));

        // Simulate an agent edit landing mid-review: the re-render syncs
        // codeRef to the new source before the review resolves.
        hoisted.workbench.code = 'const base = box(2, 2, 2);\nreturn base;';
        rerender(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);
        resolveReview({ ok: true, reviewed: false, review: null, delta: null });

        await expect(pending).resolves.toBeNull();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(shellStore.getSnapshot().directEditNotice).toBe(SOURCE_CHANGED_NOTICE);
    });

    it('refuses a concurrent commit during the in-flight review and recovers after', async () => {
        stubPlan();
        let resolveReview!: (value: unknown) => void;
        hoisted.reviewCandidate.mockImplementationOnce(
            () => new Promise((resolve) => { resolveReview = resolve; }),
        );
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        const first = window.__kernelcad_drag_entity!({ anchor: PART_ANCHOR, delta: HOOK_DELTA });
        await waitFor(() => expect(hoisted.reviewCandidate).toHaveBeenCalledTimes(1));

        const second = await window.__kernelcad_drag_entity!({ anchor: PART_ANCHOR, delta: HOOK_DELTA });
        expect(second).toBeNull();
        expect(hoisted.reviewCandidate).toHaveBeenCalledTimes(1);
        expect(shellStore.getSnapshot().directEditNotice).toBe(REVIEW_BUSY_NOTICE);

        resolveReview({ ok: true, reviewed: false, review: null, delta: null });
        await expect(first).resolves.not.toBeNull();
        expect(shellStore.getSnapshot().directEditNotice).toBeNull();

        // Busy flag released: a fresh call commits normally.
        stubCandidate();
        const third = await window.__kernelcad_drag_entity!({ anchor: PART_ANCHOR, delta: HOOK_DELTA });
        expect(third).not.toBeNull();
        expect(hoisted.reviewCandidate).toHaveBeenCalledTimes(2);
    });

    it('passes mated:true to planDrag for a mate-driven part (refusal path)', async () => {
        stubPlan({
            toCode: null,
            diagnostics: [
                {
                    code: 'feature.direct-edit.unresolved',
                    severity: 'error',
                    message: "part 'shoulder-column' is mate-driven; a direct-edit drag cannot move it",
                    hint: '',
                },
            ],
        });
        hoisted.features = makeMateRecords();
        render(<DirectEditGizmo geometries={[geometry({ assemblyPartName: 'shoulder-column' })]} itemNames={[null]} />);

        const result = await window.__kernelcad_drag_entity!({
            anchor: { kind: 'part', name: 'shoulder-column' },
            delta: HOOK_DELTA,
        });

        expect(hoisted.planDrag).toHaveBeenCalledWith(
            expect.objectContaining({ mated: true, anchor: { kind: 'part', name: 'shoulder-column' } }),
        );
        expect(result).toBeNull();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(shellStore.getSnapshot().directEditNotice).toContain('mate-driven');
    });

    it('unregisters the DEV hook on unmount', () => {
        const { unmount } = render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);
        expect(typeof window.__kernelcad_drag_entity).toBe('function');
        unmount();
        expect(window.__kernelcad_drag_entity).toBeUndefined();
    });
});

describe('DirectEditGizmo pointer release', () => {
    it('reviews exactly once per release and plans the snapped proxy delta', async () => {
        stubPlan();
        stubCandidate();
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);
        const proxy = hoisted.proxies.at(-1)!;
        const startX = proxy.position.x;

        act(() => hoisted.transformProps!.onMouseDown!());
        proxy.position.x = startX + 5;
        act(() => hoisted.transformProps!.onObjectChange!());
        act(() => hoisted.transformProps!.onMouseUp!());

        await waitFor(() => expect(hoisted.reviewCandidate).toHaveBeenCalledTimes(1));
        expect(hoisted.planDrag).toHaveBeenCalledWith(
            expect.objectContaining({ delta: [5, 0, 0], mated: false }),
        );
        // The proxy is re-parked at the bounds center for the next gesture.
        expect(proxy.position.x).toBe(startX);
    });

    it('does not plan or review a zero-delta click on the control', async () => {
        stubPlan();
        stubCandidate();
        render(<DirectEditGizmo geometries={[geometry()]} itemNames={['base']} />);

        act(() => hoisted.transformProps!.onMouseDown!());
        act(() => hoisted.transformProps!.onMouseUp!());
        await new Promise((resolve) => setTimeout(resolve, 25));

        expect(hoisted.planDrag).not.toHaveBeenCalled();
        expect(hoisted.reviewCandidate).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
    });
});
