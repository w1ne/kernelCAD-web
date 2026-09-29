// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Check, RotateCcw, X } from 'lucide-react';
import { useShellStore } from './store/useShellStore';
import type { AppliedEditHistoryEntry, StagedEdit } from './store/shellStore';
import { useStagedEditActions } from './hooks/useStagedEditActions';
import { useAutoApplySetting } from './directEdit/autoApply';

// Reads stagedEdit from the shell store. When populated, renders the intent,
// a minimal line-by-line diff, and approve/reject buttons. Always renders the
// auto-apply toggle: on, UI drags apply at once as one undo step; agent
// edits and failed/worse candidates still wait here.
//
// Approve applies stagedEdit.toCode through the shared source-edit commit
// (one undo step, saved to the project or dev file) only if the editor still
// matches the staged baseline. That keeps generated edits from overwriting
// intervening human changes.

function computeLineDiff(from: string, to: string): Array<{ kind: 'context' | 'add' | 'del'; text: string }> {
    // Trivial line diff: walk both, mark non-matching lines as add/del.
    // Doesn't compute longest-common-subsequence; for a single small AST
    // edit this is acceptable. Replace with a real diff lib if multi-hunk
    // edits become common.
    const a = from.split('\n');
    const b = to.split('\n');
    const out: Array<{ kind: 'context' | 'add' | 'del'; text: string }> = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
        const left = a[i];
        const right = b[i];
        if (left === right) {
            if (left !== undefined) out.push({ kind: 'context', text: left });
        } else {
            if (left !== undefined) out.push({ kind: 'del', text: left });
            if (right !== undefined) out.push({ kind: 'add', text: right });
        }
    }
    return out;
}

function DiffCard({ edit }: { edit: StagedEdit }) {
    const lines = computeLineDiff(edit.fromCode, edit.toCode);
    return (
        <div
            data-testid="staged-edit-diff"
            className="rounded border border-border bg-bg overflow-auto max-h-48"
        >
            <pre className="text-2xs leading-snug font-mono p-2 m-0">
                {lines.map((l, i) => (
                    <div
                        key={i}
                        className={
                            l.kind === 'add'
                                ? 'text-emerald-400'
                                : l.kind === 'del'
                                    ? 'text-red-400'
                                    : 'text-fg-3'
                        }
                    >
                        <span className="select-none mr-1">
                            {l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}
                        </span>
                        {l.text}
                    </div>
                ))}
            </pre>
        </div>
    );
}

export function AutoApplyToggle() {
    const [enabled, setEnabled] = useAutoApplySetting();
    return (
        <label
            className="flex items-start gap-2 text-[11px] text-fg leading-snug cursor-pointer"
            data-testid="staged-edit-auto-apply"
        >
            <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="mt-0.5 accent-emerald-600"
            />
            <span>
                Auto-apply UI edits
                <span className="block text-2xs text-fg-3">
                    {enabled
                        ? 'Drags apply at once. Ctrl/Cmd+Z undoes. Agent edits wait for review.'
                        : 'Every edit waits here for review.'}
                </span>
            </span>
        </label>
    );
}

function StagedEditSourceLabel({ edit }: { edit: StagedEdit }) {
    const source = edit.source;
    if (!source?.label) return null;

    return (
        <div className="min-w-0">
            <span className="text-fg-3">Source:</span> {source.kind} · {source.label}
        </div>
    );
}

function StagedEditContextMeta({ context }: { context: NonNullable<StagedEdit['context']> }) {
    const target = context.selectedFeatureId ?? null;
    const workflow = context.repairWorkflow ?? null;

    return (
        <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
            <span className="min-w-0">
                <span className="text-fg-3">Target:</span> {target ?? 'whole model'}
            </span>
            {workflow != null && (
                <span className="min-w-0">
                    <span className="text-fg-3">Workflow:</span> {workflow.promptSource} repair
                </span>
            )}
            {context.generationId && (
                <span className="min-w-0">
                    <span className="text-fg-3">Generation:</span> {context.generationId}
                </span>
            )}
        </div>
    );
}

function StagedEditContextDetails({ edit }: { edit: StagedEdit }) {
    const context = edit.context;
    if (context == null && edit.source?.label == null) return null;

    const prompt = context?.promptText.trim();

    return (
        <div
            className="min-w-0 rounded border border-border bg-bg px-2 py-1.5 text-2xs text-fg-2 space-y-1 break-words"
            data-testid="staged-edit-context"
        >
            <StagedEditSourceLabel edit={edit} />
            {prompt && (
                <div className="line-clamp-2 min-w-0" title={prompt}>
                    <span className="text-fg-3">Prompt:</span> {prompt}
                </div>
            )}
            {context != null && <StagedEditContextMeta context={context} />}
        </div>
    );
}

