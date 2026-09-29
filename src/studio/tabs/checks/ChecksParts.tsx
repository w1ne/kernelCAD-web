// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, ReactNode } from 'react';
import { Crosshair, RefreshCw, Sparkles } from 'lucide-react';
import { Badge, Button, type BadgeTone } from '../../../ui';
import type { ValidatorDiagnostic } from '../../../modeling/mates/validator';
import {
    CHECK_CATEGORY_LABEL,
    describeCounts,
    type CheckGroup,
    type ChecksCounts,
    type InterferenceFinding,
} from '../../logic/checksModel';
import { SeverityIcon } from './SeverityIcon';
import { CopyPromptButton } from './SuggestionCard';
import { diagnosticTargetLabel } from './repairWorkflow';

/** A titled block of the Checks tab. */
export function ChecksSection({
    title,
    aside,
    children,
    testId,
}: {
    title: string;
    aside?: ReactNode;
    children: ReactNode;
    testId?: string;
}): JSX.Element {
    return (
        <section className="flex flex-col gap-2" data-testid={testId}>
            <div className="flex items-baseline justify-between gap-2 px-3">
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-fg-3">{title}</h3>
                {aside}
            </div>
            {children}
        </section>
    );
}

export interface ChecksSummaryProps {
    readonly verdict: string;
    readonly verdictLabel: string;
    readonly tone: BadgeTone;
    readonly color: string;
    readonly validated: boolean;
    readonly counts: ChecksCounts;
    readonly partCount: number;
    readonly jointCount: number;
    readonly diagnosticCount: number;
    readonly onRun?: () => void;
    readonly running: boolean;
}

