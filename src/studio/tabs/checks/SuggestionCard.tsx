// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, type JSX, type MouseEvent } from 'react';
import { Check, Copy, Crosshair, Sparkles } from 'lucide-react';
import { Badge, Button, IconButton, type BadgeTone } from '../../../ui';
import type { ValiditySuggestionCard } from '../../adapters/validitySuggestions';
import { copyPrompt, draftRepair } from './draftRepair';
import type { SuggestionWorkflowState, WorkflowSummaryState } from './repairWorkflow';
import { SeverityIcon } from './SeverityIcon';

/** One suggested fix: what is wrong, what to do, and a repair prompt for the agent. */
export function SuggestionCard({
    card,
    workflowState,
    validityFingerprint,
    onSelect,
}: {
    card: ValiditySuggestionCard;
    workflowState: SuggestionWorkflowState | null;
    validityFingerprint: string;
    onSelect?: () => void;
}): JSX.Element {
    const fix = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        draftRepair(card, validityFingerprint, onSelect);
    };

    return (
        <div
            className="rounded-panel border border-border bg-surface-2 p-3 text-left"
            data-testid="validity-suggestion-card"
            data-code={card.code}
            data-kind={card.kind}
            data-prompt-source={card.promptSource}
            data-workflow-state={workflowState ?? undefined}
        >
            <div className="flex items-start gap-2">
                <SeverityIcon severity={card.severity} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-ui font-medium text-fg">{card.title}</span>
                        {card.diagnosticCount > 1 && (
                            <span data-testid="validity-suggestion-count" className="text-2xs text-fg-3">
                                {card.diagnosticCount} findings
                            </span>
                        )}
                        {workflowState != null && <WorkflowBadge state={workflowState} />}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-2xs text-fg-3" title={card.code}>
                        {card.code}
                        {card.targetLabel != null && <span> · {card.targetLabel}</span>}
                    </div>
                </div>
            </div>
            <p className="mt-2 text-ui text-fg-2">{card.evidence}</p>
            <p className="mt-1 text-ui text-fg">
                <span className="font-medium text-fg-2">Fix: </span>
                {card.action}
            </p>
            {card.repairEvidence != null && <RepairEvidenceBlock repairEvidence={card.repairEvidence} />}
            <details className="group mt-2" data-testid="validity-suggestion-prompt-preview">
                <summary className="focus-ring cursor-pointer select-none rounded-control text-2xs font-medium text-fg-3 hover:text-fg-2">
                    {card.promptSource === 'review' ? 'Review prompt' : 'Fallback prompt'}
                </summary>
                <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-control border border-border bg-surface-1 px-2 py-1.5 font-mono text-2xs text-fg-2">
                    {card.promptText}
                </p>
            </details>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="agent" size="sm" leadingIcon={<Sparkles className="size-3.5" aria-hidden="true" />} onClick={fix}>
                    Fix with agent
                </Button>
                {onSelect != null && (
                    <Button variant="ghost" size="sm" leadingIcon={<Crosshair className="size-3.5" aria-hidden="true" />} onClick={onSelect}>
                        Show in model
                    </Button>
                )}
                <CopyPromptButton text={card.promptText} className="ml-auto" />
            </div>
        </div>
    );
}

/** Copies a repair prompt, for an agent outside the Studio. */
export function CopyPromptButton({ text, className }: { text: string; className?: string }): JSX.Element {
    const [copied, setCopied] = useState(false);
    return (
        <IconButton
            size="sm"
            className={className}
            label={copied ? 'Copied' : 'Copy repair prompt'}
            icon={copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
            onClick={(event) => {
                event.stopPropagation();
                void copyPrompt(text).then((ok) => {
                    if (!ok) return;
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                });
            }}
        />
    );
}

const WORKFLOW_TONE: Record<SuggestionWorkflowState, BadgeTone> = {
    drafted: 'agent',
    running: 'warn',
    'still-failing': 'danger',
};

function WorkflowBadge({ state }: { state: SuggestionWorkflowState }): JSX.Element {
    const label =
        state === 'still-failing' ? 'Rechecked · Still failing' : state === 'running' ? 'Running' : 'Drafted';
    return (
        <span data-testid="validity-suggestion-workflow-badge">
            <Badge tone={WORKFLOW_TONE[state]}>{label}</Badge>
        </span>
    );
}

export function WorkflowSummary({ summary }: { summary: { state: WorkflowSummaryState; code: string } }): JSX.Element {
    const fixed = summary.state === 'fixed';
    return (
        <div
            role="status"
            className={`flex items-center gap-2 rounded-panel px-3 py-2 text-ui ${fixed ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}
            data-testid="validity-suggestion-workflow-summary"
            data-workflow-state={summary.state}
        >
            <SeverityIcon severity={fixed ? 'ok' : 'error'} />
            <span>
                Rechecked · {fixed ? 'Fixed' : 'Still failing'} <span className="font-mono text-2xs">{summary.code}</span>
            </span>
        </div>
    );
}

function RepairEvidenceBlock({
    repairEvidence,
}: {
    repairEvidence: NonNullable<ValiditySuggestionCard['repairEvidence']>;
}): JSX.Element {
    return (
        <div
            className="mt-2 rounded-control border border-border bg-warn-soft px-2 py-1.5 text-2xs text-fg"
            data-testid="validity-suggestion-repair-evidence"
        >
            {repairEvidence.repairMode != null && <div className="text-warn">Repair mode: {repairEvidence.repairMode}</div>}
            {repairEvidence.blockingReasons.slice(0, 2).map((reason, index) => (
                <div key={`${reason.code}-${reason.message}-${index}`} className="mt-0.5">
                    {reason.code !== '' && <span className="font-mono text-warn">{reason.code}</span>}
                    {reason.message !== '' && <span className="ml-1">{reason.message}</span>}
                    {reason.repairHint !== '' && <span className="ml-1 text-fg-2">Hint: {reason.repairHint}</span>}
                </div>
            ))}
        </div>
    );
}
