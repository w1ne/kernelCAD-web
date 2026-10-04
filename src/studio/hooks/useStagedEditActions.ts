// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { StagedEdit } from '../store/shellStore';
import { useShellStore, shellStore } from '../store/useShellStore';
import { useWorkbench } from '../context/WorkbenchContext';
import { useSourceEditCommit } from '../directEdit/useSourceEditCommit';

const STALE_EDIT_MESSAGE =
    'The editor changed since this edit was staged. Review the current code before applying this proposal.';
const SAVE_FAILED_NOTICE = 'Save failed; the edit is still staged.';

/** Clear only our own failure notice — never clobber an unrelated status. */
function clearSaveFailureNotice(): void {
    if (shellStore.getSnapshot().directEditNotice === SAVE_FAILED_NOTICE) {
        shellStore.setDirectEditNotice(null);
    }
}

/**
 * Re-checked after the async file save (script target) and before the apply:
 * the slot may hold a newer proposal, or the editor may have moved. The
 * watcher bridge may echo the bytes we just PUT back into the editor; that
 * exact value is our save succeeding, not an intervening edit — treat it as
 * fresh.
 */
function freshnessCheck(
    edit: StagedEdit,
    codeRef: RefObject<string>,
    onStale: () => void,
): () => boolean {
    return () => {
        const currentEdit = shellStore.getSnapshot().stagedEdit;
        if (currentEdit == null || currentEdit.id !== edit.id) return false;
        if (codeRef.current !== edit.fromCode && codeRef.current !== edit.toCode) {
            onStale();
            return false;
        }
        return true;
    };
}

export function useStagedEditActions() {
    const { stagedEdit } = useShellStore();
    const { code } = useWorkbench();
    const { target, commit } = useSourceEditCommit();
    const [staleWarning, setStaleWarning] = useState<{ editId: string; message: string } | null>(null);
    const [approving, setApproving] = useState(false);
    const approvingRef = useRef(false);
    const codeRef = useRef(code);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);
    const visibleStaleWarning =
        stagedEdit != null && staleWarning?.editId === stagedEdit.id
            ? staleWarning.message
            : null;
    const readOnlyHint = target.kind === 'readOnly' ? target.hint : null;
    const approveDisabled = stagedEdit?.evaluation?.ok === false || readOnlyHint !== null;
    const handleApprove = useCallback(async () => {
        if (stagedEdit == null) return;
        if (approvingRef.current) return;
        if (code !== stagedEdit.fromCode) {
            setStaleWarning({
                editId: stagedEdit.id,
                message: STALE_EDIT_MESSAGE,
            });
            return;
        }
        const edit = stagedEdit;
        approvingRef.current = true;
        setApproving(true);
        try {
            const canApply = freshnessCheck(edit, codeRef, () => setStaleWarning({
                editId: edit.id,
                message: STALE_EDIT_MESSAGE,
            }));
            const result = await commit(edit, { canApply });
            if (!result.ok) {
                if (result.reason === 'save-failed') shellStore.setDirectEditNotice(SAVE_FAILED_NOTICE);
                if (result.reason === 'read-only') shellStore.setDirectEditNotice(result.message);
                return;
            }
            clearSaveFailureNotice();
            shellStore.recordStagedEditOutcome(edit, 'approved');
            shellStore.clearStagedEdit();
        } finally {
            approvingRef.current = false;
            setApproving(false);
        }
    }, [code, stagedEdit, commit]);

    const handleReject = useCallback(() => {
        if (stagedEdit != null) {
            shellStore.recordStagedEditOutcome(stagedEdit, 'rejected');
            const workflow = stagedEdit.context?.repairWorkflow;
            const currentWorkflow = shellStore.getSnapshot().agentRepairWorkflow;
            if (
                workflow?.state === 'running' &&
                currentWorkflow?.state === 'running' &&
                currentWorkflow.cardId === workflow.cardId
            ) {
                shellStore.setAgentRepairWorkflow({ ...currentWorkflow, state: 'drafted' });
            }
        }
        setStaleWarning(null);
        clearSaveFailureNotice();
        shellStore.clearStagedEdit();
    }, [stagedEdit]);

    const handleRerunPrompt = useCallback(() => {
        if (stagedEdit == null) return;
        const context = stagedEdit.context;
        if (context == null) return;

        const prompt = context.promptText.trim();
        if (!prompt) return;

        shellStore.setSelectedFeatureId(context.selectedFeatureId);
        shellStore.setAgentDraftPrompt(prompt);
        shellStore.setAgentRepairWorkflow(
            context.repairWorkflow == null ? null : { ...context.repairWorkflow, state: 'drafted' }
        );
        shellStore.setAgentRailOpen(true);
        shellStore.recordStagedEditOutcome(stagedEdit, 'rerun');
        shellStore.clearStagedEdit();
        setStaleWarning(null);
    }, [stagedEdit]);
    return {
        stagedEdit,
        approving,
        approveDisabled,
        readOnlyHint,
        visibleStaleWarning,
        handleApprove,
        handleReject,
        handleRerunPrompt,
    };
}