/** Verdict, finding counts, model counts and the re-run action. */
export function ChecksSummary(p: ChecksSummaryProps): JSX.Element {
    const findings = describeCounts(p.counts);
    const headline = !p.validated ? 'Not checked yet' : findings ?? 'All checks passed';
    return (
        <div className="flex flex-col gap-3 border-b border-border px-3 pb-3 pt-3">
            <div className="flex items-start gap-2">
                <SeverityIcon
                    severity={!p.validated ? 'info' : p.counts.errors > 0 ? 'error' : p.counts.warnings > 0 ? 'warning' : 'ok'}
                    className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-ui font-medium text-fg" data-testid="checks-headline">
                        {headline}
                    </p>
                    <p className="mt-0.5 text-2xs text-fg-3" data-testid="validity-counts">
                        {p.partCount} parts · {p.jointCount} joints · {p.diagnosticCount} diagnostics
                    </p>
                </div>
                <span
                    data-testid="validity-chip"
                    data-status={p.verdict}
                    data-validated={p.validated ? 'true' : 'false'}
                    data-color={p.color}
                >
                    <Badge tone={p.tone}>{p.verdictLabel}</Badge>
                </span>
            </div>
            {!p.validated && (
                <p className="text-ui text-fg-2" data-testid="validity-not-run-notice">
                    No validation has run for this model yet. The counts are what the model declares, not what was
                    checked.
                </p>
            )}
            {p.onRun != null && (
                <div>
                    <Button
                        size="sm"
                        variant={p.validated ? 'ghost' : 'primary'}
                        loading={p.running}
                        onClick={p.onRun}
                        leadingIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                        data-testid="checks-run"
                    >
                        {p.validated ? 'Run checks again' : 'Run checks'}
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * Physics-grounded loop banner (P1 surface convergence): shown first when the
 * recompute's mechanism verdict is broken, one entry per failing criterion
 * with its repair hint.
 *
 * Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md
 */
export function MechanismBanner({
    entries,
}: {
    entries: ReadonlyArray<{ code: string; message: string; hint: string }>;
}): JSX.Element {
    return (
        <div className="mx-3 rounded-panel border border-danger/40 bg-danger-soft p-3" data-testid="mechanism-banner" role="alert">
            <div className="flex items-center gap-2">
                <SeverityIcon severity="error" />
                <span className="text-ui font-semibold text-danger">Mechanism broken</span>
            </div>
            <p className="mt-0.5 pl-6 text-2xs text-fg-2">This assembly will not work as built.</p>
            <ul className="mt-2 flex flex-col gap-2 pl-6" data-testid="mechanism-banner-entries">
                {entries.map((entry, i) => (
                    <li key={`${entry.code}-${i}`} className="text-ui" data-testid="mechanism-banner-entry" data-code={entry.code}>
                        <p className="text-fg">{entry.message || entry.code}</p>
                        <p className="font-mono text-2xs text-fg-3">{entry.code}</p>
                        {entry.hint && (
                            <p className="mt-0.5 text-fg-2">
                                <span className="font-medium">Fix: </span>
                                {entry.hint}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export interface FindingActions {
    readonly onSelect: (d: ValidatorDiagnostic) => void;
    /** Drafts the agent repair for a diagnostic; null when it has no fix hint. */
    readonly fixFor: (d: ValidatorDiagnostic) => { fix: () => void; prompt: string } | null;
}

/** All findings, grouped by category (worst group first). */
export function FindingsList({ groups, actions }: { groups: readonly CheckGroup[]; actions: FindingActions }): JSX.Element {
    return (
        <div className="flex flex-col gap-3" data-testid="validity-diagnostics">
            {groups.map((group) => (
                <div key={group.category} data-testid="checks-group" data-category={group.category}>
                    <h4 className="px-3 pb-1 text-2xs font-medium text-fg-2">
                        {CHECK_CATEGORY_LABEL[group.category]}
                        <span className="ml-1 text-fg-3">{group.diagnostics.length}</span>
                    </h4>
                    <ul className="flex flex-col">
                        {group.diagnostics.map((d, i) => (
                            <FindingRow key={`${d.code}-${i}`} diagnostic={d} actions={actions} />
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

function FindingRow({ diagnostic, actions }: { diagnostic: ValidatorDiagnostic; actions: FindingActions }): JSX.Element {
    const target = diagnosticTargetLabel(diagnostic);
    const fix = diagnostic.hint ? actions.fixFor(diagnostic) : null;
    return (
        <li className="border-t border-border first:border-t-0" data-severity={diagnostic.severity}>
            <button
                type="button"
                onClick={() => actions.onSelect(diagnostic)}
                className="focus-ring flex w-full items-start gap-2 px-3 pb-1 pt-2 text-left transition-colors duration-80 hover:bg-surface-2"
                data-testid="diagnostic-row"
                data-code={diagnostic.code}
                title={target != null ? `Show ${target} in the model` : undefined}
            >
                <SeverityIcon severity={diagnostic.severity} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                    <span className="block text-ui text-fg">{diagnostic.message || diagnostic.code}</span>
                    <span className="mt-0.5 block truncate font-mono text-2xs text-fg-3">
                        {diagnostic.code}
                        {target != null && <span className="font-sans text-fg-2"> · {target}</span>}
                    </span>
                </span>
            </button>
            <div className="flex flex-col gap-1.5 pb-2 pl-9 pr-3">
                {diagnostic.hint && (
                    <p className="text-ui text-fg-2" data-testid="diagnostic-hint">
                        <span className="font-medium">Fix: </span>
                        {diagnostic.hint}
                    </p>
                )}
                {fix != null && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-agent-fg"
                            aria-label={`Fix ${diagnostic.code} with agent`}
                            leadingIcon={<Sparkles className="size-3.5" aria-hidden="true" />}
                            onClick={fix.fix}
                        >
                            Fix with agent
                        </Button>
                        <CopyPromptButton text={fix.prompt} />
                    </div>
                )}
            </div>
        </li>
    );
}

/** Interfering part pairs the validator did not already report. */
export function InterferenceList({
    pairs,
    onShow,
}: {
    pairs: readonly InterferenceFinding[];
    onShow: (pair: InterferenceFinding) => void;
}): JSX.Element {
    return (
        <ul className="flex flex-col" data-testid="checks-interferences">
            {pairs.map((pair) => (
                <li key={`${pair.a}|${pair.b}`} className="border-t border-border first:border-t-0">
                    <button
                        type="button"
                        onClick={() => onShow(pair)}
                        className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-80 hover:bg-surface-2"
                        data-testid="checks-interference-row"
                    >
                        <SeverityIcon severity="warning" />
                        <span className="min-w-0 flex-1 truncate text-ui text-fg">
                            {pair.a} ↔ {pair.b}
                        </span>
                        <span className="shrink-0 font-mono text-2xs text-fg-2">{formatVolume(pair.volumeMm3)}</span>
                        <Crosshair className="size-3.5 shrink-0 text-fg-3" aria-hidden="true" />
                    </button>
                </li>
            ))}
        </ul>
    );
}

function formatVolume(mm3: number): string {
    return `${mm3 >= 100 ? Math.round(mm3) : mm3.toFixed(1)} mm³`;
}
