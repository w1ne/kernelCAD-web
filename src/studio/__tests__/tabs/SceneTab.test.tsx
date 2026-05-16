/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ValidatorResult } from '../../../modeling/mates/validator';
import type { StudioRecomputeResult } from '../../types';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockSelectFeature = vi.fn();
const mockSelectedFeatureId = { value: null as string | null };

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

vi.mock('../../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({
        selectedFeatureId: mockSelectedFeatureId.value,
        selectFeature: mockSelectFeature,
    }),
}));

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '',
        setCode: vi.fn(),
        planes: [],
        selectedItemId: null,
        hoveredItemId: null,
        hiddenIds: [],
        setSelectedItemId: vi.fn(),
        setHoveredItemId: vi.fn(),
        toggleVisibility: vi.fn(),
        togglePlaneVisibility: vi.fn(),
    }),
}));

import { SceneTab } from '../../tabs/SceneTab';

function partFeature(partName: string): FeatureRecord {
    return {
        id: `feature-${partName}`,
        kind: 'assemblyPart',
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        metadata: { partName },
    };
}

function validityWithFloating(partName: string): ValidatorResult {
    return {
        status: 'error',
        partCount: 2,
        jointCount: 0,
        diagnostics: [
            {
                code: 'assembly.part.floating',
                severity: 'error',
                message: `Part '${partName}' has no joint.`,
                hint: 'declare a joint',
                partName,
            },
        ],
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
    mockSelectFeature.mockReset();
    mockUseRecomputeResult.mockReset();
    mockSelectedFeatureId.value = null;
});

beforeEach(() => {
    mockSelectFeature.mockReset();
    mockUseRecomputeResult.mockReset();
    mockSelectedFeatureId.value = null;
});

describe('SceneTab', () => {
    it('renders an error-severity badge on a row matching a floating-part diagnostic', () => {
        mockUseRecomputeResult.mockReturnValue(
            baseResult({
                features: [partFeature('base-link'), partFeature('floating-link')],
                validity: validityWithFloating('floating-link'),
            }),
        );

        render(<SceneTab />);

        const dot = screen.getByTestId('scene-row-dot-floating-link');
        expect(dot.getAttribute('aria-label')).toBe('validity error');
        const okDot = screen.getByTestId('scene-row-dot-base-link');
        expect(okDot.getAttribute('aria-label')).toBe('validity ok');
    });

    it('calls selectFeature with the row id when a row is clicked', () => {
        mockUseRecomputeResult.mockReturnValue(
            baseResult({
                features: [partFeature('shoulder')],
                validity: validityWithFloating('floating-other'),
            }),
        );

        render(<SceneTab />);
        fireEvent.click(screen.getByTestId('scene-row-shoulder'));

        expect(mockSelectFeature).toHaveBeenCalledTimes(1);
        expect(mockSelectFeature).toHaveBeenCalledWith('shoulder');
    });

    it('marks the row matching selectedFeatureId as selected', () => {
        mockSelectedFeatureId.value = 'shoulder';
        mockUseRecomputeResult.mockReturnValue(
            baseResult({
                features: [partFeature('shoulder'), partFeature('elbow')],
                validity: validityWithFloating('floating-other'),
            }),
        );

        render(<SceneTab />);
        const selected = screen.getByTestId('scene-row-shoulder');
        const other = screen.getByTestId('scene-row-elbow');
        expect(selected.getAttribute('data-selected')).toBe('true');
        expect(selected.className).toContain('scene-row-selected');
        expect(other.getAttribute('data-selected')).toBe('false');
        expect(other.className).not.toContain('scene-row-selected');
    });
});