function AppliedEditHistory({ entries }: { entries: readonly AppliedEditHistoryEntry[] }) {
    if (entries.length === 0) return null;

    return (
        <div
            className="mt-1 border-t border-border pt-2 space-y-1"
            data-testid="applied-edit-history"
            aria-label="Recent staged edit outcomes"
        >
            <div className="uppercase tracking-wide text-2xs text-fg-3">
                Recent edits
            </div>
            {entries.map((entry) => {
                const metadata = formatHistoryMetadata(entry);
                return (
                    <div
                        key={entry.id}
                        className="min-w-0 rounded border border-border bg-bg px-2 py-1.5 text-2xs text-fg-2 space-y-1"
                    >
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-fg">{formatOutcome(entry.outcome)}</span>
                            <span className="font-mono text-emerald-300">
                                +{entry.addedLines} / -{entry.removedLines}
                            </span>
                            {entry.recheckStatus !== 'not-applicable' && (
                                <span className="text-fg-3">{formatRecheckStatus(entry.recheckStatus)}</span>
                            )}
                        </div>
                        <div className="line-clamp-1 text-fg" title={entry.intent}>
                            {entry.intent}
                        </div>
                        {entry.promptText && (
                            <div className="line-clamp-2 break-words text-fg-3">{entry.promptText}</div>
                        )}
                        {metadata.length > 0 && (
                            <div className="line-clamp-1 break-words text-fg-3">
                                {metadata.join(' · ')}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function formatHistoryMetadata(entry: AppliedEditHistoryEntry): string[] {
    const metadata: string[] = [];
    if (entry.sourceLabel) metadata.push(entry.sourceLabel);
    if (entry.selectedFeatureId) metadata.push(entry.selectedFeatureId);
    if (entry.repairPromptSource) metadata.push(`${entry.repairPromptSource} repair`);
    if (entry.generationId) metadata.push(entry.generationId);
    return metadata;
}

function formatOutcome(outcome: AppliedEditHistoryEntry['outcome']): string {
    switch (outcome) {
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        case 'rerun':
            return 'Rerun';
    }
}

function formatRecheckStatus(status: AppliedEditHistoryEntry['recheckStatus']): string {
    switch (status) {
        case 'pending-recheck':
            return 'pending recheck';
        case 'rechecked-solved':
            return 'rechecked solved';
        case 'rechecked-issues':
            return 'rechecked issues';
        case 'recheck-error':
            return 'recheck error';
        case 'not-applicable':
            return '';
    }
}

/** Why the edit waits here: auto-apply refusal, read-only view, failed run. */
function StagedEditNotes({ edit, readOnlyHint }: { edit: StagedEdit; readOnlyHint: string | null }) {
    return (
        <>
            {edit.reviewReason && (
                <div data-testid="staged-edit-review-reason" className="rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-2xs text-amber-200">
                    {edit.reviewReason}
                </div>
            )}
            {readOnlyHint && (
                <div data-testid="staged-edit-read-only" className="text-2xs text-fg-2">
                    {readOnlyHint}
                </div>
            )}
            {edit.evaluation && !edit.evaluation.ok && (
                <div className="rounded border border-red-900 bg-red-950/30 px-2 py-1 text-2xs text-red-300">
                    Candidate failed: {edit.evaluation.error ?? 'unknown error'}
                </div>
            )}
        </>
    );
}

export function StagedEditSlot() {
    const { appliedEditHistory } = useShellStore();
    const {
        stagedEdit,
        approving,
        approveDisabled,
        readOnlyHint,
        visibleStaleWarning,
        handleApprove,
        handleReject,
        handleRerunPrompt,
    } = useStagedEditActions();

    return (
        <div className="p-3 flex flex-col gap-2" data-testid="staged-edit-slot">
            <div className="uppercase tracking-wide text-2xs text-fg-3">
                Staged edits
            </div>

            <AutoApplyToggle />

            {stagedEdit != null && (
                <>
                    <div
                        className="text-[11px] text-fg leading-snug italic"
                        data-testid="staged-edit-intent"
                    >
                        "{stagedEdit.intent}"
                    </div>
                    {stagedEdit.specLabel && (
                        <div data-testid="staged-edit-spec" className="self-start rounded-full border border-violet-900 bg-violet-950/40 px-2 py-0.5 text-2xs text-violet-200">
                            {stagedEdit.specLabel}
                        </div>
                    )}
                    {stagedEdit.validityDelta && (
                        <div data-testid="staged-edit-validity" className="text-2xs text-fg-2">
                            interferences {stagedEdit.validityDelta.fromInterferences} → {stagedEdit.validityDelta.toInterferences}
                            {' · '}Σ volume {stagedEdit.validityDelta.fromVolumeMm3.toFixed(1)} → {stagedEdit.validityDelta.toVolumeMm3.toFixed(1)} mm³
                        </div>
                    )}
                    <StagedEditNotes edit={stagedEdit} readOnlyHint={readOnlyHint} />
                    <StagedEditContextDetails edit={stagedEdit} />
                    <DiffCard edit={stagedEdit} />
                    {visibleStaleWarning != null && (
                        <div
                            className="rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-2xs text-amber-200 space-y-1.5"
                            data-testid="staged-edit-stale-warning"
                            role="alert"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <div>{visibleStaleWarning}</div>
                            {stagedEdit.context?.promptText.trim() && (
                                <button
                                    type="button"
                                    onClick={handleRerunPrompt}
                                    data-testid="staged-edit-rerun-prompt"
                                    className="inline-flex items-center gap-1 rounded border border-amber-700/70 bg-amber-900/30 px-2 py-1 text-2xs text-amber-100 hover:bg-amber-900/50"
                                >
                                    <RotateCcw className="h-3 w-3" /> Rerun prompt
                                </button>
                            )}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleApprove}
                            data-testid="staged-edit-approve"
                            disabled={approveDisabled || approving}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded border border-emerald-700 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60 ${approveDisabled || approving ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            <Check className="h-3 w-3" /> Approve
                        </button>
                        <button
                            type="button"
                            onClick={handleReject}
                            aria-label="Reject staged edit"
                            data-testid="staged-edit-reject"
                            className="px-2 py-1.5 text-[11px] rounded border border-red-900 bg-red-950/40 text-red-300 hover:bg-red-900/60"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </>
            )}
            <AppliedEditHistory entries={appliedEditHistory} />
        </div>
    );
}

export default StagedEditSlot;
