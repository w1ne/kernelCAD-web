// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// First-run coach marks: four short tips that point at the Studio chrome
// (the Agent, the command search, Export and Mark for agent). They show once
// per browser, next to their control, with no backdrop: the model stays
// usable. A tip whose control is not on screen (a narrow header folds
// Export away) is skipped. Esc, Skip or the close button end the tour.
import { useCallback, useEffect, useId, useRef, useState, type JSX, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Kbd, buttonClass, cx } from '../../ui';
import { KEYMAP } from '../../shared/constants/shortcuts';
import { coachMarksPending, isAutomatedBrowser, markCoachMarksSeen } from './firstRun';

export interface CoachStep {
    readonly id: string;
    /** `data-testid` of the control the tip points at. */
    readonly target: string;
    readonly title: string;
    readonly body: ReactNode;
}

export const COACH_STEPS: readonly CoachStep[] = [
    {
        id: 'agent',
        target: 'activity-agent',
        title: 'Describe a part',
        body: 'Open the agent here. It writes the model code and shows you the change before it is applied.',
    },
    {
        id: 'palette',
        target: 'command-palette-trigger',
        title: 'Every command in one search',
        body: <>Press <Kbd keys={KEYMAP.commandPalette} className="align-middle" /> to run, export, open a starter or change the view.</>,
    },
    {
        id: 'export',
        target: 'header-export',
        title: 'Download the part',
        body: 'Export STL in one click. The arrow opens STEP, 3MF and the other formats.',
    },
    {
        id: 'mark',
        target: 'toolbar-mark',
        title: 'Mark for agent',
        body: 'Paint over the model to show the agent exactly what to change.',
    },
];

/** Wait for the chrome to settle before the first tip. */
const SHOW_DELAY_MS = 1200;
/** Re-measure while a tip is open: panes open, the header folds. */
const MEASURE_MS = 400;
const CARD_WIDTH = 288;
const GAP = 10;
const EDGE = 12;

interface Box { readonly top: number; readonly left: number; readonly width: number; readonly height: number }

function targetBox(testId: string): Box | null {
    const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (!el || el.getClientRects().length === 0) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) return null;
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** A modal (the palette, a dialog) is open: the tour waits behind it. */
function modalOpen(): boolean {
    return document.querySelector('[aria-modal="true"]') !== null;
}

/** Where the card goes: right of a control on the left rail, else below
 *  it (above when there is no room), kept inside the window. */
export function placeCard(target: Box, view: { width: number; height: number }, cardHeight: number): { top: number; left: number } {
    const width = Math.min(CARD_WIDTH, view.width - 2 * EDGE);
    const clampLeft = (x: number) => Math.max(EDGE, Math.min(x, view.width - width - EDGE));
    const clampTop = (y: number) => Math.max(EDGE, Math.min(y, view.height - cardHeight - EDGE));
    const onLeftRail = target.left + target.width < 96 && target.left + target.width + GAP + width + EDGE <= view.width;
    if (onLeftRail) {
        return { top: clampTop(target.top), left: target.left + target.width + GAP };
    }
    const below = target.top + target.height + GAP;
    const top = below + cardHeight + EDGE <= view.height ? below : target.top - GAP - cardHeight;
    return { top: clampTop(top), left: clampLeft(target.left + target.width / 2 - width / 2) };
}

/** The steps whose control is on screen now. */
function visibleSteps(steps: readonly CoachStep[]): CoachStep[] {
    return steps.filter((s) => targetBox(s.target) !== null);
}

export interface CoachMarksProps {
    /** The Studio is ready to be looked at (the chrome is mounted). */
    readonly ready: boolean;
    readonly steps?: readonly CoachStep[];
}

export function CoachMarks({ ready, steps = COACH_STEPS }: CoachMarksProps): JSX.Element | null {
    const [tour, setTour] = useState<CoachStep[] | null>(null);
    const [index, setIndex] = useState(0);
    const [box, setBox] = useState<Box | null>(null);
    const [hidden, setHidden] = useState(false);
    const [cardHeight, setCardHeight] = useState(140);
    const cardRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const bodyId = useId();

    // Start once: the first time this browser opens a ready Studio.
    useEffect(() => {
        if (!ready || tour !== null || isAutomatedBrowser() || !coachMarksPending()) return;
        const t = window.setTimeout(() => {
            const shown = visibleSteps(steps);
            if (shown.length === 0) return;
            markCoachMarksSeen();
            setTour(shown);
        }, SHOW_DELAY_MS);
        return () => window.clearTimeout(t);
    }, [ready, tour, steps]);

    const step = tour?.[index] ?? null;
    const done = useCallback(() => setTour([]), []);

    // Follow the control: the layout moves when panes open or the window resizes.
    useEffect(() => {
        if (!step) return;
        const measure = () => {
            setBox(targetBox(step.target));
            setHidden(modalOpen());
            if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
        };
        measure();
        const timer = window.setInterval(measure, MEASURE_MS);
        window.addEventListener('resize', measure);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('resize', measure);
        };
    }, [step]);

    useEffect(() => {
        if (!step) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || modalOpen()) return;
            const active = document.activeElement;
            // Esc in the editor or a field belongs to them, not to the tour.
            if (active && active !== document.body && !cardRef.current?.contains(active)) return;
            done();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [step, done]);

    if (!tour || !step || !box || hidden) return null;

    const last = index === tour.length - 1;
    const view = { width: window.innerWidth, height: window.innerHeight };
    const pos = placeCard(box, view, cardHeight);
    const next = () => (last ? done() : setIndex(index + 1));

    return (
        <>
            <div
                aria-hidden="true"
                data-testid="coach-mark-ring"
                className="pointer-events-none fixed z-[1010] rounded-panel ring-2 ring-accent ring-offset-2 ring-offset-bg transition-all duration-160"
                style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
            />
            <div
                key={step.id}
                ref={cardRef}
                role="dialog"
                aria-modal="false"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                data-testid="coach-mark"
                data-step={step.id}
                className="pointer-events-auto fixed z-[1010] flex flex-col gap-2 rounded-panel border border-border-strong bg-surface-1 p-3 text-fg shadow-e2 motion-safe:animate-pop-in"
                style={{ top: pos.top, left: pos.left, width: Math.min(CARD_WIDTH, view.width - 2 * EDGE) }}
            >
                <div className="flex items-start gap-2">
                    <p id={titleId} className="min-w-0 flex-1 text-ui font-semibold text-fg">{step.title}</p>
                    <button
                        type="button"
                        onClick={done}
                        aria-label="Close tips"
                        className={cx(buttonClass('ghost', 'sm'), '-mr-1 -mt-1 size-control-sm shrink-0 px-0 max-md:size-touch')}
                    >
                        <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                </div>
                <p id={bodyId} className="text-ui text-fg-2">{step.body}</p>
                <div className="mt-1 flex items-center gap-2">
                    <span className="flex-1 text-2xs text-fg-3" aria-live="polite">Tip {index + 1} of {tour.length}</span>
                    {!last && (
                        <button type="button" onClick={done} className={cx(buttonClass('ghost', 'sm'), 'max-md:h-touch')}>Skip</button>
                    )}
                    <button
                        type="button"
                        onClick={next}
                        // Keep the keyboard in the tour once the user moves through it.
                        autoFocus={index > 0}
                        className={cx(buttonClass('primary', 'sm'), 'max-md:h-touch max-md:px-4')}
                    >
                        {last ? 'Done' : 'Next'}
                    </button>
                </div>
            </div>
        </>
    );
}
