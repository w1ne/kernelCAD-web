// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BottomDrawer } from '../BottomDrawer';
import { shellStore } from '../store/useShellStore';
import type { ValidatorDiagnostic, ValidatorResult } from '../../lib/mates/validator';

afterEach(() => {
    cleanup();
    shellStore.reset();
});

function makeResult(
    status: ValidatorResult['status'],
    diagnostics: ValidatorDiagnostic[] = [],
): ValidatorResult {
    return { status, diagnostics, partCount: 0, jointCount: 0 };
}

const floatingHorn: ValidatorDiagnostic = {
    code: 'assembly.part.floating',
    severity: 'error',
    message: 'output-horn floats',
    hint: 'add a mate to output-horn',
    partName: 'output-horn',
};

const overConstrainedJaw: ValidatorDiagnostic = {
    code: 'assembly.mate.over-constrained',
    severity: 'error',
    message: 'jaw over-constrained',
    hint: 'remove a redundant mate',
    mateName: 'jaw-coupling',
};

describe('BottomDrawer', () => {
    it('does not render when currentValidity is null', () => {
        const { container } = render(<BottomDrawer />);
        expect(container.firstChild).toBeNull();
    });

    it('does not render when status is solved', () => {
        shellStore.publishValidity(makeResult('solved', []));
        const { container } = render(<BottomDrawer />);
        expect(container.firstChild).toBeNull();
    });

    it('renders when status is error', () => {
        shellStore.publishValidity(makeResult('error', [floatingHorn]));
        const { getByLabelText } = render(<BottomDrawer />);
        expect(getByLabelText('Validity drawer')).toBeDefined();
    });

    it('renders one DiagnosticRow per diagnostic', () => {
        shellStore.publishValidity(
            makeResult('error', [floatingHorn, overConstrainedJaw]),
        );
        const { getByText } = render(<BottomDrawer />);
        expect(getByText('output-horn')).toBeDefined();
        expect(getByText('jaw-coupling')).toBeDefined();
    });

    it('renders for non-solved statuses other than error (e.g. under-constrained)', () => {
        shellStore.publishValidity(makeResult('under-constrained', []));
        const { getByLabelText } = render(<BottomDrawer />);
        expect(getByLabelText('Validity drawer')).toBeDefined();
    });
});
