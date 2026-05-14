// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ValidityDeltaHeader } from '../ValidityDeltaHeader';
import type { ValidatorDiagnostic, ValidatorResult } from '../../lib/mates/validator';

afterEach(() => {
    cleanup();
});

function result(
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

describe('ValidityDeltaHeader', () => {
    it('null prev → renders the unconditional "now" line with diagnostic count', () => {
        const { getByText } = render(
            <ValidityDeltaHeader prev={null} curr={result('error', [floatingHorn])} />,
        );
        expect(getByText('now: error · 1 diagnostics')).toBeDefined();
    });

    it('solved → solved renders 0 new / 0 cleared', () => {
        const { getByText } = render(
            <ValidityDeltaHeader prev={result('solved', [])} curr={result('solved', [])} />,
        );
        expect(
            getByText('was: solved → now: solved · +0 new · 0 cleared'),
        ).toBeDefined();
    });

    it('solved → error with +2 new', () => {
        const { getByText } = render(
            <ValidityDeltaHeader
                prev={result('solved', [])}
                curr={result('error', [floatingHorn, overConstrainedJaw])}
            />,
        );
        expect(
            getByText('was: solved → now: error · +2 new · 0 cleared'),
        ).toBeDefined();
    });

    it('error → solved with 2 cleared', () => {
        const { getByText } = render(
            <ValidityDeltaHeader
                prev={result('error', [floatingHorn, overConstrainedJaw])}
                curr={result('solved', [])}
            />,
        );
        expect(
            getByText('was: error → now: solved · +0 new · 2 cleared'),
        ).toBeDefined();
    });
});
