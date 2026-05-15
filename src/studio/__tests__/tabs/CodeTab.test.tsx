/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureRecord } from '../../../intent/featureRecord';
import type { StudioRecomputeResult } from '../../types';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockSelectedFeatureId = { value: null as string | null };
const mockSelectFeature = vi.fn();
const mockSetCode = vi.fn();
const revealLineInCenter = vi.fn();
const setModelMarkers = vi.fn();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

vi.mock('../../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({
        selectedFeatureId: mockSelectedFeatureId.value,
        selectFeature: mockSelectFeature,
    }),
}));

vi.mock('../../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '// hello',
        setCode: mockSetCode,
    }),
}));

vi.mock('@monaco-editor/react', () => ({
    __esModule: true,
    default: function MonacoEditorMock(props: {
        value: string;
        onChange?: (value: string | undefined) => void;
        onMount?: (editor: unknown, monaco: unknown) => void;
    }) {
        const { value, onChange, onMount } = props;
        React.useEffect(() => {
            if (!onMount) return;
            const editor = {
                getModel: () => ({ getLineContent: () => '' }),
                getPosition: () => ({ lineNumber: 1, column: 1 }),
                executeEdits: vi.fn(),
                setPosition: vi.fn(),
                revealLineInCenter,
                focus: vi.fn(),
                onMouseDown: vi.fn(),
            };
            const monaco = {
                editor: {
                    setModelMarkers,
                    MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
                },
            };
            onMount(editor, monaco);
        }, [onMount]);
        return (
            <textarea
                data-testid="monaco-mock"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
            />
        );
    },
}));

import { CodeTab } from '../../tabs/CodeTab';

function partFeature(id: string, line: number, column = 1): FeatureRecord {
    return {
        id,
        kind: 'assemblyPart',
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        scriptLocation: { file: 'x.kcad.ts', line, column },
        metadata: { partName: id },
    };
}

function featureWithoutLocation(id: string): FeatureRecord {
    return {
        id,
        kind: 'assemblyPart',
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        metadata: { partName: id },
    };
}

function baseResult(overrides: Partial<StudioRecomputeResult>): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        ...overrides,
    };
}

afterEach(() => {
    cleanup();
    revealLineInCenter.mockReset();
    setModelMarkers.mockReset();
    mockSelectFeature.mockReset();
    mockSetCode.mockReset();
    mockUseRecomputeResult.mockReset();
    mockSelectedFeatureId.value = null;
});

beforeEach(() => {
    revealLineInCenter.mockReset();
    setModelMarkers.mockReset();
    mockSelectFeature.mockReset();
    mockSetCode.mockReset();
    mockUseRecomputeResult.mockReset();
    mockSelectedFeatureId.value = null;
});

describe('CodeTab', () => {
    it('mounts the Monaco editor', () => {
        mockUseRecomputeResult.mockReturnValue(baseResult({}));

        render(<CodeTab />);
        expect(screen.getByTestId('monaco-mock')).toBeTruthy();
    });

    it('reveals the feature line when selectedFeatureId resolves to a feature with scriptLocation', () => {
        mockUseRecomputeResult.mockReturnValue(
            baseResult({
                features: [partFeature('shoulder', 42, 3)],
            }),
        );

        const { rerender } = render(<CodeTab />);
        expect(revealLineInCenter).not.toHaveBeenCalled();

        mockSelectedFeatureId.value = 'shoulder';
        rerender(<CodeTab />);

        expect(revealLineInCenter).toHaveBeenCalledTimes(1);
        expect(revealLineInCenter).toHaveBeenCalledWith(42);
    });

    it('does not call reveal when selectedFeatureId is null', () => {
        mockUseRecomputeResult.mockReturnValue(
            baseResult({
                features: [partFeature('shoulder', 12)],
            }),
        );

        render(<CodeTab />);
        expect(revealLineInCenter).not.toHaveBeenCalled();
    });

    it('does not call reveal when the matching feature has no scriptLocation', () => {
        mockUseRecomputeResult.mockReturnValue(
            baseResult({
                features: [featureWithoutLocation('shoulder')],
            }),
        );

        const { rerender } = render(<CodeTab />);
        mockSelectedFeatureId.value = 'shoulder';
        rerender(<CodeTab />);

        expect(revealLineInCenter).not.toHaveBeenCalled();
    });
});
