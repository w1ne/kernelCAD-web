// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MechanismLoadsLine } from '../../../modeling/runtime/mechanismVerdict';
import { LoadsPanel } from './LoadsPanel';
import { torquePath } from './loadsPanelModel';

const LOADS: MechanismLoadsLine = {
    maxLevel: 'warning',
    statement: 'loads: min torque margin 1.50x (shoulder-drive).',
    joints: [
        { joint: 'shoulder-drive', maxLevel: 'warning', peakTorqueNm: 0.1, ratedTorqueNm: 0.15, torqueMargin: 1.5, peakBendingNmm: 52.5, supports: [{ part: 'shoulder-SG90', peakRadialN: 4.06 }, { part: 'shoulder-bushing', peakRadialN: 4.07 }], torque: [[0, 0], [500, 0.1], [1000, -0.05]] },
        { joint: 'wrist-drive', maxLevel: 'ok', peakTorqueNm: 0, ratedTorqueNm: 0.176, peakBendingNmm: 2.2, supports: [], torque: [[0, 0], [1000, 0]] },
    ],
};

afterEach(cleanup);

describe('LoadsPanel', () => {
    it('renders nothing without loads', () => {
        const { container } = render(<LoadsPanel loads={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows one row per joint with margin, bending and support loads', () => {
        render(<LoadsPanel loads={LOADS} />);
        expect(screen.getByTestId('loads-panel')).toHaveTextContent('loads: min torque margin 1.50x');
        const rows = screen.getAllByTestId('loads-joint');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('1.50x');
        expect(rows[0]).toHaveTextContent('bending 52.5 N·mm');
        expect(rows[0]).toHaveTextContent('shoulder-bushing 4.07 N');
        expect(rows[1]).toHaveTextContent('not loaded');
    });

    it('scales the torque path to the peak', () => {
        expect(torquePath([[0, 0], [500, 0.1], [1000, -0.1]])).toBe('0.0,16.0 80.0,1.0 160.0,31.0');
    });
});
