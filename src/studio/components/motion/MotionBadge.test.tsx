// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { MechanismVerdictSummary } from '../../../modeling/runtime/mechanismVerdict';
import { MotionBadge } from './MotionBadge';
import { brokenRowReasons, motionBadgeModel } from './motionBadgeModel';

const REAL: MechanismVerdictSummary = {
    verdict: 'real',
    maxLevel: 'ok',
    statement: 'Motion checked: 7 poses across 3 joints (each joint at its limits), no collisions. Gravity not checked.',
    checked: ['7 poses across 3 joints (each joint at its limits)', 'no collisions'],
    skipped: [],
    failures: [],
};
const UNVERIFIED: MechanismVerdictSummary = {
    verdict: 'unverified',
    maxLevel: 'warning',
    statement: 'Motion not checked: collision sweep across the joint travel skipped: work 600 is over the budget 300. Do not call this mechanism working.',
    checked: [],
    skipped: ['collision sweep across the joint travel skipped: work 600 is over the budget 300'],
    failures: [],
};
const BROKEN: MechanismVerdictSummary = {
    verdict: 'broken',
    maxLevel: 'error',
    statement: "Mechanism broken: Param 'shoulderDeg' is animated and turns part 'link' ...",
    checked: [],
    skipped: [],
    failures: [{ code: 'mechanism.motion-on-fixed-joint', reason: "Param 'shoulderDeg' is animated and turns part 'link', but 'shoulder' is fastened.", joint: 'shoulder', part: 'link' }],
};

afterEach(cleanup);

describe('motionBadgeModel', () => {
    it('maps each verdict to its label and tone', () => {
        expect(motionBadgeModel(REAL)).toMatchObject({ label: 'Motion checked', tone: 'ok' });
        expect(motionBadgeModel(UNVERIFIED)).toMatchObject({ label: 'Motion not checked', tone: 'neutral' });
        expect(motionBadgeModel(BROKEN)).toMatchObject({ label: 'Mechanism broken', tone: 'danger' });
    });

    it('shows no badge for a static model', () => {
        expect(motionBadgeModel(undefined)).toBeNull();
    });

    it('says what ran, what was skipped, or which joint fails, once each', () => {
        expect(motionBadgeModel(REAL)).toMatchObject({ statement: REAL.statement, lines: [] });
        expect(motionBadgeModel({ ...REAL, skipped: ["joint 'a' offset has no limits, range not checked", "joint 'b' rotation has no limits, range not checked"] })!.lines)
            .toEqual(["Also not checked: joint 'b' rotation has no limits, range not checked"]);
        expect(motionBadgeModel(UNVERIFIED)!.statement).toMatch(/^Motion not checked: collision sweep/);
        expect(motionBadgeModel({ ...UNVERIFIED, skipped: ['a', 'b'] })!.lines).toEqual(['Also skipped: b']);
        expect(motionBadgeModel(BROKEN)).toMatchObject({ statement: 'Mechanism broken: 1 failure' });
        expect(motionBadgeModel(BROKEN)!.lines[0]).toMatch(/^Joint 'shoulder': /);
    });

    it('marks the failing joint and part rows with the reason', () => {
        const rows = brokenRowReasons(BROKEN);
        expect(rows.get('shoulder')).toMatch(/fastened/);
        expect(rows.get('link')).toMatch(/fastened/);
        expect(brokenRowReasons(REAL).size).toBe(0);
    });
});

describe('MotionBadge', () => {
    it('renders nothing without a verdict', () => {
        const { container } = render(<MotionBadge summary={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the neutral "Motion not checked" badge with the skipped check in its tooltip', async () => {
        render(<MotionBadge summary={UNVERIFIED} />);
        const badge = screen.getByTestId('motion-badge');
        expect(badge).toHaveAttribute('data-verdict', 'unverified');
        expect(badge).toHaveTextContent('Motion not checked');
        expect(badge.querySelector('[data-tone]')).toHaveAttribute('data-tone', 'neutral');
        await userEvent.tab();
        expect(badge).toHaveFocus();
        expect(await screen.findByRole('tooltip')).toHaveTextContent(/Motion not checked: collision sweep/);
    });

    it('renders the red "Mechanism broken" badge', () => {
        render(<MotionBadge summary={BROKEN} />);
        const badge = screen.getByTestId('motion-badge');
        expect(badge).toHaveTextContent('Mechanism broken');
        expect(badge.querySelector('[data-tone]')).toHaveAttribute('data-tone', 'danger');
    });
});
