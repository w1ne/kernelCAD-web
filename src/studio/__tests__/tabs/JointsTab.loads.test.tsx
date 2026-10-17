// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({
        paramTable: null,
        joints: [],
        features: [],
        geometries: [],
        validity: { diagnostics: [] },
        mechanismBanner: null,
        mechanismLoads: {
            maxLevel: 'warning',
            statement: 'loads: min torque margin 1.50x (shoulder-drive).',
            joints: [{
                joint: 'shoulder-drive',
                maxLevel: 'warning',
                peakTorqueNm: 0.1,
                ratedTorqueNm: 0.15,
                torqueMargin: 1.5,
                peakBendingNmm: 52.5,
                supports: [{ part: 'shoulder-SG90', peakRadialN: 4.06 }],
                torque: [[0, 0], [1000, 0.1]],
            }],
        },
        rawInterferencePairs: [],
        interferenceSummary: null,
    }),
}));

import { Inspector } from '../../Inspector';

afterEach(cleanup);

describe('Inspector loads', () => {
    it('shows joint loads in the inspector that is already open', () => {
        render(<Inspector tabSlots={{}} />);
        expect(screen.getByTestId('loads-panel')).toHaveTextContent('loads: min torque margin 1.50x');
        expect(screen.getByTestId('loads-joint')).toHaveTextContent('shoulder-drive');
    });
});
