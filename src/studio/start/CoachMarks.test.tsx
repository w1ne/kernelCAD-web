// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachMarks, COACH_STEPS, placeCard } from './CoachMarks';
import { COACH_MARKS_KEY } from './firstRun';

/** A control of the chrome, laid out at `rect` (jsdom has no layout). */
function addTarget(testId: string, rect = { top: 50, left: 0, width: 44, height: 44 }): HTMLElement {
    const el = document.createElement('button');
    el.dataset.testid = testId;
    el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) });
    el.getClientRects = () => [el.getBoundingClientRect()] as unknown as DOMRectList;
    document.body.appendChild(el);
    return el;
}

function startTour(): void {
    render(<CoachMarks ready />);
    act(() => { vi.advanceTimersByTime(1500); });
}

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.body.innerHTML = '';
});

describe('CoachMarks', () => {
    it('walks through the tips for the controls on screen, once per browser', () => {
        for (const s of COACH_STEPS) addTarget(s.target);
        startTour();
        expect(screen.getByRole('dialog', { name: 'Describe a part' })).toBeTruthy();
        expect(screen.getByText('Tip 1 of 4')).toBeTruthy();
        expect(localStorage.getItem(COACH_MARKS_KEY)).toBe('done');

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('dialog', { name: 'Every command in one search' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('dialog', { name: 'Mark for agent' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(screen.queryByTestId('coach-mark')).toBeNull();

        cleanup();
        startTour();
        expect(screen.queryByTestId('coach-mark')).toBeNull();
    });

    it('skips a tip whose control is not on screen', () => {
        addTarget('activity-agent');
        addTarget('toolbar-mark', { top: 12, left: 400, width: 32, height: 32 });
        startTour();
        expect(screen.getByText('Tip 1 of 2')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('dialog', { name: 'Mark for agent' })).toBeTruthy();
    });

    it('closes on Esc, Skip and the close button', () => {
        for (const s of COACH_STEPS) addTarget(s.target);
        startTour();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByTestId('coach-mark')).toBeNull();

        for (const name of ['Skip', 'Close tips']) {
            cleanup();
            localStorage.clear();
            startTour();
            fireEvent.click(screen.getByRole('button', { name }));
            expect(screen.queryByTestId('coach-mark')).toBeNull();
        }
    });

    it('leaves Esc to the editor or a field that has focus', () => {
        for (const s of COACH_STEPS) addTarget(s.target);
        const field = document.createElement('input');
        document.body.appendChild(field);
        startTour();
        field.focus();
        fireEvent.keyDown(field, { key: 'Escape' });
        expect(screen.getByTestId('coach-mark')).toBeTruthy();
    });

    it('waits behind an open modal', () => {
        for (const s of COACH_STEPS) addTarget(s.target);
        startTour();
        const modal = document.createElement('div');
        modal.setAttribute('aria-modal', 'true');
        document.body.appendChild(modal);
        act(() => { vi.advanceTimersByTime(500); });
        expect(screen.queryByTestId('coach-mark')).toBeNull();
        modal.remove();
        act(() => { vi.advanceTimersByTime(500); });
        expect(screen.getByTestId('coach-mark')).toBeTruthy();
    });

    it('does not show in an automated browser, before the Studio is ready, or with no controls', () => {
        for (const s of COACH_STEPS) addTarget(s.target);
        Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => true });
        startTour();
        expect(screen.queryByTestId('coach-mark')).toBeNull();
        cleanup();

        Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false });
        render(<CoachMarks ready={false} />);
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.queryByTestId('coach-mark')).toBeNull();
        cleanup();

        document.body.innerHTML = '';
        startTour();
        expect(screen.queryByTestId('coach-mark')).toBeNull();
        // Nothing was shown, so the tour is still pending for a later visit.
        expect(localStorage.getItem(COACH_MARKS_KEY)).toBeNull();
    });
});

describe('placeCard', () => {
    const view = { width: 1440, height: 900 };

    it('puts the card right of a left-rail control', () => {
        expect(placeCard({ top: 50, left: 0, width: 44, height: 44 }, view, 140)).toEqual({ top: 50, left: 54 });
    });

    it('puts the card below a header control, inside the window', () => {
        const pos = placeCard({ top: 6, left: 1300, width: 140, height: 32 }, view, 140);
        expect(pos.top).toBe(48);
        expect(pos.left + 288).toBeLessThanOrEqual(1440 - 12);
    });

    it('flips above when there is no room below', () => {
        expect(placeCard({ top: 820, left: 600, width: 40, height: 40 }, view, 140).top).toBe(820 - 10 - 140);
    });

    it('fits a phone width', () => {
        const pos = placeCard({ top: 60, left: 200, width: 44, height: 44 }, { width: 390, height: 844 }, 160);
        expect(pos.left).toBeGreaterThanOrEqual(12);
        expect(pos.left + 288).toBeLessThanOrEqual(390 - 12);
    });
});
