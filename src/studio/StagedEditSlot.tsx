// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useShellStore, shellStore } from './store/useShellStore';
import { useWorkbench } from './context/WorkbenchContext';
import type { StagedEdit } from './store/shellStore';

// Slice 1.5: real body. Reads stagedEdit from the shell store. When
// populated, renders the intent, a minimal line-by-line diff, and
// approve/reject buttons. When empty, renders the auto-apply placeholder.
//
// Approve writes stagedEdit.toCode through workbench.setCode only if the
// editor still matches the staged baseline. That keeps generated edits from
// overwriting intervening human changes.

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
            className="rounded border border-[#2a2e38] bg-[#0d0d0d] overflow-auto max-h-48"
        >
            <pre className="text-[10px] leading-snug font-mono p-2 m-0">
                {lines.map((l, i) => (
                    <div
                        key={i}
                        className={
                            l.kind === 'add'
                                ? 'text-emerald-400'
                                : l.kind === 'del'
                                    ? 'text-red-400'
                                    : 'text-gray-500'
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

function PlaceholderBody() {
    return (
        <>
            <p className="text-xs text-gray-300 leading-snug">
                Auto-apply mode · toggle off to enable review
            </p>
            <button
                type="button"
                disabled
                aria-disabled="true"
                className="self-start px-2 py-1 text-[11px] rounded border border-[#3a3a3a] bg-[#222] text-gray-500 cursor-not-allowed"
            >
                Review edits
            </button>
        </>
    );
}

export function StagedEditSlot() {
    const { stagedEdit } = useShellStore();
    const { code, setCode } = useWorkbench();
    const [staleWarning, setStaleWarning] = useState<{ editId: string; message: string } | null>(null);
    const visibleStaleWarning =
        stagedEdit != null && staleWarning?.editId === stagedEdit.id
            ? staleWarning.message
            : null;

    const handleApprove = useCallback(() => {
        if (stagedEdit == null) return;
        if (code !== stagedEdit.fromCode) {
            setStaleWarning({
                editId: stagedEdit.id,
                message: 'The editor changed since this edit was staged. Review the current code before applying this proposal.',
            });
            return;
        }
        setCode(stagedEdit.toCode);
        shellStore.clearStagedEdit();
    }, [code, stagedEdit, setCode]);

    const handleReject = useCallback(() => {
        setStaleWarning(null);
        shellStore.clearStagedEdit();
    }, []);

    return (
        <div className="p-3 flex flex-col gap-2" data-testid="staged-edit-slot">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">
                Staged edits
            </div>

            {stagedEdit == null ? (
                <PlaceholderBody />
            ) : (
                <>
                    <div
                        className="text-[11px] text-gray-200 leading-snug italic"
                        data-testid="staged-edit-intent"
                    >
                        "{stagedEdit.intent}"
                    </div>
                    <DiffCard edit={stagedEdit} />
                    {stagedEdit.source?.label && (
                        <div className="text-[10px] text-gray-500">
                            {stagedEdit.source.kind} · {stagedEdit.source.label}
                        </div>
                    )}
                    {visibleStaleWarning != null && (
                        <div
                            className="rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-[10px] text-amber-200"
                            data-testid="staged-edit-stale-warning"
                        >
                            {visibleStaleWarning}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleApprove}
                            data-testid="staged-edit-approve"
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded border border-emerald-700 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60"
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
        </div>
    );
}

export default StagedEditSlot;
