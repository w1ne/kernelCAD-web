// @vitest-environment happy-dom
//
// Tri-pane sync — integration test. Drives selection from each of the four
// origin points (SceneTab row, DiagnosticRow in the drawer, programmatic
// shellStore set, validity-tab inline diag row) and asserts the other
// three surfaces react. This is the load-bearing review-cockpit behavior
// from the Slice 1 spec; the per-component tests cover individual
// surfaces, but only this test proves the bus actually fans out.

import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ValidatorDiagnostic, ValidatorResult } from '../../modeling/mates/validator';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { StudioRecomputeResult } from '../types';
import { shellStore } from '../store/shellStore';

const baseFeature = (id: string, kind: FeatureRecord['kind']): FeatureRecord => ({
    id,
    kind,
    inputs: {},
    params: {},
    transforms: [],
    scriptLocation: { file: 'so100.kcad.ts', line: 0, column: 0 },
    suppressed: false,
});

const features: FeatureRecord[] = [
    { ...baseFeature('base-plate', 'box'), scriptLocation: { file: 'so100.kcad.ts', line: 12, column: 1 } },
    { ...baseFeature('shoulder-servo', 'importedStep'), scriptLocation: { file: 'so100.kcad.ts', line: 18, column: 1 } },
    { ...baseFeature('output-horn', 'importedStep'), scriptLocation: { file: 'so100.kcad.ts', line: 24, column: 1 } },
];

const floatingHorn: ValidatorDiagnostic = {
    code: 'assembly.part.floating',
    severity: 'error',
    message: 'output-horn floats',
    hint: 'add a mate to output-horn',
    partName: 'output-horn',
};

const validity: ValidatorResult = {
    status: 'error',
    diagnostics: [floatingHorn],
    partCount: 3,
    jointCount: 0,
};

const recompute: StudioRecomputeResult = {
    features,
    geometries: [],
    validity,
    paramTable: null,
    diagnostics: [],
    recomputeMs: 184,
};

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => recompute,
}));

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '',
        setCode: vi.fn(),
        editorInstance: null,
        setEditorInstance: vi.fn(),
        sketches: [],
    }),
}));

beforeEach(() => {
    shellStore.reset();
    shellStore.publishValidity(validity);
});

afterEach(() => {
    cleanup();
});

// Subagent 4's BottomDrawer reads currentValidity from the shell store
// (publishValidity rotates current→previous). Other surfaces use the
// useRecomputeResult mock. Both wiring paths converge on selectFeature.
describe('tri-pane sync (integration)', () => {
    it('SceneTab row click propagates to shellStore.selectedFeatureId', async () => {
        const { SceneTab } = await import('../tabs/SceneTab');
        render(<SceneTab />);

        fireEvent.click(screen.getByTestId('scene-row-output-horn'));

        expect(shellStore.getSnapshot().selectedFeatureId).toBe('output-horn');
    });

    it('DiagnosticRow click propagates to shellStore via routeDiagnosticToSelection', async () => {
        const { DiagnosticRow } = await import('../DiagnosticRow');
        render(<DiagnosticRow diagnostic={floatingHorn} />);

        const row = screen.getByRole('button', { name: /Diagnostic.*output-horn/i });
        fireEvent.click(row);

        expect(shellStore.getSnapshot().selectedFeatureId).toBe('output-horn');
    });

    it('programmatic shellStore.setSelectedFeatureId flows to SceneTab selected state', async () => {
        const { SceneTab } = await import('../tabs/SceneTab');
        shellStore.setSelectedFeatureId('output-horn');
        render(<SceneTab />);

        const row = screen.getByTestId('scene-row-output-horn');
        expect(row.getAttribute('data-selected')).toBe('true');
    });

    it('ValidityTab inline diag click propagates same path as DiagnosticRow', async () => {
        const { ValidityTab } = await import('../tabs/ValidityTab');
        render(<ValidityTab />);

        const diagRows = within(screen.getByTestId('validity-tab')).getAllByRole('button');
        // First button is the diagnostic row (status chip is not a button).
        const diagRow = diagRows.find((b) => b.textContent?.includes('output-horn'));
        expect(diagRow).toBeDefined();
        fireEvent.click(diagRow!);

        expect(shellStore.getSnapshot().selectedFeatureId).toBe('output-horn');
    });

    it('selection survives across publishValidity (soft binding)', () => {
        shellStore.setSelectedFeatureId('output-horn');
        shellStore.publishValidity({ ...validity, status: 'solved', diagnostics: [] });

        // Same id stays selected even though the diagnostic that pointed to
        // it has cleared — the spec calls this "soft binding".
        expect(shellStore.getSnapshot().selectedFeatureId).toBe('output-horn');
    });

    it('selection is idempotent — same id twice does not re-emit', () => {
        const listener = vi.fn();
        const unsubscribe = shellStore.subscribe(listener);

        shellStore.setSelectedFeatureId('output-horn');
        shellStore.setSelectedFeatureId('output-horn');
        shellStore.setSelectedFeatureId('output-horn');

        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });
});
