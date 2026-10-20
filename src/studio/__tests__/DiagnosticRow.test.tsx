// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { DiagnosticRow } from '../DiagnosticRow';
import { shellStore } from '../store/useShellStore';
import { inspectorTabRequests } from '../hooks/studioNavigation';
import type { ValidatorDiagnostic } from '../../modeling/mates/validator';

afterEach(() => {
    cleanup();
    shellStore.reset();
});

const floatingHorn: ValidatorDiagnostic = {
    code: 'assembly.part.floating',
    severity: 'error',
    message: 'output-horn floats',
    hint: 'add a mate to output-horn',
    partName: 'output-horn',
};

const mateDiag: ValidatorDiagnostic = {
    code: 'assembly.mate.over-constrained',
    severity: 'warning',
    message: 'jaw over-constrained',
    hint: 'remove redundant mate',
    mateName: 'jaw-coupling',
};

const interferenceDiag: ValidatorDiagnostic = {
    code: 'assembly.interference.overlap',
    severity: 'error',
    message: 'overlap',
    hint: 'separate the parts',
    partA: 'shoulder-servo',
    partB: 'base-plate',
};

describe('DiagnosticRow', () => {
    it('renders code, target name (partName), and hint', () => {
        const { getByText } = render(<DiagnosticRow diagnostic={floatingHorn} />);
        expect(getByText('assembly.part.floating')).toBeDefined();
        expect(getByText('output-horn')).toBeDefined();
        expect(getByText('add a mate to output-horn')).toBeDefined();
    });

    it('shows the message when the diagnostic has no hint', () => {
        const { getByText } = render(
            <DiagnosticRow
                diagnostic={{
                    code: 'mechanism.motion-on-fixed-joint',
                    severity: 'error',
                    message: "param shoulderDeg animates joint 'shoulder', but it is fastened",
                    hint: '',
                    mateName: 'shoulder',
                }}
            />,
        );
        expect(getByText("param shoulderDeg animates joint 'shoulder', but it is fastened")).toBeDefined();
    });

    it('falls back to mateName when no partName', () => {
        const { getByText } = render(<DiagnosticRow diagnostic={mateDiag} />);
        expect(getByText('jaw-coupling')).toBeDefined();
    });

    it('shows partA↔partB when only interference fields are set', () => {
        const { getByText } = render(<DiagnosticRow diagnostic={interferenceDiag} />);
        expect(getByText('shoulder-servo↔base-plate')).toBeDefined();
    });

    it('clicking the row selects the routed feature id', () => {
        const { getByLabelText } = render(<DiagnosticRow diagnostic={floatingHorn} />);
        const row = getByLabelText(/Diagnostic assembly\.part\.floating on output-horn/i);
        fireEvent.click(row);
        expect(shellStore.getSnapshot().selectedFeatureId).toBe('output-horn');
    });

    it('clicking the jump button (→) also selects the routed id', () => {
        const { getByLabelText } = render(<DiagnosticRow diagnostic={mateDiag} />);
        const jump = getByLabelText('Jump to jaw-coupling');
        fireEvent.click(jump);
        expect(shellStore.getSnapshot().selectedFeatureId).toBe('jaw-coupling');
    });

    it('the line chip opens code and a row click does not', () => {
        const seen: string[] = [];
        const stop = inspectorTabRequests.subscribe((tab) => seen.push(tab));
        const { getByRole, queryByRole, rerender } = render(
            <DiagnosticRow diagnostic={floatingHorn} scriptLine={18} />,
        );

        fireEvent.click(getByRole('button', { name: 'Show line 18 in code' }));
        expect(shellStore.getSnapshot().selectedFeatureId).toBe('output-horn');
        expect(seen).toEqual(['code']);

        seen.length = 0;
        rerender(<DiagnosticRow diagnostic={mateDiag} />);
        expect(queryByRole('button', { name: /Show line .* in code/ })).toBeNull();
        fireEvent.click(getByRole('button', { name: /Diagnostic assembly\.mate\.over-constrained/ }));
        expect(seen).toEqual([]);
        stop();
    });
});
