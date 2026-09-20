// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { ValidatorResult } from '../../../modeling/mates/validator';
import type { StudioRecomputeResult } from '../../types';
import type { GeometryResult } from '../../../shared/worker/workerTypes';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockSelectFeature = vi.fn();
const mockSelectedFeatureId = { value: null as string | null };
const mockGeometries = { value: [] as GeometryResult[] };
const mockHiddenIds = { value: [] as string[] };
const mockToggleVisibility = vi.fn();

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
        hiddenIds: mockHiddenIds.value,
        setSelectedItemId: vi.fn(),
        setHoveredItemId: vi.fn(),
        toggleVisibility: mockToggleVisibility,
        togglePlaneVisibility: vi.fn(),
    }),
}));

// SceneTab reads `geometries` for the assembly Parts list; tests that
// exercise the feature-row path leave it empty so the legacy rows render
// without mounting the full GeometryProvider.
vi.mock('../../context/GeometryContext', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useGeometry: () => ({ geometries: mockGeometries.value }),
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
    mockGeometries.value = [];
    mockHiddenIds.value = [];
    mockToggleVisibility.mockReset();
});

beforeEach(() => {
    mockSelectFeature.mockReset();
    mockUseRecomputeResult.mockReset();
    mockSelectedFeatureId.value = null;
    mockGeometries.value = [];
    mockHiddenIds.value = [];
    mockToggleVisibility.mockReset();
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

describe('SceneTab assembly parts', () => {
    function withParts(): void {
        mockGeometries.value = [
            { faces: [], assemblyPartName: 'base-link' },
            { faces: [], assemblyPartName: 'base-link' },
            { faces: [], assemblyPartName: 'arm' },
        ];
    }

    it('lists unique assembly parts in first-seen order with severity dots', () => {
        withParts();
        mockUseRecomputeResult.mockReturnValue(
            baseResult({ validity: validityWithFloating('arm') }),
        );

        render(<SceneTab />);

        expect(screen.getByTestId('scene-tab-parts')).toBeTruthy();
        const rows = screen.getAllByTestId(/^part-row-/);
        expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
            'part-row-base-link',
            'part-row-arm',
        ]);
        expect(rows[0].textContent).toContain('base-link');
        expect(rows[1].textContent).toContain('arm');
        expect(rows[0].querySelector('span')?.getAttribute('aria-label')).toBe('validity ok');
        expect(rows[1].querySelector('span')?.getAttribute('aria-label')).toBe('validity error');
    });

    it('selects the part when its row is clicked and toggles visibility without selecting', () => {
        withParts();
        mockUseRecomputeResult.mockReturnValue(baseResult({}));

        render(<SceneTab />);
        fireEvent.click(screen.getByTestId('part-row-arm'));
        expect(mockSelectFeature).toHaveBeenCalledTimes(1);
        expect(mockSelectFeature).toHaveBeenCalledWith('arm');

        mockSelectFeature.mockReset();
        fireEvent.click(screen.getByTestId('part-visibility-base-link'));
        expect(mockToggleVisibility).toHaveBeenCalledTimes(1);
        expect(mockToggleVisibility).toHaveBeenCalledWith('base-link');
        expect(mockSelectFeature).not.toHaveBeenCalled();
    });

    it('shows Show all only while a part is hidden and toggles just the hidden parts', () => {
        withParts();
        mockHiddenIds.value = ['arm'];
        mockUseRecomputeResult.mockReturnValue(baseResult({}));

        render(<SceneTab />);

        expect(screen.getByTestId('part-visibility-arm').getAttribute('title')).toBe('Show part');
        expect(screen.getByTestId('part-visibility-base-link').getAttribute('title')).toBe('Hide part');
        fireEvent.click(screen.getByTestId('parts-show-all'));
        expect(mockToggleVisibility).toHaveBeenCalledTimes(1);
        expect(mockToggleVisibility).toHaveBeenCalledWith('arm');
    });

    it('omits Show all when nothing is hidden', () => {
        withParts();
        mockUseRecomputeResult.mockReturnValue(baseResult({}));

        render(<SceneTab />);

        expect(screen.queryByTestId('parts-show-all')).toBeNull();
    });
});
