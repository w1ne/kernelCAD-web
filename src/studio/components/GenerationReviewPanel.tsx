// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState, type JSX } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { AlertTriangle, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import type { Artifact, GenerationPartial } from '../../funnel/lib/generateClient';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { changeSize } from '../agentRunModel';
import type { StagedEdit } from '../store/shellStore';

type PreviewSide = 'before' | 'after';

/**
 * Before/after in the viewer: "After" renders the proposal's script in the
 * viewport without touching the editor source; "Before" (and leaving the
 * review) renders the editor source again.
 */
function useProposalPreview(proposal: string, currentCode: string, render?: (code: string) => unknown) {
    const [side, setSide] = useState<PreviewSide>('before');
    const latest = useRef({ currentCode, side, render });
    useEffect(() => {
        latest.current = { currentCode, side, render };
    });

    useEffect(() => () => {
        // Leaving the review (accept, discard, a new run) while showing the
        // proposal: put the editor's model back in the viewer.
        const { side: shown, render: run, currentCode: code } = latest.current;
        if (shown === 'after') void run?.(code);
    }, []);

    const show = (next: PreviewSide) => {
        if (next === side || !render) return;
        setSide(next);
        void render(next === 'after' ? proposal : currentCode);
    };
    return { side, show };
}

function PreviewToggle({ side, onShow, hasBefore }: {
    side: PreviewSide;
    onShow: (side: PreviewSide) => void;
    hasBefore: boolean;
}): JSX.Element {
    const item = (value: PreviewSide, label: string) => (
        <button
            type="button"
            aria-pressed={side === value}
            onClick={() => onShow(value)}
            className={cx(
                'focus-ring h-control-sm flex-1 rounded-control px-2.5 text-ui transition-colors duration-80 max-md:h-touch',
                side === value ? 'bg-surface-1 font-medium text-fg shadow-e1' : 'text-fg-2 hover:text-fg',
            )}
        >
            {label}
        </button>
    );
    return (
        <div role="group" aria-label="Show in the viewer" className="flex gap-0.5 rounded-control bg-surface-3 p-0.5" data-testid="agent-preview-toggle">
            {item('before', hasBefore ? 'Before' : 'Current')}
            {item('after', 'After')}
        </div>
    );
}

/**
 * The proposed change from an agent run: size, verified or not, before/after
 * in the viewer, the code diff, and Accept / Discard. Never auto-applies.
 * A partial result (best-so-far script after a time/token limit) shows
 * "Not verified" and the server's note instead of "Verified".
 */
export function GenerationReviewPanel({
    artifact,
    partial,
    baseline,
    stagedEdit,
    currentCode = baseline,
    onAccept,
    onReject,
    renderInViewer,
}: {
    artifact: Artifact;
    partial?: GenerationPartial;
    baseline: string;
    stagedEdit: StagedEdit | null;
    /** The editor source now, for "Before" in the viewer. */
    currentCode?: string;
    onAccept: () => void;
    onReject: () => void;
    /** Renders a script in the viewer without changing the editor. */
    renderInViewer?: (code: string) => unknown;
}) {
    const [diffOpen, setDiffOpen] = useState(false);
    const { side, show } = useProposalPreview(artifact.code, currentCode, renderInViewer);

    if (stagedEdit != null) {
        return (
            <div className="rounded-panel border border-warn/40 bg-warn-soft px-3 py-2 text-ui text-fg" role="status">
                Review the current staged edit before staging another proposal.
            </div>
        );
    }
    const size = changeSize(baseline, artifact.code);
    return (
        <section
            aria-label="Proposed change"
            className="flex flex-col gap-3 rounded-panel border border-agent/50 bg-surface-1 p-3"
            data-testid="agent-proposal"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-2xs font-medium uppercase tracking-wider text-agent-fg">Proposed change</p>
                    <p className="mt-0.5 break-words text-ui font-medium text-fg" title={artifact.title}>{artifact.title}</p>
                </div>
                {partial ? (
                    <Badge tone="warn" icon={<AlertTriangle />}><span title={partial.note}>Not verified</span></Badge>
                ) : (
                    <Badge tone="ok" icon={<ShieldCheck />}><span title="Built and passed the kernel checks">Verified</span></Badge>
                )}
            </div>
            <p className="font-mono text-code text-fg-2" data-testid="agent-proposal-size">
                <span className="text-ok">+{size.added}</span>{' '}
                <span className="text-danger">−{size.removed}</span>{' '}
                <span className="font-sans text-fg-3">lines{baseline.trim() ? '' : ' · new model'}</span>
            </p>
            {partial && (
                <p className="rounded-control border border-warn/40 bg-warn-soft px-2 py-1.5 text-ui text-fg" role="status">
                    {partial.note}
                </p>
            )}
            {renderInViewer && (
                <div className="flex flex-col gap-1">
                    <PreviewToggle side={side} onShow={show} hasBefore={baseline.trim().length > 0} />
                    {side === 'after' && (
                        <p className="text-2xs text-fg-3" role="status">The viewer shows the proposal. Your code has not changed.</p>
                    )}
                </div>
            )}
            <div>
                <button
                    type="button"
                    aria-expanded={diffOpen}
                    onClick={() => setDiffOpen((v) => !v)}
                    className="focus-ring flex items-center gap-1 rounded-control text-ui font-medium text-accent hover:text-accent-hover"
                    data-testid="agent-proposal-diff-toggle"
                >
                    <ChevronDown className={cx('size-4 transition-transform duration-80', !diffOpen && '-rotate-90')} strokeWidth={1.75} aria-hidden="true" />
                    {diffOpen ? 'Hide diff' : 'View diff'}
                </button>
                {diffOpen && (
                    <div className="mt-2 overflow-hidden rounded-control border border-border" style={{ height: 240 }}>
                        <DiffEditor
                            original={baseline}
                            modified={artifact.code}
                            language="typescript"
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                renderSideBySide: false,
                                minimap: { enabled: false },
                                fontSize: 12,
                                lineNumbers: 'off',
                                scrollBeyondLastLine: false,
                                renderOverviewRuler: false,
                            }}
                        />
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <Button
                    variant="primary"
                    size="md"
                    onClick={onAccept}
                    className="flex-1 max-md:h-touch"
                    leadingIcon={<Check className="size-4" strokeWidth={1.75} aria-hidden="true" />}
                    data-testid="agent-accept"
                >
                    Accept
                </Button>
                <Button variant="secondary" size="md" onClick={onReject} className="flex-1 max-md:h-touch" data-testid="agent-discard">
                    Discard
                </Button>
            </div>
        </section>
    );
}
