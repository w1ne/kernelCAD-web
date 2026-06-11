// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { SelectedFeatureId, StudioRecomputeResult } from '../types';

const mockSelection = vi.hoisted(() => ({
    current: null as SelectedFeatureId,
}));
const mockResult = vi.hoisted(() => ({
    current: null as StudioRecomputeResult | null,
}));

vi.mock('../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({
        selectedFeatureId: mockSelection.current,
        selectFeature: vi.fn(),
    }),
}));

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockResult.current,
}));

import { SelectionHighlight } from '../SelectionHighlight';

function emptyResult(): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
    };
}

function makeFeature(id: string): FeatureRecord {
    return {
        id,
        kind: 'box',
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
    };
}

beforeEach(() => {
    mockSelection.current = null;
    mockResult.current = emptyResult();
});

afterEach(() => cleanup());

describe('SelectionHighlight', () => {
    it('renders nothing when no selection', () => {
        mockSelection.current = null;
        mockResult.current = { ...emptyResult(), features: [makeFeature('output-horn')] };
        const { container } = render(<SelectionHighlight />);
        expect(container.firstChild).toBeNull();
    });

    it('renders floating label when selection matches a feature', () => {
        mockSelection.current = 'output-horn';
        mockResult.current = {
            ...emptyResult(),
            features: [makeFeature('output-horn'), makeFeature('shoulder')],
        };
        render(<SelectionHighlight />);
        const label = screen.getByTestId('selection-highlight');
        expect(label.textContent).toContain('Selected: output-horn');
    });

    it('renders nothing when selection does not match any feature (soft binding)', () => {
        mockSelection.current = 'ghost-id';
        mockResult.current = { ...emptyResult(), features: [makeFeature('output-horn')] };
        const { container } = render(<SelectionHighlight />);
        expect(container.firstChild).toBeNull();
    });
});
